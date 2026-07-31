import React from 'react';
import { X, Sliders, Cpu, LayoutGrid, Info, Keyboard } from 'lucide-react';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { AIProvidersSettings } from './AIProvidersSettings';
import { ShortcutSettings } from './ShortcutSettings';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, activeCategory, setSettingsOpen, setActiveCategory } =
    useAISettingsStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none font-sans">
      <div className="relative flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-crafted-border bg-crafted-panel shadow-2xl">
        {/* Settings Category Navigation Sidebar */}
        <div className="w-56 flex flex-col border-r border-crafted-border/60 bg-crafted-surface/40 p-3 space-y-1 font-sans">
          <div className="px-3 py-2 text-sm font-bold text-crafted-text flex items-center space-x-2 border-b border-crafted-border/40 mb-2">
            <Sliders className="h-4 w-4 text-crafted-brand-rust" />
            <span>Settings</span>
          </div>

          <button
            onClick={() => setActiveCategory('general')}
            className={`flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === 'general'
                ? 'bg-crafted-surface text-crafted-text border border-crafted-border-bright font-semibold'
                : 'text-crafted-text-muted hover:bg-crafted-surface-hover/70 hover:text-crafted-text'
            }`}
          >
            <Sliders className="h-4 w-4 text-crafted-text-dim" />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveCategory('ai-providers')}
            className={`flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === 'ai-providers'
                ? 'bg-crafted-surface text-crafted-text border border-crafted-brand-rust font-semibold shadow-sm'
                : 'text-crafted-text-muted hover:bg-crafted-surface-hover/70 hover:text-crafted-text'
            }`}
          >
            <Cpu className="h-4 w-4 text-crafted-brand-rust" />
            <span>AI Providers</span>
          </button>

          <button
            onClick={() => setActiveCategory('keyboard-shortcuts' as any)}
            className={`flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === ('keyboard-shortcuts' as any)
                ? 'bg-crafted-surface text-crafted-text border border-crafted-brand-rust font-semibold shadow-sm'
                : 'text-crafted-text-muted hover:bg-crafted-surface-hover/70 hover:text-crafted-text'
            }`}
          >
            <Keyboard className="h-4 w-4 text-crafted-brand-rust" />
            <span>Keyboard Shortcuts</span>
          </button>

          <button
            onClick={() => setActiveCategory('workspace')}
            className={`flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === 'workspace'
                ? 'bg-crafted-surface text-crafted-text border border-crafted-border-bright font-semibold'
                : 'text-crafted-text-muted hover:bg-crafted-surface-hover/70 hover:text-crafted-text'
            }`}
          >
            <LayoutGrid className="h-4 w-4 text-crafted-text-dim" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setActiveCategory('about')}
            className={`flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === 'about'
                ? 'bg-crafted-surface text-crafted-text border border-crafted-border-bright font-semibold'
                : 'text-crafted-text-muted hover:bg-crafted-surface-hover/70 hover:text-crafted-text'
            }`}
          >
            <Info className="h-4 w-4 text-crafted-text-dim" />
            <span>About</span>
          </button>

          <div className="mt-auto pt-4 border-t border-crafted-border/40 px-2 font-mono text-[10px] text-crafted-text-dim">
            Crafted Studio v1.0.0
          </div>
        </div>

        {/* Category Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-crafted-bg font-sans">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-crafted-border/60 px-6 py-4">
            <span className="font-mono text-xs uppercase tracking-wider text-crafted-text-dim">
              Preferences // {activeCategory}
            </span>
            <button
              onClick={() => setSettingsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content Container */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeCategory === 'ai-providers' && <AIProvidersSettings />}
            {activeCategory === ('keyboard-shortcuts' as any) && <ShortcutSettings />}

            {activeCategory === 'general' && (
              <div className="space-y-4 animate-fade-in font-sans">
                <h3 className="text-base font-bold text-crafted-text">General Settings</h3>
                <div className="rounded-xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-2 text-xs text-crafted-text-muted">
                  <p>General application settings placeholder. Customized themes and layout density will be available here.</p>
                </div>
              </div>
            )}

            {activeCategory === 'workspace' && (
              <div className="space-y-4 animate-fade-in font-sans">
                <h3 className="text-base font-bold text-crafted-text">Workspace Settings</h3>
                <div className="rounded-xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-2 text-xs text-crafted-text-muted">
                  <p>Workspace layout density and auto-save options.</p>
                </div>
              </div>
            )}

            {activeCategory === 'about' && (
              <div className="space-y-4 animate-fade-in font-sans text-xs text-crafted-text-muted">
                <h3 className="text-base font-bold text-crafted-text">About Crafted Studio</h3>
                <p>Crafted Studio is a high-performance AI workspace for developers and designers.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
