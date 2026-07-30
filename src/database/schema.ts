import { IDatabase } from './index';

export function initializeSchema(db: IDatabase): void {
  // Enforce WAL mode for fast concurrency where supported
  db.pragma('journal_mode = WAL');

  // Table: settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table: window_state
  db.exec(`
    CREATE TABLE IF NOT EXISTS window_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      width INTEGER NOT NULL DEFAULT 1280,
      height INTEGER NOT NULL DEFAULT 800,
      x INTEGER,
      y INTEGER,
      is_maximized INTEGER NOT NULL DEFAULT 0,
      panel_visibility TEXT,
      panel_order TEXT,
      panel_proportions TEXT,
      focus_mode_panel TEXT,
      bottom_panel_height INTEGER DEFAULT 240,
      bottom_panel_collapsed INTEGER DEFAULT 1,
      bottom_panel_active_tab TEXT DEFAULT 'terminal',
      left_sidebar_width INTEGER NOT NULL DEFAULT 260,
      right_sidebar_width INTEGER NOT NULL DEFAULT 320,
      left_collapsed INTEGER NOT NULL DEFAULT 0,
      right_collapsed INTEGER NOT NULL DEFAULT 0,
      center_split_ratio REAL NOT NULL DEFAULT 0.5,
      chat_collapsed INTEGER NOT NULL DEFAULT 0,
      workbench_collapsed INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe schema migrations for existing databases
  try { db.exec(`ALTER TABLE window_state ADD COLUMN panel_visibility TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE window_state ADD COLUMN panel_order TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE window_state ADD COLUMN panel_proportions TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE window_state ADD COLUMN focus_mode_panel TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE window_state ADD COLUMN bottom_panel_height INTEGER DEFAULT 240;`); } catch {}
  try { db.exec(`ALTER TABLE window_state ADD COLUMN bottom_panel_collapsed INTEGER DEFAULT 1;`); } catch {}
  try { db.exec(`ALTER TABLE window_state ADD COLUMN bottom_panel_active_tab TEXT DEFAULT 'terminal';`); } catch {}

  // Table: projects (Sprint 10.1 Safe Soft Delete Schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'blank',
      version TEXT NOT NULL DEFAULT '1.0.0',
      project_type TEXT NOT NULL DEFAULT 'General',
      description TEXT,
      blueprint_id TEXT NOT NULL DEFAULT 'blank',
      selected_modules TEXT NOT NULL DEFAULT '[]',
      current_stage TEXT NOT NULL DEFAULT 'planning',
      completed_checklist_items TEXT NOT NULL DEFAULT '[]',
      is_removed INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Table: recent_projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS recent_projects (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      last_opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Table: conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Table: messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      created_at TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Table: workbench_sessions (Sprint 5.3)
  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      active_tab_path TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Table: workbench_tabs (Sprint 5.3)
  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_tabs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      path TEXT NOT NULL,
      editor_id TEXT NOT NULL,
      tab_order INTEGER NOT NULL,
      state_metadata TEXT NOT NULL DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE (project_id, path)
    );
  `);

  // Safe migration checks
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN left_sidebar_width INTEGER NOT NULL DEFAULT 260;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN right_sidebar_width INTEGER NOT NULL DEFAULT 320;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN left_collapsed INTEGER NOT NULL DEFAULT 0;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN right_collapsed INTEGER NOT NULL DEFAULT 0;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'General';`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN center_split_ratio REAL NOT NULL DEFAULT 0.5;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN chat_collapsed INTEGER NOT NULL DEFAULT 0;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE window_state ADD COLUMN workbench_collapsed INTEGER NOT NULL DEFAULT 1;`);
  } catch { /* Column exists */ }

  // Sprint 9 Migrations: Description, Blueprint ID, Selected Modules
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN description TEXT;`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN blueprint_id TEXT NOT NULL DEFAULT 'blank';`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN selected_modules TEXT NOT NULL DEFAULT '[]';`);
  } catch { /* Column exists */ }

  // Sprint 10 Migrations: Current Stage & Completed Checklist Items
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'planning';`);
  } catch { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN completed_checklist_items TEXT NOT NULL DEFAULT '[]';`);
  } catch { /* Column exists */ }

  // Sprint 10.1 Migration: Safe Soft Delete
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN is_removed INTEGER NOT NULL DEFAULT 0;`);
  } catch { /* Column exists */ }

  // Initialize default window state if not present
  const existingState = db.prepare('SELECT id FROM window_state WHERE id = 1').get();
  if (!existingState) {
    db.prepare(`
      INSERT INTO window_state (id, width, height, is_maximized, left_sidebar_width, right_sidebar_width, left_collapsed, right_collapsed, center_split_ratio, chat_collapsed, workbench_collapsed)
      VALUES (1, 1280, 800, 0, 260, 320, 0, 0, 0.5, 0, 1)
    `).run();
  }

  // Table: tool_dock_items
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_dock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('website', 'desktop_app')),
      target TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Wrench',
      custom_icon_url TEXT,
      badge TEXT,
      item_order INTEGER NOT NULL DEFAULT 0,
      open_in_builtin_browser INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Initialize default tool_dock_items if empty
  const existingTools = db.prepare('SELECT COUNT(*) as count FROM tool_dock_items').get() as { count: number } | undefined;
  if (!existingTools || existingTools.count === 0) {
    const now = new Date().toISOString();
    const defaultTools = [
      { id: 'tool-browser', name: 'Browser', type: 'website', target: 'https://www.google.com', icon: 'Globe', badge: 'Web', item_order: 0, created_at: now, updated_at: now },
      { id: 'tool-antigravity', name: 'Antigravity', type: 'desktop_app', target: 'antigravity', icon: 'Sparkles', badge: 'Active', item_order: 1, created_at: now, updated_at: now },
      { id: 'tool-chatgpt', name: 'ChatGPT', type: 'website', target: 'https://chatgpt.com', icon: 'Bot', badge: 'AI', item_order: 2, created_at: now, updated_at: now },
      { id: 'tool-stitch', name: 'Stitch', type: 'website', target: 'https://stitch.withgoogle.com', icon: 'Layers', badge: 'UI', item_order: 3, created_at: now, updated_at: now },
      { id: 'tool-gemini', name: 'Gemini', type: 'website', target: 'https://gemini.google.com', icon: 'Sparkles', badge: 'AI', item_order: 4, created_at: now, updated_at: now },
      { id: 'tool-github', name: 'GitHub', type: 'website', target: 'https://github.com', icon: 'Code', badge: 'Code', item_order: 5, created_at: now, updated_at: now },
    ];


    const insertTool = db.prepare(`
      INSERT INTO tool_dock_items (id, name, type, target, icon, custom_icon_url, badge, item_order, open_in_builtin_browser, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 1, ?, ?)
    `);

    for (const tool of defaultTools) {
      insertTool.run(tool.id, tool.name, tool.type, tool.target, tool.icon, tool.badge, tool.item_order, tool.created_at, tool.updated_at);
    }
  }

  // Idempotent Migration: Ensure existing databases receive the Browser tool exactly once
  db.prepare(`
    INSERT OR IGNORE INTO tool_dock_items (id, name, type, target, icon, custom_icon_url, badge, item_order, open_in_builtin_browser, created_at, updated_at)
    VALUES ('tool-browser', 'Browser', 'website', 'https://www.google.com', 'Globe', NULL, 'Web', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();


  // Initialize default settings if not present
  const defaultSettings = [
    { key: 'theme', value: JSON.stringify('dark') },
    { key: 'appName', value: JSON.stringify('Crafted Studio') },
    { key: 'version', value: JSON.stringify('1.0.0') },
    { key: 'logoPath', value: JSON.stringify(null) },
    { key: 'activeProjectId', value: JSON.stringify(null) },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value)
    VALUES (?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }
}

