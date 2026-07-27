import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Square,
  Hammer,
  TestTube,
  GitBranch,
  ChevronDown,
  Upload,
  Loader2,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { GitPushModal } from './GitPushModal';

export const ContextAwareToolbar: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { status, setStatus, executeInActiveTerminal, addOutputLog, setActiveOutputChannel } = useTerminalStore();
  const { openBottomPanel, setBottomPanelActiveTab } = useLayoutStore();

  const [projectConfig, setProjectConfig] = useState<{
    displayName: string;
    runCommand: string;
    buildCommand: string;
    testCommand: string;
  }>({
    displayName: 'Project',
    runCommand: 'npm run dev',
    buildCommand: 'npm run build',
    testCommand: 'npm test',
  });

  const [gitInfo, setGitInfo] = useState<{ remoteUrl: string | null; defaultCommitMsg: string }>({
    remoteUrl: null,
    defaultCommitMsg: 'Update #1',
  });

  const [showRunDropdown, setShowRunDropdown] = useState(false);
  const [showGitDropdown, setShowGitDropdown] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);

  // Load project configuration from ProjectDetectorService (.crafted/project.json)
  useEffect(() => {
    if (activeProject && typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI
        .detectProjectConfig(activeProject.path)
        .then((cfg: any) => {
          if (cfg) {
            setProjectConfig({
              displayName: cfg.displayName || 'Project',
              runCommand: cfg.runCommand || 'npm run dev',
              buildCommand: cfg.buildCommand || 'npm run build',
              testCommand: cfg.testCommand || 'npm test',
            });
          }
        })
        .catch(() => {});

      window.craftedAPI
        .getGitInfo(activeProject.path)
        .then((info: any) => {
          if (info) {
            setGitInfo({
              remoteUrl: info.remoteUrl,
              defaultCommitMsg: `Update #${(info.commitCount || 0) + 1}`,
            });
          }
        })
        .catch(() => {});
    }
  }, [activeProject]);

  // Clean Run Pipeline State Machine: Idle -> Starting -> Running
  const handleRun = () => {
    if (status === 'running' || status === 'starting') return;

    openBottomPanel('terminal');
    setStatus('starting', 'Initializing dev process...');

    setTimeout(() => {
      setStatus('running');
      executeInActiveTerminal(projectConfig.runCommand);
    }, 300);
  };

  // Clean Restart Pipeline State Machine: Running -> Stopping -> Starting -> Running
  const handleRestart = () => {
    setStatus('stopping', 'Stopping running process...');
    executeInActiveTerminal('\x03'); // Send SIGINT Ctrl+C

    setTimeout(() => {
      setStatus('starting', 'Restarting process...');
      executeInActiveTerminal(projectConfig.runCommand);
      setTimeout(() => setStatus('running'), 400);
    }, 500);
  };

  // Clean Stop Pipeline State Machine: Running -> Stopping -> Idle
  const handleStop = () => {
    setStatus('stopping', 'Stopping process...');
    executeInActiveTerminal('\x03'); // Send SIGINT Ctrl+C
    setTimeout(() => {
      setStatus('idle');
    }, 400);
  };

  const handleBuild = () => {
    openBottomPanel('terminal');
    setStatus('starting', 'Starting build...');
    setTimeout(() => {
      setStatus('running');
      executeInActiveTerminal(projectConfig.buildCommand);
    }, 200);
  };

  const handleTest = () => {
    openBottomPanel('terminal');
    setStatus('starting', 'Starting tests...');
    setTimeout(() => {
      setStatus('running');
      executeInActiveTerminal(projectConfig.testCommand);
    }, 200);
  };

  // Git Push Routes Output to Output Tab (IDE System Stream)
  const handlePushSubmit = async (repoUrl: string | undefined, commitMsg: string) => {
    if (!activeProject || typeof window === 'undefined' || !window.craftedAPI) return;

    // Open Bottom Panel on Output tab
    openBottomPanel('output');
    setActiveOutputChannel('Git');

    const timestamp = new Date().toLocaleTimeString();

    if (repoUrl) {
      addOutputLog('Git', `[${timestamp}] Configuring remote origin: ${repoUrl}`);
      await window.craftedAPI.setGitRemote(activeProject.path, repoUrl);
      setGitInfo((prev) => ({ ...prev, remoteUrl: repoUrl }));
    }

    addOutputLog('Git', `[${timestamp}] Executing git add .`);
    addOutputLog('Git', `[${timestamp}] Executing git commit -m "${commitMsg}"`);
    addOutputLog('Git', `[${timestamp}] Executing git push origin main...`);

    setStatus('starting', 'Pushing to remote...');

    // Stream through user's active terminal while recording to Output log
    executeInActiveTerminal(`git add . && git commit -m "${commitMsg}" && git push origin main`);

    setTimeout(() => {
      addOutputLog('Git', `[${timestamp}] Git push completed successfully.`);
      setStatus('idle');
    }, 2500);
  };

  return (
    <div className="flex h-8 items-center justify-between border-b border-crafted-border/60 bg-[#1A1515] px-3 font-sans select-none shrink-0 text-xs">
      {/* Git Modal */}
      <GitPushModal
        isOpen={showPushModal}
        needsRepoUrl={!gitInfo.remoteUrl}
        defaultCommitMsg={gitInfo.defaultCommitMsg}
        onClose={() => setShowPushModal(false)}
        onSubmit={handlePushSubmit}
      />

      {/* Left: Cohesive Run Group */}
      <div className="flex items-center space-x-1.5 relative">
        {/* Main Run Button State Machine */}
        {status === 'running' ? (
          <div className="flex items-center space-x-1">
            <button
              onClick={handleRestart}
              title="Restart dev process"
              className="flex items-center space-x-1 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restart</span>
            </button>

            <button
              onClick={handleStop}
              title="Stop running dev process"
              className="flex items-center space-x-1 rounded-md bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        ) : status === 'starting' || status === 'stopping' ? (
          <div className="flex items-center space-x-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs text-amber-300 font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
            <span>{status === 'starting' ? 'Starting...' : 'Stopping...'}</span>
          </div>
        ) : (
          <div className="flex items-center rounded-md bg-crafted-brand-blue/20 border border-crafted-brand-blue/40 text-cyan-300">
            <button
              onClick={handleRun}
              title={`Run ${projectConfig.displayName} (${projectConfig.runCommand})`}
              className="flex items-center space-x-1.5 px-2.5 py-1 font-bold hover:bg-crafted-brand-blue/30 transition-colors rounded-l-md"
            >
              <Play className="h-3 w-3 fill-current text-cyan-400" />
              <span>Run {projectConfig.displayName}</span>
            </button>

            <button
              onClick={() => setShowRunDropdown(!showRunDropdown)}
              className="px-1.5 py-1 border-l border-crafted-brand-blue/40 hover:bg-crafted-brand-blue/30 transition-colors rounded-r-md"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Run Dropdown Menu */}
        {showRunDropdown && (
          <div
            onClick={() => setShowRunDropdown(false)}
            className="absolute top-8 left-0 z-50 w-48 rounded-xl border border-crafted-border bg-crafted-surface p-1 shadow-crafted-card animate-fade-in font-sans text-xs space-y-0.5"
          >
            <button
              onClick={handleRun}
              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-crafted-text hover:bg-crafted-surface-hover"
            >
              <Play className="h-3.5 w-3.5 text-cyan-400" />
              <span>Run ({projectConfig.runCommand})</span>
            </button>
            <button
              onClick={handleBuild}
              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-crafted-text hover:bg-crafted-surface-hover"
            >
              <Hammer className="h-3.5 w-3.5 text-amber-400" />
              <span>Build ({projectConfig.buildCommand})</span>
            </button>
            <button
              onClick={handleTest}
              className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-crafted-text hover:bg-crafted-surface-hover"
            >
              <TestTube className="h-3.5 w-3.5 text-emerald-400" />
              <span>Test ({projectConfig.testCommand})</span>
            </button>
          </div>
        )}

        {/* Git Group Dropdown */}
        <div className="relative pl-1">
          <button
            onClick={() => setShowGitDropdown(!showGitDropdown)}
            className="flex items-center space-x-1.5 rounded-md border border-crafted-border bg-crafted-surface px-2.5 py-1 text-xs text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover transition-colors"
          >
            <GitBranch className="h-3 w-3 text-crafted-brand-rust" />
            <span>Git</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showGitDropdown && (
            <div
              onClick={() => setShowGitDropdown(false)}
              className="absolute top-8 left-1 z-50 w-44 rounded-xl border border-crafted-border bg-crafted-surface p-1 shadow-crafted-card animate-fade-in font-sans text-xs space-y-0.5"
            >
              <button
                onClick={() => setShowPushModal(true)}
                className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-crafted-text hover:bg-crafted-surface-hover"
              >
                <Upload className="h-3.5 w-3.5 text-crafted-brand-rust" />
                <span>Push Changes...</span>
              </button>

              <button
                disabled
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-crafted-text-dim opacity-40 cursor-not-allowed"
              >
                <span>Pull</span>
                <span className="text-[10px]">Soon</span>
              </button>

              <button
                disabled
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-crafted-text-dim opacity-40 cursor-not-allowed"
              >
                <span>Branches</span>
                <span className="text-[10px]">Soon</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Live Project Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#181414] border border-crafted-border/40 font-mono text-[11px]">
          {status === 'running' && (
            <>
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold">Running</span>
            </>
          )}

          {status === 'starting' && (
            <>
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-semibold">Starting...</span>
            </>
          )}

          {status === 'stopping' && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 font-semibold">Stopping...</span>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-red-300 font-semibold">Failed</span>
            </>
          )}

          {status === 'idle' && (
            <>
              <div className="h-2 w-2 rounded-full bg-gray-500" />
              <span className="text-crafted-text-dim">Idle</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
