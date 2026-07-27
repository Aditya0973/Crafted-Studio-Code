import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface GitPushModalProps {
  isOpen: boolean;
  needsRepoUrl: boolean;
  defaultCommitMsg: string;
  onClose: () => void;
  onSubmit: (repoUrl: string | undefined, commitMsg: string) => void;
}

export const GitPushModal: React.FC<GitPushModalProps> = ({
  isOpen,
  needsRepoUrl,
  defaultCommitMsg,
  onClose,
  onSubmit,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsRepoUrl && !repoUrl.trim()) {
      setError('Repository URL is required for the first push.');
      return;
    }

    const finalMsg = commitMsg.trim() || defaultCommitMsg;
    onSubmit(needsRepoUrl ? repoUrl.trim() : undefined, finalMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-md rounded-2xl border border-crafted-border bg-[#1E1919] p-5 shadow-crafted-card animate-fade-in space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-crafted-border/60 pb-3">
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-crafted-brand-rust/20 p-2 text-crafted-brand-rust border border-crafted-brand-rust/30">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-crafted-text">Push Changes to Repository</h3>
              <p className="text-[11px] text-crafted-text-dim">Execute git add, commit, and push</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-crafted-text-dim hover:bg-crafted-surface hover:text-crafted-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {needsRepoUrl && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-crafted-text-muted">Repository Remote URL</label>
              <input
                type="text"
                placeholder="https://github.com/user/repository.git"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-xl border border-crafted-border bg-[#181414] px-3 py-2 font-mono text-xs text-crafted-text focus:border-crafted-brand-rust focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-crafted-text-muted">Commit Message</label>
            <input
              type="text"
              placeholder={`Default: ${defaultCommitMsg}`}
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              className="w-full rounded-xl border border-crafted-border bg-[#181414] px-3 py-2 text-xs text-crafted-text focus:border-crafted-brand-rust focus:outline-none font-sans"
            />
            <p className="text-[10px] text-crafted-text-dim">Leaving blank will automatically use "{defaultCommitMsg}"</p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-crafted-border bg-crafted-surface px-4 py-2 text-xs font-medium text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center space-x-1.5 rounded-xl bg-crafted-brand-rust px-4 py-2 text-xs font-bold text-white hover:bg-crafted-brand-rust/90 shadow-crafted-glow transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Push to Remote</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
