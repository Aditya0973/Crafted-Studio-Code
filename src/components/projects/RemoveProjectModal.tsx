import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { RecentProject } from '../../shared/types';

interface RemoveProjectModalProps {
  projectToRemove: RecentProject | null;
  onClose: () => void;
}

export const RemoveProjectModal: React.FC<RemoveProjectModalProps> = ({ projectToRemove, onClose }) => {
  const { deleteProjectRecord } = useProjectStore();

  if (!projectToRemove) return null;

  const handleConfirmRemove = async () => {
    await deleteProjectRecord(projectToRemove.projectId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none font-sans p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-md rounded-2xl border border-crafted-border bg-crafted-bg shadow-crafted-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-crafted-border px-5 py-3.5 bg-crafted-surface/40">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-crafted-text">Remove Project</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-crafted-text-muted hover:bg-crafted-surface hover:text-crafted-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3 font-sans">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Removing from Crafted Studio workspace</p>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                This will remove <strong className="text-white">{projectToRemove.name}</strong> from Crafted Studio.
                Your project folder and source files on your computer will <strong>NOT</strong> be deleted. You can add this folder back later using <em>"Open Existing Project"</em>.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-crafted-border bg-crafted-surface/50 p-3 text-xs space-y-1">
            <span className="font-mono text-[10px] text-crafted-text-dim uppercase tracking-wider block">Project Location</span>
            <span className="font-mono text-[11px] text-crafted-text-muted truncate block">{projectToRemove.path}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2.5 border-t border-crafted-border px-5 py-3.5 bg-crafted-surface/40">
          <button
            onClick={onClose}
            className="rounded-xl border border-crafted-border bg-crafted-surface px-4 py-2 text-xs font-medium text-crafted-text hover:bg-crafted-surface-hover transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmRemove}
            className="rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-colors shadow-sm"
          >
            Remove Project
          </button>
        </div>
      </div>
    </div>
  );
};
