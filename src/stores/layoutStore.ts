import { create } from 'zustand';
import { WorkspacePanelId } from '../services/WorkspaceLayoutEngine';

interface FocusSnapshot {
  panelVisibility: Record<WorkspacePanelId, boolean>;
  panelOrder: WorkspacePanelId[];
  panelProportions: Record<WorkspacePanelId, number>;
}

interface LayoutStoreState {
  // Panel Visibility (ON / OFF)
  panelVisibility: Record<WorkspacePanelId, boolean>;
  // Dynamic Panel Order for Drag & Drop Reordering
  panelOrder: WorkspacePanelId[];
  // Relative Size Proportions (sum = 1.0)
  panelProportions: Record<WorkspacePanelId, number>;
  // Focus Mode (100% width on double click)
  focusModePanel: WorkspacePanelId | null;
  snapshotBeforeFocus: FocusSnapshot | null;

  // Bottom Panel State
  bottomPanelHeight: number;
  bottomPanelCollapsed: boolean;
  bottomPanelActiveTab: 'terminal' | 'problems' | 'output';

  isInitialized: boolean;

  // Global Actions
  togglePanelVisibility: (id: WorkspacePanelId) => void;
  setPanelVisibility: (id: WorkspacePanelId, visible: boolean) => void;
  toggleFocusMode: (id: WorkspacePanelId) => void;
  reorderPanels: (newOrder: WorkspacePanelId[]) => void;
  setPanelProportions: (proportions: Record<WorkspacePanelId, number>) => void;

  // Bottom Panel Actions
  setBottomPanelHeight: (height: number) => void;
  setBottomPanelActiveTab: (tab: 'terminal' | 'problems' | 'output') => void;
  toggleBottomPanel: (targetTab?: 'terminal' | 'problems' | 'output') => void;
  openBottomPanel: (targetTab?: 'terminal' | 'problems' | 'output') => void;
  closeBottomPanel: () => void;

  resetLayout: () => void;
  initializeLayout: () => Promise<void>;
  saveLayoutState: () => void;
}

const DEFAULT_PANEL_ORDER: WorkspacePanelId[] = ['explorer', 'chat', 'editor', 'tooldock'];

const DEFAULT_PANEL_VISIBILITY: Record<WorkspacePanelId, boolean> = {
  explorer: true,
  chat: true,
  editor: true,
  tooldock: true,
};

const DEFAULT_PANEL_PROPORTIONS: Record<WorkspacePanelId, number> = {
  explorer: 0.2,
  chat: 0.25,
  editor: 0.35,
  tooldock: 0.2,
};

const MIN_BOTTOM = 120;
const getMaxBottom = () => {
  if (typeof window !== 'undefined') {
    return Math.max(200, Math.floor(window.innerHeight * 0.7));
  }
  return 600;
};

let debounceTimer: NodeJS.Timeout | null = null;

export const useLayoutStore = create<LayoutStoreState>((set, get) => ({
  panelVisibility: DEFAULT_PANEL_VISIBILITY,
  panelOrder: DEFAULT_PANEL_ORDER,
  panelProportions: DEFAULT_PANEL_PROPORTIONS,
  focusModePanel: null,
  snapshotBeforeFocus: null,

  bottomPanelHeight: 240,
  bottomPanelCollapsed: true,
  bottomPanelActiveTab: 'terminal',
  isInitialized: false,

  togglePanelVisibility: (id: WorkspacePanelId) => {
    set((state) => {
      // Exit Focus Mode on manual toggle
      const nextFocus = state.focusModePanel === id ? null : state.focusModePanel;
      const nextVis = { ...state.panelVisibility, [id]: !state.panelVisibility[id] };
      return { panelVisibility: nextVis, focusModePanel: nextFocus };
    });
    get().saveLayoutState();
  },

  setPanelVisibility: (id: WorkspacePanelId, visible: boolean) => {
    set((state) => ({
      panelVisibility: { ...state.panelVisibility, [id]: visible },
    }));
    get().saveLayoutState();
  },

  // 100% Focus Mode double click toggle with exact snapshot restoration
  toggleFocusMode: (id: WorkspacePanelId) => {
    set((state) => {
      if (state.focusModePanel === id) {
        // Restore exact snapshot before focus mode was triggered
        if (state.snapshotBeforeFocus) {
          return {
            focusModePanel: null,
            panelVisibility: state.snapshotBeforeFocus.panelVisibility,
            panelOrder: state.snapshotBeforeFocus.panelOrder,
            panelProportions: state.snapshotBeforeFocus.panelProportions,
            snapshotBeforeFocus: null,
          };
        }
        return { focusModePanel: null };
      }

      // Enter focus mode: save current layout snapshot
      const snapshot: FocusSnapshot = {
        panelVisibility: { ...state.panelVisibility },
        panelOrder: [...state.panelOrder],
        panelProportions: { ...state.panelProportions },
      };

      return {
        focusModePanel: id,
        snapshotBeforeFocus: snapshot,
      };
    });
    get().saveLayoutState();
  },

  reorderPanels: (newOrder: WorkspacePanelId[]) => {
    set({ panelOrder: newOrder });
    get().saveLayoutState();
  },

  setPanelProportions: (proportions: Record<WorkspacePanelId, number>) => {
    set({ panelProportions: proportions });
    get().saveLayoutState();
  },

  setBottomPanelHeight: (height: number) => {
    const maxH = getMaxBottom();
    const clamped = Math.max(MIN_BOTTOM, Math.min(maxH, height));
    set({ bottomPanelHeight: clamped });
    get().saveLayoutState();
  },

  setBottomPanelActiveTab: (tab: 'terminal' | 'problems' | 'output') => {
    set({ bottomPanelActiveTab: tab });
    get().saveLayoutState();
  },

  toggleBottomPanel: (targetTab = 'terminal') => {
    set((state) => {
      if (state.bottomPanelCollapsed) {
        return { bottomPanelCollapsed: false, bottomPanelActiveTab: targetTab };
      }
      if (state.bottomPanelActiveTab !== targetTab) {
        return { bottomPanelActiveTab: targetTab };
      }
      return { bottomPanelCollapsed: true };
    });
    get().saveLayoutState();
  },

  openBottomPanel: (targetTab = 'terminal') => {
    set({ bottomPanelCollapsed: false, bottomPanelActiveTab: targetTab });
    get().saveLayoutState();
  },

  closeBottomPanel: () => {
    set({ bottomPanelCollapsed: true });
    get().saveLayoutState();
  },

  resetLayout: () => {
    set({
      panelVisibility: DEFAULT_PANEL_VISIBILITY,
      panelOrder: DEFAULT_PANEL_ORDER,
      panelProportions: DEFAULT_PANEL_PROPORTIONS,
      focusModePanel: null,
      snapshotBeforeFocus: null,
      bottomPanelCollapsed: true,
    });
    get().saveLayoutState();
  },

  initializeLayout: async () => {
    if (get().isInitialized) return;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const state = await window.craftedAPI.getWindowState();
        set({
          panelVisibility: (state.panelVisibility as any) || DEFAULT_PANEL_VISIBILITY,
          panelOrder: (state.panelOrder as any) || DEFAULT_PANEL_ORDER,
          panelProportions: (state.panelProportions as any) || DEFAULT_PANEL_PROPORTIONS,
          focusModePanel: (state.focusModePanel as WorkspacePanelId | null) || null,
          bottomPanelHeight: state.bottomPanelHeight ?? 240,
          bottomPanelCollapsed: state.bottomPanelCollapsed !== undefined ? !!state.bottomPanelCollapsed : true,
          bottomPanelActiveTab: state.bottomPanelActiveTab || 'terminal',
          isInitialized: true,
        });
      } catch (err) {
        console.error('[layoutStore] Error loading global layout state:', err);
        set({ isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },

  saveLayoutState: () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        const state = get();
        window.craftedAPI.saveLayoutState({
          panelVisibility: state.panelVisibility,
          panelOrder: state.panelOrder,
          panelProportions: state.panelProportions,
          focusModePanel: state.focusModePanel,
          bottomPanelHeight: state.bottomPanelHeight,
          bottomPanelCollapsed: state.bottomPanelCollapsed,
          bottomPanelActiveTab: state.bottomPanelActiveTab,
        });
      }
    }, 400);
  },
}));
