import React, { useState } from 'react';
import { Cpu, Plus, Trash2, Check, Sparkles, Sliders } from 'lucide-react';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { ModelProfile } from '../../shared/types';

export const ModelProfilesSettings: React.FC = () => {
  const {
    modelProfiles,
    providerStatuses,
    availableModels,
    saveModelProfile,
    deleteModelProfile,
  } = useAISettingsStore();

  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    modelProfiles[0]?.id || 'profile-default'
  );
  const [isSaved, setIsSaved] = useState(false);

  const activeProfile = modelProfiles.find((p) => p.id === selectedProfileId) || modelProfiles[0];

  const [nameInput, setNameInput] = useState(activeProfile?.name || '');
  const [providerIdInput, setProviderIdInput] = useState(activeProfile?.providerId || 'ollama');
  const [modelIdInput, setModelIdInput] = useState(activeProfile?.modelId || 'qwen2.5:7b');
  const [temperatureInput, setTemperatureInput] = useState(activeProfile?.temperature ?? 0.7);

  React.useEffect(() => {
    if (activeProfile) {
      setNameInput(activeProfile.name);
      setProviderIdInput(activeProfile.providerId);
      setModelIdInput(activeProfile.modelId);
      setTemperatureInput(activeProfile.temperature ?? 0.7);
    }
  }, [selectedProfileId, modelProfiles]);

  const handleCreateNewProfile = async () => {
    const newProf = await saveModelProfile({
      name: 'New Custom Profile',
      providerId: 'ollama',
      modelId: 'qwen2.5:7b',
      temperature: 0.7,
      isDefault: false,
    });
    if (newProf) {
      setSelectedProfileId(newProf.id);
    }
  };

  const handleSaveProfile = async () => {
    if (!activeProfile) return;
    const res = await saveModelProfile({
      id: activeProfile.id,
      name: nameInput,
      providerId: providerIdInput,
      modelId: modelIdInput,
      temperature: Number(temperatureInput),
    });
    if (res) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (confirm('Are you sure you want to delete this model profile?')) {
      const ok = await deleteModelProfile(id);
      if (ok && selectedProfileId === id) {
        setSelectedProfileId(modelProfiles[0]?.id || 'profile-default');
      }
    }
  };

  const currentModels = availableModels[providerIdInput] || [];

  return (
    <div className="space-y-6 select-none font-sans animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-crafted-text tracking-tight">
            Model Profiles Architecture
          </h3>
          <p className="text-xs text-crafted-text-muted mt-1 leading-relaxed">
            Create reusable model profiles (e.g. &quot;Qwen Local&quot;, &quot;GPT-4o Fast&quot;, &quot;Claude Architect&quot;). Multiple agents can share the same profile, or use distinct profiles.
          </p>
        </div>

        <button
          onClick={handleCreateNewProfile}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-crafted-brand-rust hover:opacity-90 text-white font-mono text-xs font-bold shadow-sm transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Profile</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profiles Sidebar List */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-medium uppercase tracking-wider text-crafted-text-dim">
            Model Profiles ({modelProfiles.length})
          </label>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {modelProfiles.map((prof) => {
              const isSelected = prof.id === selectedProfileId;
              return (
                <div
                  key={prof.id}
                  onClick={() => setSelectedProfileId(prof.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-crafted-brand-rust bg-crafted-surface shadow-sm'
                      : 'border-crafted-border bg-crafted-surface/40 hover:border-crafted-border-bright'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Cpu className={`h-4 w-4 shrink-0 ${isSelected ? 'text-crafted-brand-rust' : 'text-crafted-text-dim'}`} />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-crafted-text truncate">{prof.name}</h4>
                      <p className="font-mono text-[10px] text-crafted-text-dim truncate">
                        {prof.providerId} / {prof.modelId}
                      </p>
                    </div>
                  </div>

                  {prof.isDefault && (
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Default
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Profile Configuration Form */}
        {activeProfile ? (
          <div className="md:col-span-2 rounded-xl border border-crafted-border bg-crafted-panel/60 p-4 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-crafted-border/60 pb-3">
              <div>
                <h4 className="text-xs font-bold text-crafted-text">Edit Profile: {activeProfile.name}</h4>
                <p className="text-[10px] text-crafted-text-dim">Configure profile parameters and LLM mapping</p>
              </div>

              <div className="flex items-center space-x-2">
                {isSaved && (
                  <span className="flex items-center space-x-1 font-mono text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </span>
                )}

                {!activeProfile.isDefault && (
                  <button
                    onClick={() => handleDeleteProfile(activeProfile.id)}
                    className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={handleSaveProfile}
                  className="px-3.5 py-1.5 rounded-xl bg-crafted-brand-rust text-white text-xs font-mono font-bold shadow-sm hover:opacity-90"
                >
                  Save Profile
                </button>
              </div>
            </div>

            {/* Profile Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-crafted-text-dim">Profile Display Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust"
              />
            </div>

            {/* Provider Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-crafted-text-dim">AI Provider</label>
                <select
                  value={providerIdInput}
                  onChange={(e) => setProviderIdInput(e.target.value)}
                  className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust"
                >
                  {providerStatuses.map((s) => (
                    <option key={(s as any).providerId} value={(s as any).providerId}>
                      {(s as any).providerId.toUpperCase()} ({(s as any).isAvailable ? 'Available' : 'Config Needed'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Model ID Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-crafted-text-dim">Target Model</label>
                {currentModels.length > 0 ? (
                  <select
                    value={modelIdInput}
                    onChange={(e) => setModelIdInput(e.target.value)}
                    className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust"
                  >
                    {currentModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modelIdInput}
                    onChange={(e) => setModelIdInput(e.target.value)}
                    placeholder="model name e.g. qwen2.5:7b"
                    className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust"
                  />
                )}
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5 border-t border-crafted-border/60 pt-3">
              <div className="flex items-center justify-between text-xs font-mono text-crafted-text-dim">
                <span>Temperature ({temperatureInput})</span>
                <span>{temperatureInput < 0.3 ? 'Precise / Deterministic' : temperatureInput > 0.8 ? 'Creative' : 'Balanced'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={temperatureInput}
                onChange={(e) => setTemperatureInput(parseFloat(e.target.value))}
                className="w-full accent-crafted-brand-rust"
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 p-6 rounded-xl border border-crafted-border bg-crafted-surface/30 text-xs text-crafted-text-dim font-mono">
            Select or create a model profile to edit parameters.
          </div>
        )}
      </div>
    </div>
  );
};
