import React from 'react';
import { ToolDock } from './ToolDock';
import { cn } from '../../utils/cn';

interface RightSidebarProps {
  width?: number;
  isDragging?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ width, isDragging = false }) => {
  return (
    <aside
      style={{
        width: width ? `${width}px` : '100%',
        transition: isDragging ? 'none' : 'width 0.2s ease-in-out',
      }}
      className={cn(
        'flex flex-col h-full border-l border-crafted-border bg-crafted-panel/90 text-crafted-text shrink-0 relative select-none z-20 overflow-hidden font-sans'
      )}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-crafted-border/40 bg-crafted-bg/40">
        <span className="font-mono text-[10px] uppercase tracking-wider text-crafted-text-dim">
          Tool Dock Container
        </span>
      </div>

      {/* Tool Dock Content */}
      <div className="flex-1 overflow-hidden">
        <ToolDock />
      </div>
    </aside>
  );
};
