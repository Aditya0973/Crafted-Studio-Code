import {
  IAIProvider,
  AIProviderId,
  AIProviderCapabilities,
  AIProviderConfig,
  AIProviderStatus,
  AIModel,
  AIChatMessage,
  AIChatCompletionOptions,
  AIChatResponse,
} from '../types';
import { ProviderUnavailableError, InvalidModelError } from '../errors';

export class OllamaProvider implements IAIProvider {
  public id: AIProviderId = 'ollama';
  public name = 'Ollama Local AI';
  public capabilities: AIProviderCapabilities = {
    supportsChat: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: false,
  };

  private baseUrl = 'http://localhost:11434';
  private activeModelId = '';

  public async initialize(config?: AIProviderConfig): Promise<void> {
    if (config?.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    }
    if (config?.activeModelId) {
      this.activeModelId = config.activeModelId;
    }
  }

  public async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  public async getStatus(): Promise<AIProviderStatus> {
    const available = await this.isAvailable();
    return {
      providerId: this.id,
      isAvailable: available,
      isConfigured: true,
      activeModelId: this.activeModelId,
      error: available ? undefined : 'Ollama server unreachable at ' + this.baseUrl,
    };
  }

  public async listModels(): Promise<AIModel[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as {
        models?: Array<{
          name: string;
          model?: string;
          size?: number;
          modified_at?: string;
        }>;
      };

      if (!data.models || !Array.isArray(data.models)) {
        return [];
      }

      return data.models.map((m) => ({
        id: m.name || m.model || '',
        name: m.name || m.model || 'Unknown Model',
        providerId: this.id,
        contextWindowTokens: 8192,
        capabilities: this.capabilities,
      }));
    } catch (err) {
      console.error('[OllamaProvider] Error listing models:', err);
      return [];
    }
  }

  public async generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse> {
    return this.generateStreamingCompletion(messages, options);
  }

  public async generateStreamingCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions,
    onToken?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIChatResponse> {
    const available = await this.isAvailable();
    if (!available) {
      throw new ProviderUnavailableError(this.id, `Ollama server is not running or unreachable at ${this.baseUrl}`);
    }

    const availableModels = await this.listModels();
    let targetModel = options?.modelId || this.activeModelId;

    if (!targetModel && availableModels.length > 0) {
      targetModel = availableModels[0].id;
    }

    if (!targetModel) {
      throw new InvalidModelError(this.id, 'No installed Ollama models found. Please pull a model using `ollama run llama3`.');
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.7,
          },
        }),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama API error (${res.status}): ${errText}`);
      }

      let fullText = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let finishReason = 'stop';

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          if (signal?.aborted) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const data = JSON.parse(trimmed) as {
                message?: { content: string };
                prompt_eval_count?: number;
                eval_count?: number;
                done_reason?: string;
                done?: boolean;
              };

              if (data.message?.content) {
                fullText += data.message.content;
                if (onToken) {
                  onToken(data.message.content);
                }
              }

              if (data.prompt_eval_count) promptTokens = data.prompt_eval_count;
              if (data.eval_count) completionTokens = data.eval_count;
              if (data.done_reason) finishReason = data.done_reason;
            } catch {
              // Skip malformed line
            }
          }
        }
      }

      return {
        content: fullText,
        modelId: targetModel,
        providerId: this.id,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          content: '',
          modelId: targetModel,
          providerId: this.id,
          finishReason: 'cancelled',
        };
      }
      throw err;
    }
  }

  public async dispose(): Promise<void> {
    // Reset connection
  }
}
