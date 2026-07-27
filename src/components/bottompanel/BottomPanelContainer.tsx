import React, { useState, useRef, useEffect } from 'react';
import {
  SquareTerminal,
  AlertCircle,
  FileText,
  Plus,
  X,
  ChevronDown,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react';
import { monaco } from '../../utils/monacoConfig';
import { useLayoutStore } from '../../stores/layoutStore';
import { useProjectStore } from '../../stores/projectStore';
import { useTerminalStore, OutputChannel } from '../../stores/terminalStore';
import { XTermInstance } from './XTermInstance';
import { ContextAwareToolbar } from './ContextAwareToolbar';

export const BottomPanelContainer: React.FC = () => {
  const {
    bottomPanelHeight,
    bottomPanelCollapsed,
    bottomPanelActiveTab,
    setBottomPanelHeight,
    setBottomPanelActiveTab,
    closeBottomPanel,
    openBottomPanel,
  } = useLayoutStore();

  const { activeProject } = useProjectStore();
  const {
    terminals,
    activeTerminalId,
    outputLogs,
    activeOutputChannel,
    switchProjectSession,
    addTerminal,
    renameTerminal,
    closeTerminal,
    setActiveTerminal,
    setActiveOutputChannel,
    clearOutputChannel,
  } = useTerminalStore();

  const [isDragging, setIsDragging] = useState(false);
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [monacoMarkers, setMonacoMarkers] = useState<monaco.editor.IMarker[]>([]);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(bottomPanelHeight);

  // Switch project terminal session cleanly when active project changes
  useEffect(() => {
    if (activeProject && !activeProject.isMissing) {
      switchProjectSession(activeProject.id, activeProject.path);
    } else {
      switchProjectSession(null, '');
    }
  }, [activeProject, switchProjectSession]);

  // Query Monaco TypeScript & Linter Diagnostics markers periodically for Problems tab
  useEffect(() => {
    const updateMarkers = () => {
      try {
        if (monaco && monaco.editor && typeof monaco.editor.getModelMarkers === 'function') {
          const markers = monaco.editor.getModelMarkers({});
          setMonacoMarkers(markers);
        }
      } catch {
        /* ignore */
      }
    };

    updateMarkers();
    const interval = setInterval(updateMarkers, 1500);
    return () => clearInterval(interval);
  }, []);

  // Resizing divider mouse handler (70% max window height clamp)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = bottomPanelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = dragStartYRef.current - moveEvent.clientY;
      const newHeight = startHeightRef.current + deltaY;
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleGrabBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    openBottomPanel('terminal');
    handleMouseDown(e);
  };

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingTerminalId(id);
    setEditingTitle(currentTitle);
  };

  const handleFinishRename = (id: string) => {
    if (editingTitle.trim()) {
      renameTerminal(id, editingTitle.trim());
    }
    setEditingTerminalId(null);
  };

  if (bottomPanelCollapsed) {
    return (
      <div
        onMouseDown={handleGrabBarMouseDown}
        onClick={() => openBottomPanel('terminal')}
        title="Drag or click to open Bottom Panel (Ctrl+`)"
        className="group relative h-1.5 w-full bg-[#181414] hover:bg-crafted-brand-rust/50 cursor-ns-resize transition-colors duration-200 border-t border-crafted-border/40 flex items-center justify-center z-30"
      >
        <div className="h-1 w-12 rounded-full bg-crafted-border group-hover:bg-cyan-400 transition-colors opacity-70" />
      </div>
    );
  }

  const projectCwd = activeProject?.path || '';
  const currentLogs = outputLogs[activeOutputChannel] || [];

  return (
    <div
      style={{ height: `${bottomPanelHeight}px` }}
      className={`flex flex-col w-full bg-[#151111] border-t border-crafted-border/80 text-crafted-text font-sans select-none overflow-hidden relative z-30 shrink-0 ${
        isDragging ? '' : 'transition-all duration-200 ease-in-out'
      }`}
    >
      {/* Draggable Top Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full bg-crafted-border/40 hover:bg-crafted-brand-rust/60 cursor-ns-resize transition-colors flex items-center justify-center shrink-0"
      >
        <div className="h-0.5 w-8 rounded-full bg-crafted-text-dim opacity-50" />
      </div>

      {/* Context-Aware Toolbar (Run Group, Git Group, Live Status) */}
      <ContextAwareToolbar />

      {/* Panel Header Strip with Natural Sized Tabs */}
      <div className="flex h-8 items-center justify-between border-b border-crafted-border/60 bg-[#1A1515] px-2 shrink-0 text-xs">
        <div className="flex items-center space-x-1">
          {/* Main Category Tabs with Natural Sizing */}
          <button
            onClick={() => setBottomPanelActiveTab('terminal')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-t-lg font-medium transition-colors ${
              bottomPanelActiveTab === 'terminal'
                ? 'bg-[#151111] text-cyan-300 font-semibold border-t-2 border-t-cyan-400'
                : 'text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface'
            }`}
          >
            <SquareTerminal className="h-3.5 w-3.5" />
            <span>Terminal</span>
            {terminals.length > 0 && (
              <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] font-mono">{terminals.length}</span>
            )}
          </button>

          <button
            onClick={() => setBottomPanelActiveTab('problems')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-t-lg font-medium transition-colors ${
              bottomPanelActiveTab === 'problems'
                ? 'bg-[#151111] text-amber-300 font-semibold border-t-2 border-t-amber-400'
                : 'text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Problems</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                monacoMarkers.length > 0
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {monacoMarkers.length}
            </span>
          </button>

          <button
            onClick={() => setBottomPanelActiveTab('output')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-t-lg font-medium transition-colors ${
              bottomPanelActiveTab === 'output'
                ? 'bg-[#151111] text-crafted-text font-semibold border-t-2 border-t-crafted-brand-rust'
                : 'text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Output ({activeOutputChannel})</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {bottomPanelActiveTab === 'terminal' && (
            <button
              onClick={() => addTerminal(projectCwd)}
              title="Create New Terminal"
              className="flex items-center space-x-1 rounded-md bg-crafted-surface px-2 py-1 text-xs text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Terminal</span>
            </button>
          )}

          {bottomPanelActiveTab === 'output' && (
            <button
              onClick={() => clearOutputChannel(activeOutputChannel)}
              title="Clear Output Logs"
              className="flex items-center space-x-1 rounded-md bg-crafted-surface px-2 py-1 text-xs text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={closeBottomPanel}
            title="Close Panel (Ctrl+`)"
            className="rounded-md p-1 text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Sub-Tab Strip */}
      {bottomPanelActiveTab === 'terminal' && terminals.length > 0 && (
        <div className="flex h-7 items-center space-x-1 border-b border-crafted-border/40 bg-[#120E0E] px-2 shrink-0 overflow-x-auto scrollbar-none text-xs">
          {terminals.map((term) => {
            const isActive = term.id === activeTerminalId;
            const isEditing = term.id === editingTerminalId;

            return (
              <div
                key={term.id}
                onClick={() => setActiveTerminal(term.id)}
                onDoubleClick={() => handleStartRename(term.id, term.title)}
                className={`group flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md cursor-pointer transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#1D1818] text-crafted-text font-semibold border border-crafted-border/60'
                    : 'text-crafted-text-dim hover:bg-[#181414] hover:text-crafted-text'
                }`}
              >
                <SquareTerminal className="h-3 w-3 text-cyan-400" />

                {isEditing ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleFinishRename(term.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(term.id);
                    }}
                    autoFocus
                    className="w-24 rounded bg-black px-1 text-xs text-white focus:outline-none"
                  />
                ) : (
                  <span className="truncate max-w-[120px]">{term.title}</span>
                )}

                {terminals.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTerminal(term.id);
                    }}
                    className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Output Channel Sub-Tab Bar */}
      {bottomPanelActiveTab === 'output' && (
        <div className="flex h-7 items-center justify-between border-b border-crafted-border/40 bg-[#120E0E] px-3 shrink-0 text-xs">
          <div className="flex items-center space-x-1 relative">
            <span className="text-[11px] text-crafted-text-dim">Output Channel:</span>
            <button
              onClick={() => setShowChannelDropdown(!showChannelDropdown)}
              className="flex items-center space-x-1 rounded bg-crafted-surface px-2 py-0.5 text-xs text-cyan-300 font-semibold border border-crafted-border hover:bg-crafted-surface-hover"
            >
              <span>{activeOutputChannel}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {showChannelDropdown && (
              <div
                onClick={() => setShowChannelDropdown(false)}
                className="absolute top-7 left-24 z-50 w-36 rounded-xl border border-crafted-border bg-crafted-surface p-1 shadow-crafted-card animate-fade-in text-xs space-y-0.5"
              >
                {(['Git', 'Build', 'AI Tasks', 'System'] as OutputChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setActiveOutputChannel(ch)}
                    className={`flex w-full items-center space-x-2 rounded-lg px-2 py-1.5 ${
                      activeOutputChannel === ch
                        ? 'bg-crafted-brand-blue/20 text-cyan-300 font-bold'
                        : 'text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface-hover'
                    }`}
                  >
                    <span>{ch}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-crafted-text-dim">Read-only System Log Stream</div>
        </div>
      )}

      {/* Tab Contents with Mounted DOM Preservation */}
      <div className="flex-1 overflow-hidden relative">
        {/* Terminal Tab Container (Mounted DOM Preserved) */}
        <div
          style={{ display: bottomPanelActiveTab === 'terminal' ? 'block' : 'none' }}
          className="h-full w-full relative"
        >
          {terminals.map((term) => (
            <XTermInstance
              key={term.id}
              terminalId={term.id}
              cwd={term.cwd}
              isActive={term.id === activeTerminalId}
            />
          ))}
        </div>

        {/* Problems Tab (Monaco TypeScript/Linter Diagnostics) */}
        {bottomPanelActiveTab === 'problems' && (
          <div className="flex flex-col h-full w-full bg-[#120E0E] p-2 overflow-auto font-sans text-xs">
            {monacoMarkers.length > 0 ? (
              <div className="space-y-1">
                {monacoMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 rounded-lg bg-[#1a1414] border border-crafted-border/40 p-2 hover:bg-[#201818] transition-colors"
                  >
                    {marker.severity === monaco.MarkerSeverity.Error ? (
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    ) : marker.severity === monaco.MarkerSeverity.Warning ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold text-crafted-text truncate">
                          {marker.resource.path.split(/[/\\]/).pop()}
                        </span>
                        <span className="font-mono text-[10px] text-crafted-text-dim">
                          [{marker.startLineNumber}:{marker.startColumn}]
                        </span>
                      </div>
                      <p className="text-xs text-crafted-text-muted mt-0.5">{marker.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-crafted-text-dim space-y-2">
                <AlertCircle className="h-8 w-8 text-emerald-400/80" />
                <span className="text-xs font-semibold text-crafted-text">No Problems Detected</span>
                <p className="text-[11px] text-crafted-text-muted">No diagnostic errors or warnings in open Monaco editor models.</p>
              </div>
            )}
          </div>
        )}

        {/* Output Tab (Multi-Channel Logs) */}
        {bottomPanelActiveTab === 'output' && (
          <div className="flex flex-col h-full w-full bg-[#120E0E] p-3 font-mono text-xs text-crafted-text-muted overflow-auto space-y-1">
            {currentLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
