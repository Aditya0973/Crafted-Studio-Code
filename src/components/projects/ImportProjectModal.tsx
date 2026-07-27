import React, { useState } from 'react';
import { X, Download, AlertCircle, Cpu, Folder } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';

export const ImportProjectModal: React.FC = () => {
  const { importProposal, setImportProposal, confirmImport, error } = useProjectStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!importProposal) return null;

  const handleImport = async () => {
    setIsSubmitting(true);
    await confirmImport();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-crafted-border bg-crafted-surface p-6 shadow-crafted-card">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-crafted-border/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40">
              <Download className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-crafted-text">Import Existing Project</h2>
              <p className="text-xs text-crafted-text-muted">
                Adopt software project into Crafted Studio workspace.
              </p>
            </div>
          </div>
          <button
            onClick={() => setImportProposal(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center space-x-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="mt-4 space-y-4">
          <p className="text-xs text-crafted-text leading-relaxed">
            This folder is not yet a Crafted Studio project. Would you like to import it?
          </p>

          <div className="rounded-xl border border-crafted-border bg-crafted-bg/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-crafted-text truncate">
                <Folder className="h-4 w-4 text-crafted-brand-rust shrink-0" />
                <span className="truncate">{importProposal.folderName}</span>
              </div>
              <span className="flex items-center space-x-1 rounded-full bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 border border-cyan-500/20 shrink-0">
                <Cpu className="h-3 w-3" />
                <span>{importProposal.detectedType}</span>
              </span>
            </div>

            <div className="font-mono text-[10px] text-crafted-text-dim break-all">
              {importProposal.projectPath}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-300/90 leading-normal">
            ✨ <strong className="font-semibold text-amber-200">Safe Import Guarantee:</strong> Crafted Studio will create required project metadata without modifying or overwriting your existing source code files.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3 border-t border-crafted-border/60 pt-4">
          <button
            type="button"
            onClick={() => setImportProposal(null)}
            className="rounded-xl border border-crafted-border px-4 py-2 text-xs font-medium text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleImport}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 via-[#A9452D] to-[#6E6AF6] px-5 py-2 text-xs font-semibold text-white shadow-crafted-glow hover:opacity-95 disabled:opacity-50 transition-opacity"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Importing...' : 'Import Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
