import { getDatabase } from '../database';
import { AIModel, AIProviderId } from './types';

export class ModelCacheManager {
  public static getCachedModels(providerId: AIProviderId): AIModel[] {
    try {
      const db = getDatabase();
      const rows = db
        .prepare('SELECT provider_id, model_id, model_name, capabilities_json, last_updated FROM cached_models WHERE provider_id = ?')
        .all(providerId) as Array<{
        provider_id: string;
        model_id: string;
        model_name: string;
        capabilities_json: string;
        last_updated: string;
      }>;

      return rows.map((r) => {
        let caps = {
          supportsChat: true,
          supportsStreaming: true,
          supportsVision: false,
          supportsTools: false,
          supportsReasoning: false,
          supportsEmbeddings: false,
          supportsJsonMode: false,
          supportsImageGeneration: false,
        };
        try {
          caps = { ...caps, ...JSON.parse(r.capabilities_json) };
        } catch {}

        return {
          id: r.model_id,
          name: r.model_name,
          providerId: r.provider_id,
          contextWindowTokens: 8192,
          capabilities: caps,
        };
      });
    } catch (err) {
      console.error(`[ModelCacheManager] Error getting cached models for ${providerId}:`, err);
      return [];
    }
  }

  public static setCachedModels(providerId: AIProviderId, models: AIModel[]): void {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      const deleteStmt = db.prepare('DELETE FROM cached_models WHERE provider_id = ?');
      const insertStmt = db.prepare(`
        INSERT INTO cached_models (provider_id, model_id, model_name, capabilities_json, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        deleteStmt.run(providerId);
        for (const m of models) {
          insertStmt.run(
            providerId,
            m.id,
            m.name,
            JSON.stringify(m.capabilities),
            now
          );
        }
      })();
    } catch (err) {
      console.error(`[ModelCacheManager] Error setting cached models for ${providerId}:`, err);
    }
  }

  public static clearCache(providerId?: AIProviderId): void {
    try {
      const db = getDatabase();
      if (providerId) {
        db.prepare('DELETE FROM cached_models WHERE provider_id = ?').run(providerId);
      } else {
        db.prepare('DELETE FROM cached_models').run();
      }
    } catch (err) {
      console.error('[ModelCacheManager] Error clearing cache:', err);
    }
  }
}
