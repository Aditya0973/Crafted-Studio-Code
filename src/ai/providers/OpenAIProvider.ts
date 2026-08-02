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
import { ApiKeySecurityService } from '../../services/ApiKeySecurityService';

export class OpenAIProvider implements IAIProvider {
  public id: AIProviderId = 'openai';
  public name = 'OpenAI';
  public capabilities: AIProviderCapabilities = {
    supportsChat: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    supportsReasoning: true,
    supportsEmbeddings: true,
    supportsJsonMode: true,
    supportsImageGeneration: true,
  };

  private baseUrl = 'https://api.openai.com/v1';
  private apiKey = '';
  private activeModelId = 'gpt-4o';

  public async initialize(config?: AIProviderConfig): Promise<void> {
    if (config?.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    }
    if (config?.activeModelId) {
      this.activeModelId = config.activeModelId;
    }
    if (config?.apiKey) {
      this.apiKey = ApiKeySecurityService.decryptApiKey(config.apiKey) || config.apiKey;
    } else {
      const sessionKey = ApiKeySecurityService.getSessionKey(this.id);
      if (sessionKey) this.apiKey = sessionKey;
    }
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
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
      isConfigured: !!this.apiKey,
      activeModelId: this.activeModelId,
      error: !this.apiKey ? 'API Key required' : available ? undefined : 'Unreachable OpenAI API',
    };
  }

  public async listModels(): Promise<AIModel[]> {
    const defaultModels: AIModel[] = [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)', providerId: this.id, contextWindowTokens: 128000, capabilities: this.capabilities },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Light)', providerId: this.id, contextWindowTokens: 128000, capabilities: this.capabilities },
      { id: 'o3-mini', name: 'o3-mini (Reasoning)', providerId: this.id, contextWindowTokens: 200000, capabilities: { ...this.capabilities, supportsReasoning: true } },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', providerId: this.id, contextWindowTokens: 128000, capabilities: this.capabilities },
    ];

    if (!this.apiKey) {
      return ModelCacheManager.getCachedModels(this.id).length > 0
        ? ModelCacheManager.getCachedModels(this.id)
        : defaultModels;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return ModelCacheManager.getCachedModels(this.id).length > 0
          ? ModelCacheManager.getCachedModels(this.id)
          : defaultModels;
      }

      const data = (await res.json()) as { data?: Array<{ id: string }> };
      if (data.data && Array.isArray(data.data)) {
        const fetchedIds = new Set(data.data.map((m) => m.id));
        const filtered = defaultModels.filter((m) => fetchedIds.has(m.id) || m.id.startsWith('gpt-4'));
        const result = filtered.length > 0 ? filtered : defaultModels;
        ModelCacheManager.setCachedModels(this.id, result);
        return result;
      }
    } catch {}

    return defaultModels;
  }

  public async generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing. Please configure your API key in Settings.');
    }

    const targetModel = options?.modelId || this.activeModelId || 'gpt-4o';

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      modelId: targetModel,
      providerId: this.id,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
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
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing. Please configure your API key in Settings.');
    }

    const targetModel = options?.modelId || this.activeModelId || 'gpt-4o';

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: options?.temperature ?? 0.7,
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    if (!res.body) {
      throw new Error('Response body is null');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';

    try {
      while (true) {
        if (signal?.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter((l) => l.trim().length > 0);

        for (const line of lines) {
          if (line.includes('[DONE]')) break;
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6)) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                accumulatedContent += token;
                if (onToken) onToken(token);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && !signal?.aborted) throw err;
    }

    return {
      content: accumulatedContent,
      modelId: targetModel,
      providerId: this.id,
      finishReason: signal?.aborted ? 'cancelled' : 'stop',
    };
  }
}
