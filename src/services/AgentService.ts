import { getDatabase } from '../database';
import { AgentDefinition } from '../shared/types';
import { ModelProfileService } from './ModelProfileService';

export class AgentService {
  public static getAgents(): AgentDefinition[] {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM agent_definitions ORDER BY is_preset DESC, name ASC').all() as any[];

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon || 'Bot',
        systemPrompt: r.system_prompt,
        profileId: r.profile_id,
        isPreset: Boolean(r.is_preset),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      console.error('[AgentService] Error fetching agents:', err);
      return [];
    }
  }

  public static getAgentById(id: string): AgentDefinition | null {
    const agents = this.getAgents();
    return agents.find((a) => a.id === id) || null;
  }

  public static getDefaultAgent(): AgentDefinition | null {
    const agents = this.getAgents();
    return agents.find((a) => a.id === 'agent-architect') || agents[0] || null;
  }

  public static saveAgent(agent: Partial<AgentDefinition>): AgentDefinition {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = agent.id || `agent-custom-${Date.now()}`;
    const defaultProfile = ModelProfileService.getDefaultProfile();
    const profileId = agent.profileId || (defaultProfile ? defaultProfile.id : 'profile-default');

    const existing = db.prepare('SELECT id FROM agent_definitions WHERE id = ?').get(id);

    if (existing) {
      db.prepare(`
        UPDATE agent_definitions
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            icon = COALESCE(?, icon),
            system_prompt = COALESCE(?, system_prompt),
            profile_id = COALESCE(?, profile_id),
            updated_at = ?
        WHERE id = ?
      `).run(
        agent.name ?? null,
        agent.description ?? null,
        agent.icon ?? null,
        agent.systemPrompt ?? null,
        profileId,
        now,
        id
      );
    } else {
      db.prepare(`
        INSERT INTO agent_definitions (id, name, description, icon, system_prompt, profile_id, is_preset, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        agent.name || 'Custom Agent',
        agent.description || 'Custom user agent with tailored system instructions.',
        agent.icon || 'Bot',
        agent.systemPrompt || 'You are an AI coding assistant.',
        profileId,
        agent.isPreset ? 1 : 0,
        now,
        now
      );
    }

    return this.getAgentById(id)!;
  }

  public static deleteAgent(id: string): boolean {
    try {
      const db = getDatabase();
      const agent = this.getAgentById(id);
      if (!agent || agent.isPreset) {
        console.warn('[AgentService] Preset agents cannot be deleted.');
        return false;
      }

      db.prepare('DELETE FROM agent_definitions WHERE id = ?').run(id);
      return true;
    } catch (err) {
      console.error(`[AgentService] Error deleting agent ${id}:`, err);
      return false;
    }
  }
}
