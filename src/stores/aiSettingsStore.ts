import { create } from 'zustand';
import { AISettings } from '../shared/types';
import { AIProviderStatus, AIModel } from '../ai/types';

export type SettingsCategory = 'general' | 'ai-providers' | 'keyboard-shortcuts' | 'workspace' | 'about';

interface AISettingsStoreState {
  isSettingsOpen: boolean;
  activeCategory: SettingsCategory;
  aiSettings: AISettings;
  providerStatuses: AIProviderStatus[];
  availableModels: Record<string, AIModel[]>;
  isLoading: boolean;
  isTestingConnection: boolean;
  testError: string | null;

  setSettingsOpen: (open: boolean) => void;
  setActiveCategory: (cat: SettingsCategory) => void;
  loadAISettings: () => Promise<void>;
  saveAISettings: (settings: Partial<AISettings>) => Promise<boolean>;
  fetchStatuses: () => Promise<void>;
  fetchModels: (providerId: string) => Promise<void>;
  testConnection: (providerId: string, baseUrl?: string) => Promise<boolean>;
}

export const useAISettingsStore = create<AISettingsStoreState>((set, get) => ({
  isSettingsOpen: false,
  activeCategory: 'ai-providers',
  aiSettings: {
    activeProviderId: 'mock',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaActiveModel: '',
    enabledProviders: ['mock', 'ollama'],
  },
  providerStatuses: [],
  availableModels: {},
  isLoading: true,
  isTestingConnection: false,
  testError: null,

  setSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
    if (open) {
      get().loadAISettings();
    }
  },

  setActiveCategory: (cat: SettingsCategory) => set({ activeCategory: cat }),

  loadAISettings: async () => {
    set({ isLoading: true });
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const settings = await window.craftedAPI.getAISettings();
        const statuses = (await window.craftedAPI.getAIStatuses()) as AIProviderStatus[];

        set({
          aiSettings: settings,
          providerStatuses: statuses,
          isLoading: false,
        });

        // Pre-fetch models for enabled providers
        await get().fetchModels('mock');
        await get().fetchModels('ollama');
      } catch (err) {
        console.error('[aiSettingsStore] Error loading AI settings:', err);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  saveAISettings: async (newSettings: Partial<AISettings>) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const ok = await window.craftedAPI.saveAISettings(newSettings);
        if (ok) {
          const updated = await window.craftedAPI.getAISettings();
          set({ aiSettings: updated });
          await get().fetchStatuses();
        }
        return ok;
      } catch (err) {
        console.error('[aiSettingsStore] Error saving AI settings:', err);
        return false;
      }
    }
    return false;
  },

  fetchStatuses: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const statuses = (await window.craftedAPI.getAIStatuses()) as AIProviderStatus[];
        set({ providerStatuses: statuses });
      } catch (err) {
        console.error('[aiSettingsStore] Error fetching statuses:', err);
      }
    }
  },

  fetchModels: async (providerId: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const models = (await window.craftedAPI.listAIModels(providerId)) as AIModel[];
        set((state) => ({
          availableModels: {
            ...state.availableModels,
            [providerId]: models,
          },
        }));
      } catch (err) {
        console.error(`[aiSettingsStore] Error fetching models for ${providerId}:`, err);
      }
    }
  },

  testConnection: async (providerId: string, baseUrl?: string) => {
    set({ isTestingConnection: true, testError: null });
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const result = await window.craftedAPI.testAIConnection(providerId, baseUrl);
        set({
          isTestingConnection: false,
          testError: result.isAvailable ? null : result.error || 'Connection failed',
        });
        await get().fetchStatuses();
        await get().fetchModels(providerId);
        return result.isAvailable;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection test failed';
        set({ isTestingConnection: false, testError: msg });
        return false;
      }
    }
    set({ isTestingConnection: false });
    return false;
  },
}));
