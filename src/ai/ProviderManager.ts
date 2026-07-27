import {
  IAIProvider,
  AIProviderId,
  AIProviderStatus,
  AIChatMessage,
  AIChatCompletionOptions,
  AIChatResponse,
  AIModel,
} from './types';
import { ProviderRegistry } from './ProviderRegistry';
import { MockProvider } from './providers/MockProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { AISettingsService } from '../services/AISettingsService';

export class ProviderManager {
  private static isInitialized = false;

  public static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const settings = AISettingsService.getAISettings();

    // Register built-in MockProvider
    const mock = new MockProvider();
    await mock.initialize();
    ProviderRegistry.registerProvider(mock);

    // Register OllamaProvider
    const ollama = new OllamaProvider();
    await ollama.initialize({
      providerId: 'ollama',
      baseUrl: settings.ollamaBaseUrl,
      activeModelId: settings.ollamaActiveModel,
      isEnabled: true,
    });
    ProviderRegistry.registerProvider(ollama);

    this.isInitialized = true;
  }

  public static async getActiveProvider(preferredId?: AIProviderId): Promise<IAIProvider> {
    await this.initialize();

    const settings = AISettingsService.getAISettings();
    const targetId = preferredId || settings.activeProviderId || 'mock';

    if (!ProviderRegistry.hasProvider(targetId)) {
      return ProviderRegistry.getProvider('mock');
    }

    const provider = ProviderRegistry.getProvider(targetId);

    // Fall back to MockProvider if target provider is unreachable (e.g. Ollama offline)
    if (targetId !== 'mock') {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.warn(`[ProviderManager] Provider '${targetId}' is unreachable. Falling back to MockProvider.`);
        return ProviderRegistry.getProvider('mock');
      }
    }

    return provider;
  }

  public static async generateResponse(
    messages: AIChatMessage[],
    options?: { providerId?: AIProviderId; modelId?: string; options?: AIChatCompletionOptions }
  ): Promise<AIChatResponse> {
    return this.generateStreamingResponse(messages, options);
  }

  public static async generateStreamingResponse(
    messages: AIChatMessage[],
    options?: { providerId?: AIProviderId; modelId?: string; options?: AIChatCompletionOptions },
    onToken?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIChatResponse> {
    await this.initialize();

    const settings = AISettingsService.getAISettings();
    const provider = await this.getActiveProvider(options?.providerId);

    let selectedModel = options?.modelId;
    if (!selectedModel && provider.id === 'ollama') {
      selectedModel = settings.ollamaActiveModel;
    }

    if (provider.generateStreamingCompletion) {
      return provider.generateStreamingCompletion(
        messages,
        { modelId: selectedModel, ...options?.options },
        onToken,
        signal
      );
    }

    // Fallback for non-streaming providers
    const response = await provider.generateChatCompletion(messages, {
      modelId: selectedModel,
      ...options?.options,
    });

    if (onToken && response.content) {
      onToken(response.content);
    }

    return response;
  }

  public static async getProviderStatuses(): Promise<AIProviderStatus[]> {
    await this.initialize();
    const providers = ProviderRegistry.getAllProviders();
    return Promise.all(providers.map((p) => p.getStatus()));
  }

  public static async listModels(providerId: AIProviderId): Promise<AIModel[]> {
    await this.initialize();
    if (!ProviderRegistry.hasProvider(providerId)) return [];
    const provider = ProviderRegistry.getProvider(providerId);
    return provider.listModels();
  }

  public static async testConnection(
    providerId: AIProviderId,
    baseUrl?: string
  ): Promise<{ isAvailable: boolean; error?: string }> {
    await this.initialize();
    if (!ProviderRegistry.hasProvider(providerId)) {
      return { isAvailable: false, error: `Provider '${providerId}' not found.` };
    }

    const provider = ProviderRegistry.getProvider(providerId);
    if (baseUrl && 'initialize' in provider) {
      await provider.initialize({ providerId, baseUrl, isEnabled: true });
    }

    const available = await provider.isAvailable();
    return {
      isAvailable: available,
      error: available ? undefined : `Server unreachable at ${baseUrl || 'default address'}`,
    };
  }

  public static async reloadSettings(): Promise<void> {
    const settings = AISettingsService.getAISettings();
    if (ProviderRegistry.hasProvider('ollama')) {
      const ollama = ProviderRegistry.getProvider('ollama');
      await ollama.initialize({
        providerId: 'ollama',
        baseUrl: settings.ollamaBaseUrl,
        activeModelId: settings.ollamaActiveModel,
        isEnabled: true,
      });
    }
  }

  public static async dispose(): Promise<void> {
    const providers = ProviderRegistry.getAllProviders();
    for (const p of providers) {
      await p.dispose();
    }
    ProviderRegistry.clear();
    this.isInitialized = false;
  }
}
