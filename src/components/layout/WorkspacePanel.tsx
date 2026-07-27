import React from 'react';
import { WorkspacePanelId } from '../../services/WorkspaceLayoutEngine';

interface WorkspacePanelProps {
  id: WorkspacePanelId;
  width: number;
  collapsed: boolean;
  isDragging?: boolean;
  children: React.ReactNode;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  width,
  collapsed,
  isDragging = false,
  children,
}) => {
  return (
    <div
      style={{
        width: collapsed ? 0 : `${width}px`,
        opacity: collapsed ? 0 : 1,
        transition: isDragging ? 'none' : 'width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-in-out',
      }}
      className={`flex flex-col h-full overflow-hidden shrink-0 relative select-none font-sans ${
        collapsed ? 'pointer-events-none' : ''
      }`}
    >
      {children}
    </div>
  );
};
