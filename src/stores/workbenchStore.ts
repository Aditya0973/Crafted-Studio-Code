import { create } from 'zustand';
import { TabItem } from '../shared/types';
import { normalizePathKey } from './explorerStore';
import { useLayoutStore } from './layoutStore';
import { EditorManager } from '../services/EditorManager';

export interface ExternalFilePrompt {
  filePath: string;
  diskContent: string;
}

interface WorkbenchStoreState {
  currentProjectId: string | null;
  openTabs: TabItem[];
  activeTabPath: string | null;
  isLoadingSession: boolean;
  externalFilePrompt: ExternalFilePrompt | null;

  openFile: (filePath: string) => Promise<void>;
  closeTab: (filePath: string) => void;
  closeOtherTabs: (filePath: string) => void;
  selectTab: (filePath: string) => void;
  closeAllTabs: () => void;
  updateTabContent: (filePath: string, content: string) => void;
  saveActiveTab: () => Promise<boolean>;
  saveViewState: (filePath: string, viewState: unknown) => void;
  checkActiveFileExternalChanges: () => Promise<void>;
  reloadTabFromDisk: (filePath: string) => Promise<void>;
  dismissExternalPrompt: () => void;

  loadSessionForProject: (projectId: string | null) => Promise<void>;
  saveSession: () => void;
}

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function getFileExt(filePath: string): string {
  const extIndex = filePath.lastIndexOf('.');
  return extIndex !== -1 ? filePath.substring(extIndex).toLowerCase() : '';
}

let saveDebounceTimer: NodeJS.Timeout | null = null;

export const useWorkbenchStore = create<WorkbenchStoreState>((set, get) => ({
  currentProjectId: null,
  openTabs: [],
  activeTabPath: null,
  isLoadingSession: false,
  externalFilePrompt: null,

  openFile: async (filePath: string) => {
    if (!filePath) return;

    const { openTabs } = get();
    const key = normalizePathKey(filePath);

    console.log(`[MONACO_TRACE] 1. Explorer click / openFile() invoked`);
    console.log(`[MONACO_TRACE] 2. File path received: "${filePath}" (normalized: "${key}")`);

    useLayoutStore.getState().setPanelVisibility('editor', true);

    const existing = openTabs.find((t) => normalizePathKey(t.path) === key);
    if (existing) {
      console.log(`[MONACO_TRACE] Tab already open, selecting active tab: "${existing.path}"`);
      set({ activeTabPath: existing.path });
      get().saveSession();
      return;
    }

    const title = getFileName(filePath);
    const extension = getFileExt(filePath);
    let content = '';
    let updatedAtOnDisk = new Date().toISOString();

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const res = await window.craftedAPI.readFileText(filePath);
        content = res.content;
        const stats = await window.craftedAPI.getFileStats(filePath);
        if (stats) updatedAtOnDisk = stats.updatedAt;
      } catch (err) {
        console.error(`[workbenchStore] Error reading file for tab (${filePath}):`, err);
      }
    }

    console.log(`[MONACO_TRACE] 3. File content length read from disk: ${content.length} chars`);

    const newTab: TabItem = {
      id: filePath,
      path: filePath,
      title,
      editorId: 'monaco',
      extension,
      isDirty: false,
      content,
      originalContent: content,
      stateMetadata: {
        updatedAtOnDisk,
      },
    };

    set({
      openTabs: [...openTabs, newTab],
      activeTabPath: filePath,
    });

    get().saveSession();
  },

  closeTab: (filePath: string) => {
    const { openTabs, activeTabPath } = get();
    const key = normalizePathKey(filePath);

    EditorManager.getInstance().disposeModel(filePath);

    const nextTabs = openTabs.filter((t) => normalizePathKey(t.path) !== key);
    let nextActive = activeTabPath;

    if (activeTabPath && normalizePathKey(activeTabPath) === key) {
      if (nextTabs.length > 0) {
        const closedIndex = openTabs.findIndex((t) => normalizePathKey(t.path) === key);
        const newActiveIndex = Math.max(0, Math.min(closedIndex, nextTabs.length - 1));
        nextActive = nextTabs[newActiveIndex].path;
      } else {
        nextActive = null;
      }
    }

    set({
      openTabs: nextTabs,
      activeTabPath: nextActive,
    });

    if (nextTabs.length === 0) {
      useLayoutStore.getState().setPanelVisibility('editor', false);
    }

    get().saveSession();
  },

  closeOtherTabs: (filePath: string) => {
    const { openTabs } = get();
    const key = normalizePathKey(filePath);

    openTabs.forEach((tab) => {
      if (normalizePathKey(tab.path) !== key) {
        EditorManager.getInstance().disposeModel(tab.path);
      }
    });

    const keepTab = openTabs.find((t) => normalizePathKey(t.path) === key);

    if (keepTab) {
      set({
        openTabs: [keepTab],
        activeTabPath: keepTab.path,
      });
      get().saveSession();
    }
  },

  selectTab: (filePath: string) => {
    set({ activeTabPath: filePath });
    get().saveSession();
    get().checkActiveFileExternalChanges();
  },

  closeAllTabs: () => {
    EditorManager.getInstance().disposeAll();
    set({ openTabs: [], activeTabPath: null });
    useLayoutStore.getState().setPanelVisibility('editor', false);
    get().saveSession();
  },

  updateTabContent: (filePath: string, content: string) => {
    const { openTabs } = get();
    const key = normalizePathKey(filePath);

    const updatedTabs = openTabs.map((tab) => {
      if (normalizePathKey(tab.path) === key) {
        const isDirty = content !== (tab.originalContent ?? '');
        return {
          ...tab,
          content,
          isDirty,
        };
      }
      return tab;
    });

    set({ openTabs: updatedTabs });
    get().saveSession();
  },

  saveActiveTab: async (): Promise<boolean> => {
    const { activeTabPath, openTabs } = get();
    if (!activeTabPath) return false;

    const key = normalizePathKey(activeTabPath);
    const activeTab = openTabs.find((t) => normalizePathKey(t.path) === key);
    if (!activeTab) return false;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const contentToWrite = activeTab.content !== undefined ? activeTab.content : '';
        await window.craftedAPI.writeFileText(activeTab.path, contentToWrite);

        const stats = await window.craftedAPI.getFileStats(activeTab.path);
        const newDiskTime = stats ? stats.updatedAt : new Date().toISOString();

        const updatedTabs = openTabs.map((t) => {
          if (normalizePathKey(t.path) === key) {
            return {
              ...t,
              originalContent: contentToWrite,
              isDirty: false,
              stateMetadata: {
                ...t.stateMetadata,
                updatedAtOnDisk: newDiskTime,
              },
            };
          }
          return t;
        });

        set({ openTabs: updatedTabs });
        get().saveSession();
        return true;
      } catch (err) {
        console.error('[workbenchStore] Save error:', err);
        return false;
      }
    }
    return false;
  },

  saveViewState: (filePath: string, viewState: unknown) => {
    const { openTabs } = get();
    const key = normalizePathKey(filePath);

    let changed = false;
    const updatedTabs = openTabs.map((tab) => {
      if (normalizePathKey(tab.path) === key) {
        if (tab.stateMetadata?.viewState !== viewState) {
          changed = true;
          return {
            ...tab,
            stateMetadata: {
              ...tab.stateMetadata,
              viewState,
            },
          };
        }
      }
      return tab;
    });

    if (changed) {
      set({ openTabs: updatedTabs });
    }
  },

  checkActiveFileExternalChanges: async () => {
    const { activeTabPath, openTabs } = get();
    if (!activeTabPath || typeof window === 'undefined' || !window.craftedAPI) return;

    const key = normalizePathKey(activeTabPath);
    const activeTab = openTabs.find((t) => normalizePathKey(t.path) === key);
    if (!activeTab || !activeTab.stateMetadata?.updatedAtOnDisk) return;

    try {
      const stats = await window.craftedAPI.getFileStats(activeTab.path);
      if (stats && stats.updatedAt !== activeTab.stateMetadata.updatedAtOnDisk) {
        const res = await window.craftedAPI.readFileText(activeTab.path);
        if (res.content !== activeTab.content) {
          set({
            externalFilePrompt: {
              filePath: activeTab.path,
              diskContent: res.content,
            },
          });
        }
      }
    } catch {
      /* Skip check */
    }
  },

  reloadTabFromDisk: async (filePath: string) => {
    const { openTabs } = get();
    const key = normalizePathKey(filePath);

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const res = await window.craftedAPI.readFileText(filePath);
        const stats = await window.craftedAPI.getFileStats(filePath);
        const newDiskTime = stats ? stats.updatedAt : new Date().toISOString();

        const updatedTabs = openTabs.map((t) => {
          if (normalizePathKey(t.path) === key) {
            return {
              ...t,
              content: res.content,
              originalContent: res.content,
              isDirty: false,
              stateMetadata: {
                ...t.stateMetadata,
                updatedAtOnDisk: newDiskTime,
              },
            };
          }
          return t;
        });

        set({ openTabs: updatedTabs, externalFilePrompt: null });
        get().saveSession();
      } catch (err) {
        console.error('[workbenchStore] Reload from disk error:', err);
      }
    }
  },

  dismissExternalPrompt: () => set({ externalFilePrompt: null }),

  loadSessionForProject: async (projectId: string | null) => {
    // Clear any pending debounced save timer from the previous project
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }

    // Immediately dispose all Monaco models and reset state for target project
    EditorManager.getInstance().disposeAll();
    set({ currentProjectId: projectId, openTabs: [], activeTabPath: null });

    if (!projectId) {
      set({ isLoadingSession: false });
      return;
    }

    set({ isLoadingSession: true });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const session = await window.craftedAPI.getWorkbenchSession(projectId);

        // Concurrently read all open tab files for fast startup
        const tabPromises = (session.tabs || []).map(async (t) => {
          try {
            const fileRes = await window.craftedAPI.readFileText(t.path);
            const stats = await window.craftedAPI.getFileStats(t.path);
            return {
              ...t,
              editorId: 'monaco',
              content: fileRes.content,
              originalContent: fileRes.content,
              isDirty: false,
              stateMetadata: {
                ...t.stateMetadata,
                updatedAtOnDisk: stats ? stats.updatedAt : new Date().toISOString(),
              },
            } as TabItem;
          } catch {
            return null; // Skip missing/deleted files
          }
        });

        const loadedResults = await Promise.all(tabPromises);
        const loadedTabs = loadedResults.filter((t): t is TabItem => t !== null);

        set({
          openTabs: loadedTabs,
          activeTabPath: session.activeTabPath || (loadedTabs[0]?.path || null),
          isLoadingSession: false,
        });
      } catch (err) {
        console.error(`[workbenchStore] Error loading session for ${projectId}:`, err);
        set({ openTabs: [], activeTabPath: null, isLoadingSession: false });
      }
    } else {
      set({ isLoadingSession: false });
    }
  },

  saveSession: () => {
    const { currentProjectId, openTabs, activeTabPath } = get();
    if (!currentProjectId) return;

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        window.craftedAPI.saveWorkbenchSession(currentProjectId, activeTabPath, openTabs);
      }
    }, 400);
  },
}));
