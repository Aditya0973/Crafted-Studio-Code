import React, { useEffect, useState } from 'react';
import { FolderGit2, Plus, FolderOpen, Check, Clock, Trash2, ExternalLink } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { RecentProject } from '../../shared/types';
import { RemoveProjectModal } from './RemoveProjectModal';

export const RecentProjectsDropdown: React.FC = () => {
  const {
    activeProject,
    recentProjects,
    isRecentMenuOpen,
    setRecentMenuOpen,
    setCreateDialogOpen,
    fetchRecentProjects,
    switchProject,
    openProject,
  } = useProjectStore();

  const [projectToRemove, setProjectToRemove] = useState<RecentProject | null>(null);

  useEffect(() => {
    if (isRecentMenuOpen) {
      fetchRecentProjects();
    }
  }, [isRecentMenuOpen, fetchRecentProjects]);

  if (!isRecentMenuOpen) return null;

  const handleOpenExisting = async () => {
    setRecentMenuOpen(false);
    await openProject();
  };

  const handleCreateNew = () => {
    setRecentMenuOpen(false);
    setCreateDialogOpen(true);
  };

  const handleOpenFolder = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.openProjectFolder(path);
    }
  };

  return (
    <>
      <div className="absolute bottom-full left-2 right-2 mb-2 z-50 overflow-hidden rounded-xl border border-crafted-border bg-crafted-surface p-2 shadow-crafted-card animate-fade-in">
        <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-crafted-text-dim border-b border-crafted-border/40 flex justify-between items-center">
          <span>Recent Projects</span>
          <Clock className="h-3 w-3 text-crafted-text-dim" />
        </div>

        {/* Recent Projects List */}
        <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
          {recentProjects.length === 0 ? (
            <div className="p-3 text-center text-xs text-crafted-text-muted">
              No recent projects found.
            </div>
          ) : (
            recentProjects.map((p) => {
              const isActive = activeProject?.id === p.projectId;
              return (
                <div
                  key={p.id}
                  onClick={() => switchProject(p.projectId)}
                  className={`group/item flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-crafted-surface-hover text-crafted-text border border-crafted-border-bright'
                      : 'text-crafted-text-muted hover:bg-crafted-surface-hover/70 hover:text-crafted-text'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <FolderGit2 className="h-3.5 w-3.5 text-crafted-brand-rust shrink-0" />
                    <div className="truncate min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="font-mono text-[10px] text-crafted-text-dim truncate">{p.path}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {isActive && <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" />}

                    {/* Open Folder Action */}
                    <button
                      onClick={(e) => handleOpenFolder(e, p.path)}
                      title="Reveal in Explorer / Open Folder"
                      className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-crafted-surface text-crafted-text-dim hover:text-cyan-400 transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    {/* Trash / Remove Icon Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToRemove(p);
                      }}
                      title="Remove from Crafted Studio"
                      className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-red-500/20 text-crafted-text-dim hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Footer */}
        <div className="border-t border-crafted-border/60 pt-1.5 mt-1 space-y-1">
          <button
            onClick={handleOpenExisting}
            className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
            <span>Open Existing Folder...</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-crafted-brand-rust" />
            <span>Create New Project</span>
          </button>
        </div>
      </div>

      {/* Remove Confirmation Modal */}
      <RemoveProjectModal
        projectToRemove={projectToRemove}
        onClose={() => setProjectToRemove(null)}
      />
    </>
  );
};
