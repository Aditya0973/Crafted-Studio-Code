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
import { ModelCacheManager } from '../ModelCacheManager';

export class OllamaProvider implements IAIProvider {
  public id: AIProviderId = 'ollama';
  public name = 'Ollama Local AI';
  public capabilities: AIProviderCapabilities = {
    supportsChat: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    supportsReasoning: false,
    supportsEmbeddings: true,
    supportsJsonMode: true,
    supportsImageGeneration: false,
  };

  private baseUrl = 'http://127.0.0.1:11434';
  private activeModelId = 'qwen2.5:7b';

  private normalizeUrl(url?: string): string {
    if (!url) return 'http://127.0.0.1:11434';
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.includes('localhost')) {
      clean = clean.replace('localhost', '127.0.0.1');
    }
    return clean;
  }

  public async initialize(config?: AIProviderConfig): Promise<void> {
    if (config?.baseUrl) {
      this.baseUrl = this.normalizeUrl(config.baseUrl);
    }
    if (config?.activeModelId) {
      this.activeModelId = config.activeModelId;
    }
  }

  public async isAvailable(): Promise<boolean> {
    const urlsToTry = [this.baseUrl, 'http://127.0.0.1:11434', 'http://localhost:11434'];
    for (const targetUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${targetUrl}/api/tags`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (res.ok) {
          this.baseUrl = targetUrl;
          return true;
        }
      } catch {}
    }
    return false;
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
    const urlsToTry = [this.baseUrl, 'http://127.0.0.1:11434', 'http://localhost:11434'];
    for (const targetUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${targetUrl}/api/tags`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as {
            models?: Array<{
              name: string;
              model?: string;
              size?: number;
              modified_at?: string;
            }>;
          };

          if (data.models && Array.isArray(data.models) && data.models.length > 0) {
            const models: AIModel[] = data.models.map((m) => ({
              id: m.name || m.model || '',
              name: m.name || m.model || 'Unknown Model',
              providerId: this.id,
              contextWindowTokens: 8192,
              capabilities: this.capabilities,
            }));

            this.baseUrl = targetUrl;
            ModelCacheManager.setCachedModels(this.id, models);
            return models;
          }
        }
      } catch {}
    }

    return ModelCacheManager.getCachedModels(this.id);
  }

  public async generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse> {
    const targetModel = options?.modelId || this.activeModelId || 'qwen2.5:7b';

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      message?: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const content = data.message?.content || '';
    const promptTokens = data.prompt_eval_count || 0;
    const completionTokens = data.eval_count || 0;

    return {
      content,
      modelId: targetModel,
      providerId: this.id,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: 'stop',
    };
  }

  public async generateStreamingCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions,
    onToken?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIChatResponse> {
    const targetModel = options?.modelId || this.activeModelId || 'qwen2.5:7b';

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
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

    if (!res.body) {
      throw new Error('Response body is null');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        if (signal?.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter((l) => l.trim().length > 0);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as {
              message?: { content?: string };
              prompt_eval_count?: number;
              eval_count?: number;
              done?: boolean;
            };

            if (parsed.message?.content) {
              accumulatedContent += parsed.message.content;
              if (onToken) {
                onToken(parsed.message.content);
              }
            }

            if (parsed.prompt_eval_count) promptTokens = parsed.prompt_eval_count;
            if (parsed.eval_count) completionTokens = parsed.eval_count;
          } catch {
            // Ignore incomplete JSON line chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        console.log('[OllamaProvider] Stream aborted by user signal.');
      } else {
        throw err;
      }
    }

    return {
      content: accumulatedContent,
      modelId: targetModel,
      providerId: this.id,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: signal?.aborted ? 'cancelled' : 'stop',
    };
  }
}
