import { getDatabase } from '../database';
import { AISettings, ProviderConfigData } from '../shared/types';
import { ProviderManager } from '../ai/ProviderManager';

export class AISettingsService {
  private static readonly DEFAULTS: AISettings = {
    activeProviderId: 'ollama',
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaActiveModel: 'qwen2.5:7b',
    enabledProviders: ['mock', 'ollama', 'openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'lmstudio', 'custom'],
    providersConfig: {
      mock: { providerId: 'mock', name: 'Mock Provider', isEnabled: true },
      ollama: { providerId: 'ollama', name: 'Ollama Local AI', isEnabled: true, baseUrl: 'http://127.0.0.1:11434', activeModelId: 'qwen2.5:7b' },
      openai: { providerId: 'openai', name: 'OpenAI', isEnabled: true, baseUrl: 'https://api.openai.com/v1', activeModelId: 'gpt-4o' },
      anthropic: { providerId: 'anthropic', name: 'Anthropic Claude', isEnabled: true, baseUrl: 'https://api.anthropic.com/v1', activeModelId: 'claude-3-5-sonnet-20241022' },
      gemini: { providerId: 'gemini', name: 'Google Gemini', isEnabled: true, baseUrl: 'https://generativelanguage.googleapis.com/v1beta', activeModelId: 'gemini-2.0-flash-exp' },
      openrouter: { providerId: 'openrouter', name: 'OpenRouter', isEnabled: true, baseUrl: 'https://openrouter.ai/api/v1', activeModelId: 'anthropic/claude-3.5-sonnet' },
      groq: { providerId: 'groq', name: 'Groq Cloud', isEnabled: true, baseUrl: 'https://api.groq.com/openai/v1', activeModelId: 'llama-3.3-70b-versatile' },
      lmstudio: { providerId: 'lmstudio', name: 'LM Studio Local', isEnabled: true, baseUrl: 'http://127.0.0.1:1234/v1' },
      custom: { providerId: 'custom', name: 'Custom Endpoint', isEnabled: true },
    },
    keyStorageMode: 'safeStorage',
  };

  private static normalizeLocalUrl(url?: string): string {
    if (!url) return 'http://127.0.0.1:11434';
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.includes('localhost')) {
      clean = clean.replace('localhost', '127.0.0.1');
    }
    return clean;
  }

  public static getAISettings(): AISettings {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT key, value FROM settings WHERE key LIKE "ai_%"').all() as Array<{
        key: string;
        value: string;
      }>;

      const map = new Map<string, unknown>();
      for (const row of rows) {
        try {
          map.set(row.key, JSON.parse(row.value));
        } catch {
          map.set(row.key, row.value);
        }
      }

      const rawUrl = (map.get('ai_ollamaBaseUrl') as string) || this.DEFAULTS.ollamaBaseUrl;
      const activeProvider = (map.get('ai_activeProviderId') as string) || this.DEFAULTS.activeProviderId;
      const activeModel = (map.get('ai_ollamaActiveModel') as string) || this.DEFAULTS.ollamaActiveModel;
      const parsedConfigs = (map.get('ai_providersConfig') as Record<string, ProviderConfigData>) || this.DEFAULTS.providersConfig;

      return {
        activeProviderId: activeProvider,
        ollamaBaseUrl: this.normalizeLocalUrl(rawUrl),
        ollamaActiveModel: activeModel,
        enabledProviders: (map.get('ai_enabledProviders') as string[]) || this.DEFAULTS.enabledProviders,
        providersConfig: { ...this.DEFAULTS.providersConfig, ...parsedConfigs },
        keyStorageMode: (map.get('ai_keyStorageMode') as any) || this.DEFAULTS.keyStorageMode,
      };
    } catch (err) {
      console.error('[AISettingsService] Error reading AI settings:', err);
      return this.DEFAULTS;
    }
  }

  public static saveAISettings(settings: Partial<AISettings>): boolean {
    try {
      const db = getDatabase();
      const current = this.getAISettings();
      const updated: AISettings = {
        ...current,
        ...settings,
        ollamaBaseUrl: settings.ollamaBaseUrl ? this.normalizeLocalUrl(settings.ollamaBaseUrl) : current.ollamaBaseUrl,
        providersConfig: {
          ...current.providersConfig,
          ...(settings.providersConfig || {}),
        },
      };

      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run('ai_activeProviderId', JSON.stringify(updated.activeProviderId));
      stmt.run('ai_ollamaBaseUrl', JSON.stringify(updated.ollamaBaseUrl));
      stmt.run('ai_ollamaActiveModel', JSON.stringify(updated.ollamaActiveModel));
      stmt.run('ai_enabledProviders', JSON.stringify(updated.enabledProviders));
      stmt.run('ai_providersConfig', JSON.stringify(updated.providersConfig));
      stmt.run('ai_keyStorageMode', JSON.stringify(updated.keyStorageMode));

      // Re-synchronize ProviderManager with updated settings
      ProviderManager.updateOllamaConfig().catch((err) =>
        console.error('[AISettingsService] Error updating Ollama config in ProviderManager:', err)
      );

      return true;
    } catch (err) {
      console.error('[AISettingsService] Error saving AI settings:', err);
      return false;
    }
  }
}
