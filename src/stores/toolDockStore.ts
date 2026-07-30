import { create } from 'zustand';
import { ToolDockItem, CreateToolInput, UpdateToolInput } from '../shared/types/toolDock';

interface ToolDockState {
  tools: ToolDockItem[];
  activeToolId: string | null;
  isLoading: boolean;
  isModalOpen: boolean;
  editingTool: ToolDockItem | null;
  launchStatus: { toolId: string; success: boolean; error?: string } | null;

  // Actions
  loadTools: () => Promise<void>;
  setActiveTool: (toolId: string) => Promise<void>;
  addTool: (input: CreateToolInput) => Promise<ToolDockItem | null>;
  updateTool: (id: string, update: UpdateToolInput) => Promise<ToolDockItem | null>;
  deleteTool: (id: string) => Promise<boolean>;
  reorderTools: (orderedIds: string[]) => Promise<void>;
  moveTool: (id: string, direction: 'left' | 'right') => Promise<void>;
  openAddModal: () => void;
  openEditModal: (tool: ToolDockItem) => void;
  closeModal: () => void;
  clearLaunchStatus: () => void;
}

export const useToolDockStore = create<ToolDockState>((set, get) => ({
  tools: [],
  activeToolId: null,
  isLoading: false,
  isModalOpen: false,
  editingTool: null,
  launchStatus: null,

  loadTools: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        const items = await window.craftedAPI.getToolDockItems();
        set({ tools: items, isLoading: false });

        // Ensure activeToolId is valid
        const currentActive = get().activeToolId;
        if (!currentActive || !items.some((t) => t.id === currentActive)) {
          if (items.length > 0) {
            set({ activeToolId: items[0].id });
          }
        }
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('[toolDockStore] Failed to load tools:', err);
      set({ isLoading: false });
    }
  },

  setActiveTool: async (toolId: string) => {
    const tool = get().tools.find((t) => t.id === toolId);
    set({ activeToolId: toolId, launchStatus: null });

    if (tool && tool.type === 'desktop_app') {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        const res = await window.craftedAPI.launchTool(tool.target, 'desktop_app', tool.name);

        if (!res.success) {
          set({ launchStatus: { toolId, success: false, error: res.error } });
        } else {
          set({ launchStatus: { toolId, success: true } });
        }
      }
    }
  },

  addTool: async (input: CreateToolInput) => {
    if (typeof window === 'undefined' || !window.craftedAPI) return null;
    try {
      const newItem = await window.craftedAPI.addToolDockItem(input);
      if (newItem) {
        set({ isModalOpen: false, editingTool: null, activeToolId: newItem.id });
        // Re-sync tools directly from SQLite
        await get().loadTools();

        if (newItem.type === 'desktop_app') {
          get().setActiveTool(newItem.id);
        }
        return newItem;
      }
    } catch (err) {
      console.error('[toolDockStore] Error adding tool:', err);
    }
    return null;
  },

  updateTool: async (id: string, update: UpdateToolInput) => {
    if (typeof window === 'undefined' || !window.craftedAPI) return null;
    try {
      const updated = await window.craftedAPI.updateToolDockItem(id, update);
      if (updated) {
        set({ isModalOpen: false, editingTool: null });
        await get().loadTools();
        return updated;
      }
    } catch (err) {
      console.error(`[toolDockStore] Error updating tool ${id}:`, err);
    }
    return null;
  },

  deleteTool: async (id: string) => {
    if (typeof window === 'undefined' || !window.craftedAPI) return false;
    try {
      const success = await window.craftedAPI.deleteToolDockItem(id);
      if (success) {
        set({ isModalOpen: false, editingTool: null });
        await get().loadTools();
        return true;
      }
    } catch (err) {
      console.error(`[toolDockStore] Error deleting tool ${id}:`, err);
    }
    return false;
  },

  reorderTools: async (orderedIds: string[]) => {
    if (typeof window === 'undefined' || !window.craftedAPI) return;
    try {
      await window.craftedAPI.reorderToolDockItems(orderedIds);
      await get().loadTools();
    } catch (err) {
      console.error('[toolDockStore] Error reordering tools:', err);
    }
  },

  moveTool: async (id: string, direction: 'left' | 'right') => {
    const { tools, reorderTools } = get();
    const currentIndex = tools.findIndex((t) => t.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tools.length) return;

    const newTools = [...tools];
    const [moved] = newTools.splice(currentIndex, 1);
    newTools.splice(targetIndex, 0, moved);

    const orderedIds = newTools.map((t) => t.id);
    await reorderTools(orderedIds);
  },

  openAddModal: () => set({ isModalOpen: true, editingTool: null }),
  openEditModal: (tool: ToolDockItem) => set({ isModalOpen: true, editingTool: tool }),
  closeModal: () => set({ isModalOpen: false, editingTool: null }),
  clearLaunchStatus: () => set({ launchStatus: null }),
}));
