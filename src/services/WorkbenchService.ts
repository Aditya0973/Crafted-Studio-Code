import crypto from 'crypto';
import { getDatabase } from '../database';
import { WorkbenchSession, TabItem } from '../shared/types';

export class WorkbenchService {
  public static async getSession(projectId: string): Promise<WorkbenchSession> {
    if (!projectId) {
      return { projectId: '', activeTabPath: null, tabs: [] };
    }

    try {
      const db = getDatabase();
      const sessionRow = db.prepare('SELECT active_tab_path FROM workbench_sessions WHERE project_id = ?').get(projectId) as { active_tab_path: string | null } | undefined;

      const tabRows = db.prepare(`
        SELECT id, path, editor_id, tab_order, state_metadata
        FROM workbench_tabs
        WHERE project_id = ?
        ORDER BY tab_order ASC
      `).all(projectId) as {
        id: string;
        path: string;
        editor_id: string;
        tab_order: number;
        state_metadata: string;
      }[];

      const tabs: TabItem[] = tabRows.map((r) => {
        let meta = {};
        try { meta = JSON.parse(r.state_metadata || '{}'); } catch { meta = {}; }
        const filename = r.path.split(/[/\\]/).pop() || 'Untitled';
        const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';

        return {
          id: r.id,
          path: r.path,
          title: filename,
          editorId: (r.editor_id || 'monaco') as any,
          extension: ext,
          stateMetadata: meta,
        };
      });

      return {
        projectId,
        activeTabPath: sessionRow ? sessionRow.active_tab_path : (tabs[0]?.path || null),
        tabs,
      };
    } catch (err) {
      console.error('[WorkbenchService] Error loading session:', err);
      return { projectId, activeTabPath: null, tabs: [] };
    }
  }

  public static async saveSession(projectId: string, activeTabPath: string | null, tabs: TabItem[]): Promise<boolean> {
    if (!projectId) return false;

    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      // Upsert Session
      const existingSession = db.prepare('SELECT id FROM workbench_sessions WHERE project_id = ?').get(projectId) as { id: string } | undefined;
      if (existingSession) {
        db.prepare('UPDATE workbench_sessions SET active_tab_path = ?, updated_at = ? WHERE project_id = ?').run(activeTabPath, now, projectId);
      } else {
        const sessionId = crypto.randomUUID();
        db.prepare('INSERT INTO workbench_sessions (id, project_id, active_tab_path, updated_at) VALUES (?, ?, ?, ?)').run(sessionId, projectId, activeTabPath, now);
      }

      // Clear existing tabs & write new tab list
      db.prepare('DELETE FROM workbench_tabs WHERE project_id = ?').run(projectId);

      const insertStmt = db.prepare(`
        INSERT INTO workbench_tabs (id, project_id, path, editor_id, tab_order, state_metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      tabs.forEach((tab, index) => {
        const tabId = tab.id || crypto.randomUUID();
        const metaJson = JSON.stringify(tab.stateMetadata || {});
        insertStmt.run(tabId, projectId, tab.path, tab.editorId || 'monaco', index, metaJson, now);
      });

      return true;
    } catch (err) {
      console.error('[WorkbenchService] Error saving session:', err);
      return false;
    }
  }
}
