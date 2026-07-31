import React, { useEffect } from 'react';
import { FilePlus, FolderPlus, Edit3, Copy, Trash2, FolderOpen } from 'lucide-react';
import { useExplorerStore } from '../../stores/explorerStore';
import { TreeNode } from '../../shared/types';

export const ExplorerContextMenu: React.FC = () => {
  const {
    contextMenu,
    setContextMenu,
    setCreateModal,
    setRenameInputPath,
    setDeleteConfirmModal,
    duplicateNode,
    rootNode,
  } = useExplorerStore();

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const node: TreeNode | null = contextMenu.node;
  const isDir = node ? node.type === 'directory' : true;

  const getParentFolder = (): string => {
    if (node) {
      return isDir ? node.path : node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')));
    }
    return rootNode ? rootNode.path : '';
  };

  const handleNewFile = () => {
    setCreateModal({
      isOpen: true,
      parentPath: getParentFolder(),
      type: 'file',
    });
    setContextMenu(null);
  };

  const handleNewFolder = () => {
    setCreateModal({
      isOpen: true,
      parentPath: getParentFolder(),
      type: 'folder',
    });
    setContextMenu(null);
  };

  const handleRename = () => {
    if (node) {
      setRenameInputPath(node.path);
    }
    setContextMenu(null);
  };

  const handleDuplicate = async () => {
    if (node) {
      await duplicateNode(node.path);
    }
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (node) {
      setDeleteConfirmModal({
        isOpen: true,
        targetPath: node.path,
        itemName: node.name,
      });
    }
    setContextMenu(null);
  };

  const handleReveal = () => {
    if (node && typeof window !== 'undefined' && window.craftedAPI) {
      const folderPath = isDir ? node.path : node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')));
      window.craftedAPI.openProjectFolder(folderPath);
    }
    setContextMenu(null);
  };

  // Clamp position to viewport boundaries
  const menuWidth = 180;
  const menuHeight = 220;
  const clampedX = Math.min(contextMenu.x, window.innerWidth - menuWidth - 10);
  const clampedY = Math.min(contextMenu.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-48 rounded-xl border border-crafted-border bg-crafted-panel/95 backdrop-blur-md shadow-2xl p-1.5 font-sans select-none text-xs space-y-0.5 animate-fade-in"
    >
      <button
        onClick={handleNewFile}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-crafted-text hover:bg-crafted-surface-hover transition-colors"
      >
        <div className="flex items-center space-x-2">
          <FilePlus className="h-3.5 w-3.5 text-crafted-brand-rust" />
          <span>New File</span>
        </div>
        <span className="font-mono text-[9px] text-crafted-text-dim">Ctrl+N</span>
      </button>

      <button
        onClick={handleNewFolder}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-crafted-text hover:bg-crafted-surface-hover transition-colors"
      >
        <div className="flex items-center space-x-2">
          <FolderPlus className="h-3.5 w-3.5 text-crafted-brand-rust" />
          <span>New Folder</span>
        </div>
        <span className="font-mono text-[9px] text-crafted-text-dim">Ctrl+Shift+N</span>
      </button>

      {node && (
        <>
          <div className="my-1 border-t border-crafted-border/60" />

          <button
            onClick={handleRename}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-crafted-text hover:bg-crafted-surface-hover transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Edit3 className="h-3.5 w-3.5 text-crafted-text-dim" />
              <span>Rename</span>
            </div>
            <span className="font-mono text-[9px] text-crafted-text-dim">F2</span>
          </button>

          <button
            onClick={handleDuplicate}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-crafted-text hover:bg-crafted-surface-hover transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Copy className="h-3.5 w-3.5 text-crafted-text-dim" />
              <span>Duplicate</span>
            </div>
            <span className="font-mono text-[9px] text-crafted-text-dim">Ctrl+D</span>
          </button>

          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Move to Recycle Bin</span>
            </div>
            <span className="font-mono text-[9px] text-rose-400/70">Del</span>
          </button>
        </>
      )}

      <div className="my-1 border-t border-crafted-border/60" />

      <button
        onClick={handleReveal}
        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        <span>Reveal in File Explorer</span>
      </button>
    </div>
  );
};
