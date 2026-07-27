import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from '../database';
import { SettingsService } from './SettingsService';
import { ChatService } from './ChatService';
import { Project, RecentProject, CreateProjectInput, ImportProjectInput, OpenProjectResult, ProjectConfig } from '../shared/types';
import { BlueprintRegistry } from '../blueprints/BlueprintRegistry';

export class ProjectService {
  public static calculateProgress(blueprintId: string, completedItems: string[]): number {
    const blueprint = BlueprintRegistry.getBlueprint(blueprintId);
    let totalItems = 0;
    const allItemIds = new Set<string>();

    for (const stage of blueprint.stages) {
      for (const item of stage.items) {
        totalItems++;
        allItemIds.add(item.id);
      }
    }

    if (totalItems === 0) return 0;
    const matchedCount = completedItems.filter((id) => allItemIds.has(id)).length;
    return Math.round((matchedCount / totalItems) * 100);
  }

  public static detectProjectType(projectPath: string): string {
    try {
      if (fs.existsSync(path.join(projectPath, 'pubspec.yaml'))) {
        return 'Flutter App';
      }
      if (fs.existsSync(path.join(projectPath, 'next.config.js')) || fs.existsSync(path.join(projectPath, 'next.config.mjs')) || fs.existsSync(path.join(projectPath, 'next.config.ts'))) {
        return 'Next.js App';
      }
      if (fs.existsSync(path.join(projectPath, 'package.json'))) {
        const raw = fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8');
        if (raw.includes('"electron"')) return 'Electron App';
        if (raw.includes('"react"')) return 'React App';
        return 'Node API';
      }
    } catch {
      // Fallthrough
    }
    return 'General Software';
  }

  public static async createProject(input: CreateProjectInput): Promise<Project> {
    const parentPath = path.resolve(path.normalize(input.parentPath));
    if (!fs.existsSync(parentPath)) {
      throw new Error(`Parent directory does not exist: ${parentPath}`);
    }

    const projectDirName = input.name.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
    const projectPath = path.resolve(path.join(parentPath, projectDirName));

    if (fs.existsSync(projectPath)) {
      throw new Error(`A folder already exists at: ${projectPath}`);
    }

    const blueprintId = input.blueprintId || 'blank';
    const blueprint = BlueprintRegistry.getBlueprint(blueprintId);
    const selectedModules = input.selectedModules || [];
    const description = input.description || '';
    const currentStage = input.currentStage || 'planning';
    const completedChecklistItems: string[] = [];

    // 1. Create Folder Hierarchy
    fs.mkdirSync(projectPath, { recursive: true });
    const subfolders = ['docs', 'assets', 'src'];
    for (const folder of subfolders) {
      fs.mkdirSync(path.join(projectPath, folder), { recursive: true });
    }

    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();

    // 2. Create project.json
    const config: ProjectConfig = {
      name: input.name,
      description,
      blueprintId,
      selectedModules,
      currentStage,
      completedChecklistItems,
      createdAt: now,
      updatedAt: now,
      template: input.template || blueprintId,
      version: '1.0.0',
      projectType: blueprint.displayName,
    };
    fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(config, null, 2), 'utf-8');

    // 3. Create memory.md
    const initialMemory = `# ${input.name} - Project Memory

## Blueprint Metadata
- Blueprint: ${blueprint.displayName} (${blueprint.primaryLanguage} / ${blueprint.framework})
- Description: ${description || 'No description provided.'}
- Selected Modules: ${selectedModules.length > 0 ? selectedModules.join(', ') : 'None'}

## Guided Workflow Status
- Current Stage: ${currentStage}
- Initial Progress: 0%

## Architecture & Decisions
- Created with Crafted Studio Blueprints engine.
`;
    fs.writeFileSync(path.join(projectPath, 'memory.md'), initialMemory, 'utf-8');

    // 4. Register in SQLite
    const modulesJson = JSON.stringify(selectedModules);
    const checklistJson = JSON.stringify(completedChecklistItems);
    const db = getDatabase();
    db.prepare(`
      INSERT INTO projects (id, name, path, created_at, updated_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items, is_removed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(path) DO UPDATE SET
        name = excluded.name,
        updated_at = excluded.updated_at,
        template = excluded.template,
        version = excluded.version,
        project_type = excluded.project_type,
        description = excluded.description,
        blueprint_id = excluded.blueprint_id,
        selected_modules = excluded.selected_modules,
        current_stage = excluded.current_stage,
        completed_checklist_items = excluded.completed_checklist_items,
        is_removed = 0
    `).run(
      projectId,
      input.name,
      projectPath,
      now,
      now,
      config.template,
      config.version,
      blueprint.displayName,
      description,
      blueprintId,
      modulesJson,
      currentStage,
      checklistJson
    );

    // 5. Initialize Conversation for Project
    await ChatService.getOrCreateConversation(projectId);

    // 6. Update Recent Projects & Active Project
    this.addRecentProject(projectId);
    SettingsService.setSetting('activeProjectId', projectId);

    return {
      id: projectId,
      name: input.name,
      path: projectPath,
      createdAt: now,
      updatedAt: now,
      template: config.template,
      version: config.version,
      projectType: blueprint.displayName,
      description,
      blueprintId,
      selectedModules,
      currentStage,
      completedChecklistItems,
      completionPercentage: 0,
    };
  }

  public static async openProject(projectPath?: string): Promise<OpenProjectResult> {
    if (!projectPath) {
      throw new Error('Project path must be provided');
    }

    const normalizedPath = path.resolve(path.normalize(projectPath));
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Project path does not exist: ${normalizedPath}`);
    }

    // Case 3 — Folder already open as active project
    const currentActive = await this.getActiveProject();
    if (currentActive && currentActive.path === normalizedPath) {
      return currentActive;
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // Case 1 — Existing SQLite database record for this path (whether is_removed = 0 or 1)
    const existingDbRecord = db
      .prepare('SELECT id, name, created_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items FROM projects WHERE path = ?')
      .get(normalizedPath) as {
        id: string;
        name: string;
        created_at: string;
        template: string;
        version: string;
        project_type: string;
        description?: string;
        blueprint_id?: string;
        selected_modules?: string;
        current_stage?: string;
        completed_checklist_items?: string;
      } | undefined;

    if (existingDbRecord) {
      // Restore soft-deleted project record and reactivate
      db.prepare('UPDATE projects SET is_removed = 0, updated_at = ? WHERE id = ?').run(now, existingDbRecord.id);

      let selectedModules: string[] = [];
      try { selectedModules = JSON.parse(existingDbRecord.selected_modules || '[]'); } catch { selectedModules = []; }

      let completedChecklistItems: string[] = [];
      try { completedChecklistItems = JSON.parse(existingDbRecord.completed_checklist_items || '[]'); } catch { completedChecklistItems = []; }

      const blueprintId = existingDbRecord.blueprint_id || 'blank';
      const blueprint = BlueprintRegistry.getBlueprint(blueprintId);
      const completionPercentage = this.calculateProgress(blueprintId, completedChecklistItems);

      await ChatService.getOrCreateConversation(existingDbRecord.id);
      this.addRecentProject(existingDbRecord.id);
      SettingsService.setSetting('activeProjectId', existingDbRecord.id);

      return {
        id: existingDbRecord.id,
        name: existingDbRecord.name,
        path: normalizedPath,
        createdAt: existingDbRecord.created_at || now,
        updatedAt: now,
        template: existingDbRecord.template || 'blank',
        version: existingDbRecord.version || '1.0.0',
        projectType: blueprint.displayName,
        description: existingDbRecord.description || '',
        blueprintId,
        selectedModules,
        currentStage: existingDbRecord.current_stage || 'planning',
        completedChecklistItems,
        completionPercentage,
      };
    }

    // Case 1b — Existing project.json in directory
    const projectJsonPath = path.join(normalizedPath, 'project.json');
    if (fs.existsSync(projectJsonPath)) {
      const raw = fs.readFileSync(projectJsonPath, 'utf-8');
      const config: ProjectConfig = JSON.parse(raw);
      const projectId = crypto.randomUUID();
      const blueprintId = config.blueprintId || 'blank';
      const blueprint = BlueprintRegistry.getBlueprint(blueprintId);
      const selectedModules = config.selectedModules || [];
      const description = config.description || '';
      const currentStage = config.currentStage || 'planning';
      const completedChecklistItems = config.completedChecklistItems || [];
      const completionPercentage = this.calculateProgress(blueprintId, completedChecklistItems);

      const modulesJson = JSON.stringify(selectedModules);
      const checklistJson = JSON.stringify(completedChecklistItems);

      db.prepare(`
        INSERT INTO projects (id, name, path, created_at, updated_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items, is_removed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(projectId, config.name || path.basename(normalizedPath), normalizedPath, config.createdAt || now, now, config.template || 'blank', config.version || '1.0.0', blueprint.displayName, description, blueprintId, modulesJson, currentStage, checklistJson);

      await ChatService.getOrCreateConversation(projectId);
      this.addRecentProject(projectId);
      SettingsService.setSetting('activeProjectId', projectId);

      return {
        id: projectId,
        name: config.name || path.basename(normalizedPath),
        path: normalizedPath,
        createdAt: config.createdAt || now,
        updatedAt: now,
        template: config.template || 'blank',
        version: config.version || '1.0.0',
        projectType: blueprint.displayName,
        description,
        blueprintId,
        selectedModules,
        currentStage,
        completedChecklistItems,
        completionPercentage,
      };
    }

    // Case 2 — Non-Crafted folder requiring wizard proposal
    const folderName = path.basename(normalizedPath);
    const detectedType = this.detectProjectType(normalizedPath);

    return {
      isImportRequired: true,
      projectPath: normalizedPath,
      folderName,
      detectedType,
    };
  }

  public static async importProject(input: ImportProjectInput): Promise<Project> {
    const normalizedPath = path.resolve(path.normalize(input.projectPath));
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Project path does not exist: ${normalizedPath}`);
    }

    const folderName = input.name || path.basename(normalizedPath);
    const blueprintId = input.blueprintId || 'blank';
    const blueprint = BlueprintRegistry.getBlueprint(blueprintId);
    const selectedModules = input.selectedModules || [];
    const description = input.description || '';
    const currentStage = 'planning';
    const completedChecklistItems: string[] = [];
    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();

    const config: ProjectConfig = {
      name: folderName,
      description,
      blueprintId,
      selectedModules,
      currentStage,
      completedChecklistItems,
      createdAt: now,
      updatedAt: now,
      template: input.template || 'imported',
      version: '1.0.0',
      projectType: blueprint.displayName,
    };
    fs.writeFileSync(path.join(normalizedPath, 'project.json'), JSON.stringify(config, null, 2), 'utf-8');

    const modulesJson = JSON.stringify(selectedModules);
    const checklistJson = JSON.stringify(completedChecklistItems);
    const db = getDatabase();
    db.prepare(`
      INSERT INTO projects (id, name, path, created_at, updated_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items, is_removed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(path) DO UPDATE SET
        name = excluded.name,
        updated_at = excluded.updated_at,
        template = excluded.template,
        version = excluded.version,
        project_type = excluded.project_type,
        description = excluded.description,
        blueprint_id = excluded.blueprint_id,
        selected_modules = excluded.selected_modules,
        current_stage = excluded.current_stage,
        completed_checklist_items = excluded.completed_checklist_items,
        is_removed = 0
    `).run(projectId, folderName, normalizedPath, now, now, config.template, config.version, blueprint.displayName, description, blueprintId, modulesJson, currentStage, checklistJson);

    await ChatService.getOrCreateConversation(projectId);
    this.addRecentProject(projectId);
    SettingsService.setSetting('activeProjectId', projectId);

    return {
      id: projectId,
      name: folderName,
      path: normalizedPath,
      createdAt: now,
      updatedAt: now,
      template: config.template,
      version: config.version,
      projectType: blueprint.displayName,
      description,
      blueprintId,
      selectedModules,
      currentStage,
      completedChecklistItems,
      completionPercentage: 0,
    };
  }

  public static async updateProjectWorkflow(
    projectId: string,
    update: { currentStage?: string; completedChecklistItems?: string[] }
  ): Promise<Project | null> {
    const db = getDatabase();
    const existing = db.prepare('SELECT id, name, path, created_at, updated_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items FROM projects WHERE id = ? AND is_removed = 0').get(projectId) as {
      id: string;
      name: string;
      path: string;
      created_at: string;
      updated_at: string;
      template: string;
      version: string;
      project_type: string;
      description?: string;
      blueprint_id?: string;
      selected_modules?: string;
      current_stage?: string;
      completed_checklist_items?: string;
    } | undefined;

    if (!existing) return null;

    const blueprintId = existing.blueprint_id || 'blank';
    const currentStage = update.currentStage !== undefined ? update.currentStage : (existing.current_stage || 'planning');

    let completedChecklistItems: string[] = [];
    if (update.completedChecklistItems !== undefined) {
      completedChecklistItems = update.completedChecklistItems;
    } else {
      try {
        completedChecklistItems = JSON.parse(existing.completed_checklist_items || '[]');
      } catch {
        completedChecklistItems = [];
      }
    }

    const now = new Date().toISOString();
    const checklistJson = JSON.stringify(completedChecklistItems);

    db.prepare(`
      UPDATE projects
      SET current_stage = ?, completed_checklist_items = ?, updated_at = ?
      WHERE id = ?
    `).run(currentStage, checklistJson, now, projectId);

    if (fs.existsSync(path.join(existing.path, 'project.json'))) {
      try {
        const raw = fs.readFileSync(path.join(existing.path, 'project.json'), 'utf-8');
        const parsed = JSON.parse(raw);
        parsed.currentStage = currentStage;
        parsed.completedChecklistItems = completedChecklistItems;
        parsed.updatedAt = now;
        fs.writeFileSync(path.join(existing.path, 'project.json'), JSON.stringify(parsed, null, 2), 'utf-8');
      } catch {
        /* Non-critical */
      }
    }

    return this.getActiveProject();
  }

  public static async switchProject(projectId: string): Promise<Project | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT id, name, path, created_at, updated_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items FROM projects WHERE id = ? AND is_removed = 0').get(projectId) as {
      id: string;
      name: string;
      path: string;
      created_at: string;
      updated_at: string;
      template: string;
      version: string;
      project_type: string;
      description?: string;
      blueprint_id?: string;
      selected_modules?: string;
      current_stage?: string;
      completed_checklist_items?: string;
    } | undefined;

    if (!row) return null;

    const isMissing = !fs.existsSync(row.path);
    let selectedModules: string[] = [];
    try { selectedModules = JSON.parse(row.selected_modules || '[]'); } catch { selectedModules = []; }

    let completedChecklistItems: string[] = [];
    try { completedChecklistItems = JSON.parse(row.completed_checklist_items || '[]'); } catch { completedChecklistItems = []; }

    const blueprintId = row.blueprint_id || 'blank';
    const completionPercentage = this.calculateProgress(blueprintId, completedChecklistItems);

    this.addRecentProject(projectId);
    SettingsService.setSetting('activeProjectId', projectId);

    return {
      id: row.id,
      name: row.name,
      path: row.path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      template: row.template,
      version: row.version,
      projectType: row.project_type || 'General',
      description: row.description || '',
      blueprintId,
      selectedModules,
      currentStage: row.current_stage || 'planning',
      completedChecklistItems,
      completionPercentage,
      isMissing,
    };
  }

  public static async getActiveProject(): Promise<Project | null> {
    try {
      const db = getDatabase();
      const settings = SettingsService.getSettings();
      const activeId = settings.activeProjectId;

      if (!activeId) return null;

      const row = db.prepare('SELECT id, name, path, created_at, updated_at, template, version, project_type, description, blueprint_id, selected_modules, current_stage, completed_checklist_items FROM projects WHERE id = ? AND is_removed = 0').get(activeId) as {
        id: string;
        name: string;
        path: string;
        created_at: string;
        updated_at: string;
        template: string;
        version: string;
        project_type: string;
        description?: string;
        blueprint_id?: string;
        selected_modules?: string;
        current_stage?: string;
        completed_checklist_items?: string;
      } | undefined;

      if (!row) return null;

      const isMissing = !fs.existsSync(row.path);
      let selectedModules: string[] = [];
      try { selectedModules = JSON.parse(row.selected_modules || '[]'); } catch { selectedModules = []; }

      let completedChecklistItems: string[] = [];
      try { completedChecklistItems = JSON.parse(row.completed_checklist_items || '[]'); } catch { completedChecklistItems = []; }

      const blueprintId = row.blueprint_id || 'blank';
      const completionPercentage = this.calculateProgress(blueprintId, completedChecklistItems);

      return {
        id: row.id,
        name: row.name,
        path: row.path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        template: row.template,
        version: row.version,
        projectType: row.project_type || 'General',
        description: row.description || '',
        blueprintId,
        selectedModules,
        currentStage: row.current_stage || 'planning',
        completedChecklistItems,
        completionPercentage,
        isMissing,
      };
    } catch (err) {
      console.error('[ProjectService] Error getting active project:', err);
      return null;
    }
  }

  public static async getRecentProjects(): Promise<RecentProject[]> {
    try {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT r.id, r.project_id, p.name, p.path, r.last_opened_at
        FROM recent_projects r
        JOIN projects p ON r.project_id = p.id
        WHERE p.is_removed = 0
        ORDER BY r.last_opened_at DESC
        LIMIT 10
      `).all() as {
        id: string;
        project_id: string;
        name: string;
        path: string;
        last_opened_at: string;
      }[];

      return rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        path: r.path,
        lastOpenedAt: r.last_opened_at,
      }));
    } catch (err) {
      console.error('[ProjectService] Error getting recent projects:', err);
      return [];
    }
  }

  public static async deleteProject(projectId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      // Safe Soft Delete: Set is_removed = 1 and clear from recent list
      db.prepare('DELETE FROM recent_projects WHERE project_id = ?').run(projectId);
      db.prepare('UPDATE projects SET is_removed = 1 WHERE id = ?').run(projectId);

      const settings = SettingsService.getSettings();
      if (settings.activeProjectId === projectId) {
        SettingsService.setSetting('activeProjectId', null);
      }
      return true;
    } catch (err) {
      console.error('[ProjectService] Error removing project from workspace:', err);
      return false;
    }
  }

  private static addRecentProject(projectId: string): void {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM recent_projects WHERE project_id = ?').get(projectId) as { id: string } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE recent_projects SET last_opened_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(existing.id);
    } else {
      const recentId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO recent_projects (id, project_id, last_opened_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(recentId, projectId);
    }
  }
}
