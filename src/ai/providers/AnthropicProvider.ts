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

export class AnthropicProvider implements IAIProvider {
  public id: AIProviderId = 'anthropic';
  public name = 'Anthropic Claude';
  public capabilities: AIProviderCapabilities = {
    supportsChat: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    supportsReasoning: true,
    supportsEmbeddings: false,
    supportsJsonMode: true,
    supportsImageGeneration: false,
  };

  private baseUrl = 'https://api.anthropic.com/v1';
  private apiKey = '';
  private activeModelId = 'claude-3-5-sonnet-20241022';

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
    return !!this.apiKey;
  }

  public async getStatus(): Promise<AIProviderStatus> {
    const available = await this.isAvailable();
    return {
      providerId: this.id,
      isAvailable: available,
      isConfigured: !!this.apiKey,
      activeModelId: this.activeModelId,
      error: !this.apiKey ? 'Anthropic API Key required' : undefined,
    };
  }

  public async listModels(): Promise<AIModel[]> {
    const models: AIModel[] = [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)', providerId: this.id, contextWindowTokens: 200000, capabilities: this.capabilities },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)', providerId: this.id, contextWindowTokens: 200000, capabilities: this.capabilities },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)', providerId: this.id, contextWindowTokens: 200000, capabilities: this.capabilities },
    ];
    ModelCacheManager.setCachedModels(this.id, models);
    return models;
  }

  public async generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API Key is missing. Please configure your API key in Settings.');
    }

    const targetModel = options?.modelId || this.activeModelId || 'claude-3-5-sonnet-20241022';
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage,
        messages: conversationMessages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const content = data.content?.[0]?.text || '';

    return {
      content,
      modelId: targetModel,
      providerId: this.id,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
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
      throw new Error('Anthropic API Key is missing. Please configure your API key in Settings.');
    }

    const targetModel = options?.modelId || this.activeModelId || 'claude-3-5-sonnet-20241022';
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage,
        messages: conversationMessages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: options?.temperature ?? 0.7,
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
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
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6)) as {
                type: string;
                delta?: { text?: string };
              };
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                accumulatedContent += parsed.delta.text;
                if (onToken) onToken(parsed.delta.text);
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
