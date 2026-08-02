import { getDatabase } from '../database';
import { ModelProfile } from '../shared/types';

export class ModelProfileService {
  public static getModelProfiles(): ModelProfile[] {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM model_profiles ORDER BY is_default DESC, name ASC').all() as any[];

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        providerId: r.provider_id,
        modelId: r.model_id,
        temperature: r.temperature ?? 0.7,
        maxTokens: r.max_tokens ?? undefined,
        systemPrompt: r.system_prompt ?? undefined,
        isDefault: Boolean(r.is_default),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      console.error('[ModelProfileService] Error fetching profiles:', err);
      return [];
    }
  }

  public static getProfileById(id: string): ModelProfile | null {
    const profiles = this.getModelProfiles();
    return profiles.find((p) => p.id === id) || null;
  }

  public static getDefaultProfile(): ModelProfile | null {
    const profiles = this.getModelProfiles();
    return profiles.find((p) => p.isDefault) || profiles[0] || null;
  }

  public static saveModelProfile(profile: Partial<ModelProfile>): ModelProfile {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = profile.id || `profile-${Date.now()}`;

    if (profile.isDefault) {
      db.prepare('UPDATE model_profiles SET is_default = 0').run();
    }

    const existing = db.prepare('SELECT id FROM model_profiles WHERE id = ?').get(id);

    if (existing) {
      db.prepare(`
        UPDATE model_profiles
        SET name = COALESCE(?, name),
            provider_id = COALESCE(?, provider_id),
            model_id = COALESCE(?, model_id),
            temperature = COALESCE(?, temperature),
            max_tokens = ?,
            system_prompt = ?,
            is_default = COALESCE(?, is_default),
            updated_at = ?
        WHERE id = ?
      `).run(
        profile.name ?? null,
        profile.providerId ?? null,
        profile.modelId ?? null,
        profile.temperature ?? null,
        profile.maxTokens ?? null,
        profile.systemPrompt ?? null,
        profile.isDefault ? 1 : 0,
        now,
        id
      );
    } else {
      db.prepare(`
        INSERT INTO model_profiles (id, name, provider_id, model_id, temperature, max_tokens, system_prompt, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        profile.name || 'Custom Model Profile',
        profile.providerId || 'ollama',
        profile.modelId || 'qwen2.5:7b',
        profile.temperature ?? 0.7,
        profile.maxTokens ?? null,
        profile.systemPrompt ?? null,
        profile.isDefault ? 1 : 0,
        now,
        now
      );
    }

    return this.getProfileById(id)!;
  }

  public static deleteModelProfile(id: string): boolean {
    try {
      const db = getDatabase();
      const profile = this.getProfileById(id);
      if (!profile || profile.isDefault) {
        console.warn('[ModelProfileService] Cannot delete default profile.');
        return false;
      }

      // Re-assign any agents bound to this profile to default profile
      const defaultProf = this.getDefaultProfile();
      if (defaultProf) {
        db.prepare('UPDATE agent_definitions SET profile_id = ? WHERE profile_id = ?').run(defaultProf.id, id);
      }

      db.prepare('DELETE FROM model_profiles WHERE id = ?').run(id);
      return true;
    } catch (err) {
      console.error(`[ModelProfileService] Error deleting profile ${id}:`, err);
      return false;
    }
  }
}
