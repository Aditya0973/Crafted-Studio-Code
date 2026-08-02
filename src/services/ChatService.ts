import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { getDatabase } from '../database';
import { Conversation, Message, CreateMessageInput, MessageRole, MessageStatus, MessageMetadata } from '../shared/types';
import { ProviderManager } from '../ai/ProviderManager';
import { AIChatMessage } from '../ai/types';
import { AgentService } from './AgentService';
import { ModelProfileService } from './ModelProfileService';
import { ContextBuilderService } from './ContextBuilderService';

export class ChatService {
  private static activeAborts: Map<string, AbortController> = new Map();

  public static async getOrCreateConversation(projectId: string): Promise<Conversation> {
    if (!projectId) {
      throw new Error('Project ID is required to get or create a conversation');
    }

    const db = getDatabase();
    const existing = db
      .prepare('SELECT id, project_id, title, created_at, updated_at FROM conversations WHERE project_id = ?')
      .get(projectId) as { id: string; project_id: string; title: string; created_at: string; updated_at: string } | undefined;

    if (existing) {
      return {
        id: existing.id,
        projectId: existing.project_id,
        title: existing.title,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const now = new Date().toISOString();
    const conversationId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO conversations (id, project_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(conversationId, projectId, 'Project Conversation', now, now);

    return {
      id: conversationId,
      projectId,
      title: 'Project Conversation',
      createdAt: now,
      updatedAt: now,
    };
  }

  public static async getMessages(conversationId: string): Promise<Message[]> {
    if (!conversationId) return [];

    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT id, conversation_id, role, content, status, created_at, metadata
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`
      )
      .all(conversationId) as Array<{
      id: string;
      conversation_id: string;
      role: MessageRole;
      content: string;
      status: MessageStatus;
      created_at: string;
      metadata: string | null;
    }>;

    return rows.map((r) => {
      let meta: MessageMetadata | undefined = undefined;
      if (r.metadata) {
        try {
          meta = JSON.parse(r.metadata);
        } catch {}
      }
      return {
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        status: r.status,
        createdAt: r.created_at,
        metadata: meta,
      };
    });
  }

  public static async sendMessage(input: CreateMessageInput, mainWindow?: BrowserWindow): Promise<Message> {
    if (!input.projectId || !input.content.trim()) {
      throw new Error('Project ID and message content are required');
    }

    const conversation = await this.getOrCreateConversation(input.projectId);
    const db = getDatabase();
    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();
    const metaJson = JSON.stringify(input.metadata || {});

    // 1. Save user message into SQLite
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(messageId, conversation.id, input.role, input.content.trim(), 'sent', now, metaJson);

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversation.id);

    const userMessage: Message = {
      id: messageId,
      conversationId: conversation.id,
      role: input.role,
      content: input.content.trim(),
      status: 'sent',
      createdAt: now,
      metadata: input.metadata || {},
    };

    // 2. If message is from user, launch background streaming execution
    if (input.role === 'user') {
      const abortController = new AbortController();
      this.activeAborts.set(conversation.id, abortController);

      const aiMessageId = crypto.randomUUID();

      // Launch async stream in background
      setImmediate(async () => {
        let streamedContent = '';

        // Send chat:stream-start event immediately to create assistant message bubble
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('chat:stream-start', {
            conversationId: conversation.id,
            messageId: aiMessageId,
            role: 'assistant',
            initialContent: '',
          });
        }

        try {
          // Resolve Agent and Model Profile mapping
          const targetAgentId = (input.metadata?.agentId as string) || 'agent-architect';
          const agent = AgentService.getAgentById(targetAgentId) || AgentService.getDefaultAgent();
          const profile = agent
            ? ModelProfileService.getProfileById(agent.profileId)
            : ModelProfileService.getDefaultProfile();

          // Build Prompt Context using ContextBuilderService
          const contextResult = await ContextBuilderService.buildPromptContext({
            projectId: input.projectId,
            agentId: targetAgentId,
            userPrompt: input.content.trim(),
            selectedFilePaths: (input.metadata?.attachments as string[]) || [],
            activeTabPath: input.metadata?.activeTabPath as string | undefined,
            activeTabContent: input.metadata?.activeTabContent as string | undefined,
          });

          // Fetch message history for conversation
          const history = await this.getMessages(conversation.id);
          const cleanHistory = history
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role,
              content: m.content,
            }));

          const aiMessages: AIChatMessage[] = [
            { role: 'system', content: contextResult.systemPrompt },
            ...cleanHistory,
          ];

          const aiResponse = await ProviderManager.generateStreamingResponse(
            aiMessages,
            {
              providerId: profile?.providerId as any,
              modelId: profile?.modelId,
              options: { temperature: profile?.temperature ?? 0.7 },
            },
            (tokenChunk: string) => {
              streamedContent += tokenChunk;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('chat:stream-token', {
                  conversationId: conversation.id,
                  messageId: aiMessageId,
                  token: tokenChunk,
                  fullText: streamedContent,
                });
              }
            },
            abortController.signal
          );

          const finalContent = aiResponse.content || streamedContent;
          const aiMeta: MessageMetadata = {
            provider: aiResponse.providerId,
            model: aiResponse.modelId,
            agentId: agent?.id,
            agentName: agent?.name,
            profileId: profile?.id,
            profileName: profile?.name,
            contextSummary: contextResult.contextSummary,
            tokensUsage: aiResponse.usage
              ? {
                  prompt: aiResponse.usage.promptTokens,
                  completion: aiResponse.usage.completionTokens,
                  total: aiResponse.usage.totalTokens,
                }
              : undefined,
          };

          db.prepare(`
            INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(aiMessageId, conversation.id, 'assistant', finalContent, 'sent', new Date().toISOString(), JSON.stringify(aiMeta));

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('chat:stream-end', {
              conversationId: conversation.id,
              messageId: aiMessageId,
              fullText: finalContent,
            });
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || abortController.signal.aborted) {
            console.log('[ChatService] Generation cancelled by user for conversation:', conversation.id);
            if (streamedContent.trim()) {
              const aiMeta: MessageMetadata = { status: 'cancelled' };
              db.prepare(`
                INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(aiMessageId, conversation.id, 'assistant', streamedContent, 'sent', new Date().toISOString(), JSON.stringify(aiMeta));
            }
          } else {
            console.error('[ChatService] Error generating streaming AI response:', err);
            const errContent = `Error: ${err.message || 'Failed to generate response'}`;
            const errMeta: MessageMetadata = { error: err.message };

            db.prepare(`
              INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(aiMessageId, conversation.id, 'assistant', errContent, 'error', new Date().toISOString(), JSON.stringify(errMeta));

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('chat:stream-end', {
                conversationId: conversation.id,
                messageId: aiMessageId,
                fullText: errContent,
              });
            }
          }
        } finally {
          this.activeAborts.delete(conversation.id);
        }
      });
    }

    return userMessage;
  }

  public static async cancelGeneration(conversationId: string): Promise<boolean> {
    const controller = this.activeAborts.get(conversationId);
    if (controller) {
      controller.abort();
      this.activeAborts.delete(conversationId);
      return true;
    }
    return false;
  }

  public static async clearConversation(projectId: string): Promise<boolean> {
    if (!projectId) return false;

    const db = getDatabase();
    const conversation = db.prepare('SELECT id FROM conversations WHERE project_id = ?').get(projectId) as { id: string } | undefined;

    if (conversation) {
      this.cancelGeneration(conversation.id);
      db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversation.id);
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), conversation.id);
    }
    return true;
  }
}
