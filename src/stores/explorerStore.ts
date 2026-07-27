import { create } from 'zustand';
import { TreeNode } from '../shared/types';

interface ExplorerStoreState {
  rootNode: TreeNode | null;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  isLoading: boolean;
  searchQuery: string;
  currentProjectPath: string | null;
  currentProjectId: string | null;

  setSearchQuery: (query: string) => void;
  selectNode: (path: string | null) => void;
  toggleExpanded: (path: string) => void;
  loadProjectTree: (projectPath: string, projectId: string) => Promise<void>;
  refreshTree: () => Promise<void>;
}

let saveExpandedTimer: NodeJS.Timeout | null = null;

// Helper to normalize path comparison across Windows drive letters and slashes
export function normalizePathKey(p: string): string {
  if (!p) return '';
  return p.replace(/\\/g, '/').toLowerCase();
}

export const useExplorerStore = create<ExplorerStoreState>((set, get) => ({
  rootNode: null,
  expandedPaths: new Set<string>(),
  selectedPath: null,
  isLoading: false,
  searchQuery: '',
  currentProjectPath: null,
  currentProjectId: null,

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  selectNode: (path: string | null) => set({ selectedPath: path }),

  toggleExpanded: (rawPath: string) => {
    const { expandedPaths, currentProjectId } = get();
    const key = normalizePathKey(rawPath);
    const next = new Set(expandedPaths);

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    set({ expandedPaths: next });

    // Debounced persistence to SQLite
    if (currentProjectId && typeof window !== 'undefined' && window.craftedAPI) {
      if (saveExpandedTimer) clearTimeout(saveExpandedTimer);
      saveExpandedTimer = setTimeout(() => {
        window.craftedAPI.saveExpandedPaths(currentProjectId, Array.from(next));
      }, 500);
    }
  },

  loadProjectTree: async (projectPath: string, projectId: string) => {
    if (!projectPath) {
      set({ rootNode: null, isLoading: false, currentProjectPath: null, currentProjectId: null });
      return;
    }

    set({ isLoading: true, currentProjectPath: projectPath, currentProjectId: projectId });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const [tree, savedExpanded] = await Promise.all([
          window.craftedAPI.scanExplorerTree(projectPath),
          window.craftedAPI.getExpandedPaths(projectId),
        ]);

        const expandedSet = new Set<string>();
        if (Array.isArray(savedExpanded)) {
          savedExpanded.forEach((p) => expandedSet.add(normalizePathKey(p)));
        }

        // Automatically expand root node if not explicitly saved
        if (tree) {
          expandedSet.add(normalizePathKey(tree.path));
        }

        set({
          rootNode: tree,
          expandedPaths: expandedSet,
          isLoading: false,
        });
      } catch (err) {
        console.error('[explorerStore] Error loading explorer tree:', err);
        set({ rootNode: null, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  refreshTree: async () => {
    const { currentProjectPath, currentProjectId, loadProjectTree } = get();
    if (currentProjectPath && currentProjectId) {
      await loadProjectTree(currentProjectPath, currentProjectId);
    }
  },
}));
