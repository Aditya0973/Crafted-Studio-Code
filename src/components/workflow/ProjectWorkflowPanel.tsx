import React from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Target,
  FileText,
  Layout,
  Code,
  Rocket,
  Sparkles,
  Layers3,
  MessageSquare,
  Wand2,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useChatStore } from '../../stores/chatStore';
import { BlueprintRegistry } from '../../blueprints/BlueprintRegistry';
import { ProjectStage, StageItem, StageItemAction } from '../../blueprints/types';

export const ProjectWorkflowPanel: React.FC = () => {
  const { activeProject, updateWorkflow } = useProjectStore();
  const { sendMessage } = useChatStore();

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-crafted-text-dim font-sans text-xs">
        Select a project to view guided workflow stages.
      </div>
    );
  }

  const blueprint = BlueprintRegistry.getBlueprint(activeProject.blueprintId || 'blank');
  const stages = blueprint.stages || [];
  const completedSet = new Set(activeProject.completedChecklistItems || []);
  const currentStageId = activeProject.currentStage || stages[0]?.id || 'planning';

  // Compute Stage-specific progress percentage
  const calculateStageProgress = (stage: ProjectStage) => {
    if (!stage.items || stage.items.length === 0) return 0;
    const completedCount = stage.items.filter((item) => completedSet.has(item.id)).length;
    return Math.round((completedCount / stage.items.length) * 100);
  };

  const handleToggleChecklist = (itemId: string) => {
    const nextCompleted = new Set(completedSet);
    if (nextCompleted.has(itemId)) {
      nextCompleted.delete(itemId);
    } else {
      nextCompleted.add(itemId);
    }
    updateWorkflow({
      completedChecklistItems: Array.from(nextCompleted),
    });
  };

  const handleSelectStage = (stageId: string) => {
    if (stageId !== currentStageId) {
      updateWorkflow({
        currentStage: stageId,
      });
    }
  };

  // Action hook dispatcher (Sprint 10.2 Workflow Actions)
  const handleItemAction = (item: StageItem, action: StageItemAction, stageName: string) => {
    if (!activeProject) return;

    if (action.type === 'discuss') {
      const prompt = `Let's discuss requirements and approach for: "${item.title}" in stage [${stageName}]. What are key decisions we need to make?`;
      sendMessage(prompt);
    } else if (action.type === 'generate') {
      const prompt = `Generate a comprehensive spec and code structure for checklist item: "${item.title}" (${item.description || 'No description provided'}) under stage [${stageName}].`;
      sendMessage(prompt);
    }
  };

  const renderStageIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'file-text':
        return <FileText className="h-3.5 w-3.5 text-cyan-400" />;
      case 'layout':
        return <Layout className="h-3.5 w-3.5 text-indigo-400" />;
      case 'code':
        return <Code className="h-3.5 w-3.5 text-emerald-400" />;
      case 'rocket':
        return <Rocket className="h-3.5 w-3.5 text-rose-400" />;
      default:
        return <Target className="h-3.5 w-3.5 text-crafted-brand-rust" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-crafted-bg text-crafted-text select-none font-sans overflow-y-auto">
      {/* Header Banner with Overall Progress */}
      <div className="border-b border-crafted-border bg-crafted-surface/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Layers3 className="h-3.5 w-3.5 text-crafted-brand-rust" />
            <span className="text-xs font-bold text-crafted-text">Guided Workflow</span>
          </div>

          <span className="flex items-center space-x-1 rounded-full bg-crafted-surface px-2 py-0.5 font-mono text-[10px] font-bold text-crafted-brand-lightViolet border border-crafted-border">
            <Sparkles className="h-2.5 w-2.5" />
            <span>Overall: {activeProject.completionPercentage}%</span>
          </span>
        </div>

        {/* Overall Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-crafted-surface-hover overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#433FA9] to-[#A9452D] transition-all duration-300"
            style={{ width: `${activeProject.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Accordion List of Stages */}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
        {stages.map((stage) => {
          const isCurrentStage = stage.id === currentStageId;
          const stagePct = calculateStageProgress(stage);

          return (
            <div
              key={stage.id}
              className={`rounded-xl border transition-all ${
                isCurrentStage
                  ? 'border-crafted-brand-rust/60 bg-crafted-surface/70 shadow-crafted-card'
                  : 'border-crafted-border/60 bg-crafted-surface/30 hover:border-crafted-border'
              }`}
            >
              {/* Stage Header */}
              <div
                onClick={() => handleSelectStage(stage.id)}
                className="flex items-center justify-between p-2.5 cursor-pointer"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-crafted-surface border border-crafted-border">
                    {renderStageIcon(stage.icon)}
                  </div>
                  <span
                    className={`text-xs font-semibold truncate ${
                      isCurrentStage ? 'text-crafted-text font-bold' : 'text-crafted-text-muted'
                    }`}
                  >
                    {stage.name}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-mono text-[10px] text-crafted-text-dim font-medium">
                    {stagePct}%
                  </span>
                  {isCurrentStage ? (
                    <ChevronDown className="h-3.5 w-3.5 text-crafted-brand-rust" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-crafted-text-dim" />
                  )}
                </div>
              </div>

              {/* Stage Checklist Items (Visible when active stage) */}
              {isCurrentStage && (
                <div className="border-t border-crafted-border/40 p-2 space-y-2 bg-crafted-bg/40 animate-fade-in">
                  {stage.items.map((item: StageItem) => {
                    const isChecked = completedSet.has(item.id);
                    const actions = item.actions || [
                      { type: 'generate', label: 'Generate' },
                      { type: 'discuss', label: 'Discuss' },
                    ];

                    return (
                      <div
                        key={item.id}
                        className={`group flex flex-col rounded-lg p-2 transition-all select-none border ${
                          isChecked
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-crafted-text-muted'
                            : 'bg-crafted-surface/40 border-crafted-border/40 hover:border-crafted-border text-crafted-text'
                        }`}
                      >
                        <div
                          onClick={() => handleToggleChecklist(item.id)}
                          className="flex items-start space-x-2.5 cursor-pointer"
                        >
                          <button className="mt-0.5 shrink-0 text-crafted-text-muted group-hover:text-crafted-text">
                            {isChecked ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 fill-emerald-500/20" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-crafted-text-dim" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <span
                              className={`text-xs block leading-snug font-sans ${
                                isChecked ? 'line-through text-crafted-text-dim' : 'font-medium'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="text-[10px] block text-crafted-text-dim truncate">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Workflow Actions (Sprint 10.2 Requirement) */}
                        <div className="flex items-center space-x-1.5 pt-2 pl-6">
                          {actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemAction(item, act, stage.name);
                              }}
                              className="flex items-center space-x-1 rounded-md border border-crafted-border bg-crafted-surface px-2 py-0.5 text-[10px] font-medium text-crafted-text-muted hover:border-crafted-brand-rust/60 hover:text-crafted-text hover:bg-crafted-surface-hover transition-colors"
                            >
                              {act.type === 'generate' ? (
                                <Wand2 className="h-2.5 w-2.5 text-cyan-400" />
                              ) : (
                                <MessageSquare className="h-2.5 w-2.5 text-crafted-brand-rust" />
                              )}
                              <span>{act.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
