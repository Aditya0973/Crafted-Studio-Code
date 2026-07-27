import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from '../database';
import { TabItem, WorkbenchSession, EditorType, TabStateMetadata } from '../shared/types';
import { EditorRegistry } from './EditorRegistry';

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function getFileExt(filePath: string): string {
  const extIndex = filePath.lastIndexOf('.');
  return extIndex !== -1 ? filePath.substring(extIndex).toLowerCase() : '';
}

export class WorkbenchSessionService {
  public static getSession(projectId: string): WorkbenchSession {
    if (!projectId) {
      return { projectId: '', activeTabPath: null, tabs: [] };
    }

    try {
      const db = getDatabase();

      // Query active tab path
      const sessionRow = db
        .prepare('SELECT active_tab_path FROM workbench_sessions WHERE project_id = ?')
        .get(projectId) as { active_tab_path: string | null } | undefined;

      let activeTabPath = sessionRow?.active_tab_path || null;

      // Query persisted open tabs sorted by tab_order ASC
      const tabRows = db
        .prepare(
          `SELECT path, editor_id, tab_order, state_metadata
           FROM workbench_tabs
           WHERE project_id = ?
           ORDER BY tab_order ASC`
        )
        .all(projectId) as Array<{
        path: string;
        editor_id: string;
        tab_order: number;
        state_metadata: string;
      }>;

      const validTabs: TabItem[] = [];

      for (const row of tabRows) {
        const normalized = path.resolve(path.normalize(row.path));

        // Part 5 — File Validation: verify file exists on disk
        if (fs.existsSync(normalized)) {
          let metadata: TabStateMetadata = {};
          try {
            metadata = JSON.parse(row.state_metadata || '{}');
          } catch {
            metadata = {};
          }

          const editorId = (row.editor_id || EditorRegistry.getEditorForFile(normalized)) as EditorType;

          validTabs.push({
            id: normalized,
            path: normalized,
            title: getFileName(normalized),
            editorId,
            extension: getFileExt(normalized),
            stateMetadata: metadata,
          });
        }
      }

      // Verify activeTabPath exists among validTabs
      if (activeTabPath) {
        const normalizedActive = path.resolve(path.normalize(activeTabPath));
        const existsInValid = validTabs.some(
          (t) => path.resolve(path.normalize(t.path)) === normalizedActive
        );

        if (!existsInValid) {
          activeTabPath = validTabs.length > 0 ? validTabs[0].path : null;
        } else {
          activeTabPath = normalizedActive;
        }
      } else if (validTabs.length > 0) {
        activeTabPath = validTabs[0].path;
      }

      return {
        projectId,
        activeTabPath,
        tabs: validTabs,
      };
    } catch (err) {
      console.error(`[WorkbenchSessionService] Error loading session for ${projectId}:`, err);
      return { projectId, activeTabPath: null, tabs: [] };
    }
  }

  public static saveSession(
    projectId: string,
    activeTabPath: string | null,
    tabs: TabItem[]
  ): boolean {
    if (!projectId) return false;

    try {
      const db = getDatabase();

      const normalizedActive = activeTabPath ? path.resolve(path.normalize(activeTabPath)) : null;

      // Upsert session
      const existingSession = db
        .prepare('SELECT id FROM workbench_sessions WHERE project_id = ?')
        .get(projectId) as { id: string } | undefined;

      if (existingSession) {
        db.prepare(
          'UPDATE workbench_sessions SET active_tab_path = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?'
        ).run(normalizedActive, projectId);
      } else {
        db.prepare(
          'INSERT INTO workbench_sessions (id, project_id, active_tab_path) VALUES (?, ?, ?)'
        ).run(crypto.randomUUID(), projectId, normalizedActive);
      }

      // Delete existing tabs for this project and re-insert
      db.prepare('DELETE FROM workbench_tabs WHERE project_id = ?').run(projectId);

      const insertTab = db.prepare(`
        INSERT INTO workbench_tabs (id, project_id, path, editor_id, tab_order, state_metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      tabs.forEach((tab, index) => {
        const normalized = path.resolve(path.normalize(tab.path));
        const stateMetaJson = JSON.stringify(tab.stateMetadata || {});

        insertTab.run(
          crypto.randomUUID(),
          projectId,
          normalized,
          tab.editorId,
          index,
          stateMetaJson
        );
      });

      return true;
    } catch (err) {
      console.error(`[WorkbenchSessionService] Error saving session for ${projectId}:`, err);
      return false;
    }
  }
}
