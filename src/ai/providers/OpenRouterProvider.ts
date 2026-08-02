import { OpenAIProvider } from './OpenAIProvider';
import { AIProviderId, AIModel } from '../types';
import { ModelCacheManager } from '../ModelCacheManager';

export class OpenRouterProvider extends OpenAIProvider {
  public override id: AIProviderId = 'openrouter';
  public override name = 'OpenRouter';

  constructor() {
    super();
    // @ts-ignore
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  public override async listModels(): Promise<AIModel[]> {
    const defaultModels: AIModel[] = [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', providerId: this.id, contextWindowTokens: 200000, capabilities: this.capabilities },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (via OpenRouter)', providerId: this.id, contextWindowTokens: 64000, capabilities: this.capabilities },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (via OpenRouter)', providerId: this.id, contextWindowTokens: 128000, capabilities: this.capabilities },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', providerId: this.id, contextWindowTokens: 1048576, capabilities: this.capabilities },
    ];
    ModelCacheManager.setCachedModels(this.id, defaultModels);
    return defaultModels;
  }
}
