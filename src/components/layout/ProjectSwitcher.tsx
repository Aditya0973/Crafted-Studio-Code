import React, { useEffect } from 'react';
import { FolderGit2, ChevronsUpDown, Plus, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { RecentProjectsDropdown } from '../projects/RecentProjectsDropdown';

export const ProjectSwitcher: React.FC = () => {
  const {
    activeProject,
    isRecentMenuOpen,
    setRecentMenuOpen,
    setCreateDialogOpen,
    fetchActiveProject,
    fetchRecentProjects,
  } = useProjectStore();

  useEffect(() => {
    fetchActiveProject();
    fetchRecentProjects();
  }, [fetchActiveProject, fetchRecentProjects]);

  return (
    <div className="relative border-t border-crafted-border bg-crafted-surface/40 p-3 select-none">
      {/* Recent Projects Popover Dropdown */}
      <RecentProjectsDropdown />

      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-crafted-text-dim">
          // Active Project
        </span>
        {activeProject ? (
          activeProject.isMissing ? (
            <span className="flex items-center space-x-1 rounded-full bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-red-400 border border-red-500/20">
              <AlertCircle className="h-2.5 w-2.5" />
              <span>FOLDER MISSING</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE</span>
            </span>
          )
        ) : (
          <span className="flex items-center space-x-1 rounded-full bg-crafted-surface px-1.5 py-0.5 font-mono text-[9px] font-semibold text-crafted-text-dim border border-crafted-border">
            <span>NONE</span>
          </span>
        )}
      </div>

      {/* Main Switcher Button */}
      <button
        onClick={() => setRecentMenuOpen(!isRecentMenuOpen)}
        className="group flex w-full items-center justify-between rounded-lg border border-crafted-border bg-crafted-surface p-2 text-left transition-all duration-200 hover:border-crafted-border-bright hover:bg-crafted-surface-hover active:scale-[0.99]"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white shadow-sm">
            <FolderGit2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold text-crafted-text group-hover:text-white">
              {activeProject ? activeProject.name : 'Select Project'}
            </h4>
            <p className="truncate text-[10px] font-mono text-crafted-text-muted">
              {activeProject ? activeProject.path : 'Click to open or create'}
            </p>
          </div>
        </div>

        <ChevronsUpDown className="h-4 w-4 shrink-0 text-crafted-text-dim transition-colors group-hover:text-crafted-text-muted" />
      </button>

      {/* Footer Quick Action */}
      <div className="mt-2 flex items-center justify-between px-1">
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center space-x-1 text-[11px] font-medium text-crafted-text-muted hover:text-crafted-text transition-colors"
        >
          <Plus className="h-3 w-3 text-crafted-brand-rust" />
          <span>New Project</span>
        </button>
        <span className="font-mono text-[10px] text-crafted-text-dim">Ctrl+O</span>
      </div>
    </div>
  );
};
