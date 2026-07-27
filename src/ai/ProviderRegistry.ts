import { IAIProvider, AIProviderId } from './types';
import { ProviderNotFoundError } from './errors';

export class ProviderRegistry {
  private static providers: Map<AIProviderId, IAIProvider> = new Map();

  public static registerProvider(provider: IAIProvider): void {
    if (!provider || !provider.id) {
      throw new Error('Invalid provider: provider must have a valid id');
    }
    this.providers.set(provider.id, provider);
  }

  public static getProvider(id: AIProviderId): IAIProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new ProviderNotFoundError(id);
    }
    return provider;
  }

  public static hasProvider(id: AIProviderId): boolean {
    return this.providers.has(id);
  }

  public static getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  public static unregisterProvider(id: AIProviderId): boolean {
    return this.providers.delete(id);
  }

  public static clear(): void {
    this.providers.clear();
  }
}
