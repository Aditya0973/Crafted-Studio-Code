import React, { useState, useEffect } from 'react';
import { FilePlus, FolderPlus, Trash2, X, AlertTriangle } from 'lucide-react';
import { useExplorerStore, resolveDirectoryPath } from '../../stores/explorerStore';

export const ExplorerModals: React.FC = () => {
  const {
    createModal,
    setCreateModal,
    createFile,
    createFolder,
    deleteConfirmModal,
    setDeleteConfirmModal,
    deleteNode,
  } = useExplorerStore();

  const [newItemName, setNewItemName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset input name when modal opens
  useEffect(() => {
    if (createModal) {
      setNewItemName('');
    }
  }, [createModal]);

  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!createModal || !newItemName.trim()) return;

    const name = newItemName.trim();
    const targetDir = resolveDirectoryPath(createModal.parentPath);

    if (createModal.type === 'file') {
      await createFile(targetDir, name);
    } else {
      await createFolder(targetDir, name);
    }

    setNewItemName('');
    setCreateModal(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteNode(deleteConfirmModal.targetPath);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmModal(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (createModal) {
        handleCreateSubmit();
      } else if (deleteConfirmModal) {
        handleDeleteConfirm();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setNewItemName('');
      setCreateModal(null);
      setDeleteConfirmModal(null);
    }
  };

  if (!createModal && !deleteConfirmModal) return null;

  const displayDir = createModal ? resolveDirectoryPath(createModal.parentPath) : '';

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none font-sans"
    >
      {/* Create File / Folder Modal */}
      {createModal && (
        <div className="w-full max-w-md rounded-2xl border border-crafted-border bg-crafted-panel p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-crafted-border/60 pb-3">
            <h3 className="text-sm font-bold text-crafted-text flex items-center space-x-2">
              {createModal.type === 'file' ? (
                <FilePlus className="h-4 w-4 text-crafted-brand-rust" />
              ) : (
                <FolderPlus className="h-4 w-4 text-crafted-brand-rust" />
              )}
              <span>{createModal.type === 'file' ? 'Create New File' : 'Create New Folder'}</span>
            </h3>
            <button
              onClick={() => {
                setNewItemName('');
                setCreateModal(null);
              }}
              className="text-crafted-text-dim hover:text-crafted-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-crafted-text-dim block mb-1">
                Location: <span className="font-mono text-crafted-text truncate block">{displayDir}</span>
              </label>
              <input
                type="text"
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={createModal.type === 'file' ? 'e.g. App.tsx' : 'e.g. components'}
                className="w-full rounded-xl border border-crafted-border bg-crafted-surface py-2 px-3 text-xs text-crafted-text placeholder-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNewItemName('');
                  setCreateModal(null);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-crafted-border text-xs text-crafted-text hover:bg-crafted-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newItemName.trim()}
                className="px-4 py-1.5 rounded-xl bg-crafted-brand-rust text-white font-bold text-xs disabled:opacity-40 transition-colors shadow-crafted-button"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-crafted-panel p-5 shadow-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-crafted-text">Move to Recycle Bin</h3>
              <p className="text-xs text-crafted-text-dim mt-0.5">
                Are you sure you want to move <span className="font-mono font-bold text-crafted-text">{deleteConfirmModal.itemName}</span> to the Windows Recycle Bin?
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-crafted-border/60">
            <button
              onClick={() => setDeleteConfirmModal(null)}
              disabled={isDeleting}
              className="px-3.5 py-1.5 rounded-xl border border-crafted-border text-xs text-crafted-text hover:bg-crafted-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 disabled:opacity-40 transition-colors shadow-crafted-button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? 'Moving...' : 'Move to Recycle Bin'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
