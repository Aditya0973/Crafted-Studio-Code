import React, { useState } from 'react';
import { AppWindow, Play, CheckCircle2, AlertCircle, RefreshCw, LayoutGrid } from 'lucide-react';
import { ToolDockItem } from '../../shared/types/toolDock';

interface DesktopAppLauncherCardProps {
  tool: ToolDockItem;
}

export const DesktopAppLauncherCard: React.FC<DesktopAppLauncherCardProps> = ({ tool }) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; error?: string } | null>(null);


  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchResult(null);
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const result = await window.craftedAPI.launchTool(tool.target, 'desktop_app', tool.name);
      setLaunchResult(result);
    }
    setIsLaunching(false);
  };


  const handleArrangeAgain = async () => {
    setIsArranging(true);
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.arrangeWorkspace();
    }
    setTimeout(() => setIsArranging(false), 500);
  };


  return (
    <div className="flex flex-col items-center justify-center h-full p-8 font-sans text-center bg-crafted-bg select-none">
      <div className="w-full max-w-sm p-6 rounded-2xl border border-crafted-border bg-crafted-panel shadow-2xl space-y-5">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-crafted-surface border border-crafted-border text-crafted-brand-rust shadow-crafted-glow">
            {tool.customIconUrl ? (
              <img src={tool.customIconUrl} alt={tool.name} className="h-8 w-8 object-contain" />
            ) : (
              <AppWindow className="h-8 w-8 text-crafted-brand-rust" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-crafted-text flex items-center justify-center space-x-2">
            <span>{tool.name}</span>
            {tool.badge && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-crafted-brand-rust bg-crafted-brand-rust/10 border border-crafted-brand-rust/20 px-2 py-0.5 rounded-full">
                {tool.badge}
              </span>
            )}
          </h3>
          <p className="font-mono text-xs text-crafted-text-dim truncate px-2">
            {tool.target}
          </p>
        </div>

        {launchResult && (
          <div
            className={`p-3 rounded-xl text-xs font-mono flex items-center space-x-2 border text-left ${
              launchResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {launchResult.success ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Launched & Workspace Arranged Side-by-Side</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span className="truncate">{launchResult.error || 'Failed to launch'}</span>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white font-bold text-xs rounded-xl shadow-crafted-button transition-all disabled:opacity-50"
          >
            {isLaunching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            <span>{isLaunching ? 'Launching Application...' : 'Launch Application'}</span>
          </button>

          {launchResult?.success && (
            <button
              onClick={handleArrangeAgain}
              disabled={isArranging}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text font-medium text-xs rounded-xl transition-all disabled:opacity-50"
            >
              <LayoutGrid className={`h-3.5 w-3.5 text-crafted-brand-rust ${isArranging ? 'animate-spin' : ''}`} />
              <span>{isArranging ? 'Arranging Workspace...' : 'Arrange Workspace Again'}</span>
            </button>
          )}

        </div>

        <p className="text-[10px] text-crafted-text-dim font-mono">
          // Crafted Studio & external application will arrange side-by-side cleanly. Afterwards, you can freely move or resize both windows.
        </p>
      </div>
    </div>
  );
};
