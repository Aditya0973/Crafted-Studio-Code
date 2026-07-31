export type CommandCategory =
  | 'Explorer'
  | 'Editor'
  | 'Chat'
  | 'Panels'
  | 'Tool Dock'
  | 'Workspace';

export interface Command {
  id: string;
  category: CommandCategory;
  label: string;
  description?: string;
  defaultShortcut: string;
  currentShortcut: string;
  isRemapped?: boolean;
}

export interface ShortcutConflict {
  commandId: string;
  conflictingCommandId: string;
  shortcut: string;
  commandLabel: string;
  conflictingCommandLabel: string;
}

export const DEFAULT_COMMANDS: Command[] = [
  // Explorer Commands
  { id: 'explorer.newFile', category: 'Explorer', label: 'New File', description: 'Create a new file in workspace', defaultShortcut: 'Ctrl+N', currentShortcut: 'Ctrl+N' },
  { id: 'explorer.newFolder', category: 'Explorer', label: 'New Folder', description: 'Create a new folder in workspace', defaultShortcut: 'Ctrl+Shift+N', currentShortcut: 'Ctrl+Shift+N' },
  { id: 'explorer.rename', category: 'Explorer', label: 'Rename Item', description: 'Rename selected file or folder', defaultShortcut: 'F2', currentShortcut: 'F2' },
  { id: 'explorer.trash', category: 'Explorer', label: 'Move to Recycle Bin', description: 'Move selected file or folder to Recycle Bin', defaultShortcut: 'Delete', currentShortcut: 'Delete' },
  { id: 'explorer.duplicate', category: 'Explorer', label: 'Duplicate Item', description: 'Duplicate selected file or folder', defaultShortcut: 'Ctrl+D', currentShortcut: 'Ctrl+D' },
  { id: 'explorer.focus', category: 'Explorer', label: 'Focus Explorer', description: 'Focus File Explorer panel', defaultShortcut: 'Ctrl+Shift+E', currentShortcut: 'Ctrl+Shift+E' },

  // Panel Commands (Bound to Panel Identity)
  { id: 'panels.toggleExplorer', category: 'Panels', label: 'Toggle Explorer Panel', description: 'Focus or toggle File Explorer panel', defaultShortcut: 'Ctrl+1', currentShortcut: 'Ctrl+1' },
  { id: 'panels.toggleChat', category: 'Panels', label: 'Toggle Chat Panel', description: 'Focus or toggle AI Chat panel', defaultShortcut: 'Ctrl+2', currentShortcut: 'Ctrl+2' },
  { id: 'panels.toggleEditor', category: 'Panels', label: 'Toggle Editor Panel', description: 'Focus or toggle Code Editor panel', defaultShortcut: 'Ctrl+3', currentShortcut: 'Ctrl+3' },
  { id: 'panels.toggleToolDock', category: 'Panels', label: 'Toggle Tool Dock', description: 'Focus or toggle Tool Dock panel', defaultShortcut: 'Ctrl+4', currentShortcut: 'Ctrl+4' },

  // Tool Dock Commands (Bound to Tool Dock Order)
  { id: 'toolDock.launch1', category: 'Tool Dock', label: 'Launch Tool #1', description: 'Launch tool at Tool Dock index 1', defaultShortcut: 'Ctrl+Alt+1', currentShortcut: 'Ctrl+Alt+1' },
  { id: 'toolDock.launch2', category: 'Tool Dock', label: 'Launch Tool #2', description: 'Launch tool at Tool Dock index 2', defaultShortcut: 'Ctrl+Alt+2', currentShortcut: 'Ctrl+Alt+2' },
  { id: 'toolDock.launch3', category: 'Tool Dock', label: 'Launch Tool #3', description: 'Launch tool at Tool Dock index 3', defaultShortcut: 'Ctrl+Alt+3', currentShortcut: 'Ctrl+Alt+3' },
  { id: 'toolDock.launch4', category: 'Tool Dock', label: 'Launch Tool #4', description: 'Launch tool at Tool Dock index 4', defaultShortcut: 'Ctrl+Alt+4', currentShortcut: 'Ctrl+Alt+4' },
  { id: 'toolDock.launch5', category: 'Tool Dock', label: 'Launch Tool #5', description: 'Launch tool at Tool Dock index 5', defaultShortcut: 'Ctrl+Alt+5', currentShortcut: 'Ctrl+Alt+5' },
  { id: 'toolDock.launch6', category: 'Tool Dock', label: 'Launch Tool #6', description: 'Launch tool at Tool Dock index 6', defaultShortcut: 'Ctrl+Alt+6', currentShortcut: 'Ctrl+Alt+6' },

  // Editor Commands (Standard Monaco / VS Code Defaults)
  { id: 'editor.save', category: 'Editor', label: 'Save File', description: 'Save current active file', defaultShortcut: 'Ctrl+S', currentShortcut: 'Ctrl+S' },
  { id: 'editor.find', category: 'Editor', label: 'Find in File', description: 'Open find widget in editor', defaultShortcut: 'Ctrl+F', currentShortcut: 'Ctrl+F' },
  { id: 'editor.replace', category: 'Editor', label: 'Replace in File', description: 'Open replace widget in editor', defaultShortcut: 'Ctrl+H', currentShortcut: 'Ctrl+H' },
  { id: 'editor.toggleComment', category: 'Editor', label: 'Toggle Line Comment', description: 'Comment or uncomment line', defaultShortcut: 'Ctrl+/', currentShortcut: 'Ctrl+/' },

  // Chat Commands
  { id: 'chat.focusInput', category: 'Chat', label: 'Focus Chat Input', description: 'Focus AI Chat input box', defaultShortcut: 'Ctrl+L', currentShortcut: 'Ctrl+L' },
  { id: 'chat.sendMessage', category: 'Chat', label: 'Send Message', description: 'Submit message to AI Assistant', defaultShortcut: 'Enter', currentShortcut: 'Enter' },

  // Workspace Commands
  { id: 'workspace.openFolder', category: 'Workspace', label: 'Open Folder', description: 'Open project folder picker', defaultShortcut: 'Ctrl+O', currentShortcut: 'Ctrl+O' },
  { id: 'workspace.openRecent', category: 'Workspace', label: 'Open Recent Projects', description: 'Open recent projects selector', defaultShortcut: 'Ctrl+Shift+O', currentShortcut: 'Ctrl+Shift+O' },
  { id: 'workspace.openSettings', category: 'Workspace', label: 'Open Settings', description: 'Open Settings modal', defaultShortcut: 'Ctrl+,', currentShortcut: 'Ctrl+,' },
  { id: 'workspace.toggleFullscreen', category: 'Workspace', label: 'Toggle Fullscreen', description: 'Toggle application window fullscreen state', defaultShortcut: 'F11', currentShortcut: 'F11' },
];
