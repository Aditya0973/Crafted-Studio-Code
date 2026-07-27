import React, { useEffect } from 'react';
import { Search, Layers, RefreshCw, FolderPlus, Loader2, FolderX } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useExplorerStore } from '../../stores/explorerStore';
import { TreeNodeItem } from '../explorer/TreeNodeItem';
import { TreeNode } from '../../shared/types';

export const ExplorerPanel: React.FC = () => {
  const { activeProject, setCreateDialogOpen } = useProjectStore();
  const {
    rootNode,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadProjectTree,
    refreshTree,
  } = useExplorerStore();

  useEffect(() => {
    if (activeProject && !activeProject.isMissing) {
      loadProjectTree(activeProject.path, activeProject.id);
    }
  }, [activeProject, loadProjectTree]);

  // Search filter helper
  const filterNode = (node: TreeNode | null): TreeNode | null => {
    if (!node) return null;
    if (!searchQuery || !searchQuery.trim()) return node;
    const q = searchQuery.trim().toLowerCase();

    if (node.type === 'file') {
      return node.name.toLowerCase().includes(q) ? node : null;
    }

    const filteredChildren = (node.children || [])
      .map((c) => filterNode(c))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  const displayedTree = filterNode(rootNode);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Explorer Panel Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-crafted-border/60">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Layers className="h-3.5 w-3.5 text-crafted-brand-rust shrink-0" />
          <span className="text-xs font-semibold tracking-wide text-crafted-text uppercase truncate">
            {activeProject ? activeProject.name : 'Explorer'}
          </span>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => refreshTree()}
            title="Refresh Explorer Tree"
            disabled={!activeProject || isLoading}
            className="flex h-6 w-6 items-center justify-center rounded text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-2.5 border-b border-crafted-border/40">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-crafted-text-dim pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!activeProject}
            placeholder="Search workspace files..."
            className="w-full rounded-md border border-crafted-border bg-crafted-surface/80 py-1 pl-8 pr-2 text-xs text-crafted-text placeholder-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust/60 disabled:opacity-50 transition-colors"
          />
        </div>
      </div>

      {/* Explorer Content Area */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-crafted-text-muted space-y-2">
            <Loader2 className="h-5 w-5 animate-spin text-crafted-brand-rust" />
            <span className="text-xs font-mono">Scanning project tree...</span>
          </div>
        ) : !activeProject ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-crafted-text-muted space-y-3 mt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-crafted-surface border border-crafted-border text-crafted-text-dim">
              <FolderX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-crafted-text">No Active Project</p>
              <p className="text-[11px] text-crafted-text-dim mt-1">
                Open or create a project to explore workspace files.
              </p>
            </div>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-crafted-surface px-3 py-1.5 text-xs font-medium text-crafted-text border border-crafted-border hover:border-crafted-border-bright transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5 text-crafted-brand-rust" />
              <span>Create Project</span>
            </button>
          </div>
        ) : activeProject.isMissing ? (
          <div className="p-4 text-center text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-lg mt-4">
            Project folder no longer exists at:
            <div className="font-mono text-[10px] text-crafted-text-dim mt-1 break-all">
              {activeProject.path}
            </div>
          </div>
        ) : !displayedTree ? (
          <div className="p-6 text-center text-xs text-crafted-text-muted">
            No matching files found.
          </div>
        ) : (
          <TreeNodeItem node={displayedTree} />
        )}
      </div>
    </div>
  );
};
