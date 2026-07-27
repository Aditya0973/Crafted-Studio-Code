import React, { useEffect } from 'react';
import { ShieldAlert, X, RotateCcw } from 'lucide-react';
import { TitleBar } from './TitleBar';
import { WorkspaceLayout } from './WorkspaceLayout';
import { CraftedGlow } from '../common/CraftedGlow';
import { GrainBackground } from '../common/GrainBackground';
import { useLayoutStore } from '../../stores/layoutStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { shortcutManager } from '../../services/ShortcutManager';

interface ShellLayoutProps {
  isSafeMode?: boolean;
  onDismissSafeMode?: () => void;
}

export const ShellLayout: React.FC<ShellLayoutProps> = ({ isSafeMode = false, onDismissSafeMode }) => {
  const {
    togglePanelVisibility,
    toggleBottomPanel,
  } = useLayoutStore();

  // Register Global Workspace Shortcuts in Centralized ShortcutManager
  useEffect(() => {
    shortcutManager.register({
      id: 'toggle-explorer',
      combo: 'ctrl+1',
      description: 'Toggle Explorer Panel',
      handler: () => togglePanelVisibility('explorer'),
    });

    shortcutManager.register({
      id: 'toggle-chat',
      combo: 'ctrl+2',
      description: 'Toggle Chat Panel',
      handler: () => togglePanelVisibility('chat'),
    });

    shortcutManager.register({
      id: 'toggle-editor',
      combo: 'ctrl+3',
      description: 'Toggle Editor Panel',
      handler: () => togglePanelVisibility('editor'),
    });

    shortcutManager.register({
      id: 'toggle-tooldock',
      combo: 'ctrl+4',
      description: 'Toggle Tool Dock Panel',
      handler: () => togglePanelVisibility('tooldock'),
    });

    shortcutManager.register({
      id: 'toggle-terminal',
      combo: 'ctrl+`',
      description: 'Toggle Integrated Terminal',
      handler: () => toggleBottomPanel('terminal'),
    });

    return () => {
      shortcutManager.unregister('toggle-explorer');
      shortcutManager.unregister('toggle-chat');
      shortcutManager.unregister('toggle-editor');
      shortcutManager.unregister('toggle-tooldock');
      shortcutManager.unregister('toggle-terminal');
    };
  }, [togglePanelVisibility, toggleBottomPanel]);

  const handleResetSession = () => {
    useWorkbenchStore.getState().closeAllTabs();
    if (onDismissSafeMode) onDismissSafeMode();
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-crafted-bg text-crafted-text overflow-hidden font-sans select-none">
      {/* Background layers */}
      <CraftedGlow />
      <GrainBackground />

      {/* Desktop TitleBar Header with Workspace Navigation Bar */}
      <TitleBar />

      {/* Inline Safe Mode Banner */}
      {isSafeMode && (
        <div className="no-drag flex h-9 items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 text-xs text-amber-200 shrink-0 z-30 font-sans">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-semibold">
              The previous session could not be restored. Crafted Studio has launched in Safe Mode.
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetSession}
              title="Clear all open tabs and reset workspace session"
              className="flex items-center space-x-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Session</span>
            </button>

            <button
              onClick={onDismissSafeMode}
              title="Dismiss banner notice"
              className="flex items-center space-x-1 rounded-md border border-crafted-border bg-crafted-surface px-2 py-1 text-xs text-crafted-text-dim hover:text-crafted-text transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout Shell */}
      <div className="relative flex-1 flex overflow-hidden z-10">
        <WorkspaceLayout />
      </div>
    </div>
  );
};
