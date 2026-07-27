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
} from 'lucide-react';
import { useAISettingsStore } from '../../stores/aiSettingsStore';

export const AIProvidersSettings: React.FC = () => {
  const {
    aiSettings,
    providerStatuses,
    availableModels,
    isTestingConnection,
    testError,
    saveAISettings,
    testConnection,
    fetchModels,
  } = useAISettingsStore();

  const [activeProviderId, setActiveProviderId] = useState(aiSettings.activeProviderId);
  const [ollamaUrl, setOllamaUrl] = useState(aiSettings.ollamaBaseUrl);
  const [ollamaModel, setOllamaModel] = useState(aiSettings.ollamaActiveModel);
  const [isSaved, setIsSaved] = useState(false);

  const ollamaStatus = providerStatuses.find((p) => p.providerId === 'ollama');
  const ollamaModels = availableModels['ollama'] || [];

  // Autosave when activeProviderId changes
  const handleSelectProvider = async (providerId: string) => {
    setActiveProviderId(providerId);
    const ok = await saveAISettings({
      activeProviderId: providerId,
      ollamaBaseUrl: ollamaUrl,
      ollamaActiveModel: ollamaModel,
    });
    if (ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Autosave when active model changes
  const handleSelectModel = async (modelId: string) => {
    setOllamaModel(modelId);
    const ok = await saveAISettings({
      activeProviderId,
      ollamaBaseUrl: ollamaUrl,
      ollamaActiveModel: modelId,
    });
    if (ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Autosave base URL on blur
  const handleUrlBlur = async () => {
    if (ollamaUrl !== aiSettings.ollamaBaseUrl) {
      const ok = await saveAISettings({
        activeProviderId,
        ollamaBaseUrl: ollamaUrl,
        ollamaActiveModel: ollamaModel,
      });
      if (ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    }
  };

  const handleTestOllama = async () => {
    await testConnection('ollama', ollamaUrl);
  };

  return (
    <div className="space-y-6 select-none font-sans animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-crafted-text tracking-tight">
            AI Provider Settings
          </h3>
          <p className="text-xs text-crafted-text-muted mt-1 leading-relaxed">
            Configure local and cloud AI providers. Provider and model selections autosave immediately.
          </p>
        </div>

        {isSaved && (
          <span className="flex items-center space-x-1 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-fade-in">
            <Check className="h-3.5 w-3.5" />
            <span>Auto-saved</span>
          </span>
        )}
      </div>

      {/* Provider Selector Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-mono font-medium uppercase tracking-wider text-crafted-text-dim">
          Select Active Provider (Autosaved)
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Mock Provider Card */}
          <div
            onClick={() => handleSelectProvider('mock')}
            className={`flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer ${
              activeProviderId === 'mock'
                ? 'border-crafted-brand-rust bg-crafted-surface shadow-crafted-glow'
                : 'border-crafted-border bg-crafted-surface/50 hover:border-crafted-border-bright'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-crafted-surface-hover border border-crafted-border text-crafted-brand-rust">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-crafted-text">Mock Local Provider</h4>
                  <span className="font-mono text-[10px] text-crafted-text-dim">Built-in Development Provider</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>Ready</span>
                </span>
                {activeProviderId === 'mock' && <Check className="h-4 w-4 text-crafted-brand-rust" />}
              </div>
            </div>
            <p className="text-[11px] text-crafted-text-muted mt-3 leading-normal font-sans">
              Simulates AI responses with token streaming without external network calls or API keys.
            </p>
          </div>

          {/* Ollama Provider Card */}
          <div
            onClick={() => handleSelectProvider('ollama')}
            className={`flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer ${
              activeProviderId === 'ollama'
                ? 'border-crafted-brand-rust bg-crafted-surface shadow-crafted-glow'
                : 'border-crafted-border bg-crafted-surface/50 hover:border-crafted-border-bright'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-crafted-text">Ollama Local AI</h4>
                  <span className="font-mono text-[10px] text-crafted-text-dim">Local LLM Engine</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                {ollamaStatus?.isAvailable ? (
                  <span className="flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-red-400 border border-red-500/20">
                    <XCircle className="h-2.5 w-2.5" />
                    <span>Disconnected</span>
                  </span>
                )}
                {activeProviderId === 'ollama' && <Check className="h-4 w-4 text-crafted-brand-rust" />}
              </div>
            </div>
            <p className="text-[11px] text-crafted-text-muted mt-3 leading-normal font-sans">
              Connect to local Ollama instance running open-weights LLMs (Llama 3, Mistral, Qwen, DeepSeek).
            </p>
          </div>
        </div>
      </div>

      {/* Ollama Provider Configuration */}
      <div className="rounded-xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-crafted-border/60 pb-3">
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-crafted-text">Ollama Configuration</h4>
          </div>
          <button
            onClick={handleTestOllama}
            disabled={isTestingConnection}
            className="flex items-center space-x-1.5 rounded-lg border border-crafted-border bg-crafted-surface px-2.5 py-1 text-xs text-crafted-text hover:bg-crafted-surface-hover disabled:opacity-50 transition-colors font-sans"
          >
            <RefreshCw className={`h-3 w-3 ${isTestingConnection ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* Test Error Alert */}
        {testError && (
          <div className="flex items-center space-x-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{testError}</span>
          </div>
        )}

        {/* Server Base URL Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono text-crafted-text-dim">Ollama Base URL</label>
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="http://localhost:11434"
            className="w-full rounded-lg border border-crafted-border bg-crafted-surface px-3 py-2 text-xs font-mono text-crafted-text focus:border-cyan-500/60 focus:outline-none"
          />
        </div>

        {/* Installed Models Select Dropdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-crafted-text-dim">Select Active Ollama Model (Autosaved)</label>
            <button
              onClick={() => fetchModels('ollama')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Refresh Models List
            </button>
          </div>

          <select
            value={ollamaModel}
            onChange={(e) => handleSelectModel(e.target.value)}
            className="w-full rounded-lg border border-crafted-border bg-crafted-surface px-3 py-2 text-xs font-mono text-crafted-text focus:border-cyan-500/60 focus:outline-none"
          >
            <option value="">-- Choose Installed Ollama Model --</option>
            {ollamaModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {ollamaModels.length === 0 && (
            <p className="text-[11px] text-crafted-text-dim mt-1 font-sans">
              No installed models found. Run <code className="font-mono text-amber-300">ollama run llama3</code> in terminal to pull models.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
