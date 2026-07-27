import React, { useState } from 'react';
import { FolderTree, Target } from 'lucide-react';
import { ExplorerPanel } from './ExplorerPanel';
import { ProjectSwitcher } from './ProjectSwitcher';
import { ProjectWorkflowPanel } from '../workflow/ProjectWorkflowPanel';
import { cn } from '../../utils/cn';

interface LeftSidebarProps {
  width?: number;
  isDragging?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ width, isDragging = false }) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'workflow'>('explorer');

  return (
    <aside
      style={{
        width: width ? `${width}px` : '100%',
        transition: isDragging ? 'none' : 'width 0.2s ease-in-out',
      }}
      className={cn(
        'flex flex-col h-full border-r border-crafted-border bg-crafted-panel/90 text-crafted-text shrink-0 relative select-none z-20 overflow-hidden font-sans'
      )}
    >
      {/* Top Sidebar Header with Segmented Tab Control */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-crafted-border/60 bg-crafted-bg/60">
        <div className="flex items-center rounded-lg bg-crafted-surface p-0.5 border border-crafted-border/80 flex-1 box-border">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex flex-1 items-center justify-center space-x-1.5 rounded-md py-1 px-2 text-xs font-bold transition-colors duration-150 border ${
              activeTab === 'explorer'
                ? 'bg-crafted-bg text-crafted-text border-crafted-border/80 shadow-sm'
                : 'border-transparent text-crafted-text-dim hover:text-crafted-text'
            }`}
          >
            <FolderTree className={`h-3.5 w-3.5 ${activeTab === 'explorer' ? 'text-cyan-400' : 'text-crafted-text-dim'}`} />
            <span>Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex flex-1 items-center justify-center space-x-1.5 rounded-md py-1 px-2 text-xs font-bold transition-colors duration-150 border ${
              activeTab === 'workflow'
                ? 'bg-crafted-bg text-crafted-text border-crafted-border/80 shadow-sm'
                : 'border-transparent text-crafted-text-dim hover:text-crafted-text'
            }`}
          >
            <Target className={`h-3.5 w-3.5 ${activeTab === 'workflow' ? 'text-crafted-brand-rust' : 'text-crafted-text-dim'}`} />
            <span>Workflow</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'explorer' ? <ExplorerPanel /> : <ProjectWorkflowPanel />}
      </div>

      {/* Bottom Project Switcher */}
      <ProjectSwitcher />
    </aside>
  );
};
