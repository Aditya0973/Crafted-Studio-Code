import { getDatabase } from '../database';
import { AISettings } from '../shared/types';

export class AISettingsService {
  private static readonly DEFAULTS: AISettings = {
    activeProviderId: 'mock',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaActiveModel: '',
    enabledProviders: ['mock', 'ollama'],
  };

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

      return {
        activeProviderId: (map.get('ai_activeProviderId') as string) || this.DEFAULTS.activeProviderId,
        ollamaBaseUrl: (map.get('ai_ollamaBaseUrl') as string) || this.DEFAULTS.ollamaBaseUrl,
        ollamaActiveModel: (map.get('ai_ollamaActiveModel') as string) || this.DEFAULTS.ollamaActiveModel,
        enabledProviders: (map.get('ai_enabledProviders') as string[]) || this.DEFAULTS.enabledProviders,
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
      const updated: AISettings = { ...current, ...settings };

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

      return true;
    } catch (err) {
      console.error('[AISettingsService] Error saving AI settings:', err);
      return false;
    }
  }
}
