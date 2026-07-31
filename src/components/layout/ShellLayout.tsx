import React, { useEffect } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { TitleBar } from './TitleBar';
import { WorkspaceLayout } from './WorkspaceLayout';
import { CraftedGlow } from '../common/CraftedGlow';
import { GrainBackground } from '../common/GrainBackground';
import { useLayoutStore } from '../../stores/layoutStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useShortcutStore } from '../../stores/shortcutStore';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { useProjectStore } from '../../stores/projectStore';

interface ShellLayoutProps {
  isSafeMode?: boolean;
  onDismissSafeMode?: () => void;
}

export const ShellLayout: React.FC<ShellLayoutProps> = ({ isSafeMode = false, onDismissSafeMode }) => {
  const { togglePanelVisibility } = useLayoutStore();
  const { setSettingsOpen, setActiveCategory } = useAISettingsStore();
  const { openProject } = useProjectStore();

  // Register Global Workspace & Panel Commands in Central Shortcut Store
  useEffect(() => {
    const registerHandler = useShortcutStore.getState().registerHandler;
    const unsubs = [
      registerHandler('panels.toggleExplorer', () => togglePanelVisibility('explorer')),
      registerHandler('panels.toggleChat', () => togglePanelVisibility('chat')),
      registerHandler('panels.toggleEditor', () => togglePanelVisibility('editor')),
      registerHandler('panels.toggleToolDock', () => togglePanelVisibility('tooldock')),
      registerHandler('workspace.openSettings', () => {
        setActiveCategory('keyboard-shortcuts');
        setSettingsOpen(true);
      }),
      registerHandler('workspace.openFolder', () => {
        openProject();
      }),
      registerHandler('workspace.toggleFullscreen', () => {
        if (typeof window !== 'undefined' && window.craftedAPI) {
          window.craftedAPI.getWindowState().then((state) => {
            if (state.isMaximized) {
              window.craftedAPI.restoreWindow();
            } else {
              window.craftedAPI.maximizeWindow();
            }
          });
        }
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [togglePanelVisibility, setSettingsOpen, setActiveCategory, openProject]);

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
          </div>
        </div>
      )}

      {/* Main Resizable Workspace Grid Engine */}
      <div className="flex-1 overflow-hidden relative">
        <WorkspaceLayout />
      </div>
    </div>
  );
};
