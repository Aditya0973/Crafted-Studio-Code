import { OpenAIProvider } from './OpenAIProvider';
import { AIProviderId, AIModel } from '../types';
import { ModelCacheManager } from '../ModelCacheManager';

export class GroqProvider extends OpenAIProvider {
  public override id: AIProviderId = 'groq';
  public override name = 'Groq Cloud (Ultra Fast LPU)';

  constructor() {
    super();
    // @ts-ignore
    this.baseUrl = 'https://api.groq.com/openai/v1';
  }

  public override async listModels(): Promise<AIModel[]> {
    const defaultModels: AIModel[] = [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', providerId: this.id, contextWindowTokens: 128000, capabilities: this.capabilities },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', providerId: this.id, contextWindowTokens: 128000, capabilities: { ...this.capabilities, supportsReasoning: true } },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k', providerId: this.id, contextWindowTokens: 32768, capabilities: this.capabilities },
    ];
    ModelCacheManager.setCachedModels(this.id, defaultModels);
    return defaultModels;
  }
}
