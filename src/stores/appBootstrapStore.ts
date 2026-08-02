import { create } from 'zustand';
import { useProjectStore } from './projectStore';
import { useAISettingsStore } from './aiSettingsStore';

export interface BootstrapStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
}

interface AppBootstrapState {
  isBootstrapComplete: boolean;
  steps: BootstrapStep[];
  currentStepIndex: number;
  error: string | null;

  runBootstrap: () => Promise<void>;
}

export const useAppBootstrapStore = create<AppBootstrapState>((set, get) => ({
  isBootstrapComplete: false,
  steps: [
    { id: 'db', label: 'Initializing SQLite database...', status: 'pending' },
    { id: 'settings', label: 'Loading application settings...', status: 'pending' },
    { id: 'providers', label: 'Loading AI providers & models...', status: 'pending' },
    { id: 'project', label: 'Restoring project workspace...', status: 'pending' },
    { id: 'ready', label: 'Opening Crafted Studio...', status: 'pending' },
  ],
  currentStepIndex: 0,
  error: null,

  runBootstrap: async () => {
    if (get().isBootstrapComplete) return;

    const updateStep = (id: string, status: BootstrapStep['status']) => {
      set((state) => ({
        steps: state.steps.map((s) => (s.id === id ? { ...s, status } : s)),
      }));
    };

    try {
      // Step 1: Database
      updateStep('db', 'loading');
      await new Promise((r) => setTimeout(r, 60));
      updateStep('db', 'done');

      // Step 2: Settings & AI Providers Handshake via IPC
      updateStep('settings', 'loading');
      updateStep('providers', 'loading');

      if (typeof window !== 'undefined' && window.craftedAPI) {
        const bootstrapData = await window.craftedAPI.getBootstrapState();

        // Synchronize Project Store
        if (bootstrapData.activeProject) {
          useProjectStore.setState({
            activeProject: bootstrapData.activeProject,
            recentProjects: bootstrapData.recentProjects,
            isLoading: false,
          });
        } else {
          useProjectStore.setState({
            recentProjects: bootstrapData.recentProjects,
            isLoading: false,
          });
        }

        // Synchronize AI Settings Store
        useAISettingsStore.setState({
          aiSettings: bootstrapData.aiSettings,
          providerStatuses: bootstrapData.providerStatuses as any,
          modelProfiles: bootstrapData.modelProfiles || [],
          agents: bootstrapData.agents || [],
          activeAgentId: bootstrapData.agents?.[0]?.id || 'agent-architect',
          isLoading: false,
        });

        updateStep('settings', 'done');
        updateStep('providers', 'done');

        // Step 4: Restoring project tree & session if active project exists
        updateStep('project', 'loading');
        if (bootstrapData.activeProject && !bootstrapData.activeProject.isMissing) {
          await useProjectStore.getState().fetchActiveProject();
        }
        updateStep('project', 'done');
      } else {
        updateStep('settings', 'done');
        updateStep('providers', 'done');
        updateStep('project', 'done');
      }

      // Step 5: Ready
      updateStep('ready', 'loading');
      await new Promise((r) => setTimeout(r, 80));
      updateStep('ready', 'done');

      set({ isBootstrapComplete: true });
    } catch (err) {
      console.error('[appBootstrapStore] Bootstrap error:', err);
      const msg = err instanceof Error ? err.message : 'Application bootstrap failed';
      set({ error: msg, isBootstrapComplete: true });
    }
  },
}));
