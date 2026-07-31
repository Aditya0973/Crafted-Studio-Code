import React, { useState, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  AlertTriangle,
  Download,
  Upload,
  Keyboard,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { useShortcutStore } from '../../stores/shortcutStore';
import { CommandCategory } from '../../shared/types/commandTypes';

const CATEGORIES: (CommandCategory | 'All')[] = [
  'All',
  'Explorer',
  'Panels',
  'Tool Dock',
  'Editor',
  'Chat',
  'Workspace',
];

export const ShortcutSettings: React.FC = () => {
  const {
    commands,
    searchQuery,
    setSearchQuery,
    recordingCommandId,
    setRecordingCommandId,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    pendingConflict,
    clearPendingConflict,
    exportShortcuts,
    importShortcuts,
  } = useShortcutStore();

  const [activeTab, setActiveTab] = useState<CommandCategory | 'All'>('All');
  const [recordedKeys, setRecordedKeys] = useState<string>('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Key recording listener
  useEffect(() => {
    if (!recordingCommandId) {
      setRecordedKeys('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingCommandId(null);
        setRecordedKeys('');
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let key = e.key;
      if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
        setRecordedKeys(parts.join('+'));
        return;
      }

      if (key === ' ') key = 'Space';
      else if (key.length === 1) key = key.toUpperCase();

      parts.push(key);
      const shortcutStr = parts.join('+');
      setRecordedKeys(shortcutStr);

      // Attempt shortcut update
      updateShortcut(recordingCommandId, shortcutStr, false);
      setRecordingCommandId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recordingCommandId, updateShortcut, setRecordingCommandId]);

  const filteredCommands = commands.filter((cmd) => {
    const matchesCategory = activeTab === 'All' || cmd.category === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.currentShortcut.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const handleExport = () => {
    const json = exportShortcuts();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crafted-studio-keybindings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const success = await importShortcuts(text);
        if (success) {
          setImportNotice('Keybindings imported successfully!');
          setTimeout(() => setImportNotice(null), 3000);
        } else {
          setImportNotice('Failed to parse keybindings JSON.');
          setTimeout(() => setImportNotice(null), 3000);
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-5 font-sans select-none animate-fade-in">
      {/* Header & Description */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-crafted-text flex items-center space-x-2">
            <Keyboard className="h-5 w-5 text-crafted-brand-rust" />
            <span>Keyboard Shortcuts</span>
          </h3>
          <p className="text-xs text-crafted-text-dim mt-0.5">
            Configure custom keybindings for workspace commands. Changes save persistently.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            title="Export Keybindings JSON"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-crafted-text-dim" />
            <span>Export</span>
          </button>

          <button
            onClick={handleImportClick}
            title="Import Keybindings JSON"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-crafted-text-dim" />
            <span>Import</span>
          </button>

          <button
            onClick={resetAllShortcuts}
            title="Reset All Shortcuts to Defaults"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {importNotice && (
        <div className="p-2.5 rounded-xl text-xs bg-crafted-brand-rust/20 border border-crafted-brand-rust text-crafted-brand-rust font-mono flex items-center space-x-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* Conflict Warning Modal Banner */}
      {pendingConflict && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2 font-bold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Shortcut Conflict Detected</span>
          </div>
          <p>
            Key combination <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold text-white">{pendingConflict.shortcut}</code> is already assigned to <strong className="text-white">{pendingConflict.conflictingCommandLabel}</strong>.
          </p>
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={clearPendingConflict}
              className="px-3 py-1 bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => updateShortcut(pendingConflict.commandId, pendingConflict.shortcut, true)}
              className="px-3 py-1 bg-crafted-brand-rust text-white font-bold rounded-lg text-xs shadow-crafted-button"
            >
              Replace Assignment
            </button>
          </div>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-crafted-text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands or shortcuts..."
            className="w-full rounded-xl border border-crafted-border bg-crafted-surface/60 py-1.5 pl-9 pr-3 text-xs text-crafted-text placeholder-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                activeTab === cat
                  ? 'bg-crafted-brand-rust text-white font-bold shadow-sm'
                  : 'bg-crafted-surface/50 border border-crafted-border text-crafted-text-dim hover:text-crafted-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Commands List Table */}
      <div className="rounded-2xl border border-crafted-border bg-crafted-surface/30 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 bg-crafted-surface/60 border-b border-crafted-border/60 font-mono text-[10px] uppercase text-crafted-text-dim">
          <div className="col-span-5">Command</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-4 text-right pr-2">Shortcut</div>
        </div>

        <div className="divide-y divide-crafted-border/40 max-h-[42vh] overflow-y-auto">
          {filteredCommands.map((cmd) => {
            const isRecording = recordingCommandId === cmd.id;
            return (
              <div
                key={cmd.id}
                className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-crafted-surface-hover/50 transition-colors text-xs"
              >
                <div className="col-span-5 pr-2">
                  <div className="font-semibold text-crafted-text">{cmd.label}</div>
                  {cmd.description && (
                    <div className="text-[10px] text-crafted-text-dim truncate">{cmd.description}</div>
                  )}
                </div>

                <div className="col-span-3">
                  <span className="font-mono text-[10px] bg-crafted-surface border border-crafted-border/60 text-crafted-brand-rust px-2 py-0.5 rounded-md">
                    {cmd.category}
                  </span>
                </div>

                <div className="col-span-4 flex items-center justify-end space-x-2">
                  {isRecording ? (
                    <div className="flex items-center space-x-1.5 px-3 py-1 bg-crafted-brand-rust/20 border border-crafted-brand-rust text-crafted-brand-rust rounded-lg font-mono text-xs animate-pulse">
                      <span>{recordedKeys || 'Press keys...'}</span>
                      <button
                        onClick={() => setRecordingCommandId(null)}
                        className="text-crafted-text-dim hover:text-crafted-text"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRecordingCommandId(cmd.id)}
                      title="Click to change shortcut"
                      className={`font-mono text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        cmd.isRemapped
                          ? 'bg-crafted-brand-rust/10 border-crafted-brand-rust/40 text-crafted-brand-rust font-bold'
                          : 'bg-crafted-surface border-crafted-border text-crafted-text hover:border-crafted-border-bright'
                      }`}
                    >
                      {cmd.currentShortcut || 'Unbound'}
                    </button>
                  )}

                  {cmd.isRemapped && (
                    <button
                      onClick={() => resetShortcut(cmd.id)}
                      title="Reset to default shortcut"
                      className="p-1 text-crafted-text-dim hover:text-crafted-text transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredCommands.length === 0 && (
            <div className="p-8 text-center text-xs text-crafted-text-dim">
              No matching commands or shortcuts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
