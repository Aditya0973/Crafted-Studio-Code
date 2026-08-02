import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  AlertTriangle,
  Check,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Key,
  Globe,
  Cpu,
  Layers,
} from 'lucide-react';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { ProviderConfigData } from '../../shared/types';

interface ProviderCardDef {
  id: string;
  name: string;
  category: 'local' | 'cloud';
  description: string;
  icon: React.ReactNode;
  defaultBaseUrl?: string;
  requiresApiKey: boolean;
}

const PROVIDERS_META: ProviderCardDef[] = [
  {
    id: 'ollama',
    name: 'Ollama Local AI',
    category: 'local',
    description: 'Local LLM engine for open-weights models (Llama 3, Mistral, Qwen, DeepSeek).',
    icon: <Bot className="h-4 w-4 text-cyan-400" />,
    defaultBaseUrl: 'http://127.0.0.1:11434',
    requiresApiKey: false,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    category: 'local',
    description: 'Local OpenAI-compatible server running LLMs on GPU/CPU.',
    icon: <Cpu className="h-4 w-4 text-emerald-400" />,
    defaultBaseUrl: 'http://127.0.0.1:1234/v1',
    requiresApiKey: false,
  },
  {
    id: 'mock',
    name: 'Mock Local Provider',
    category: 'local',
    description: 'Simulates AI responses locally for testing without network calls or API keys.',
    icon: <Sparkles className="h-4 w-4 text-crafted-brand-rust" />,
    requiresApiKey: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'cloud',
    description: 'GPT-4o, GPT-4o Mini, o3-mini reasoning models.',
    icon: <Globe className="h-4 w-4 text-green-400" />,
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'cloud',
    description: 'Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus models.',
    icon: <Layers className="h-4 w-4 text-amber-400" />,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'cloud',
    description: 'Gemini 2.0 Flash, Gemini 1.5 Pro multimodal models.',
    icon: <Sparkles className="h-4 w-4 text-blue-400" />,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'cloud',
    description: 'Unified API routing for Claude, DeepSeek V3, Llama 3.3, and 200+ models.',
    icon: <Globe className="h-4 w-4 text-purple-400" />,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    category: 'cloud',
    description: 'Ultra-fast LPU inference for Llama 3.3 70B and DeepSeek R1 Distill.',
    icon: <Cpu className="h-4 w-4 text-orange-400" />,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    category: 'cloud',
    description: 'Connect to any OpenAI-compatible API endpoint.',
    icon: <Server className="h-4 w-4 text-indigo-400" />,
    requiresApiKey: true,
  },
];

export const AIProvidersSettings: React.FC = () => {
  const {
    aiSettings,
    providerStatuses,
    availableModels,
    isSafeStorageAvailable,
    isTestingConnection,
    testError,
    saveAISettings,
    testConnection,
    fetchModels,
    saveProviderApiKey,
    getProviderApiKey,
  } = useAISettingsStore();

  const activeProviderId = aiSettings.activeProviderId || 'ollama';
  const [selectedConfigProviderId, setSelectedConfigProviderId] = useState<string>(activeProviderId);

  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyStorageModeInput, setKeyStorageModeInput] = useState<'safeStorage' | 'sessionOnly' | 'unencryptedOptIn'>('safeStorage');
  const [unencryptedOptIn, setUnencryptedOptIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const activeMeta = PROVIDERS_META.find((p) => p.id === selectedConfigProviderId) || PROVIDERS_META[0];
  const activeStatus = providerStatuses.find((p) => (p as any).providerId === selectedConfigProviderId) as any;
  const currentConfig: ProviderConfigData = aiSettings.providersConfig?.[selectedConfigProviderId] || {
    providerId: selectedConfigProviderId,
    name: activeMeta.name,
    isEnabled: true,
    baseUrl: activeMeta.defaultBaseUrl,
  };
  const providerModels = availableModels[selectedConfigProviderId] || [];

  useEffect(() => {
    const meta = PROVIDERS_META.find((p) => p.id === selectedConfigProviderId);
    const existing = aiSettings.providersConfig?.[selectedConfigProviderId];
    setBaseUrlInput(existing?.baseUrl || meta?.defaultBaseUrl || (selectedConfigProviderId === 'ollama' ? aiSettings.ollamaBaseUrl : ''));

    // Fetch existing API Key for active provider form
    getProviderApiKey(selectedConfigProviderId).then((key) => {
      setApiKeyInput(key || '');
    });
  }, [selectedConfigProviderId, aiSettings]);

  // Handle active provider selection
  const handleSelectActiveProvider = async (providerId: string) => {
    setSelectedConfigProviderId(providerId);
    const ok = await saveAISettings({ activeProviderId: providerId });
    if (ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Handle saving provider base URL & active model
  const handleSaveConfig = async (update: Partial<ProviderConfigData>) => {
    const updatedConfigMap = {
      ...aiSettings.providersConfig,
      [selectedConfigProviderId]: {
        ...currentConfig,
        ...update,
      },
    };

    const payload: Partial<typeof aiSettings> = {
      providersConfig: updatedConfigMap,
    };

    if (selectedConfigProviderId === 'ollama') {
      if (update.baseUrl) payload.ollamaBaseUrl = update.baseUrl;
      if (update.activeModelId) payload.ollamaActiveModel = update.activeModelId;
    }

    const ok = await saveAISettings(payload);
    if (ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Handle API key save
  const handleSaveKey = async () => {
    let mode: 'safeStorage' | 'sessionOnly' | 'unencryptedOptIn' = keyStorageModeInput;
    if (!isSafeStorageAvailable && mode === 'safeStorage') {
      mode = unencryptedOptIn ? 'unencryptedOptIn' : 'sessionOnly';
    }

    const ok = await saveProviderApiKey(selectedConfigProviderId, apiKeyInput, mode);
    if (ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6 select-none font-sans animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-crafted-text tracking-tight">
            AI Providers & Encryption Settings
          </h3>
          <p className="text-xs text-crafted-text-muted mt-1 leading-relaxed">
            Configure local models and cloud API providers. API keys are encrypted with host OS keychain (`safeStorage`).
          </p>
        </div>

        {isSaved && (
          <span className="flex items-center space-x-1 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-fade-in">
            <Check className="h-3.5 w-3.5" />
            <span>Settings Saved</span>
          </span>
        )}
      </div>

      {/* Security Status Banner */}
      <div
        className={`rounded-xl border p-3.5 text-xs flex items-center justify-between font-mono ${
          isSafeStorageAvailable
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          {isSafeStorageAvailable ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <div>
            <span className="font-bold">
              {isSafeStorageAvailable
                ? 'OS Keychain Security Active (Electron safeStorage)'
                : 'Host OS Keychain Unavailable'}
            </span>
            <p className="text-[11px] font-sans text-crafted-text-dim mt-0.5">
              {isSafeStorageAvailable
                ? 'API keys are hardware-encrypted on disk using your OS credential manager.'
                : 'Choose Session-Only memory storage or explicit unencrypted opt-in storage below.'}
            </p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-crafted-surface border border-crafted-border">
          {isSafeStorageAvailable ? 'Hardware Encrypted' : 'Fallback Mode'}
        </span>
      </div>

      {/* Provider Selector Grid */}
      <div className="space-y-3">
        <label className="block text-xs font-mono font-medium uppercase tracking-wider text-crafted-text-dim">
          Select Active Provider
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {PROVIDERS_META.map((p) => {
            const isActive = activeProviderId === p.id;
            const status = providerStatuses.find((s) => (s as any).providerId === p.id) as any;
            const isConn = status?.isAvailable;

            return (
              <div
                key={p.id}
                onClick={() => handleSelectActiveProvider(p.id)}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-crafted-brand-rust bg-crafted-surface shadow-crafted-glow'
                    : 'border-crafted-border bg-crafted-surface/40 hover:border-crafted-border-bright'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-crafted-surface border border-crafted-border">
                      {p.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-crafted-text">{p.name}</h4>
                      <span className="font-mono text-[9px] text-crafted-text-dim uppercase">{p.category}</span>
                    </div>
                  </div>

                  {isActive && (
                    <div className="h-4 w-4 rounded-full bg-crafted-brand-rust flex items-center justify-center text-white shrink-0">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between font-mono text-[10px]">
                  {isConn ? (
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>Ready</span>
                    </span>
                  ) : p.requiresApiKey ? (
                    <span className="flex items-center space-x-1 text-amber-400">
                      <Key className="h-2.5 w-2.5" />
                      <span>Key Needed</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-crafted-text-dim">
                      <XCircle className="h-2.5 w-2.5" />
                      <span>Offline</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConfigProviderId(p.id);
                    }}
                    className="text-crafted-brand-rust hover:underline font-mono text-[10px]"
                  >
                    Configure &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider Details & Configuration Panel */}
      <div className="rounded-xl border border-crafted-border bg-crafted-panel/60 p-4 space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-crafted-border/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-crafted-surface border border-crafted-border">
              {activeMeta.icon}
            </div>
            <div>
              <h4 className="text-xs font-bold text-crafted-text">{activeMeta.name} Configuration</h4>
              <p className="text-[10px] text-crafted-text-dim">{activeMeta.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => testConnection(selectedConfigProviderId, baseUrlInput)}
              disabled={isTestingConnection}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-crafted-border bg-crafted-surface text-xs text-crafted-text hover:bg-crafted-surface-hover disabled:opacity-50 transition-colors font-sans"
            >
              <RefreshCw className={`h-3 w-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
              <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {testError && (
          <div className="flex items-center space-x-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 animate-fade-in font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{testError}</span>
          </div>
        )}

        {/* Base URL Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono text-crafted-text-dim">
            Provider Base Endpoint URL
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              onBlur={() => handleSaveConfig({ baseUrl: baseUrlInput })}
              placeholder={activeMeta.defaultBaseUrl || 'https://api.example.com/v1'}
              className="flex-1 rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust transition-colors"
            />
            <button
              onClick={() => handleSaveConfig({ baseUrl: baseUrlInput })}
              className="px-3 py-2 rounded-xl bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-xs text-crafted-text font-mono"
            >
              Save URL
            </button>
          </div>
        </div>

        {/* API Key Input Section (Cloud / Custom providers) */}
        {activeMeta.requiresApiKey && (
          <div className="space-y-2 border-t border-crafted-border/60 pt-3">
            <label className="block text-xs font-mono text-crafted-text-dim">
              API Key ({activeMeta.name})
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 pl-3 pr-9 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2.5 text-crafted-text-dim hover:text-crafted-text"
                >
                  {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-xl bg-crafted-brand-rust hover:opacity-90 text-white text-xs font-mono font-bold shadow-sm transition-opacity"
              >
                Save Key
              </button>
            </div>

            {/* Unencrypted Opt-in Fallback Options if safeStorage Unavailable */}
            {!isSafeStorageAvailable && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 font-mono text-xs text-amber-200 mt-2">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Choose Key Storage Fallback Mode</span>
                </p>

                <div className="space-y-1.5 font-sans text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="keyMode"
                      checked={keyStorageModeInput === 'sessionOnly'}
                      onChange={() => setKeyStorageModeInput('sessionOnly')}
                      className="accent-crafted-brand-rust"
                    />
                    <span>
                      <strong>Session-Only RAM Storage</strong> (Recommended: Key stays in memory, never written to disk)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="keyMode"
                      checked={keyStorageModeInput === 'unencryptedOptIn'}
                      onChange={() => setKeyStorageModeInput('unencryptedOptIn')}
                      className="accent-crafted-brand-rust"
                    />
                    <span>
                      <strong>Explicit Unencrypted Disk Storage</strong> (Opt-in: Write key to SQLite database unencrypted)
                    </span>
                  </label>
                </div>

                {keyStorageModeInput === 'unencryptedOptIn' && (
                  <label className="flex items-center space-x-2 text-[11px] font-mono text-amber-300 pt-1">
                    <input
                      type="checkbox"
                      checked={unencryptedOptIn}
                      onChange={(e) => setUnencryptedOptIn(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>I understand the risks of storing API keys unencrypted on this machine.</span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Model Selector Dropdown */}
        <div className="space-y-1.5 border-t border-crafted-border/60 pt-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-crafted-text-dim">
              Active Model Selection ({activeMeta.name})
            </label>
            <button
              onClick={() => fetchModels(selectedConfigProviderId)}
              className="text-[10px] font-mono text-crafted-brand-rust hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              <span>Refresh Models List</span>
            </button>
          </div>

          {providerModels.length > 0 ? (
            <select
              value={currentConfig.activeModelId || (selectedConfigProviderId === 'ollama' ? aiSettings.ollamaActiveModel : '')}
              onChange={(e) => handleSaveConfig({ activeModelId: e.target.value })}
              className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust transition-colors"
            >
              <option value="" disabled>
                -- Select Model --
              </option>
              {providerModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 rounded-xl bg-crafted-surface border border-crafted-border text-xs text-crafted-text-dim font-mono">
              No cached models detected for {activeMeta.name}. Enter API key / Base URL and click &quot;Refresh Models List&quot;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
