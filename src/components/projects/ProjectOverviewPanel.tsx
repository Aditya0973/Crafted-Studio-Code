import React from 'react';
import {
  FileCode,
  Smartphone,
  Atom,
  Layers,
  Laptop,
  Server,
  Box,
  Folder,
  Sparkles,
  Layers3,
  Target,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Project } from '../../shared/types';
import { BlueprintRegistry } from '../../blueprints/BlueprintRegistry';
import { ModuleRegistry } from '../../modules/ModuleRegistry';

interface ProjectOverviewPanelProps {
  project: Project;
}

export const ProjectOverviewPanel: React.FC<ProjectOverviewPanelProps> = ({ project }) => {
  const blueprint = BlueprintRegistry.getBlueprint(project.blueprintId || 'blank');
  const createdDate = new Date(project.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const updatedDate = new Date(project.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const stages = blueprint.stages || [];
  let totalItemsCount = 0;
  for (const s of stages) {
    totalItemsCount += s.items.length;
  }
  const completedCount = (project.completedChecklistItems || []).length;
  const currentStageObj = stages.find((s) => s.id === project.currentStage) || stages[0];

  const handleOpenFolder = async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.openProjectFolder(project.path);
    }
  };

  const renderBlueprintIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'smartphone':
        return <Smartphone className="h-5 w-5 text-cyan-400" />;
      case 'atom':
        return <Atom className="h-5 w-5 text-indigo-400" />;
      case 'layers':
        return <Layers className="h-5 w-5 text-emerald-400" />;
      case 'laptop':
        return <Laptop className="h-5 w-5 text-amber-400" />;
      case 'server':
        return <Server className="h-5 w-5 text-rose-400" />;
      default:
        return <FileCode className="h-5 w-5 text-crafted-brand-rust" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-crafted-bg select-none font-sans p-6 overflow-y-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-start justify-between border-b border-crafted-border/60 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white shadow-crafted-glow shrink-0">
            {renderBlueprintIcon(blueprint.icon)}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-crafted-text tracking-tight">{project.name}</h2>
            <p className="text-xs text-crafted-text-muted">
              {project.description || blueprint.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenFolder}
            className="flex items-center space-x-1 rounded-full bg-crafted-surface px-3 py-1 font-mono text-xs text-cyan-400 hover:text-cyan-300 border border-crafted-border transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open Folder</span>
          </button>

          <span className="flex items-center space-x-1 rounded-full bg-crafted-surface px-3 py-1 font-mono text-xs text-crafted-brand-lightViolet border border-crafted-border">
            <Sparkles className="h-3 w-3" />
            <span>v{project.version || '1.0.0'}</span>
          </span>
        </div>
      </div>

      {/* Guided Workflow Status Banner */}
      <div className="rounded-2xl border border-crafted-brand-rust/50 bg-gradient-to-r from-[#433FA9]/10 to-[#A9452D]/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-crafted-brand-rust" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-crafted-text">
              Guided Workflow Status
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Overall Progress: {project.completionPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-crafted-surface overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#433FA9] to-[#A9452D] transition-all duration-300"
            style={{ width: `${project.completionPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-crafted-text-dim">Current Stage:</span>
            <span className="font-bold text-cyan-400 uppercase tracking-wide bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {currentStageObj?.name || project.currentStage || 'Planning'}
            </span>
          </div>

          <div className="flex items-center space-x-1 font-mono text-[11px] text-crafted-text-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              {completedCount} of {totalItemsCount} checklist items completed
            </span>
          </div>
        </div>
      </div>

      {/* Blueprint Metadata Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blueprint Card */}
        <div className="rounded-2xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-crafted-brand-rust">
            <Layers3 className="h-4 w-4" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">Project Blueprint</h3>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-crafted-text-dim">Blueprint</span>
              <span className="font-bold text-crafted-text">{blueprint.displayName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-crafted-text-dim">Language</span>
              <span className="font-medium text-crafted-text">{blueprint.primaryLanguage}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-crafted-text-dim">Framework</span>
              <span className="font-medium text-crafted-text">{blueprint.framework}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-crafted-text-dim">Category</span>
              <span className="font-mono text-[10px] uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {blueprint.category}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Details Card */}
        <div className="rounded-2xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Folder className="h-4 w-4" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">Workspace Details</h3>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-crafted-text-dim">Created</span>
              <span className="font-medium text-crafted-text">{createdDate}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-crafted-text-dim">Last Modified</span>
              <span className="font-medium text-crafted-text">{updatedDate}</span>
            </div>
            <div className="flex flex-col space-y-0.5 text-xs pt-1">
              <span className="font-mono text-crafted-text-dim">Path</span>
              <span className="font-mono text-[10px] text-crafted-text-muted truncate">{project.path}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Modules Card */}
      <div className="rounded-2xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-3">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Box className="h-4 w-4" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider">Enabled Modules</h3>
        </div>

        {project.selectedModules && project.selectedModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {project.selectedModules.map((modId) => {
              const mod = ModuleRegistry.getModule(modId);
              return (
                <div
                  key={modId}
                  className="flex items-center space-x-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5"
                >
                  <Box className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-crafted-text truncate">
                      {mod?.displayName || modId}
                    </h4>
                    <p className="text-[9px] font-mono text-cyan-300/80 uppercase">
                      {mod?.category || 'module'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-crafted-text-dim italic pt-1">
            No optional modules enabled for this project.
          </p>
        )}
      </div>
    </div>
  );
};
