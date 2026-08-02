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

export class GeminiProvider implements IAIProvider {
  public id: AIProviderId = 'gemini';
  public name = 'Google Gemini';
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

  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private apiKey = '';
  private activeModelId = 'gemini-2.0-flash-exp';

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
      error: !this.apiKey ? 'Gemini API Key required' : undefined,
    };
  }

  public async listModels(): Promise<AIModel[]> {
    const models: AIModel[] = [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', providerId: this.id, contextWindowTokens: 1048576, capabilities: this.capabilities },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', providerId: this.id, contextWindowTokens: 2097152, capabilities: this.capabilities },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)', providerId: this.id, contextWindowTokens: 1048576, capabilities: this.capabilities },
    ];
    ModelCacheManager.setCachedModels(this.id, models);
    return models;
  }

  public async generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is missing. Please configure your API key in Settings.');
    }

    const targetModel = options?.modelId || this.activeModelId || 'gemini-2.0-flash-exp';

    const formattedContents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === 'system')?.content;

    const res = await fetch(`${this.baseUrl}/models/${targetModel}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      modelId: targetModel,
      providerId: this.id,
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
      throw new Error('Gemini API Key is missing. Please configure your API key in Settings.');
    }

    const targetModel = options?.modelId || this.activeModelId || 'gemini-2.0-flash-exp';

    const formattedContents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === 'system')?.content;

    const res = await fetch(`${this.baseUrl}/models/${targetModel}:streamGenerateContent?key=${this.apiKey}&alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
        },
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
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
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
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
