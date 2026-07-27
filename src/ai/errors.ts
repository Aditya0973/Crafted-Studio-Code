import { AIProviderId } from './types';

export class AIError extends Error {
  public providerId?: AIProviderId;
  public code: string;

  constructor(message: string, code = 'AI_ERROR', providerId?: AIProviderId) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.providerId = providerId;
  }
}

export class ProviderNotFoundError extends AIError {
  constructor(providerId: AIProviderId) {
    super(`AI Provider '${providerId}' is not registered in ProviderRegistry.`, 'PROVIDER_NOT_FOUND', providerId);
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderUnavailableError extends AIError {
  constructor(providerId: AIProviderId, reason?: string) {
    super(
      `AI Provider '${providerId}' is unavailable.${reason ? ` Reason: ${reason}` : ''}`,
      'PROVIDER_UNAVAILABLE',
      providerId
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderNotConfiguredError extends AIError {
  constructor(providerId: AIProviderId) {
    super(`AI Provider '${providerId}' is missing required configuration (e.g. API Key or Base URL).`, 'PROVIDER_NOT_CONFIGURED', providerId);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class InvalidModelError extends AIError {
  constructor(providerId: AIProviderId, modelId: string) {
    super(`Model '${modelId}' is not supported by provider '${providerId}'.`, 'INVALID_MODEL', providerId);
    this.name = 'InvalidModelError';
  }
}

export class AIConnectionTimeoutError extends AIError {
  constructor(providerId: AIProviderId, timeoutMs: number) {
    super(`Connection to AI Provider '${providerId}' timed out after ${timeoutMs}ms.`, 'CONNECTION_TIMEOUT', providerId);
    this.name = 'AIConnectionTimeoutError';
  }
}
