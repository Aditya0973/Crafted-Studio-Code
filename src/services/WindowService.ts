import { BrowserWindow } from 'electron';
import { getDatabase } from '../database';
import { WindowState } from '../shared/types';

export class WindowService {
  public static getSavedState(): WindowState {
    try {
      const db = getDatabase();
      const row = db.prepare(`
        SELECT width, height, x, y, is_maximized,
               panel_visibility, panel_order, panel_proportions, focus_mode_panel,
               bottom_panel_height, bottom_panel_collapsed, bottom_panel_active_tab,
               left_sidebar_width, right_sidebar_width, left_collapsed, right_collapsed, center_split_ratio, chat_collapsed, workbench_collapsed
        FROM window_state
        WHERE id = 1
      `).get() as {
        width: number;
        height: number;
        x: number | null;
        y: number | null;
        is_maximized: number;
        panel_visibility: string | null;
        panel_order: string | null;
        panel_proportions: string | null;
        focus_mode_panel: string | null;
        bottom_panel_height: number | null;
        bottom_panel_collapsed: number | null;
        bottom_panel_active_tab: string | null;
        left_sidebar_width: number;
        right_sidebar_width: number;
        left_collapsed: number;
        right_collapsed: number;
        center_split_ratio: number;
        chat_collapsed: number;
        workbench_collapsed: number;
      } | undefined;

      if (!row) {
        return {
          width: 1280,
          height: 800,
          isMaximized: false,
          panelVisibility: { explorer: true, chat: true, editor: true, tooldock: true },
          panelOrder: ['explorer', 'chat', 'editor', 'tooldock'],
          panelProportions: { explorer: 0.2, chat: 0.25, editor: 0.35, tooldock: 0.2 },
          focusModePanel: null,
          bottomPanelHeight: 240,
          bottomPanelCollapsed: true,
          bottomPanelActiveTab: 'terminal',
        };
      }

      let panelVisibility = undefined;
      let panelOrder = undefined;
      let panelProportions = undefined;

      try {
        if (row.panel_visibility) panelVisibility = JSON.parse(row.panel_visibility);
        if (row.panel_order) panelOrder = JSON.parse(row.panel_order);
        if (row.panel_proportions) panelProportions = JSON.parse(row.panel_proportions);
      } catch (e) {
        console.error('[WindowService] Failed to parse JSON layout state:', e);
      }

      return {
        width: row.width || 1280,
        height: row.height || 800,
        x: row.x ?? undefined,
        y: row.y ?? undefined,
        isMaximized: !!row.is_maximized,
        panelVisibility,
        panelOrder,
        panelProportions,
        focusModePanel: row.focus_mode_panel || null,
        bottomPanelHeight: row.bottom_panel_height ?? 240,
        bottomPanelCollapsed: row.bottom_panel_collapsed !== null ? !!row.bottom_panel_collapsed : true,
        bottomPanelActiveTab: (row.bottom_panel_active_tab as any) || 'terminal',
        leftSidebarWidth: row.left_sidebar_width || 260,
        rightSidebarWidth: row.right_sidebar_width || 320,
        leftCollapsed: !!row.left_collapsed,
        rightCollapsed: !!row.right_collapsed,
        centerSplitRatio: row.center_split_ratio ?? 0.5,
        chatCollapsed: !!row.chat_collapsed,
        workbenchCollapsed: !!row.workbench_collapsed,
      };
    } catch (err) {
      console.error('[WindowService] Error loading window state:', err);
      return {
        width: 1280,
        height: 800,
        isMaximized: false,
        panelVisibility: { explorer: true, chat: true, editor: true, tooldock: true },
        panelOrder: ['explorer', 'chat', 'editor', 'tooldock'],
        panelProportions: { explorer: 0.2, chat: 0.25, editor: 0.35, tooldock: 0.2 },
        focusModePanel: null,
        bottomPanelHeight: 240,
        bottomPanelCollapsed: true,
        bottomPanelActiveTab: 'terminal',
      };
    }
  }

  public static saveState(window: BrowserWindow): void {
    if (window.isDestroyed()) return;

    try {
      const isMaximized = window.isMaximized();
      if (isMaximized) {
        const db = getDatabase();
        db.prepare('UPDATE window_state SET is_maximized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run();
        return;
      }

      const bounds = window.getBounds();
      const db = getDatabase();
      db.prepare(`
        UPDATE window_state
        SET width = ?, height = ?, x = ?, y = ?, is_maximized = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(bounds.width, bounds.height, bounds.x, bounds.y);
    } catch (err) {
      console.error('[WindowService] Error saving window bounds:', err);
    }
  }

  public static saveLayoutState(state: Partial<WindowState>): boolean {
    try {
      const db = getDatabase();
      const current = this.getSavedState();

      const visibilityJson = state.panelVisibility !== undefined ? JSON.stringify(state.panelVisibility) : (current.panelVisibility ? JSON.stringify(current.panelVisibility) : null);
      const orderJson = state.panelOrder !== undefined ? JSON.stringify(state.panelOrder) : (current.panelOrder ? JSON.stringify(current.panelOrder) : null);
      const proportionsJson = state.panelProportions !== undefined ? JSON.stringify(state.panelProportions) : (current.panelProportions ? JSON.stringify(current.panelProportions) : null);
      const focusMode = state.focusModePanel !== undefined ? state.focusModePanel : current.focusModePanel;

      const bottomHeight = state.bottomPanelHeight ?? current.bottomPanelHeight ?? 240;
      const bottomCollapsed = state.bottomPanelCollapsed !== undefined ? (state.bottomPanelCollapsed ? 1 : 0) : (current.bottomPanelCollapsed ? 1 : 0);
      const bottomTab = state.bottomPanelActiveTab || current.bottomPanelActiveTab || 'terminal';

      db.prepare(`
        UPDATE window_state
        SET panel_visibility = ?,
            panel_order = ?,
            panel_proportions = ?,
            focus_mode_panel = ?,
            bottom_panel_height = ?,
            bottom_panel_collapsed = ?,
            bottom_panel_active_tab = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(
        visibilityJson,
        orderJson,
        proportionsJson,
        focusMode,
        bottomHeight,
        bottomCollapsed,
        bottomTab
      );

      return true;
    } catch (err) {
      console.error('[WindowService] Error saving layout state:', err);
      return false;
    }
  }
}
