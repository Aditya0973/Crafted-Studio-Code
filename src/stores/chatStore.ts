import { create } from 'zustand';
import { Conversation, Message, CreateMessageInput, StreamStartPayload, StreamTokenPayload, StreamEndPayload } from '../shared/types';

interface ChatStoreState {
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isGenerating: boolean;
  streamingMessageId: string | null;
  streamingContent: string;
  composerText: string;
  currentProjectId: string | null;
  debugLog: string[];

  setComposerText: (text: string) => void;
  loadConversationForProject: (projectId: string | null) => Promise<void>;
  sendMessage: (content: string, metadata?: import('../shared/types').MessageMetadata) => Promise<Message | null>;
  cancelGeneration: () => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  subscribeStreamEvents: () => () => void;
}

const logStateChange = (action: string, state: { isSending: boolean; isGenerating: boolean; streamingMessageId: string | null; messagesCount: number }) => {
  const ts = new Date().toISOString().substring(11, 23);
  const msg = `[${ts}] ${action} -> isSending:${state.isSending}, isGenerating:${state.isGenerating}, streamId:${state.streamingMessageId || 'null'}, msgCount:${state.messagesCount}`;
  console.log(`[CHAT_DEBUG] ${msg}`);
  return msg;
};

export const useChatStore = create<ChatStoreState>((set, get) => ({
  activeConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isGenerating: false,
  streamingMessageId: null,
  streamingContent: '',
  composerText: '',
  currentProjectId: null,
  debugLog: [],

  setComposerText: (text: string) => set({ composerText: text }),

  loadConversationForProject: async (projectId: string | null) => {
    if (!projectId) {
      set({
        activeConversation: null,
        messages: [],
        isLoading: false,
        isGenerating: false,
        streamingMessageId: null,
        streamingContent: '',
        currentProjectId: null,
      });
      return;
    }

    set({ isLoading: true, currentProjectId: projectId });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const conversation = await window.craftedAPI.getConversation(projectId);
        const msgs = await window.craftedAPI.getMessages(conversation.id);

        set({
          activeConversation: conversation,
          messages: msgs,
          isLoading: false,
        });
      } catch (err) {
        console.error('[chatStore] Error loading conversation for project:', err);
        set({
          activeConversation: null,
          messages: [],
          isLoading: false,
        });
      }
    } else {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string, metadata?: import('../shared/types').MessageMetadata) => {
    const { currentProjectId, isSending, isGenerating } = get();
    const trimmed = content.trim();

    if (!trimmed || !currentProjectId || isSending || isGenerating) {
      console.warn('[CHAT_DEBUG] sendMessage BLOCKED due to state guard:', { trimmed: !!trimmed, currentProjectId: !!currentProjectId, isSending, isGenerating });
      return null;
    }

    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      conversationId: get().activeConversation?.id || 'conv',
      role: 'user',
      content: trimmed,
      status: 'sent',
      createdAt: new Date().toISOString(),
      metadata,
    };

    const log1 = logStateChange('sendMessage START', { isSending: true, isGenerating: true, streamingMessageId: null, messagesCount: get().messages.length });
    set((state) => ({
      isSending: true,
      isGenerating: true,
      composerText: '',
      streamingContent: '',
      messages: [...state.messages, tempUserMsg],
      debugLog: [...state.debugLog.slice(-15), log1],
    }));

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const input: CreateMessageInput = {
          projectId: currentProjectId,
          role: 'user',
          content: trimmed,
          metadata,
        };

        const userMsg = await window.craftedAPI.sendMessage(input);

        if (userMsg) {
          const log2 = logStateChange('sendMessage IPC_RETURNED', { isSending: false, isGenerating: get().isGenerating, streamingMessageId: get().streamingMessageId, messagesCount: get().messages.length });
          set((state) => {
            const hasTemp = state.messages.some((m) => m.id === tempUserMsg.id);
            const nextMessages = hasTemp
              ? state.messages.map((m) => (m.id === tempUserMsg.id ? userMsg : m))
              : [...state.messages, userMsg];

            return {
              isSending: false,
              messages: nextMessages,
              debugLog: [...state.debugLog.slice(-15), log2],
            };
          });
        }

        return userMsg;
      } catch (err) {
        console.error('[chatStore] Error sending message:', err);
        const logErr = logStateChange('sendMessage ERROR', { isSending: false, isGenerating: false, streamingMessageId: null, messagesCount: get().messages.length });
        set((state) => ({
          isSending: false,
          isGenerating: false,
          debugLog: [...state.debugLog.slice(-15), logErr],
        }));
        return null;
      } finally {
        const logFin = logStateChange('sendMessage FINALLY', { isSending: false, isGenerating: get().isGenerating, streamingMessageId: get().streamingMessageId, messagesCount: get().messages.length });
        set((state) => ({
          isSending: false,
          debugLog: [...state.debugLog.slice(-15), logFin],
        }));
      }
    }

    set({ isSending: false, isGenerating: false });
    return null;
  },

  cancelGeneration: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    const logCancel = logStateChange('cancelGeneration CLICKED', { isSending: false, isGenerating: false, streamingMessageId: null, messagesCount: get().messages.length });
    set((state) => ({ debugLog: [...state.debugLog.slice(-15), logCancel] }));

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        await window.craftedAPI.cancelGeneration(activeConversation.id);
        const updatedMsgs = await window.craftedAPI.getMessages(activeConversation.id);
        const logDone = logStateChange('cancelGeneration DONE', { isSending: false, isGenerating: false, streamingMessageId: null, messagesCount: updatedMsgs.length });
        set((state) => ({
          messages: updatedMsgs,
          isGenerating: false,
          isSending: false,
          streamingMessageId: null,
          streamingContent: '',
          debugLog: [...state.debugLog.slice(-15), logDone],
        }));
      } catch (err) {
        console.error('[chatStore] Error cancelling generation:', err);
        set({ isGenerating: false, isSending: false });
      }
    }
  },

  retryMessage: async (messageId: string) => {
    const { messages, isGenerating, cancelGeneration } = get();
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    let userContentToRetry: string | null = null;
    if (target.role === 'user') {
      userContentToRetry = target.content;
    } else {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx > 0 && messages[idx - 1].role === 'user') {
        userContentToRetry = messages[idx - 1].content;
      }
    }

    if (!userContentToRetry) return;

    if (isGenerating) {
      await cancelGeneration();
    }

    setTimeout(() => {
      get().sendMessage(userContentToRetry!);
    }, 100);
  },

  clearConversation: async () => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        await window.craftedAPI.clearConversation(currentProjectId);
        set({ messages: [], isGenerating: false, isSending: false, streamingContent: '', debugLog: [] });
      } catch (err) {
        console.error('[chatStore] Error clearing conversation:', err);
      }
    }
  },

  subscribeStreamEvents: () => {
    if (typeof window === 'undefined' || !window.craftedAPI) {
      return () => {};
    }

    const unsubStart = window.craftedAPI.onStreamStart((payload: StreamStartPayload) => {
      const { activeConversation } = get();
      if (!activeConversation || payload.conversationId !== activeConversation.id) return;

      set((state) => {
        const existingMsg = state.messages.find((m) => m.id === payload.messageId);
        const logStart = logStateChange('onStreamStart EVENT', { isSending: state.isSending, isGenerating: true, streamingMessageId: payload.messageId, messagesCount: existingMsg ? state.messages.length : state.messages.length + 1 });

        if (!existingMsg) {
          const newAiMsg: Message = {
            id: payload.messageId,
            conversationId: payload.conversationId,
            role: payload.role,
            content: payload.initialContent || '',
            status: 'sending',
            createdAt: new Date().toISOString(),
          };
          return {
            messages: [...state.messages, newAiMsg],
            isGenerating: true,
            streamingMessageId: payload.messageId,
            streamingContent: payload.initialContent || '',
            debugLog: [...state.debugLog.slice(-15), logStart],
          };
        } else {
          return {
            isGenerating: true,
            streamingMessageId: payload.messageId,
            debugLog: [...state.debugLog.slice(-15), logStart],
          };
        }
      });
    });

    const unsubToken = window.craftedAPI.onStreamToken((payload: StreamTokenPayload) => {
      const { activeConversation } = get();
      if (!activeConversation || payload.conversationId !== activeConversation.id) return;

      set((state) => {
        const updated = state.messages.map((m) =>
          m.id === payload.messageId ? { ...m, content: payload.fullText } : m
        );
        return {
          messages: updated,
          isGenerating: true,
          streamingMessageId: payload.messageId,
          streamingContent: payload.fullText,
        };
      });
    });

    const unsubEnd = window.craftedAPI.onStreamEnd((payload: StreamEndPayload) => {
      const { activeConversation } = get();
      if (!activeConversation || payload.conversationId !== activeConversation.id) return;

      window.craftedAPI.getMessages(payload.conversationId).then((msgs) => {
        set((state) => {
          const logEnd = logStateChange('onStreamEnd EVENT', { isSending: false, isGenerating: false, streamingMessageId: null, messagesCount: msgs.length });
          return {
            messages: msgs,
            isGenerating: false,
            isSending: false,
            streamingMessageId: null,
            streamingContent: '',
            debugLog: [...state.debugLog.slice(-15), logEnd],
          };
        });
      });
    });

    return () => {
      unsubStart();
      unsubToken();
      unsubEnd();
    };
  },
}));
