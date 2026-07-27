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
    return this.generateStreamingCompletion(messages, options);
  }

  public async generateStreamingCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions,
    onToken?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIChatResponse> {
    const selectedModel = options?.modelId || this.activeModelId;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const userPrompt = lastUserMessage ? lastUserMessage.content : 'Hello';

    const fullResponse =
      `[Mock AI Response (${selectedModel})]\n\n` +
      `Received prompt: "${userPrompt}"\n\n` +
      `Crafted Studio provider-agnostic AI streaming architecture is active.\n` +
      `Streaming tokens incrementally to allow testing live cancellation and Stop Generation button interactions.\n` +
      `Token 1: System initialized.\n` +
      `Token 2: Context window verified.\n` +
      `Token 3: Memory & state persisted to SQLite database.\n` +
      `Token 4: Completion sequence ending successfully.`;

    const tokens = fullResponse.split(' ');
    let currentContent = '';

    for (let i = 0; i < tokens.length; i++) {
      if (signal?.aborted) {
        break;
      }

      const chunk = (i === 0 ? '' : ' ') + tokens[i];
      currentContent += chunk;

      if (onToken) {
        onToken(chunk);
      }

      // 120ms delay per token chunk so response streams over ~8 seconds for easy Stop testing
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return {
      content: currentContent,
      modelId: selectedModel,
      providerId: this.id,
      usage: {
        promptTokens: Math.ceil(userPrompt.length / 4),
        completionTokens: Math.ceil(currentContent.length / 4),
        totalTokens: Math.ceil((userPrompt.length + currentContent.length) / 4),
      },
      finishReason: signal?.aborted ? 'cancelled' : 'stop',
    };
  }

  public async dispose(): Promise<void> {
    // Reset state
  }
}
