import { create } from 'zustand';
import { AISettings, ModelProfile, AgentDefinition } from '../shared/types';
import { AIProviderStatus, AIModel } from '../ai/types';

export type SettingsCategory = 'general' | 'ai-providers' | 'model-profiles' | 'agents' | 'keyboard-shortcuts' | 'workspace' | 'about';

interface AISettingsStoreState {
  isSettingsOpen: boolean;
  activeCategory: SettingsCategory;
  aiSettings: AISettings;
  providerStatuses: AIProviderStatus[];
  availableModels: Record<string, AIModel[]>;
  modelProfiles: ModelProfile[];
  agents: AgentDefinition[];
  activeAgentId: string;
  isSafeStorageAvailable: boolean;
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
  saveProviderApiKey: (providerId: string, apiKey: string, mode?: 'safeStorage' | 'sessionOnly' | 'unencryptedOptIn') => Promise<boolean>;
  getProviderApiKey: (providerId: string) => Promise<string | null>;
  loadProfilesAndAgents: () => Promise<void>;
  saveModelProfile: (profile: Partial<ModelProfile>) => Promise<ModelProfile | null>;
  deleteModelProfile: (id: string) => Promise<boolean>;
  saveAgent: (agent: Partial<AgentDefinition>) => Promise<AgentDefinition | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  setActiveAgentId: (id: string) => void;
}

export const useAISettingsStore = create<AISettingsStoreState>((set, get) => ({
  isSettingsOpen: false,
  activeCategory: 'ai-providers',
  aiSettings: {
    activeProviderId: 'ollama',
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaActiveModel: 'qwen2.5:7b',
    enabledProviders: ['mock', 'ollama', 'openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'lmstudio', 'custom'],
    providersConfig: {},
    keyStorageMode: 'safeStorage',
  },
  providerStatuses: [],
  availableModels: {},
  modelProfiles: [],
  agents: [],
  activeAgentId: 'agent-architect',
  isSafeStorageAvailable: true,
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
        const secStatus = await window.craftedAPI.getAISecurityStatus();
        const profiles = await window.craftedAPI.getModelProfiles();
        const agentList = await window.craftedAPI.getAgents();

        set({
          aiSettings: settings,
          providerStatuses: statuses,
          isSafeStorageAvailable: secStatus.isSafeStorageAvailable,
          modelProfiles: profiles || [],
          agents: agentList || [],
          isLoading: false,
        });

        // Pre-fetch models for key providers
        await get().fetchModels('mock');
        await get().fetchModels('ollama');
        await get().fetchModels('openai');
        await get().fetchModels('anthropic');
        await get().fetchModels('gemini');
        await get().fetchModels('openrouter');
        await get().fetchModels('groq');
        await get().fetchModels('lmstudio');
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
        const result = (await window.craftedAPI.testAIConnection(providerId, baseUrl)) as {
          isAvailable?: boolean;
          success?: boolean;
          error?: string;
        };

        if (result.isAvailable || result.success) {
          set({ isTestingConnection: false, testError: null });
          await get().fetchStatuses();
          return true;
        } else {
          set({
            isTestingConnection: false,
            testError: result.error || 'Connection failed',
          });
          return false;
        }
      } catch (err: any) {
        set({ isTestingConnection: false, testError: err.message || 'Connection failed' });
        return false;
      }
    }
    set({ isTestingConnection: false, testError: 'API not available' });
    return false;
  },

  saveProviderApiKey: async (providerId: string, apiKey: string, mode?: 'safeStorage' | 'sessionOnly' | 'unencryptedOptIn') => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.saveAIProviderKey(providerId, apiKey, mode);
      if (ok) {
        await get().loadAISettings();
      }
      return ok;
    }
    return false;
  },

  getProviderApiKey: async (providerId: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      return window.craftedAPI.getAIProviderKey(providerId);
    }
    return null;
  },

  loadProfilesAndAgents: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const profiles = await window.craftedAPI.getModelProfiles();
      const agentList = await window.craftedAPI.getAgents();
      set({ modelProfiles: profiles || [], agents: agentList || [] });
    }
  },

  saveModelProfile: async (profile: Partial<ModelProfile>) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const result = await window.craftedAPI.saveModelProfile(profile);
      await get().loadProfilesAndAgents();
      return result;
    }
    return null;
  },

  deleteModelProfile: async (id: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.deleteModelProfile(id);
      if (ok) {
        await get().loadProfilesAndAgents();
      }
      return ok;
    }
    return false;
  },

  saveAgent: async (agent: Partial<AgentDefinition>) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const result = await window.craftedAPI.saveAgent(agent);
      await get().loadProfilesAndAgents();
      return result;
    }
    return null;
  },

  deleteAgent: async (id: string) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const ok = await window.craftedAPI.deleteAgent(id);
      if (ok) {
        await get().loadProfilesAndAgents();
      }
      return ok;
    }
    return false;
  },

  setActiveAgentId: (id: string) => set({ activeAgentId: id }),
}));
