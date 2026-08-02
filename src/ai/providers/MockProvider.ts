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

export class MockProvider implements IAIProvider {
  public id: AIProviderId = 'mock';
  public name = 'Mock AI Provider';
  public capabilities: AIProviderCapabilities = {
    supportsChat: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    supportsReasoning: true,
    supportsEmbeddings: true,
    supportsJsonMode: true,
    supportsImageGeneration: false,
  };

  private activeModelId = 'mock-gpt-4o';

  public async initialize(config?: AIProviderConfig): Promise<void> {
    if (config?.activeModelId) {
      this.activeModelId = config.activeModelId;
    }
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async getStatus(): Promise<AIProviderStatus> {
    return {
      providerId: this.id,
      isAvailable: true,
      isConfigured: true,
      activeModelId: this.activeModelId,
    };
  }

  public async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'mock-gpt-4o',
        name: 'Mock GPT-4o (Simulated)',
        providerId: this.id,
        contextWindowTokens: 128000,
        capabilities: this.capabilities,
      },
      {
        id: 'mock-claude-3-5-sonnet',
        name: 'Mock Claude 3.5 Sonnet (Simulated)',
        providerId: this.id,
        contextWindowTokens: 200000,
        capabilities: this.capabilities,
      },
    ];
  }

  public async generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Hello';
    const responseText = `[Mock AI Response] You said: "${lastUserMessage}". This is a simulated response generated locally for testing purposes.`;

    return {
      content: responseText,
      modelId: options?.modelId || this.activeModelId,
      providerId: this.id,
      usage: {
        promptTokens: lastUserMessage.length,
        completionTokens: responseText.length,
        totalTokens: lastUserMessage.length + responseText.length,
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
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Hello';
    const responseText = `[Mock AI Response] You said: "${lastUserMessage}". This is a simulated response generated locally for testing purposes.`;

    const tokens = responseText.split(' ');
    let accumulated = '';

    for (const token of tokens) {
      if (signal?.aborted) {
        break;
      }
      const chunk = token + ' ';
      accumulated += chunk;
      if (onToken) {
        onToken(chunk);
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    return {
      content: accumulated,
      modelId: options?.modelId || this.activeModelId,
      providerId: this.id,
      usage: {
        promptTokens: lastUserMessage.length,
        completionTokens: accumulated.length,
        totalTokens: lastUserMessage.length + accumulated.length,
      },
      finishReason: signal?.aborted ? 'cancelled' : 'stop',
    };
  }
}
