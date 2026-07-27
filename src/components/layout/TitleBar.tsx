import React, { useState } from 'react';
import {
  Files,
  MessageSquare,
  Code2,
  Boxes,
  SquareTerminal,
  Settings as SettingsIcon,
  Maximize2,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { WindowControls } from './WindowControls';
import { useSettings } from '../../hooks/useSettings';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { WorkspacePanelId } from '../../services/WorkspaceLayoutEngine';

interface PanelNavConfig {
  id: WorkspacePanelId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PANEL_NAV_CONFIGS: Record<WorkspacePanelId, PanelNavConfig> = {
  explorer: { id: 'explorer', label: 'Explorer', icon: Files },
  chat: { id: 'chat', label: 'Chat', icon: MessageSquare },
  editor: { id: 'editor', label: 'Editor', icon: Code2 },
  tooldock: { id: 'tooldock', label: 'Tool Dock', icon: Boxes },
};

export const TitleBar: React.FC = () => {
  const { settings } = useSettings();
  const { setSettingsOpen } = useAISettingsStore();
  const {
    panelVisibility,
    panelOrder,
    focusModePanel,
    bottomPanelCollapsed,
    togglePanelVisibility,
    toggleFocusMode,
    reorderPanels,
    toggleBottomPanel,
  } = useLayoutStore();

  const [draggedPanelId, setDraggedPanelId] = useState<WorkspacePanelId | null>(null);
  const [dropTargetId, setDropTargetId] = useState<WorkspacePanelId | null>(null);

  const handleDragStart = (e: React.DragEvent, id: WorkspacePanelId) => {
    setDraggedPanelId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: WorkspacePanelId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetId !== id) {
      setDropTargetId(id);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: WorkspacePanelId) => {
    e.preventDefault();
    setDropTargetId(null);

    if (!draggedPanelId || draggedPanelId === targetId) return;

    const currentOrder = [...panelOrder];
    const sourceIdx = currentOrder.indexOf(draggedPanelId);
    const targetIdx = currentOrder.indexOf(targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      currentOrder.splice(sourceIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedPanelId);
      reorderPanels(currentOrder);
    }
    setDraggedPanelId(null);
  };

  return (
    <header className="drag h-10 w-full flex items-center justify-between border-b border-crafted-border bg-crafted-bg/95 backdrop-blur-crafted px-3 select-none z-40 relative font-sans">
      {/* Left: Logo & App Title */}
      <div className="no-drag flex items-center space-x-3 shrink-0">
        <Logo customLogoPath={settings.logoPath} size={20} />
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold tracking-wide text-crafted-text">
            {settings.appName || 'Crafted Studio'}
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono font-medium text-crafted-text-dim border border-white/[0.05]">
            v{settings.version || '1.0.0'}
          </span>
        </div>
      </div>

      {/* Center: Top Workspace Navigation Bar (4 Equal Panels Only) */}
      <div className="no-drag flex items-center space-x-1 border border-crafted-border/80 bg-[#161212] p-1 rounded-xl shadow-inner relative">
        {panelOrder.map((panelId) => {
          const cfg = PANEL_NAV_CONFIGS[panelId];
          if (!cfg) return null;

          const IconComponent = cfg.icon;
          const isVisible = panelVisibility[panelId];
          const isFocused = focusModePanel === panelId;
          const isDropTarget = dropTargetId === panelId && draggedPanelId !== panelId;

          return (
            <div key={panelId} className="relative flex items-center">
              {/* Drop Insertion Line Indicator */}
              {isDropTarget && (
                <div className="absolute -left-1 top-1 bottom-1 w-0.5 bg-cyan-400 rounded-full animate-pulse shadow-crafted-glow z-10" />
              )}

              <button
                draggable
                onDragStart={(e) => handleDragStart(e, panelId)}
                onDragOver={(e) => handleDragOver(e, panelId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, panelId)}
                onClick={() => togglePanelVisibility(panelId)}
                onDoubleClick={() => toggleFocusMode(panelId)}
                title={`${cfg.label} (Click: Toggle, Double Click: Focus 100%, Drag: Reorder)`}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  isFocused
                    ? 'bg-crafted-brand-blue text-white shadow-crafted-glow border border-cyan-300/60 animate-pulse'
                    : isVisible
                    ? 'bg-crafted-surface text-cyan-300 border border-crafted-border/80 shadow-sm'
                    : 'text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover opacity-60'
                }`}
              >
                <IconComponent className="h-3.5 w-3.5" />
                <span>{cfg.label}</span>
                {isFocused && <Maximize2 className="h-3 w-3 text-cyan-200 ml-0.5" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Right: Compact Terminal Utility Button & Window Controls */}
      <div className="no-drag flex items-center space-x-1 shrink-0">
        {/* Sleek Terminal Utility Button beside Settings */}
        <button
          onClick={() => toggleBottomPanel('terminal')}
          title="Toggle Integrated Terminal (Ctrl+`)"
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
            !bottomPanelCollapsed
              ? 'bg-crafted-brand-blue/30 text-cyan-300 border border-crafted-brand-blue/50'
              : 'text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text'
          }`}
        >
          <SquareTerminal className="h-4 w-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Open Application Settings"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        <WindowControls />
      </div>
    </header>
  );
};
