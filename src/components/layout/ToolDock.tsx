import React, { useState } from 'react';
import { Wrench, Sparkles, ExternalLink, ShieldCheck, Layers, Bot, Globe } from 'lucide-react';

export const ToolDock: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState('Antigravity');

  const toolsRegistry = [
    { id: 'Antigravity', icon: Sparkles, color: 'text-cyan-400', badge: 'Active' },
    { id: 'ChatGPT', icon: Bot, color: 'text-emerald-400', badge: 'External' },
    { id: 'Stitch', icon: Layers, color: 'text-purple-400', badge: 'UI Tool' },
    { id: 'Browser', icon: Globe, color: 'text-amber-400', badge: 'Web' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Tool Dock Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-crafted-border/60 bg-crafted-bg/40">
        <div className="flex items-center space-x-2">
          <Wrench className="h-3.5 w-3.5 text-crafted-brand-rust" />
          <span className="text-xs font-semibold uppercase tracking-wide text-crafted-text">
            Tool Dock
          </span>
        </div>
        <span className="font-mono text-[10px] text-crafted-text-dim rounded bg-crafted-surface border border-crafted-border px-1.5 py-0.5">
          Registry V1
        </span>
      </div>

      {/* Tool Dock Selector Tabs */}
      <div className="flex items-center space-x-1 p-2 border-b border-crafted-border/40 overflow-x-auto no-scrollbar">
        {toolsRegistry.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs transition-all ${
                isSelected
                  ? 'bg-crafted-surface border border-crafted-border-bright text-crafted-text font-medium shadow-sm'
                  : 'text-crafted-text-muted hover:bg-crafted-surface/50 hover:text-crafted-text'
              }`}
            >
              <Icon className={`h-3 w-3 ${tool.color}`} />
              <span>{tool.id}</span>
            </button>
          );
        })}
      </div>

      {/* Tool Dock Content Placeholder Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-crafted-border bg-crafted-surface shadow-crafted-card">
          <Sparkles className="h-6 w-6 text-crafted-brand-rust" />
        </div>

        <h3 className="text-sm font-semibold text-crafted-text mb-1">
          {selectedTool} Slot Active
        </h3>

        <p className="text-xs text-crafted-text-muted max-w-xs mb-6 leading-relaxed">
          Dynamic Tool Dock container initialized. Tool registry integrations will load in future sprints.
        </p>

        <div className="w-full space-y-2 text-left rounded-xl border border-crafted-border bg-crafted-surface/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-crafted-text-dim text-[10px] uppercase">// Registry Status</span>
            <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-mono">
              <ShieldCheck className="h-3 w-3" />
              <span>CONTAINER READY</span>
            </span>
          </div>

          <div className="pt-2 border-t border-crafted-border/40 flex items-center justify-between text-xs text-crafted-text-muted">
            <span>Dock Action</span>
            <button className="flex items-center space-x-1 text-[11px] text-crafted-brand-lightViolet hover:underline">
              <span>Inspect Slot</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
