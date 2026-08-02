import React, { useState } from 'react';
import { Bot, Plus, Trash2, Check, Layers, Code, ShieldCheck, Bug, User, Sparkles } from 'lucide-react';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { AgentDefinition } from '../../shared/types';

const AGENT_ICONS = ['Bot', 'Layers', 'Code', 'ShieldCheck', 'Bug', 'User', 'Sparkles'];

export const AgentsSettings: React.FC = () => {
  const { agents, modelProfiles, saveAgent, deleteAgent } = useAISettingsStore();

  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents[0]?.id || 'agent-general'
  );
  const [isSaved, setIsSaved] = useState(false);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const [nameInput, setNameInput] = useState(activeAgent?.name || '');
  const [descInput, setDescInput] = useState(activeAgent?.description || '');
  const [iconInput, setIconInput] = useState(activeAgent?.icon || 'Bot');
  const [profileIdInput, setProfileIdInput] = useState(activeAgent?.profileId || 'profile-default');
  const [systemPromptInput, setSystemPromptInput] = useState(activeAgent?.systemPrompt || '');

  React.useEffect(() => {
    if (activeAgent) {
      setNameInput(activeAgent.name);
      setDescInput(activeAgent.description);
      setIconInput(activeAgent.icon || 'Bot');
      setProfileIdInput(activeAgent.profileId);
      setSystemPromptInput(activeAgent.systemPrompt);
    }
  }, [selectedAgentId, agents]);

  const handleCreateNewAgent = async () => {
    const newAg = await saveAgent({
      name: 'Custom Specialist Agent',
      description: 'Custom AI assistant with custom instructions.',
      icon: 'Bot',
      systemPrompt: 'You are a specialized AI assistant in Crafted Studio.',
      profileId: modelProfiles[0]?.id || 'profile-default',
      isPreset: false,
    });
    if (newAg) {
      setSelectedAgentId(newAg.id);
    }
  };

  const handleSaveAgent = async () => {
    if (!activeAgent) return;
    const res = await saveAgent({
      id: activeAgent.id,
      name: nameInput,
      description: descInput,
      icon: iconInput,
      profileId: profileIdInput,
      systemPrompt: systemPromptInput,
    });
    if (res) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this custom agent?')) {
      const ok = await deleteAgent(id);
      if (ok && selectedAgentId === id) {
        setSelectedAgentId(agents[0]?.id || 'agent-general');
      }
    }
  };

  return (
    <div className="space-y-6 select-none font-sans animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-crafted-text tracking-tight">
            AI Agents & Custom Prompts
          </h3>
          <p className="text-xs text-crafted-text-muted mt-1 leading-relaxed">
            Configure preset and custom agents. Each agent can be assigned its own Model Profile, or share the default local profile!
          </p>
        </div>

        <button
          onClick={handleCreateNewAgent}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-crafted-brand-rust hover:opacity-90 text-white font-mono text-xs font-bold shadow-sm transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Agent</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agents Sidebar List */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-medium uppercase tracking-wider text-crafted-text-dim">
            Agents ({agents.length})
          </label>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {agents.map((ag) => {
              const isSelected = ag.id === selectedAgentId;
              const profile = modelProfiles.find((p) => p.id === ag.profileId);

              return (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-crafted-brand-rust bg-crafted-surface shadow-sm'
                      : 'border-crafted-border bg-crafted-surface/40 hover:border-crafted-border-bright'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Bot className={`h-4 w-4 shrink-0 ${isSelected ? 'text-crafted-brand-rust' : 'text-crafted-text-dim'}`} />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-crafted-text truncate">{ag.name}</h4>
                      <p className="font-mono text-[10px] text-crafted-text-dim truncate">
                        {profile ? profile.name : ag.profileId}
                      </p>
                    </div>
                  </div>

                  {ag.isPreset && (
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      Preset
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Agent Configuration Form */}
        {activeAgent ? (
          <div className="md:col-span-2 rounded-xl border border-crafted-border bg-crafted-panel/60 p-4 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-crafted-border/60 pb-3">
              <div>
                <h4 className="text-xs font-bold text-crafted-text">Agent: {activeAgent.name}</h4>
                <p className="text-[10px] text-crafted-text-dim">{activeAgent.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                {isSaved && (
                  <span className="flex items-center space-x-1 font-mono text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </span>
                )}

                {!activeAgent.isPreset && (
                  <button
                    onClick={() => handleDeleteAgent(activeAgent.id)}
                    className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={handleSaveAgent}
                  className="px-3.5 py-1.5 rounded-xl bg-crafted-brand-rust text-white text-xs font-mono font-bold shadow-sm hover:opacity-90"
                >
                  Save Agent
                </button>
              </div>
            </div>

            {/* Agent Name & Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-crafted-text-dim">Agent Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-crafted-text-dim">Assigned Model Profile</label>
                <select
                  value={profileIdInput}
                  onChange={(e) => setProfileIdInput(e.target.value)}
                  className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust"
                >
                  {modelProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.providerId} / {p.modelId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-crafted-text-dim">Description</label>
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-sans focus:outline-none focus:border-crafted-brand-rust"
              />
            </div>

            {/* System Prompt Instructions Editor */}
            <div className="space-y-1.5 border-t border-crafted-border/60 pt-3">
              <label className="block text-xs font-mono text-crafted-text-dim">
                Custom System Instructions / System Prompt
              </label>
              <textarea
                rows={6}
                value={systemPromptInput}
                onChange={(e) => setSystemPromptInput(e.target.value)}
                placeholder="Enter system prompt for this agent..."
                className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text font-mono focus:outline-none focus:border-crafted-brand-rust resize-none leading-relaxed"
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 p-6 rounded-xl border border-crafted-border bg-crafted-surface/30 text-xs text-crafted-text-dim font-mono">
            Select or create an agent to edit prompt instructions.
          </div>
        )}
      </div>
    </div>
  );
};
