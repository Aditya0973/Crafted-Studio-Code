export type AIProviderId = 'mock' | 'ollama' | 'lmstudio' | 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'groq' | string;

export interface AIProviderCapabilities {
  supportsChat: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  supportsEmbeddings: boolean;
  supportsJsonMode: boolean;
  supportsImageGeneration: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  providerId: AIProviderId;
  contextWindowTokens?: number;
  capabilities: AIProviderCapabilities;
}

export interface AIProviderConfig {
  providerId: AIProviderId;
  apiKey?: string;
  baseUrl?: string;
  activeModelId?: string;
  isEnabled: boolean;
  [key: string]: unknown;
}

export interface AIProviderStatus {
  providerId: AIProviderId;
  isAvailable: boolean;
  isConfigured: boolean;
  error?: string;
  activeModelId?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatCompletionOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIChatResponse {
  content: string;
  modelId: string;
  providerId: AIProviderId;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface IAIProvider {
  id: AIProviderId;
  name: string;
  capabilities: AIProviderCapabilities;
  initialize(config?: AIProviderConfig): Promise<void>;
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<AIProviderStatus>;
  listModels(): Promise<AIModel[]>;
  generateChatCompletion(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatResponse>;
  generateStreamingCompletion?(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions,
    onToken?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIChatResponse>;
  dispose?(): Promise<void>;
}
