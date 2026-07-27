import React from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarToggleProps {
  side: 'left' | 'right';
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  side,
  isCollapsed,
  onToggle,
  className = '',
}) => {
  const getIcon = () => {
    if (side === 'left') {
      return isCollapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      );
    } else {
      return isCollapsed ? (
        <PanelRightOpen className="h-4 w-4" />
      ) : (
        <PanelRightClose className="h-4 w-4" />
      );
    }
  };

  return (
    <button
      onClick={onToggle}
      title={isCollapsed ? `Expand ${side} sidebar` : `Collapse ${side} sidebar`}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-crafted-text-muted transition-all hover:bg-crafted-surface-hover hover:text-crafted-text active:scale-95',
        className
      )}
    >
      {getIcon()}
    </button>
  );
};
