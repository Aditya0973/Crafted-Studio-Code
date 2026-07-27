export interface WorkspacePanelDefinition {
  id: string;
  title: string;
  minSize: number; // in pixels
  defaultSize: number; // relative proportion e.g. 0.25
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
  panelVisibility?: Record<string, boolean>;
  panelOrder?: string[];
  panelProportions?: Record<string, number>;
  focusModePanel?: string | null;
  leftSidebarWidth?: number;
  rightSidebarWidth?: number;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  centerSplitRatio?: number;
  chatCollapsed?: boolean;
  workbenchCollapsed?: boolean;
  bottomPanelHeight?: number;
  bottomPanelCollapsed?: boolean;
  bottomPanelActiveTab?: 'terminal' | 'problems' | 'output';
}

export interface AppSettings {
  theme: 'dark';
  logoPath?: string;
  appName: string;
  version: string;
  activeProjectId?: string;
}

export interface AISettings {
  activeProviderId: string;
  ollamaBaseUrl: string;
  ollamaActiveModel: string;
  enabledProviders: string[];
}

export interface ProjectConfig {
  name: string;
  createdAt: string;
  updatedAt: string;
  template: string;
  version: string;
  projectType?: string;
  description?: string;
  blueprintId?: string;
  selectedModules?: string[];
  currentStage?: string;
  completedChecklistItems?: string[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  template: string;
  version: string;
  projectType?: string;
  description?: string;
  blueprintId: string;
  selectedModules: string[];
  currentStage: string;
  completedChecklistItems: string[];
  completionPercentage: number;
  isMissing?: boolean;
}

export interface RecentProject {
  id: string;
  projectId: string;
  name: string;
  path: string;
  lastOpenedAt: string;
}

export interface CreateProjectInput {
  name: string;
  parentPath: string;
  template?: string;
  description?: string;
  blueprintId?: string;
  selectedModules?: string[];
  currentStage?: string;
}

export interface ImportProjectInput {
  projectPath: string;
  name?: string;
  template?: string;
  description?: string;
  blueprintId?: string;
  selectedModules?: string[];
}

export interface ImportProposal {
  isImportRequired: true;
  projectPath: string;
  folderName: string;
  detectedType: string;
}

export type OpenProjectResult = Project | ImportProposal;

export type TreeNodeType = 'file' | 'directory';

export interface TreeNodeMetadata {
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored';
  isAiContext?: boolean;
  isMemoryFile?: boolean;
  badge?: string;
  sizeBytes?: number;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: TreeNodeType;
  extension?: string;
  children?: TreeNode[];
  depth: number;
  parentId?: string | null;
  metadata?: TreeNodeMetadata;
}

export interface ExplorerScanOptions {
  maxDepth?: number;
  ignoreGlobs?: string[];
}

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface MessageMetadata {
  model?: string;
  provider?: string;
  tokensUsage?: { prompt: number; completion: number; total: number };
  thinking?: string;
  toolCalls?: unknown[];
  citations?: string[];
  attachments?: string[];
  error?: string;
  agentId?: string;
  agentName?: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  metadata?: MessageMetadata;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface CreateMessageInput {
  projectId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
}

// Workbench & Editor Registry Types
export type EditorType = 'monaco' | 'text-viewer' | 'image-viewer' | 'unknown';

export interface EditorDefinition {
  id: EditorType;
  name: string;
  extensions: string[];
}

export interface TabStateMetadata {
  scrollTop?: number;
  cursorLine?: number;
  cursorColumn?: number;
  zoomLevel?: number;
  viewState?: unknown;
  updatedAtOnDisk?: string;
  [key: string]: unknown;
}

export interface TabItem {
  id: string;
  path: string;
  title: string;
  editorId: EditorType;
  extension: string;
  isDirty?: boolean;
  content?: string;
  originalContent?: string;
  stateMetadata?: TabStateMetadata;
}

export interface WorkbenchSession {
  projectId: string;
  activeTabPath: string | null;
  tabs: TabItem[];
}

export interface FileContentResult {
  path: string;
  content: string;
  sizeBytes: number;
  isBinary?: boolean;
}

export interface StreamStartPayload {
  conversationId: string;
  messageId: string;
  role: MessageRole;
  initialContent: string;
}

export interface StreamTokenPayload {
  conversationId: string;
  messageId: string;
  token: string;
  fullText: string;
}

export interface StreamEndPayload {
  conversationId: string;
  messageId: string;
  fullText: string;
}

export interface BootstrapState {
  isReady: boolean;
  appSettings: AppSettings;
  aiSettings: AISettings;
  activeProject: Project | null;
  recentProjects: RecentProject[];
  providerStatuses: unknown[];
}

export interface TerminalSessionMeta {
  id: string;
  title: string;
  cwd: string;
}

export const IPC_CHANNELS = {
  APP_GET_BOOTSTRAP_STATE: 'app:get-bootstrap-state',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_RESTORE: 'window:restore',
  WINDOW_CLOSE: 'window:close',
  WINDOW_GET_STATE: 'window:get-state',
  WINDOW_SAVE_LAYOUT: 'window:save-layout',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_IMPORT: 'project:import',
  PROJECT_SWITCH: 'project:switch',
  PROJECT_GET_ACTIVE: 'project:get-active',
  PROJECT_LIST_RECENT: 'project:list-recent',
  PROJECT_DELETE: 'project:delete',
  PROJECT_UPDATE_WORKFLOW: 'project:update-workflow',
  PROJECT_OPEN_FOLDER: 'project:open-folder',
  DIALOG_SELECT_FOLDER: 'dialog:select-folder',
  EXPLORER_SCAN: 'explorer:scan',
  EXPLORER_GET_EXPANDED: 'explorer:get-expanded',
  EXPLORER_SAVE_EXPANDED: 'explorer:save-expanded',
  CHAT_GET_CONVERSATION: 'chat:get-conversation',
  CHAT_GET_MESSAGES: 'chat:get-messages',
  CHAT_SEND_MESSAGE: 'chat:send-message',
  CHAT_CANCEL_GENERATION: 'chat:cancel-generation',
  CHAT_CLEAR_CONVERSATION: 'chat:clear-conversation',
  FILE_READ_TEXT: 'file:read-text',
  FILE_WRITE_TEXT: 'file:write-text',
  FILE_GET_STATS: 'file:get-stats',
  FILE_READ_DATA_URL: 'file:read-data-url',
  WORKBENCH_GET_SESSION: 'workbench:get-session',
  WORKBENCH_SAVE_SESSION: 'workbench:save-session',
  AI_GET_SETTINGS: 'ai:get-settings',
  AI_SAVE_SETTINGS: 'ai:save-settings',
  AI_GET_STATUSES: 'ai:get-statuses',
  AI_LIST_MODELS: 'ai:list-models',
  AI_TEST_CONNECTION: 'ai:test-connection',
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  PROJECT_DETECT_CONFIG: 'project:detect-config',
  PROJECT_SAVE_CONFIG: 'project:save-config',
  GIT_GET_INFO: 'git:get-info',
  GIT_SET_REMOTE: 'git:set-remote',
  GIT_GET_NEXT_COMMIT_MSG: 'git:get-next-commit-msg',
} as const;

export interface ICcraftedAPI {
  getBootstrapState: () => Promise<BootstrapState>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  restoreWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getWindowState: () => Promise<WindowState>;
  saveLayoutState: (state: Partial<WindowState>) => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  setSetting: (key: keyof AppSettings, value: unknown) => Promise<boolean>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  openProject: (projectPath?: string) => Promise<OpenProjectResult>;
  importProject: (input: ImportProjectInput) => Promise<Project>;
  switchProject: (projectId: string) => Promise<Project | null>;
  getActiveProject: () => Promise<Project | null>;
  getRecentProjects: () => Promise<RecentProject[]>;
  deleteProject: (projectId: string) => Promise<boolean>;
  updateProjectWorkflow: (projectId: string, update: { currentStage?: string; completedChecklistItems?: string[] }) => Promise<Project | null>;
  openProjectFolder: (folderPath: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  scanExplorerTree: (projectPath: string, options?: ExplorerScanOptions) => Promise<TreeNode | null>;
  getExpandedPaths: (projectId: string) => Promise<string[]>;
  saveExpandedPaths: (projectId: string, expandedPaths: string[]) => Promise<boolean>;
  getConversation: (projectId: string) => Promise<Conversation>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (input: CreateMessageInput) => Promise<Message>;
  cancelGeneration: (conversationId: string) => Promise<boolean>;
  clearConversation: (projectId: string) => Promise<boolean>;
  readFileText: (filePath: string) => Promise<FileContentResult>;
  writeFileText: (filePath: string, content: string) => Promise<boolean>;
  getFileStats: (filePath: string) => Promise<{ sizeBytes: number; updatedAt: string } | null>;
  readFileDataUrl: (filePath: string) => Promise<string>;
  getWorkbenchSession: (projectId: string) => Promise<WorkbenchSession>;
  saveWorkbenchSession: (projectId: string, activeTabPath: string | null, tabs: TabItem[]) => Promise<boolean>;
  getAISettings: () => Promise<AISettings>;
  saveAISettings: (settings: Partial<AISettings>) => Promise<boolean>;
  getAIStatuses: () => Promise<unknown[]>;
  listAIModels: (providerId: string) => Promise<unknown[]>;
  testAIConnection: (providerId: string, baseUrl?: string) => Promise<{ isAvailable: boolean; error?: string }>;
  terminalCreate: (options: { id: string; cwd: string; shellPath?: string; cols?: number; rows?: number }) => Promise<boolean>;
  terminalData: (id: string, data: string) => void;
  terminalResize: (id: string, cols: number, rows: number) => void;
  terminalClose: (id: string) => void;
  onTerminalData: (id: string, callback: (data: string) => void) => () => void;
  onTerminalExit: (id: string, callback: (code: number) => void) => () => void;
  detectProjectConfig: (projectPath: string) => Promise<unknown>;
  saveProjectConfig: (projectPath: string, config: unknown) => Promise<boolean>;
  getGitInfo: (projectPath: string) => Promise<unknown>;
  setGitRemote: (projectPath: string, repoUrl: string) => Promise<boolean>;
  getGitNextCommitMsg: (projectPath: string, userMsg?: string) => Promise<string>;
  onStreamStart: (callback: (payload: StreamStartPayload) => void) => () => void;
  onStreamToken: (callback: (payload: StreamTokenPayload) => void) => () => void;
  onStreamEnd: (callback: (payload: StreamEndPayload) => void) => () => void;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    craftedAPI: ICcraftedAPI;
  }
}
