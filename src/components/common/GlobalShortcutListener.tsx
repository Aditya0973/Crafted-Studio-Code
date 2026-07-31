import React, { useEffect } from 'react';
import { useShortcutStore } from '../../stores/shortcutStore';
import { useToolDockStore } from '../../stores/toolDockStore';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { useExplorerStore } from '../../stores/explorerStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { useProjectStore } from '../../stores/projectStore';

export const GlobalShortcutListener: React.FC = () => {
  const { commands, executeCommand, loadShortcuts, isLoaded, recordingCommandId } = useShortcutStore();
  const { tools, setActiveTool } = useToolDockStore();
  const { isSettingsOpen, setSettingsOpen } = useAISettingsStore();
  const { createModal, deleteConfirmModal, setRenameInputPath, setContextMenu } = useExplorerStore();

  useEffect(() => {
    try {
      if (!isLoaded) {
        loadShortcuts();
      }
    } catch (err) {
      console.error('[GlobalShortcutListener] Failed to load shortcuts:', err);
    }
  }, [isLoaded, loadShortcuts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        const activeElement = document.activeElement as HTMLElement | null;

        // Check if cursor is inside Monaco Editor
        const isInsideMonaco = !!activeElement?.closest('.monaco-editor');

        // 1. GLOBAL ESCAPE KEY HANDLER (Closes popups, modals, context menus, unfocuses input, cancels rename)
        if (e.key === 'Escape') {
          let handled = false;

          // Cancel File Explorer Inline Rename
          if (useExplorerStore.getState().renameInputPath) {
            setRenameInputPath(null);
            handled = true;
          }

          // Close File Explorer Context Menu
          if (useExplorerStore.getState().contextMenu) {
            setContextMenu(null);
            handled = true;
          }

          // Close Settings Modal if open
          if (isSettingsOpen) {
            setSettingsOpen(false);
            handled = true;
          }

          // Unfocus active input / textarea
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.blur();
            handled = true;
          }

          if (handled) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }

        // 2. DISABLE ALL SHORTCUT COMMANDS WHEN IN SETTINGS MODAL, RECORDING SHORTCUT, OR CREATING/DELETING MODAL IS OPEN
        if (isSettingsOpen || recordingCommandId || createModal || deleteConfirmModal) {
          return;
        }

        // Construct normalized key combination string (e.g. Ctrl+Shift+N, Ctrl+Alt+1, F2, Delete)
        const parts: string[] = [];
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        let key = e.key;
        if (!key || key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
          return; // Don't trigger on modifier key press alone
        }

        if (key === ' ') key = 'Space';
        else if (key.length === 1) key = key.toUpperCase();

        parts.push(key);
        const pressedShortcut = parts.join('+');

        // 3. MONACO NATIVE SHORTCUT BYPASS: If inside Monaco Editor, let Monaco handle Ctrl+S, Ctrl+F, Ctrl+H, Ctrl+/, Ctrl+Z, Ctrl+Y natively!
        if (isInsideMonaco) {
          if (pressedShortcut === 'Ctrl+S') {
            e.preventDefault();
            useWorkbenchStore.getState().saveActiveTab();
            return;
          }
          if (
            pressedShortcut === 'Ctrl+F' ||
            pressedShortcut === 'Ctrl+H' ||
            pressedShortcut === 'Ctrl+/' ||
            pressedShortcut === 'Ctrl+Z' ||
            pressedShortcut === 'Ctrl+Y' ||
            pressedShortcut === 'Ctrl+A'
          ) {
            // Let Monaco handle find/replace/comment/undo/redo natively
            return;
          }
        }

        // Check text input focus context
        const isInputFocused =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable);

        // 4. DYNAMIC TOOL DOCK SHORTCUTS (Ctrl+Alt+1..9 bound dynamically to Tool Dock order)
        const safeTools = Array.isArray(tools) ? tools : [];
        if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && /^Digit[1-9]$|^[1-9]$/.test(e.code || e.key)) {
          const indexStr = (e.code ? e.code.replace('Digit', '') : e.key);
          const index = parseInt(indexStr, 10) - 1;
          if (index >= 0 && index < safeTools.length) {
            e.preventDefault();
            e.stopPropagation();
            setActiveTool(safeTools[index].id);
            return;
          }
        }

        // Match pressed shortcut against registered commands
        const safeCommands = Array.isArray(commands) ? commands : [];
        const matchedCmd = safeCommands.find(
          (cmd) => cmd.currentShortcut && cmd.currentShortcut.toLowerCase() === pressedShortcut.toLowerCase()
        );

        if (matchedCmd) {
          // Protect text typing inside inputs unless Ctrl/Alt modifier is used or hotkey is F2/F11/Delete
          if (
            isInputFocused &&
            !e.ctrlKey &&
            !e.altKey &&
            !e.metaKey &&
            pressedShortcut !== 'F2' &&
            pressedShortcut !== 'F11' &&
            pressedShortcut !== 'Escape'
          ) {
            return;
          }

          // Special Cases
          if (matchedCmd.id === 'explorer.focus') {
            e.preventDefault();
            e.stopPropagation();
            useLayoutStore.getState().setPanelVisibility('explorer', true);
            setTimeout(() => {
              const input = document.getElementById('explorer-search-input');
              if (input) input.focus();
            }, 50);
            return;
          }

          if (matchedCmd.id === 'chat.focusInput') {
            e.preventDefault();
            e.stopPropagation();
            useLayoutStore.getState().setPanelVisibility('chat', true);
            setTimeout(() => {
              const chatInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement | null;
              if (chatInput) {
                chatInput.focus();
                chatInput.select();
              }
            }, 50);
            return;
          }

          if (matchedCmd.id === 'workspace.openRecent') {
            e.preventDefault();
            e.stopPropagation();
            useProjectStore.getState().setRecentMenuOpen(true);
            return;
          }

          if (matchedCmd.id === 'editor.save') {
            e.preventDefault();
            e.stopPropagation();
            useWorkbenchStore.getState().saveActiveTab();
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          executeCommand(matchedCmd.id);
        }
      } catch (err) {
        console.error('[GlobalShortcutListener] KeyDown handler exception:', err);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [commands, executeCommand, tools, setActiveTool, isSettingsOpen, setSettingsOpen, createModal, deleteConfirmModal, recordingCommandId, setRenameInputPath, setContextMenu]);

  return null;
};
