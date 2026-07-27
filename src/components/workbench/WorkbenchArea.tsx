import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Save,
  FileCode,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useProjectStore } from '../../stores/projectStore';
import { ProjectOverviewPanel } from '../projects/ProjectOverviewPanel';
import { CodeEditorHost } from './CodeEditorHost';
import { WorkbenchErrorBoundary } from './WorkbenchErrorBoundary';
import { TabItem } from '../../shared/types';
import { getFileIcon } from '../../services/FileIconService';

export const WorkbenchArea: React.FC = () => {
  const { activeProject } = useProjectStore();
  const {
    openTabs,
    activeTabPath,
    selectTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    updateTabContent,
    saveActiveTab,
    saveViewState,
    externalFilePrompt,
    reloadTabFromDisk,
    dismissExternalPrompt,
  } = useWorkbenchStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabPath: string } | null>(null);
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  // Global Ctrl+S listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveActiveTab]);

  // Tab Strip Auto-Scroll to Active Tab
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [activeTabPath]);

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  const handleTabMouseDown = (e: React.MouseEvent, tabPath: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabPath);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tabPath: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabPath });
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="flex flex-col h-full w-full bg-[#1e1e1e] text-crafted-text select-none overflow-hidden relative font-sans"
    >
      {/* Tab Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-36 rounded-xl border border-crafted-border bg-crafted-surface p-1 shadow-crafted-card animate-fade-in font-sans text-xs"
        >
          <button
            onClick={() => {
              closeTab(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text"
          >
            <span>Close</span>
          </button>
          <button
            onClick={() => {
              closeOtherTabs(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text"
          >
            <span>Close Others</span>
          </button>
          <button
            onClick={() => {
              closeAllTabs();
              setContextMenu(null);
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-red-400 hover:bg-red-500/10"
          >
            <span>Close All</span>
          </button>
        </div>
      )}

      {/* External File Change Prompt Banner */}
      {externalFilePrompt && (
        <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 z-30 animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>This file was modified outside Crafted Studio. Reload from disk?</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => reloadTabFromDisk(externalFilePrompt.filePath)}
              className="flex items-center space-x-1 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors border border-amber-500/30"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reload</span>
            </button>

            <button
              onClick={dismissExternalPrompt}
              className="rounded-md border border-crafted-border bg-crafted-surface px-2.5 py-1 text-xs text-crafted-text-dim hover:text-crafted-text transition-colors"
            >
              Keep Local Edits
            </button>
          </div>
        </div>
      )}

      {/* Editor Header Bar with Tabs */}
      {openTabs.length > 0 ? (
        <div className="flex h-9 items-center justify-between border-b border-crafted-border/60 bg-[#181818] px-1 shrink-0">
          <div className="flex items-center space-x-0.5 overflow-x-auto h-full min-w-0 pr-2 scrollbar-none">
            {openTabs.map((tab: TabItem) => {
              const isActive = tab.path === activeTabPath;

              return (
                <div
                  key={tab.path}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => selectTab(tab.path)}
                  onMouseDown={(e) => handleTabMouseDown(e, tab.path)}
                  onContextMenu={(e) => handleContextMenu(e, tab.path)}
                  className={`group flex h-full items-center space-x-2 border-r border-crafted-border/40 px-3 cursor-pointer text-xs transition-colors duration-150 border-t-2 shrink-0 ${
                    isActive
                      ? 'bg-[#1e1e1e] text-crafted-text border-t-crafted-brand-rust font-semibold'
                      : 'bg-[#181818] text-crafted-text-dim border-t-transparent hover:bg-[#1f1f1f] hover:text-crafted-text'
                  }`}
                >
                  {/* Unified File Icon */}
                  {getFileIcon(tab.title || tab.path)}

                  <span className="truncate max-w-[140px] font-sans text-xs">{tab.title}</span>

                  {tab.isDirty ? (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" title="Unsaved changes" />
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.path);
                    }}
                    className="rounded p-0.5 opacity-60 group-hover:opacity-100 hover:bg-crafted-surface hover:text-crafted-text transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 px-2 shrink-0 border-l border-crafted-border/40">
            <button
              onClick={() => saveActiveTab()}
              disabled={!activeTab?.isDirty}
              title="Save File (Ctrl+S)"
              className="flex items-center space-x-1 rounded-md bg-crafted-surface px-2.5 py-1 text-xs font-semibold text-crafted-text border border-crafted-border hover:border-crafted-brand-rust/60 disabled:opacity-40 transition-colors"
            >
              <Save className="h-3 w-3 text-cyan-400" />
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Persistent Single Editor Container wrapped in React Error Boundary */}
      <div className="flex-1 overflow-hidden relative">
        <WorkbenchErrorBoundary
          filePath={activeTab?.path}
          onResetTab={() => activeTabPath && closeTab(activeTabPath)}
        >
          {activeTab ? (
            <CodeEditorHost
              key="native-persistent-editor"
              filePath={activeTab.path}
              value={activeTab.content || ''}
              onChange={(newVal: string) => updateTabContent(activeTab.path, newVal)}
              onSave={() => saveActiveTab()}
              savedViewState={activeTab.stateMetadata?.viewState}
              onSaveViewState={(vs: unknown) => saveViewState(activeTab.path, vs)}
            />
          ) : activeProject ? (
            <ProjectOverviewPanel project={activeProject} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-crafted-text-dim space-y-3 font-sans">
              <FileCode className="h-10 w-10 text-crafted-border" />
              <h3 className="text-sm font-bold text-crafted-text">No Open Editor Tabs</h3>
              <p className="text-xs max-w-sm text-crafted-text-muted">
                Select or double-click a file from the Workspace Explorer to open it in Native Monaco Editor.
              </p>
            </div>
          )}
        </WorkbenchErrorBoundary>
      </div>
    </div>
  );
};
