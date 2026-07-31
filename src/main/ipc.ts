import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { IPC_CHANNELS, AppSettings, WindowState, CreateProjectInput, ImportProjectInput, ExplorerScanOptions, CreateMessageInput, TabItem, AISettings, BootstrapState } from '../shared/types';
import { SettingsService } from '../services/SettingsService';
import { WindowService } from '../services/WindowService';
import { ProjectService } from '../services/ProjectService';
import { ExplorerService } from '../services/ExplorerService';
import { ChatService } from '../services/ChatService';
import { FileService } from '../services/FileService';
import { WorkbenchService } from '../services/WorkbenchService';
import { AISettingsService } from '../services/AISettingsService';
import { ProviderManager } from '../ai/ProviderManager';
import { PTYService } from '../services/PTYService';
import { ProjectDetectorService } from '../services/ProjectDetectorService';
import { GitService } from '../services/GitService';
import { ToolDockService } from '../services/ToolDockService';
import { Win32WindowService } from '../services/Win32WindowService';



export function setupIPCHandlers(mainWindow?: BrowserWindow): void {
  // Bootstrap State Initialization Handshake
  ipcMain.handle(IPC_CHANNELS.APP_GET_BOOTSTRAP_STATE, async (): Promise<BootstrapState> => {
    console.log('[IPC] APP_GET_BOOTSTRAP_STATE handshake triggered');
    await ProviderManager.initialize();
    const appSettings = SettingsService.getSettings();
    const aiSettings = AISettingsService.getAISettings();
    const activeProject = await ProjectService.getActiveProject();
    const recentProjects = await ProjectService.getRecentProjects();
    const providerStatuses = await ProviderManager.getProviderStatuses();

    return {
      isReady: true,
      appSettings,
      aiSettings,
      activeProject,
      recentProjects,
      providerStatuses,
    };
  });

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => mainWindow?.minimize());
  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle(IPC_CHANNELS.WINDOW_RESTORE, () => mainWindow?.restore());
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => mainWindow?.close());
  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_STATE, () => WindowService.getSavedState());
  ipcMain.handle(IPC_CHANNELS.WINDOW_SAVE_LAYOUT, (_event, state: Partial<WindowState>) =>
    WindowService.saveLayoutState(state)
  );

  // Settings Controls
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => SettingsService.getSettings());
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, key: keyof AppSettings, value: unknown) =>
    SettingsService.setSetting(key, value)
  );

  // Project Controls with Robust Folder Picker Dialog Fallback
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, (_event, input: CreateProjectInput) => {
    console.log('[IPC] -> [Main] -> [ProjectService] createProject:', input.name);
    return ProjectService.createProject(input);
  });
  ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN, async (_event, projectPath?: string) => {
    console.log(`[IPC] -> [Main] openProject requested for path: "${projectPath || 'dialog'}"`);
    try {
      let targetPath = projectPath;
      if (!targetPath && mainWindow) {
        const dialogResult = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Project Directory',
        });
        if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
          console.log('[Main] openProject folder dialog canceled');
          return null;
        }
        targetPath = dialogResult.filePaths[0];
      }

      if (!targetPath) {
        throw new Error('Project path must be provided');
      }

      const res = await ProjectService.openProject(targetPath);
      console.log(`[Main] -> [ProjectService] openProject SUCCESS:`, 'isImportRequired' in res ? `Import Required (${res.folderName})` : `Loaded Project (${res.name})`);
      return res;
    } catch (err) {
      console.error(`[Main] -> [ProjectService] openProject FAIL:`, err);
      throw err;
    }
  });
  ipcMain.handle(IPC_CHANNELS.PROJECT_IMPORT, (_event, input: ImportProjectInput) => {
    console.log('[IPC] -> [Main] -> [ProjectService] importProject:', input.name);
    return ProjectService.importProject(input);
  });
  ipcMain.handle(IPC_CHANNELS.PROJECT_SWITCH, (_event, projectId: string) => {
    console.log('[IPC] -> [Main] -> [ProjectService] switchProject:', projectId);
    return ProjectService.switchProject(projectId);
  });
  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_ACTIVE, () => ProjectService.getActiveProject());
  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST_RECENT, () => ProjectService.getRecentProjects());
  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, (_event, projectId: string) =>
    ProjectService.deleteProject(projectId)
  );
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_UPDATE_WORKFLOW,
    (_event, projectId: string, update: { currentStage?: string; completedChecklistItems?: string[] }) =>
      ProjectService.updateProjectWorkflow(projectId, update)
  );
  ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN_FOLDER, async (_event, folderPath: string) => {
    if (!folderPath) return false;
    const err = await shell.openPath(folderPath);
    return !err;
  });

  // Dialog Controls
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_FOLDER, async () => {
    console.log('[IPC] -> [Main] DIALOG_SELECT_FOLDER triggered');
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Project Directory',
    });
    if (result.canceled || result.filePaths.length === 0) {
      console.log('[Main] DIALOG_SELECT_FOLDER canceled by user');
      return null;
    }
    console.log('[Main] DIALOG_SELECT_FOLDER selected:', result.filePaths[0]);
    return result.filePaths[0];
  });

  // Explorer Controls
  ipcMain.handle(
    IPC_CHANNELS.EXPLORER_SCAN,
    (_event, projectPath: string, options?: ExplorerScanOptions) =>
      ExplorerService.scanTree(projectPath, options)
  );
  ipcMain.handle(IPC_CHANNELS.EXPLORER_GET_EXPANDED, (_event, projectId: string) =>
    ExplorerService.getExpandedPaths(projectId)
  );
  ipcMain.handle(
    IPC_CHANNELS.EXPLORER_SAVE_EXPANDED,
    (_event, projectId: string, expandedPaths: string[]) =>
      ExplorerService.saveExpandedPaths(projectId, expandedPaths)
  );

  // Chat & Conversation Controls
  ipcMain.handle(IPC_CHANNELS.CHAT_GET_CONVERSATION, (_event, projectId: string) =>
    ChatService.getOrCreateConversation(projectId)
  );
  ipcMain.handle(IPC_CHANNELS.CHAT_GET_MESSAGES, (_event, conversationId: string) =>
    ChatService.getMessages(conversationId)
  );
  ipcMain.handle(IPC_CHANNELS.CHAT_SEND_MESSAGE, (_event, input: CreateMessageInput) =>
    ChatService.sendMessage(input, mainWindow)
  );
  ipcMain.handle(IPC_CHANNELS.CHAT_CANCEL_GENERATION, (_event, conversationId: string) =>
    ChatService.cancelGeneration(conversationId)
  );
  ipcMain.handle(IPC_CHANNELS.CHAT_CLEAR_CONVERSATION, (_event, projectId: string) =>
    ChatService.clearConversation(projectId)
  );

  // File Operations Controls
  ipcMain.handle(IPC_CHANNELS.FILE_READ_TEXT, (_event, filePath: string) => FileService.readFileText(filePath));
  ipcMain.handle(IPC_CHANNELS.FILE_WRITE_TEXT, (_event, filePath: string, content: string) =>
    FileService.writeFileText(filePath, content)
  );
  ipcMain.handle(IPC_CHANNELS.FILE_GET_STATS, (_event, filePath: string) => FileService.getFileStats(filePath));
  ipcMain.handle(IPC_CHANNELS.FILE_READ_DATA_URL, (_event, filePath: string) => FileService.readFileDataUrl(filePath));
  ipcMain.handle(IPC_CHANNELS.FILE_CREATE, (_event, filePath: string, content?: string) => FileService.createFile(filePath, content));
  ipcMain.handle(IPC_CHANNELS.FILE_CREATE_DIR, (_event, folderPath: string) => FileService.createFolder(folderPath));
  ipcMain.handle(IPC_CHANNELS.FILE_RENAME, (_event, oldPath: string, newPath: string) => FileService.renamePath(oldPath, newPath));
  ipcMain.handle(IPC_CHANNELS.FILE_TRASH, (_event, targetPath: string) => FileService.trashItem(targetPath));
  ipcMain.handle(IPC_CHANNELS.FILE_DUPLICATE, (_event, targetPath: string) => FileService.duplicatePath(targetPath));

  // Workbench & Editor Session Controls
  ipcMain.handle(IPC_CHANNELS.WORKBENCH_GET_SESSION, (_event, projectId: string) =>
    WorkbenchService.getSession(projectId)
  );
  ipcMain.handle(
    IPC_CHANNELS.WORKBENCH_SAVE_SESSION,
    (_event, projectId: string, activeTabPath: string | null, tabs: TabItem[]) =>
      WorkbenchService.saveSession(projectId, activeTabPath, tabs)
  );

  // AI Provider & Settings Controls
  ipcMain.handle(IPC_CHANNELS.AI_GET_SETTINGS, () => AISettingsService.getAISettings());
  ipcMain.handle(IPC_CHANNELS.AI_SAVE_SETTINGS, (_event, settings: Partial<AISettings>) =>
    AISettingsService.saveAISettings(settings)
  );
  ipcMain.handle(IPC_CHANNELS.AI_GET_STATUSES, () => ProviderManager.getProviderStatuses());
  ipcMain.handle(IPC_CHANNELS.AI_LIST_MODELS, (_event, providerId: string) =>
    ProviderManager.listModels(providerId as any)
  );
  ipcMain.handle(
    IPC_CHANNELS.AI_TEST_CONNECTION,
    (_event, providerId: string, baseUrl?: string) =>
      ProviderManager.testConnection(providerId as any, baseUrl)
  );

  // Terminal PTY Handlers
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE,
    (_event, options: { id: string; cwd: string; shellPath?: string; cols?: number; rows?: number }) => {
      const instance = PTYService.getInstance().createPTY(options);
      instance.onData((data) => {
        mainWindow?.webContents.send(`${IPC_CHANNELS.TERMINAL_DATA}:${options.id}`, data);
      });
      instance.onExit((code) => {
        mainWindow?.webContents.send(`${IPC_CHANNELS.TERMINAL_CLOSE}:${options.id}`, code);
      });
      return true;
    }
  );
  ipcMain.on(IPC_CHANNELS.TERMINAL_DATA, (_event, id: string, data: string) => {
    const inst = PTYService.getInstance().getPTY(id);
    if (inst) inst.write(data);
  });
  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, id: string, cols: number, rows: number) => {
    const inst = PTYService.getInstance().getPTY(id);
    if (inst) inst.resize(cols, rows);
  });
  ipcMain.on(IPC_CHANNELS.TERMINAL_CLOSE, (_event, id: string) => {
    PTYService.getInstance().killPTY(id);
  });

  // Project Detector & Custom Run Configuration Handlers
  ipcMain.handle(IPC_CHANNELS.PROJECT_DETECT_CONFIG, (_event, projectPath: string) =>
    ProjectDetectorService.getInstance().detectProjectConfig(projectPath)
  );
  ipcMain.handle(IPC_CHANNELS.PROJECT_SAVE_CONFIG, (_event, projectPath: string, config: any) =>
    ProjectDetectorService.getInstance().saveProjectConfig(projectPath, config)
  );

  // Git Handlers
  ipcMain.handle(IPC_CHANNELS.GIT_GET_INFO, (_event, projectPath: string) =>
    GitService.getInstance().getGitInfo(projectPath)
  );
  ipcMain.handle(IPC_CHANNELS.GIT_SET_REMOTE, (_event, projectPath: string, repoUrl: string) =>
    GitService.getInstance().setRemoteUrl(projectPath, repoUrl)
  );
  ipcMain.handle(IPC_CHANNELS.GIT_GET_NEXT_COMMIT_MSG, (_event, projectPath: string, userMsg?: string) =>
    GitService.getInstance().getNextCommitMessage(projectPath, userMsg)
  );

  // Tool Dock Handlers
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_GET_ITEMS, () => ToolDockService.getTools());
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_ADD_ITEM, (_event, input: any) => ToolDockService.addTool(input));
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_UPDATE_ITEM, (_event, id: string, update: any) =>
    ToolDockService.updateTool(id, update)
  );
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_DELETE_ITEM, (_event, id: string) => ToolDockService.deleteTool(id));
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_REORDER_ITEMS, (_event, orderedIds: string[]) =>
    ToolDockService.reorderTools(orderedIds)
  );
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_LAUNCH_APP, (_event, target: string, type: any, name?: string) =>
    ToolDockService.launchTool(target, type, name)
  );

  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_SELECT_EXECUTABLE, () => ToolDockService.selectExecutable(mainWindow));
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_GET_DISCOVERED_APPS, () => ToolDockService.getDiscoveredApps());
  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_ARRANGE_WORKSPACE, () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
      return Win32WindowService.snapActiveToolAgain(win);
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.TOOL_DOCK_OPEN_EXTERNAL, async (_event, url: string) => {


    if (!url) return false;
    await shell.openExternal(url);
    return true;
  });
}

