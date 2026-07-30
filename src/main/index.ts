import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { initDatabaseAsync, closeDatabase } from '../database';
import { WindowService } from '../services/WindowService';
import { setupIPCHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  // Initialize SQLite Database in user data folder
  const userDataPath = app.getPath('userData');
  await initDatabaseAsync(userDataPath);

  // Retrieve saved window bounds from SQLite
  const savedState = WindowService.getSavedState();

  mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Frameless for custom Crafted Co titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#090B0E',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },

  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // Register IPC handlers
  setupIPCHandlers(mainWindow);

  // Enable Standard Application Menu & Reload Shortcuts (Ctrl+R, F5, F12 / DevTools)
  const isDev = process.env.NODE_ENV === 'development';
  const menuTemplate: MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache(),
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // WebContents Keyboard Shortcut Fallback for CmdOrCtrl+R and F5
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown') {
      const isR = input.key.toLowerCase() === 'r' && (input.control || input.meta);
      const isF5 = input.key === 'F5';
      const isDevTools = (input.key.toLowerCase() === 'i' && (input.control || input.meta) && input.shift) || input.key === 'F12';

      if (isR || isF5) {
        mainWindow?.webContents.reload();
      } else if (isDevTools) {
        mainWindow?.webContents.toggleDevTools();
      }
    }
  });

  // Smooth window display
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5783');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
