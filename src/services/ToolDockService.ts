import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { shell, dialog, BrowserWindow } from 'electron';
import { getDatabase } from '../database';
import { ToolDockItem, CreateToolInput, UpdateToolInput, ToolType } from '../shared/types/toolDock';
import { Win32WindowService } from './Win32WindowService';
import { AppDiscoveryService } from './AppDiscoveryService';


export interface DiscoveredApp {
  id: string;
  name: string;
  target: string;
  icon: string;
  badge?: string;
  type: ToolType;
  isInstalled?: boolean;
}

export class ToolDockService {
  public static getTools(): ToolDockItem[] {
    try {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT 
          id, name, type, target, icon, 
          custom_icon_url as customIconUrl, 
          badge, 
          item_order as itemOrder, 
          open_in_builtin_browser as openInBuiltInBrowser, 
          created_at as createdAt, 
          updated_at as updatedAt 
        FROM tool_dock_items 
        ORDER BY item_order ASC
      `).all() as any[];

      return rows.map((r) => ({
        ...r,
        openInBuiltInBrowser: Boolean(r.openInBuiltInBrowser),
      }));
    } catch (err) {
      console.error('[ToolDockService] Error fetching tools from DB:', err);
      return [];
    }
  }

  public static addTool(input: CreateToolInput): ToolDockItem {
    const db = getDatabase();
    const id = `tool-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const maxOrderRow = db.prepare('SELECT MAX(item_order) as maxOrder FROM tool_dock_items').get() as { maxOrder: number | null };
    const itemOrder = input.itemOrder ?? ((maxOrderRow?.maxOrder ?? -1) + 1);

    const newItem: ToolDockItem = {
      id,
      name: input.name,
      type: input.type,
      target: input.target,
      icon: input.icon || (input.type === 'website' ? 'Globe' : 'AppWindow'),
      customIconUrl: input.customIconUrl || undefined,
      badge: input.badge || undefined,
      itemOrder,
      openInBuiltInBrowser: input.openInBuiltInBrowser ?? true,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO tool_dock_items (id, name, type, target, icon, custom_icon_url, badge, item_order, open_in_builtin_browser, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newItem.id,
      newItem.name,
      newItem.type,
      newItem.target,
      newItem.icon,
      newItem.customIconUrl || null,
      newItem.badge || null,
      newItem.itemOrder,
      newItem.openInBuiltInBrowser ? 1 : 0,
      newItem.createdAt,
      newItem.updatedAt
    );

    return newItem;
  }

  public static updateTool(id: string, update: UpdateToolInput): ToolDockItem | null {
    try {
      const db = getDatabase();
      // FIX ROOT CAUSE: Pass `id` parameter to `.get(id)`!
      const existing = db.prepare('SELECT id FROM tool_dock_items WHERE id = ?').get(id);
      if (!existing) {
        console.warn(`[ToolDockService] Tool with id "${id}" not found`);
        return null;
      }

      const now = new Date().toISOString();
      const fields: string[] = ['updated_at = ?'];
      const params: any[] = [now];

      if (update.name !== undefined) { fields.push('name = ?'); params.push(update.name); }
      if (update.type !== undefined) { fields.push('type = ?'); params.push(update.type); }
      if (update.target !== undefined) { fields.push('target = ?'); params.push(update.target); }
      if (update.icon !== undefined) { fields.push('icon = ?'); params.push(update.icon); }
      if (update.customIconUrl !== undefined) { fields.push('custom_icon_url = ?'); params.push(update.customIconUrl || null); }
      if (update.badge !== undefined) { fields.push('badge = ?'); params.push(update.badge || null); }
      if (update.itemOrder !== undefined) { fields.push('item_order = ?'); params.push(update.itemOrder); }
      if (update.openInBuiltInBrowser !== undefined) { fields.push('open_in_builtin_browser = ?'); params.push(update.openInBuiltInBrowser ? 1 : 0); }

      params.push(id);
      const sql = `UPDATE tool_dock_items SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...params);

      const tools = this.getTools();
      return tools.find((t) => t.id === id) || null;
    } catch (err) {
      console.error(`[ToolDockService] Error updating tool "${id}":`, err);
      return null;
    }
  }

  public static deleteTool(id: string): boolean {
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM tool_dock_items WHERE id = ?').run(id);
      return true;
    } catch (err) {
      console.error(`[ToolDockService] Error deleting tool ${id}:`, err);
      return false;
    }
  }

  public static reorderTools(orderedIds: string[]): boolean {
    try {
      const db = getDatabase();
      const stmt = db.prepare('UPDATE tool_dock_items SET item_order = ? WHERE id = ?');
      orderedIds.forEach((id, index) => {
        stmt.run(index, id);
      });
      return true;
    } catch (err) {
      console.error('[ToolDockService] Error reordering tools:', err);
      return false;
    }
  }

  public static async launchTool(target: string, type: ToolType, toolName?: string): Promise<{ success: boolean; error?: string }> {
    if (!target) return { success: false, error: 'Target URL or application path is required' };

    try {
      if (type === 'website') {
        const url = target.startsWith('http://') || target.startsWith('https://') ? target : `https://${target}`;
        await shell.openExternal(url);
        return { success: true };
      }

      // If toolName wasn't passed, try looking up tool name from DB
      let nameHint = toolName;
      if (!nameHint) {
        const db = getDatabase();
        const row = db.prepare('SELECT name FROM tool_dock_items WHERE target = ? LIMIT 1').get(target) as { name: string } | undefined;
        if (row) nameHint = row.name;
      }

      // 1. Check for URI Scheme (figma://, vscode://, chatgpt://, postman://, etc.)
      const isUriScheme = target.includes('://');
      if (isUriScheme) {
        await shell.openExternal(target);
      } else if (target.toLowerCase().startsWith('shell:appsfolder')) {
        // 2. Check for Microsoft Store / UWP Shell Apps Folder target (shell:AppsFolder\...)
        const errNotice = await shell.openPath(target);
        if (errNotice) {
          try {
            await shell.openExternal(target);
          } catch {
            return { success: false, error: `Could not launch Store App "${target}". ${errNotice}` };
          }
        }
      } else {
        // 3. Executable File Path Launching
        const errorStr = await shell.openPath(target);
        if (errorStr) {
          console.warn(`[ToolDockService] shell.openPath returned notice for "${target}":`, errorStr);
          try {
            await shell.openExternal(target);
          } catch {
            return { success: false, error: `Could not launch application at "${target}". ${errorStr}` };
          }
        }
      }

      // 4. Trigger Win32 Workspace Manager Snapping for ALL Desktop Apps
      console.log(`[ToolDockService] Launch succeeded. Triggering Workspace Manager snapping for target: "${target}", toolName: "${nameHint}"`);
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        Win32WindowService.pollAndSnapWindow(target, nameHint, mainWindow);
      }

      return { success: true };

    } catch (err) {
      console.error('[ToolDockService] Launch failed:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }


  public static async selectExecutable(mainWindow?: BrowserWindow | null): Promise<string | null> {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Application Executable, Shortcut, or App Package',
      properties: ['openFile'],
      filters: [
        { name: 'Applications & Executables', extensions: ['exe', 'cmd', 'bat', 'lnk', 'app', 'com'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }

  // Real Dynamic Discovery via AppDiscoveryService (NVIDIA App Style)
  public static async getDiscoveredApps(): Promise<DiscoveredApp[]> {
    return AppDiscoveryService.scanInstalledApps();
  }
}

