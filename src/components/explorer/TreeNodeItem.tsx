import React from 'react';
import { ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import { TreeNode } from '../../shared/types';
import { useExplorerStore, normalizePathKey } from '../../stores/explorerStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { cn } from '../../utils/cn';
import { getFileIcon } from '../../services/FileIconService';

interface TreeNodeItemProps {
  node: TreeNode;
}

export const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ node }) => {
  const { expandedPaths, selectedPath, toggleExpanded, selectNode } = useExplorerStore();
  const { openFile, activeTabPath } = useWorkbenchStore();

  const isDir = node.type === 'directory';
  const nodeKey = normalizePathKey(node.path);
  const isExpanded = expandedPaths.has(nodeKey);
  const isActiveTab = activeTabPath ? normalizePathKey(activeTabPath) === nodeKey : false;
  const isSelected = selectedPath ? normalizePathKey(selectedPath) === nodeKey : false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.path);
    if (isDir) {
      toggleExpanded(node.path);
    } else {
      openFile(node.path);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDir) {
      openFile(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ paddingLeft: `${node.depth * 12 + 6}px` }}
        className={cn(
          'group flex items-center justify-between rounded-md py-1 pr-2 text-xs transition-colors duration-150 cursor-pointer select-none',
          isActiveTab
            ? 'bg-crafted-surface border border-crafted-brand-rust/60 text-crafted-text font-bold shadow-sm'
            : isSelected
            ? 'bg-crafted-surface/50 text-crafted-text'
            : 'text-crafted-text-muted hover:bg-crafted-surface/60 hover:text-crafted-text'
        )}
      >
        <div className="flex items-center space-x-1.5 min-w-0 truncate">
          {/* Chevron for directories */}
          {isDir ? (
            <span className="text-crafted-text-dim shrink-0 hover:text-crafted-text">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {/* Unified File Icon */}
          {getFileIcon(node.name || node.path, { isDirectory: isDir, isExpanded })}

          {/* Node Name */}
          <span className="truncate text-xs tracking-tight">{node.name}</span>
        </div>

        {/* Extensible Metadata Badges Slot */}
        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {node.metadata?.isMemoryFile && (
            <span
              title="Project Memory"
              className="flex items-center space-x-0.5 rounded bg-amber-500/10 px-1 py-0.2 font-mono text-[9px] text-amber-400 border border-amber-500/20"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>MEM</span>
            </span>
          )}
        </div>
      </div>

      {/* Recursive Children List */}
      {isDir && isExpanded && node.children && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <TreeNodeItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};
