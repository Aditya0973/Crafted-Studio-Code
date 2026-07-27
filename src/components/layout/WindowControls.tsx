import React from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { useWindowControls } from '../../hooks/useWindowControls';

export const WindowControls: React.FC = () => {
  const { isMaximized, minimize, toggleMaximize, close } = useWindowControls();

  return (
    <div className="flex items-center space-x-1 no-drag select-none z-50">
      {/* Minimize Button */}
      <button
        onClick={minimize}
        title="Minimize"
        className="flex h-8 w-9 items-center justify-center rounded-md text-crafted-text-muted transition-colors hover:bg-white/5 hover:text-crafted-text active:bg-white/10"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      {/* Maximize / Restore Button */}
      <button
        onClick={toggleMaximize}
        title={isMaximized ? 'Restore Down' : 'Maximize'}
        className="flex h-8 w-9 items-center justify-center rounded-md text-crafted-text-muted transition-colors hover:bg-white/5 hover:text-crafted-text active:bg-white/10"
      >
        {isMaximized ? (
          <Copy className="h-3 w-3 rotate-180" />
        ) : (
          <Square className="h-3 w-3" />
        )}
      </button>

      {/* Close Button */}
      <button
        onClick={close}
        title="Close"
        className="flex h-8 w-9 items-center justify-center rounded-md text-crafted-text-muted transition-colors hover:bg-red-500/90 hover:text-white active:bg-red-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
