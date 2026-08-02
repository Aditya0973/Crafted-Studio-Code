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

  // Table: projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'blank',
      version TEXT NOT NULL DEFAULT '1.0.0',
      project_type TEXT,
      description TEXT,
      blueprint_id TEXT DEFAULT 'blank',
      selected_modules TEXT DEFAULT '[]',
      current_stage TEXT DEFAULT 'planning',
      completed_checklist_items TEXT DEFAULT '[]',
      deleted_at TEXT DEFAULT NULL
    );
  `);

  // Table: recent_projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS recent_projects (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      last_opened_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Table: explorer_state
  db.exec(`
    CREATE TABLE IF NOT EXISTS explorer_state (
      project_id TEXT PRIMARY KEY,
      expanded_paths TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Table: conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Conversation',
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
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Table: cached_models
  db.exec(`
    CREATE TABLE IF NOT EXISTS cached_models (
      provider_id TEXT PRIMARY KEY,
      models_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table: model_profiles
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER,
      system_prompt TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Table: agent_definitions
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Bot',
      system_prompt TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES model_profiles(id)
    );
  `);

  // Table: workbench_sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_sessions (
      project_id TEXT PRIMARY KEY,
      active_tab_path TEXT,
      tabs_json TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Table: tool_dock_items
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_dock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      icon TEXT,
      custom_icon_url TEXT,
      badge TEXT,
      item_order INTEGER NOT NULL DEFAULT 0,
      open_in_builtin_browser INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed Default Model Profile if empty
  const profileCount = (db.prepare('SELECT COUNT(*) as count FROM model_profiles').get() as { count: number }).count;
  if (profileCount === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO model_profiles (id, name, provider_id, model_id, temperature, system_prompt, is_default, created_at, updated_at)
      VALUES ('profile-default', 'Default Local Profile', 'ollama', 'qwen2.5:7b', 0.7, NULL, 1, ?, ?)
    `).run(now, now);
  }

  // Seed/Update 4 Responsibility Built-in Agents
  const now = new Date().toISOString();
  const builtInAgents = [
    {
      id: 'agent-architect',
      name: 'Architect (Planning & Documentation)',
      description: 'Idea brainstorming, PRD, architecture, implementation plans, and project documentation.',
      icon: 'Layers',
      system_prompt: `You are the Architect & Documentation Agent inside Crafted Studio.

Your responsibility is to transform ideas into clear requirements, modular architecture, and implementation plans, while maintaining clear, accurate, up-to-date documentation.

Help users define requirements, architecture, milestones, risks, dependencies, technical decisions, and long-term project memory before coding begins.

Prefer asking clarifying questions over making assumptions.

When enough information exists, generate structured markdown documents (PRDs, requirements.md, implementation_plan.md, README.md, CHANGELOG.md) suitable for long-term project development.

Never write production code directly unless explicitly asked. Focus on thinking, planning, and documenting first.`,
      profile_id: 'profile-default',
      is_preset: 1,
    },
    {
      id: 'agent-designer',
      name: 'Designer (UI Prompt Generator)',
      description: 'UX flows, wireframes, design systems, and AI prompts for Stitch, Figma AI, v0, Lovable.',
      icon: 'Sparkles',
      system_prompt: `You are the Design Agent inside Crafted Studio.

Design complete user experiences before implementation begins.

Produce detailed prompts for UI generation models including Stitch, Figma AI, v0, Lovable, and similar design tools.

Focus on usability, accessibility, visual hierarchy, consistency, and scalable design systems.

Never generate implementation code unless explicitly requested.

When design decisions become finalized, document them clearly for the engineering stage.`,
      profile_id: 'profile-default',
      is_preset: 1,
    },
    {
      id: 'agent-engineer',
      name: 'Engineer (Implementation Agent)',
      description: 'Coding, feature implementation, refactoring, debugging, git, and terminal execution.',
      icon: 'Code',
      system_prompt: `You are the Engineering Agent inside Crafted Studio.

Your responsibility is to implement software according to project requirements and implementation plans.

Always understand existing code before making changes.

Minimize unnecessary edits.

Reuse existing architecture whenever possible.

Follow project conventions and coding standards.

Use available tools when necessary.

Update project memory whenever implementation milestones are completed.`,
      profile_id: 'profile-default',
      is_preset: 1,
    },
    {
      id: 'agent-reviewer',
      name: 'Reviewer (Audit & Feedback Agent)',
      description: 'Critical code review, architecture auditing, bug hunting, and security checks.',
      icon: 'ShieldCheck',
      system_prompt: `You are the Review Agent inside Crafted Studio.

Critically evaluate plans, code, and architecture.

Verify correctness before approving implementation.

Look for bugs, unnecessary complexity, edge cases, scalability concerns, and maintainability issues.

Be skeptical.

Do not rewrite work unnecessarily.

Prefer concise actionable feedback over broad criticism.`,
      profile_id: 'profile-default',
      is_preset: 1,
    },
  ];

  const upsertAgent = db.prepare(`
    INSERT INTO agent_definitions (id, name, description, icon, system_prompt, profile_id, is_preset, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      system_prompt = excluded.system_prompt,
      is_preset = excluded.is_preset,
      updated_at = excluded.updated_at
  `);

  for (const ag of builtInAgents) {
    upsertAgent.run(ag.id, ag.name, ag.description, ag.icon, ag.system_prompt, ag.profile_id, ag.is_preset, now, now);
  }

  // Remove obsolete default preset agents if present
  try {
    db.prepare(`DELETE FROM agent_definitions WHERE id IN ('agent-general', 'agent-coder', 'agent-debugger') AND is_preset = 1`).run();
  } catch {}

  // Seed Default Tool Dock Items if empty
  const existingTools = db.prepare('SELECT COUNT(*) as count FROM tool_dock_items').get() as { count: number };
  if (!existingTools || existingTools.count === 0) {
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
