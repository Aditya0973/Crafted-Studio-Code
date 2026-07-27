import { create } from 'zustand';
import { Project, RecentProject, CreateProjectInput, ImportProposal, ImportProjectInput } from '../shared/types';
import { useExplorerStore } from './explorerStore';
import { useChatStore } from './chatStore';
import { useWorkbenchStore } from './workbenchStore';

interface ProjectStoreState {
  activeProject: Project | null;
  recentProjects: RecentProject[];
  isLoading: boolean;
  isCreateDialogOpen: boolean;
  isRecentMenuOpen: boolean;
  importProposal: ImportProposal | null;
  error: string | null;

  setCreateDialogOpen: (open: boolean) => void;
  setRecentMenuOpen: (open: boolean) => void;
  setImportProposal: (proposal: ImportProposal | null) => void;
  setError: (error: string | null) => void;

  fetchActiveProject: () => Promise<void>;
  fetchRecentProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project | null>;
  openProject: (path?: string) => Promise<Project | null>;
  confirmImport: (inputName?: string) => Promise<Project | null>;
  switchProject: (projectId: string) => Promise<Project | null>;
  deleteProjectRecord: (projectId: string) => Promise<void>;
  updateWorkflow: (update: { currentStage?: string; completedChecklistItems?: string[] }) => Promise<Project | null>;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  activeProject: null,
  recentProjects: [],
  isLoading: true,
  isCreateDialogOpen: false,
  isRecentMenuOpen: false,
  importProposal: null,
  error: null,

  setCreateDialogOpen: (open: boolean) => set({ isCreateDialogOpen: open, error: null }),
  setRecentMenuOpen: (open: boolean) => set({ isRecentMenuOpen: open }),
  setImportProposal: (proposal: ImportProposal | null) => set({ importProposal: proposal, error: null }),
  setError: (error: string | null) => set({ error }),

  fetchActiveProject: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const active = await window.craftedAPI.getActiveProject();
        set({ activeProject: active, isLoading: false });

        if (active && !active.isMissing) {
          useExplorerStore.getState().loadProjectTree(active.path, active.id);
          useChatStore.getState().loadConversationForProject(active.id);
          useWorkbenchStore.getState().loadSessionForProject(active.id);
        }
      } catch (err) {
        console.error('[projectStore] Error loading active project:', err);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  fetchRecentProjects: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const recents = await window.craftedAPI.getRecentProjects();
        set({ recentProjects: recents });
      } catch (err) {
        console.error('[projectStore] Error loading recent projects:', err);
      }
    }
  },

  createProject: async (input: CreateProjectInput) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        set({ error: null });
        const project = await window.craftedAPI.createProject(input);
        set({ activeProject: project, isCreateDialogOpen: false });
        await get().fetchRecentProjects();

        if (project) {
          useExplorerStore.getState().loadProjectTree(project.path, project.id);
          useChatStore.getState().loadConversationForProject(project.id);
          useWorkbenchStore.getState().loadSessionForProject(project.id);
        }

        return project;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create project';
        set({ error: msg });
        console.error('[projectStore] Create project error:', err);
        return null;
      }
    }
    return null;
  },

  openProject: async (path?: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        set({ error: null });
        const result = await window.craftedAPI.openProject(path);
        if (!result) return null;

        if ('isImportRequired' in result && result.isImportRequired) {
          set({ importProposal: result, isRecentMenuOpen: false });
          return null;
        }

        const project = result as Project;
        set({ activeProject: project, isRecentMenuOpen: false, importProposal: null });
        await get().fetchRecentProjects();

        if (project && !project.isMissing) {
          useExplorerStore.getState().loadProjectTree(project.path, project.id);
          useChatStore.getState().loadConversationForProject(project.id);
          useWorkbenchStore.getState().loadSessionForProject(project.id);
        }

        return project;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open project';
        set({ error: msg });
        console.error('[projectStore] Open project error:', err);
        return null;
      }
    }
    return null;
  },

  confirmImport: async (inputName?: string) => {
    const { importProposal } = get();
    if (!importProposal) return null;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        set({ error: null });
        const input: ImportProjectInput = {
          projectPath: importProposal.projectPath,
          name: inputName || importProposal.folderName,
        };
        const project = await window.craftedAPI.importProject(input);
        set({ activeProject: project, importProposal: null, isRecentMenuOpen: false });
        await get().fetchRecentProjects();

        if (project && !project.isMissing) {
          useExplorerStore.getState().loadProjectTree(project.path, project.id);
          useChatStore.getState().loadConversationForProject(project.id);
          useWorkbenchStore.getState().loadSessionForProject(project.id);
        }

        return project;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to import project';
        set({ error: msg });
        console.error('[projectStore] Confirm import error:', err);
        return null;
      }
    }
    return null;
  },

  switchProject: async (projectId: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        set({ error: null });
        const project = await window.craftedAPI.switchProject(projectId);
        if (project) {
          set({ activeProject: project, isRecentMenuOpen: false });
          await get().fetchRecentProjects();

          if (!project.isMissing) {
            useExplorerStore.getState().loadProjectTree(project.path, project.id);
            useChatStore.getState().loadConversationForProject(project.id);
            useWorkbenchStore.getState().loadSessionForProject(project.id);
          }
        }
        return project;
      } catch (err) {
        console.error('[projectStore] Switch project error:', err);
        return null;
      }
    }
    return null;
  },

  deleteProjectRecord: async (projectId: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        await window.craftedAPI.deleteProject(projectId);
        if (get().activeProject?.id === projectId) {
          set({ activeProject: null });
        }
        await get().fetchRecentProjects();
      } catch (err) {
        console.error('[projectStore] Delete project error:', err);
      }
    }
  },

  updateWorkflow: async (update: { currentStage?: string; completedChecklistItems?: string[] }) => {
    const { activeProject } = get();
    if (!activeProject) return null;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const updated = await window.craftedAPI.updateProjectWorkflow(activeProject.id, update);
        if (updated) {
          set({ activeProject: updated });
        }
        return updated;
      } catch (err) {
        console.error('[projectStore] Update workflow error:', err);
      }
    }
    return null;
  },
}));
