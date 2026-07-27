import { create } from 'zustand';
import { TerminalSessionMeta } from '../shared/types';

export type RunStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'failed';
export type OutputChannel = 'Git' | 'Build' | 'AI Tasks' | 'System';

export interface ProjectTerminalState {
  terminals: TerminalSessionMeta[];
  activeTerminalId: string | null;
  status: RunStatus;
  statusMessage: string | null;
  activeOutputChannel: OutputChannel;
  outputLogs: Record<OutputChannel, string[]>;
}

interface TerminalStoreState {
  projectSessions: Record<string, ProjectTerminalState>;
  currentProjectId: string | null;

  // Active Project Getters
  terminals: TerminalSessionMeta[];
  activeTerminalId: string | null;
  status: RunStatus;
  statusMessage: string | null;
  activeOutputChannel: OutputChannel;
  outputLogs: Record<OutputChannel, string[]>;

  // Actions
  switchProjectSession: (projectId: string | null, cwd: string) => void;
  initSessionForProject: (projectId: string, cwd: string) => void;
  addTerminal: (cwd: string, title?: string) => string;
  renameTerminal: (id: string, newTitle: string) => void;
  closeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  setStatus: (status: RunStatus, message?: string | null) => void;
  executeInActiveTerminal: (command: string) => void;
  addOutputLog: (channel: OutputChannel, log: string) => void;
  setActiveOutputChannel: (channel: OutputChannel) => void;
  clearOutputChannel: (channel: OutputChannel) => void;
}

const defaultProjectState = (): ProjectTerminalState => ({
  terminals: [],
  activeTerminalId: null,
  status: 'idle',
  statusMessage: null,
  activeOutputChannel: 'Git',
  outputLogs: {
    Git: ['[Crafted Studio Git Channel Initialized]'],
    Build: ['[Crafted Studio Build Output Engine Initialized]'],
    'AI Tasks': ['[Crafted Studio AI Task Stream Initialized]'],
    System: ['[Crafted Studio Workspace Log Channel Initialized]'],
  },
});

let nextTerminalCounter = 1;

export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
  projectSessions: {},
  currentProjectId: null,

  terminals: [],
  activeTerminalId: null,
  status: 'idle',
  statusMessage: null,
  activeOutputChannel: 'Git',
  outputLogs: defaultProjectState().outputLogs,

  switchProjectSession: (projectId: string | null, cwd: string) => {
    if (!projectId) {
      set({
        currentProjectId: null,
        terminals: [],
        activeTerminalId: null,
        status: 'idle',
        statusMessage: null,
      });
      return;
    }

    const { projectSessions } = get();
    let session = projectSessions[projectId];

    if (!session) {
      session = defaultProjectState();
      const termId = `term-${projectId}-1`;
      session.terminals = [{ id: termId, title: 'PowerShell 1', cwd }];
      session.activeTerminalId = termId;

      if (typeof window !== 'undefined' && window.craftedAPI) {
        window.craftedAPI.terminalCreate({ id: termId, cwd });
      }
    }

    set({
      currentProjectId: projectId,
      projectSessions: { ...projectSessions, [projectId]: session },
      terminals: session.terminals,
      activeTerminalId: session.activeTerminalId,
      status: session.status,
      statusMessage: session.statusMessage,
      activeOutputChannel: session.activeOutputChannel,
      outputLogs: session.outputLogs,
    });
  },

  initSessionForProject: (projectId: string, cwd: string) => {
    get().switchProjectSession(projectId, cwd);
  },

  addTerminal: (cwd: string, title?: string) => {
    const { currentProjectId, projectSessions, terminals } = get();
    if (!currentProjectId) return '';

    nextTerminalCounter += 1;
    const id = `term-${currentProjectId}-${Date.now()}-${nextTerminalCounter}`;
    const termTitle = title || `PowerShell ${terminals.length + 1}`;

    const newTerm: TerminalSessionMeta = { id, title: termTitle, cwd };
    const updatedTerminals = [...terminals, newTerm];

    const session = projectSessions[currentProjectId] || defaultProjectState();
    const updatedSession = { ...session, terminals: updatedTerminals, activeTerminalId: id };

    set({
      projectSessions: { ...projectSessions, [currentProjectId]: updatedSession },
      terminals: updatedTerminals,
      activeTerminalId: id,
    });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI.terminalCreate({ id, cwd });
    }

    return id;
  },

  renameTerminal: (id: string, newTitle: string) => {
    const { currentProjectId, projectSessions, terminals } = get();
    if (!currentProjectId) return;

    const updatedTerminals = terminals.map((t) => (t.id === id ? { ...t, title: newTitle } : t));
    const session = projectSessions[currentProjectId];
    if (!session) return;

    const updatedSession = { ...session, terminals: updatedTerminals };

    set({
      projectSessions: { ...projectSessions, [currentProjectId]: updatedSession },
      terminals: updatedTerminals,
    });
  },

  closeTerminal: (id: string) => {
    const { currentProjectId, projectSessions, terminals, activeTerminalId } = get();
    if (!currentProjectId) return;

    const filtered = terminals.filter((t) => t.id !== id);

    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI.terminalClose(id);
    }

    let nextActiveId = activeTerminalId;
    if (activeTerminalId === id) {
      nextActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    }

    const session = projectSessions[currentProjectId];
    if (!session) return;

    const updatedSession = { ...session, terminals: filtered, activeTerminalId: nextActiveId };

    set({
      projectSessions: { ...projectSessions, [currentProjectId]: updatedSession },
      terminals: filtered,
      activeTerminalId: nextActiveId,
    });
  },

  setActiveTerminal: (id: string) => {
    const { currentProjectId, projectSessions } = get();
    if (!currentProjectId) return;

    const session = projectSessions[currentProjectId];
    if (session) {
      set({
        projectSessions: { ...projectSessions, [currentProjectId]: { ...session, activeTerminalId: id } },
        activeTerminalId: id,
      });
    }
  },

  setStatus: (status, message = null) => {
    const { currentProjectId, projectSessions } = get();
    if (!currentProjectId) return;

    const session = projectSessions[currentProjectId];
    if (session) {
      set({
        projectSessions: { ...projectSessions, [currentProjectId]: { ...session, status, statusMessage: message } },
        status,
        statusMessage: message,
      });
    }
  },

  executeInActiveTerminal: (command: string) => {
    const { activeTerminalId, terminals } = get();
    if (!activeTerminalId || terminals.length === 0) return;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI.terminalData(activeTerminalId, `${command}\r`);
    }
  },

  addOutputLog: (channel: OutputChannel, log: string) => {
    const { currentProjectId, projectSessions } = get();
    if (!currentProjectId) return;

    const session = projectSessions[currentProjectId] || defaultProjectState();
    const channelLogs = session.outputLogs[channel] || [];
    const updatedChannelLogs = [...channelLogs, log];

    const updatedLogs = { ...session.outputLogs, [channel]: updatedChannelLogs };
    const updatedSession = { ...session, outputLogs: updatedLogs };

    set({
      projectSessions: { ...projectSessions, [currentProjectId]: updatedSession },
      outputLogs: updatedLogs,
    });
  },

  setActiveOutputChannel: (channel: OutputChannel) => {
    const { currentProjectId, projectSessions } = get();
    if (!currentProjectId) return;

    const session = projectSessions[currentProjectId];
    if (session) {
      set({
        projectSessions: { ...projectSessions, [currentProjectId]: { ...session, activeOutputChannel: channel } },
        activeOutputChannel: channel,
      });
    } else {
      set({ activeOutputChannel: channel });
    }
  },

  clearOutputChannel: (channel: OutputChannel) => {
    const { currentProjectId, projectSessions } = get();
    if (!currentProjectId) return;

    const session = projectSessions[currentProjectId];
    if (session) {
      const updatedLogs = { ...session.outputLogs, [channel]: [] };
      set({
        projectSessions: { ...projectSessions, [currentProjectId]: { ...session, outputLogs: updatedLogs } },
        outputLogs: updatedLogs,
      });
    }
  },
}));
