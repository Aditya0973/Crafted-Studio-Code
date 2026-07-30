import React, { useEffect, useState, useRef } from 'react';
import {
  Wrench,
  Sparkles,
  Bot,
  Layers,
  Globe,
  Code,
  Terminal,
  Zap,
  Shield,
  AppWindow,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToolDockStore } from '../../stores/toolDockStore';
import { BuiltInWebBrowser } from './BuiltInWebBrowser';
import { DesktopAppLauncherCard } from './DesktopAppLauncherCard';
import { ToolDockModal } from './ToolDockModal';
import { ToolDockItem } from '../../shared/types/toolDock';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Bot,
  Layers,
  Globe,
  Code,
  Terminal,
  Zap,
  Shield,
  AppWindow,
  Wrench,
};

export const ToolDock: React.FC = () => {
  const {
    tools,
    activeToolId,
    loadTools,
    setActiveTool,
    openAddModal,
    openEditModal,
    moveTool,
  } = useToolDockStore();

  const [isManageMode, setIsManageMode] = useState(false);
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeToolId, tools.length]);

  const activeTool = tools.find((t) => t.id === activeToolId) || tools[0] || null;

  // Render tool icon or domain favicon
  const renderToolIcon = (tool: ToolDockItem) => {
    if (tool.customIconUrl) {
      return (
        <img
          src={tool.customIconUrl}
          alt={tool.name}
          className="h-3.5 w-3.5 object-contain rounded-sm"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    if (tool.type === 'website' && tool.target) {
      try {
        const urlObj = new URL(tool.target.startsWith('http') ? tool.target : `https://${tool.target}`);
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
        return (
          <img
            src={faviconUrl}
            alt={tool.name}
            className="h-3.5 w-3.5 object-contain rounded-sm shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        );
      } catch {
        /* Ignore invalid URLs */
      }
    }

    const IconComp = ICON_MAP[tool.icon] || (tool.type === 'website' ? Globe : AppWindow);
    return <IconComp className="h-3.5 w-3.5 text-crafted-brand-rust" />;
  };

  const websiteTools = tools.filter((t) => t.type === 'website');

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-crafted-panel font-sans border-l border-crafted-border">
      {/* Tool Dock Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-crafted-border/60 bg-crafted-surface/40 shrink-0">
        <div className="flex items-center space-x-2">
          <Wrench className="h-4 w-4 text-crafted-brand-rust" />
          <span className="text-xs font-bold uppercase tracking-wider text-crafted-text">
            Tool Dock
          </span>
          <span className="font-mono text-[10px] text-crafted-text-dim rounded-full bg-crafted-surface border border-crafted-border px-2 py-0.5">
            {tools.length} Tools
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            title={isManageMode ? 'Done Reordering' : 'Reorder Tools'}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all border ${
              isManageMode
                ? 'bg-crafted-brand-rust/20 border-crafted-brand-rust text-crafted-brand-rust font-bold'
                : 'bg-crafted-surface border-crafted-border text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover'
            }`}
          >
            {isManageMode ? 'Done' : 'Reorder'}
          </button>

          <button
            onClick={openAddModal}
            title="Add New Tool"
            className="flex items-center space-x-1 px-2.5 py-1 bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white rounded-lg text-xs font-semibold shadow-crafted-button transition-all"
          >
            <Plus className="h-3 w-3" />
            <span>Add Tool</span>
          </button>
        </div>
      </div>

      {/* Tool Dock Horizontal Selector Tabs */}
      <div className="flex items-center space-x-1.5 p-2 pr-12 border-b border-crafted-border/40 overflow-x-auto no-scrollbar bg-crafted-bg shrink-0">
        {tools.map((tool, index) => {
          const isSelected = activeTool?.id === tool.id;
          return (
            <div
              key={tool.id}
              ref={isSelected ? activeTabRef : null}
              className={`group relative flex items-center rounded-xl px-2.5 py-1.5 text-xs transition-all duration-200 shrink-0 border ${
                isSelected
                  ? 'bg-crafted-surface border-crafted-brand-rust text-crafted-text font-bold shadow-sm'
                  : 'bg-crafted-surface/40 border-crafted-border/40 text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text'
              }`}
            >
              {isManageMode && index > 0 && (
                <button
                  onClick={() => moveTool(tool.id, 'left')}
                  title="Move Left"
                  className="text-crafted-text-dim hover:text-crafted-text p-0.5 mr-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
              )}

              <button
                onClick={() => setActiveTool(tool.id)}
                className="flex items-center space-x-1.5 focus:outline-none"
              >
                {renderToolIcon(tool)}
                <span className="truncate max-w-[100px]">{tool.name}</span>
                {tool.badge && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-crafted-brand-rust bg-crafted-brand-rust/10 border border-crafted-brand-rust/20 px-1.5 rounded-full">
                    {tool.badge}
                  </span>
                )}
              </button>

              {/* Edit button smoothly revealed on hover */}
              <div className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-200 overflow-hidden flex items-center shrink-0">
                <button
                  onClick={() => openEditModal(tool)}
                  title="Edit Tool"
                  className="p-0.5 text-crafted-text-dim hover:text-crafted-brand-lightViolet"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>

              {isManageMode && index < tools.length - 1 && (
                <button
                  onClick={() => moveTool(tool.id, 'right')}
                  title="Move Right"
                  className="text-crafted-text-dim hover:text-crafted-text p-0.5 ml-1"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {/* Trailing empty spacer so the last tool's hover edit button is never cut off */}
        <div className="w-12 shrink-0" />
      </div>


      {/* Persistent Webviews & Desktop App Viewport */}
      <div className="flex-1 overflow-hidden relative bg-crafted-bg">
        {websiteTools.map((webTool) => {
          const isSelected = activeTool?.id === webTool.id;
          return (
            <div
              key={webTool.id}
              className={`h-full w-full overflow-hidden ${isSelected ? 'block' : 'hidden'}`}
            >
              <BuiltInWebBrowser tool={webTool} />
            </div>
          );
        })}

        {activeTool && activeTool.type === 'desktop_app' && (
          <div className="h-full w-full overflow-hidden">
            <DesktopAppLauncherCard tool={activeTool} />
          </div>
        )}

        {tools.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-crafted-text-muted">
            <Wrench className="h-8 w-8 text-crafted-border mb-2 animate-pulse" />
            <p className="text-xs">No tools configured in Tool Dock.</p>
            <button
              onClick={openAddModal}
              className="mt-3 px-3.5 py-1.5 bg-crafted-brand-rust text-white text-xs rounded-xl font-semibold shadow-crafted-button"
            >
              Add First Tool
            </button>
          </div>
        )}
      </div>

      {/* Tool Dock Modal */}
      <ToolDockModal />
    </div>
  );
};
