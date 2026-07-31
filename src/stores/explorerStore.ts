import { create } from 'zustand';
import { TreeNode } from '../shared/types';
import { useWorkbenchStore } from './workbenchStore';

export interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode | null;
}

export interface CreateItemModalState {
  isOpen: boolean;
  parentPath: string;
  type: 'file' | 'folder';
}

export interface DeleteConfirmModalState {
  isOpen: boolean;
  targetPath: string;
  itemName: string;
}

interface ExplorerStoreState {
  rootNode: TreeNode | null;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  isLoading: boolean;
  searchQuery: string;
  currentProjectPath: string | null;
  currentProjectId: string | null;
  renameInputPath: string | null;
  contextMenu: ContextMenuState | null;
  createModal: CreateItemModalState | null;
  deleteConfirmModal: DeleteConfirmModalState | null;

  setSearchQuery: (query: string) => void;
  selectNode: (path: string | null) => void;
  toggleExpanded: (path: string) => void;
  setRenameInputPath: (path: string | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setCreateModal: (modal: CreateItemModalState | null) => void;
  setDeleteConfirmModal: (modal: DeleteConfirmModalState | null) => void;
  loadProjectTree: (projectPath: string, projectId: string) => Promise<void>;
  refreshTree: () => Promise<void>;

  // CRUD Actions
  createFile: (parentPath: string, fileName: string) => Promise<boolean>;
  createFolder: (parentPath: string, folderName: string) => Promise<boolean>;
  renameNode: (oldPath: string, newName: string) => Promise<boolean>;
  deleteNode: (targetPath: string) => Promise<boolean>;
  duplicateNode: (targetPath: string) => Promise<boolean>;
}

let saveExpandedTimer: NodeJS.Timeout | null = null;

// Helper to normalize path comparison across Windows drive letters and slashes
export function normalizePathKey(p: string): string {
  if (!p) return '';
  return p.replace(/\\/g, '/').toLowerCase();
}

// Helper to ensure target is a directory path, stripping filename if a file was selected
export function resolveDirectoryPath(targetPath: string): string {
  if (!targetPath) return '';
  const clean = targetPath.trim();
  const lastSep = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
  const lastDot = clean.lastIndexOf('.');

  // If path contains an extension after last separator, it's a file path -> return parent dir
  if (lastDot > lastSep && lastDot < clean.length - 1) {
    return lastSep > 0 ? clean.substring(0, lastSep) : clean;
  }

  return clean;
}

export const useExplorerStore = create<ExplorerStoreState>((set, get) => ({
  rootNode: null,
  expandedPaths: new Set<string>(),
  selectedPath: null,
  isLoading: false,
  searchQuery: '',
  currentProjectPath: null,
  currentProjectId: null,
  renameInputPath: null,
  contextMenu: null,
  createModal: null,
  deleteConfirmModal: null,

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  selectNode: (path: string | null) => set({ selectedPath: path }),
  setRenameInputPath: (path: string | null) => set({ renameInputPath: path }),
  setContextMenu: (menu: ContextMenuState | null) => set({ contextMenu: menu }),
  setCreateModal: (modal: CreateItemModalState | null) => set({ createModal: modal }),
  setDeleteConfirmModal: (modal: DeleteConfirmModalState | null) => set({ deleteConfirmModal: modal }),

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

  createFile: async (parentPath: string, fileName: string) => {
    if (!fileName || !fileName.trim()) return false;
    const cleanName = fileName.trim();

    // Resolve clean directory path (strips filename if a file was selected in explorer)
    const dir = resolveDirectoryPath(parentPath);
    const sep = dir.includes('\\') ? '\\' : '/';
    const filePath = `${dir}${dir.endsWith(sep) ? '' : sep}${cleanName}`;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.createFile(filePath, '');
      if (ok) {
        await get().refreshTree();
        get().selectNode(filePath);
        useWorkbenchStore.getState().openFile(filePath);
        return true;
      }
    }
    return false;
  },

  createFolder: async (parentPath: string, folderName: string) => {
    if (!folderName || !folderName.trim()) return false;
    const cleanName = folderName.trim();

    // Resolve clean directory path (strips filename if a file was selected in explorer)
    const dir = resolveDirectoryPath(parentPath);
    const sep = dir.includes('\\') ? '\\' : '/';
    const folderPath = `${dir}${dir.endsWith(sep) ? '' : sep}${cleanName}`;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.createFolder(folderPath);
      if (ok) {
        await get().refreshTree();
        get().toggleExpanded(dir);
        get().selectNode(folderPath);
        return true;
      }
    }
    return false;
  },

  renameNode: async (oldPath: string, newName: string) => {
    if (!newName || !newName.trim()) return false;
    const cleanName = newName.trim();

    const normalizedOld = oldPath.replace(/\\/g, '/');
    const parts = normalizedOld.split('/');
    parts.pop();
    const parentDir = parts.join('/');
    const isWindows = oldPath.includes('\\');
    const newPath = isWindows ? `${parentDir.replace(/\//g, '\\')}\\${cleanName}` : `${parentDir}/${cleanName}`;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.renamePath(oldPath, newPath);
      if (ok) {
        // Update active tab path in workbench if open
        const wb = useWorkbenchStore.getState();
        if (wb.activeTabPath && normalizePathKey(wb.activeTabPath) === normalizePathKey(oldPath)) {
          wb.openFile(newPath);
        }
        await get().refreshTree();
        get().selectNode(newPath);
        return true;
      }
    }
    return false;
  },

  deleteNode: async (targetPath: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.trashItem(targetPath);
      if (ok) {
        const wb = useWorkbenchStore.getState();
        if (wb.activeTabPath && normalizePathKey(wb.activeTabPath) === normalizePathKey(targetPath)) {
          wb.closeTab(targetPath);
        }
        await get().refreshTree();
        set({ selectedPath: null, deleteConfirmModal: null });
        return true;
      }
    }
    return false;
  },

  duplicateNode: async (targetPath: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const copyPath = await window.craftedAPI.duplicatePath(targetPath);
      if (copyPath) {
        await get().refreshTree();
        get().selectNode(copyPath);
        return true;
      }
    }
    return false;
  },
}));
