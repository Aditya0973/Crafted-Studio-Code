import { create } from 'zustand';
import { Command, DEFAULT_COMMANDS, ShortcutConflict } from '../shared/types/commandTypes';

type CommandHandler = () => void | Promise<void>;

// Store non-reactive handlers outside Zustand state to prevent infinite re-render loops on registration
const handlersMap = new Map<string, CommandHandler>();

interface ShortcutState {
  commands: Command[];
  searchQuery: string;
  recordingCommandId: string | null;
  pendingConflict: ShortcutConflict | null;
  isLoaded: boolean;

  // Actions
  loadShortcuts: () => Promise<void>;
  registerHandler: (commandId: string, handler: CommandHandler) => () => void;
  executeCommand: (commandId: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  setRecordingCommandId: (commandId: string | null) => void;
  updateShortcut: (commandId: string, newShortcut: string, forceReplace?: boolean) => Promise<boolean>;
  resetShortcut: (commandId: string) => Promise<void>;
  resetAllShortcuts: () => Promise<void>;
  clearPendingConflict: () => void;
  exportShortcuts: () => string;
  importShortcuts: (jsonStr: string) => Promise<boolean>;
}

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  commands: DEFAULT_COMMANDS,
  searchQuery: '',
  recordingCommandId: null,
  pendingConflict: null,
  isLoaded: false,

  loadShortcuts: async () => {
    try {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        const settings = await window.craftedAPI.getSettings();
        let savedOverrides = (settings as any)?.keybindings;

        if (typeof savedOverrides === 'string') {
          try {
            savedOverrides = JSON.parse(savedOverrides);
          } catch {}
        }

        if (savedOverrides && typeof savedOverrides === 'object' && !Array.isArray(savedOverrides)) {
          const updatedCommands = get().commands.map((cmd) => {
            if (savedOverrides[cmd.id] && typeof savedOverrides[cmd.id] === 'string') {
              const customShortcut = savedOverrides[cmd.id];
              return {
                ...cmd,
                currentShortcut: customShortcut,
                isRemapped: customShortcut !== cmd.defaultShortcut,
              };
            }
            return cmd;
          });
          set({ commands: updatedCommands, isLoaded: true });
          return;
        }
      }
      set({ isLoaded: true });
    } catch (err) {
      console.error('[shortcutStore] Failed to load keybindings from settings:', err);
      set({ isLoaded: true });
    }
  },

  registerHandler: (commandId: string, handler: CommandHandler) => {
    handlersMap.set(commandId, handler);
    return () => {
      handlersMap.delete(commandId);
    };
  },

  executeCommand: async (commandId: string) => {
    const handler = handlersMap.get(commandId);
    if (handler) {
      try {
        await handler();
        return true;
      } catch (err) {
        console.error(`[shortcutStore] Error executing command ${commandId}:`, err);
      }
    }
    return false;
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setRecordingCommandId: (commandId: string | null) => set({ recordingCommandId: commandId }),

  updateShortcut: async (commandId: string, newShortcut: string, forceReplace = false) => {
    const { commands } = get();
    const targetCommand = commands.find((c) => c.id === commandId);
    if (!targetCommand) return false;

    // Check for conflict with existing binding
    const conflicting = commands.find(
      (c) => c.id !== commandId && c.currentShortcut.toLowerCase() === newShortcut.toLowerCase()
    );

    if (conflicting && !forceReplace) {
      set({
        pendingConflict: {
          commandId,
          conflictingCommandId: conflicting.id,
          shortcut: newShortcut,
          commandLabel: targetCommand.label,
          conflictingCommandLabel: conflicting.label,
        },
      });
      return false;
    }

    // Apply update and unbind conflict if forceReplace is true
    const updatedCommands = commands.map((cmd) => {
      if (cmd.id === commandId) {
        return {
          ...cmd,
          currentShortcut: newShortcut,
          isRemapped: newShortcut !== cmd.defaultShortcut,
        };
      }
      if (conflicting && forceReplace && cmd.id === conflicting.id) {
        return {
          ...cmd,
          currentShortcut: '',
          isRemapped: true,
        };
      }
      return cmd;
    });

    set({ commands: updatedCommands, recordingCommandId: null, pendingConflict: null });

    // Save to settings DB
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const overridesMap: Record<string, string> = {};
      updatedCommands.forEach((c) => {
        if (c.isRemapped) {
          overridesMap[c.id] = c.currentShortcut;
        }
      });
      await window.craftedAPI.setSetting('keybindings' as any, overridesMap);
    }
    return true;
  },

  resetShortcut: async (commandId: string) => {
    const { commands } = get();
    const targetCommand = commands.find((c) => c.id === commandId);
    if (!targetCommand) return;

    await get().updateShortcut(commandId, targetCommand.defaultShortcut, true);
  },

  resetAllShortcuts: async () => {
    const resetCommands = DEFAULT_COMMANDS.map((cmd) => ({
      ...cmd,
      currentShortcut: cmd.defaultShortcut,
      isRemapped: false,
    }));

    set({ commands: resetCommands, recordingCommandId: null, pendingConflict: null });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.setSetting('keybindings' as any, {});
    }
  },

  clearPendingConflict: () => set({ pendingConflict: null }),

  exportShortcuts: () => {
    const overridesMap: Record<string, string> = {};
    get().commands.forEach((c) => {
      if (c.isRemapped) {
        overridesMap[c.id] = c.currentShortcut;
      }
    });
    return JSON.stringify(overridesMap, null, 2);
  },

  importShortcuts: async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        const updatedCommands = get().commands.map((cmd) => {
          if (parsed[cmd.id]) {
            return {
              ...cmd,
              currentShortcut: String(parsed[cmd.id]),
              isRemapped: String(parsed[cmd.id]) !== cmd.defaultShortcut,
            };
          }
          return cmd;
        });

        set({ commands: updatedCommands });
        if (typeof window !== 'undefined' && window.craftedAPI) {
          await window.craftedAPI.setSetting('keybindings' as any, parsed);
        }
        return true;
      }
    } catch {
      /* Invalid JSON */
    }
    return false;
  },
}));
