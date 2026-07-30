import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Search, Sparkles, Bot, Layers, Globe, Code, Terminal, Zap, Shield, AppWindow, Folder, Check } from 'lucide-react';

interface DetectInstalledAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (app: { name: string; target: string; icon: string; badge?: string }) => void;
  onManualBrowse: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Bot,
  Layers,
  Globe,
  Code,
  Terminal,
  Zap,
  Shield,
  AppWindow,
};

export const DetectInstalledAppsModal: React.FC<DetectInstalledAppsModalProps> = ({
  isOpen,
  onClose,
  onSelectApp,
  onManualBrowse,
}) => {
  const [apps, setApps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'dev' | 'system'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.craftedAPI) {
      setIsLoading(true);
      window.craftedAPI
        .getDiscoveredApps()
        .then((list) => {
          if (Array.isArray(list)) setApps(list);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.publisher && app.publisher.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'dev') {
      return (
        app.badge === 'Dev' ||
        app.badge === 'AI' ||
        app.badge === 'Git' ||
        app.badge === 'Design'
      );
    }
    if (selectedCategory === 'system') {
      return app.badge === 'System' || app.badge === 'Installed';
    }

    return true;
  });

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none pointer-events-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl border border-crafted-border bg-crafted-panel shadow-2xl pointer-events-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-crafted-border/60 bg-crafted-surface/40 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <Search className="h-4 w-4 text-crafted-brand-rust" />
            <h2 className="text-sm font-bold text-crafted-text">
              Detected Installed Applications
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Field & Filter Chips */}
        <div className="p-5 border-b border-crafted-border/40 bg-crafted-bg space-y-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-crafted-text-dim" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search installed applications on this PC..."
              className="w-full bg-crafted-surface border border-crafted-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-crafted-text focus:outline-none focus:border-crafted-brand-rust transition-colors font-mono"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-crafted-brand-rust text-white shadow-sm font-semibold'
                  : 'bg-crafted-surface border border-crafted-border text-crafted-text-muted hover:text-crafted-text hover:bg-crafted-surface-hover'
              }`}
            >
              All Detected ({apps.length})
            </button>
            <button
              onClick={() => setSelectedCategory('dev')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                selectedCategory === 'dev'
                  ? 'bg-crafted-brand-rust text-white shadow-sm font-semibold'
                  : 'bg-crafted-surface border border-crafted-border text-crafted-text-muted hover:text-crafted-text hover:bg-crafted-surface-hover'
              }`}
            >
              Dev & Design Tools
            </button>
            <button
              onClick={() => setSelectedCategory('system')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                selectedCategory === 'system'
                  ? 'bg-crafted-brand-rust text-white shadow-sm font-semibold'
                  : 'bg-crafted-surface border border-crafted-border text-crafted-text-muted hover:text-crafted-text hover:bg-crafted-surface-hover'
              }`}
            >
              System Apps
            </button>
          </div>
        </div>

        {/* Application List Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 max-h-[50vh] bg-crafted-bg">
          {isLoading ? (
            <div className="py-12 text-center text-crafted-text-muted text-xs flex flex-col items-center">
              <Search className="h-6 w-6 text-crafted-brand-rust animate-pulse mb-2" />
              <span>Scanning Registry & Windows Start Menu for installed apps...</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-12 text-center text-crafted-text-muted text-xs space-y-3">
              <p>No installed applications found matching "{searchQuery}".</p>
              <button
                onClick={onManualBrowse}
                className="px-4 py-2 bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text rounded-xl font-medium transition-all"
              >
                Browse Executable File Manually...
              </button>
            </div>
          ) : (
            filteredApps.map((app) => {
              const IconComp = ICON_MAP[app.icon] || AppWindow;
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-crafted-border bg-crafted-surface/50 hover:bg-crafted-surface-hover hover:border-crafted-border-bright transition-all group shadow-sm"
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crafted-panel border border-crafted-border">
                      <IconComp className="h-4 w-4 text-crafted-brand-rust" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-crafted-text truncate">
                          {app.name}
                        </span>
                        {app.badge && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-crafted-brand-rust bg-crafted-brand-rust/10 border border-crafted-brand-rust/20 px-2 py-0.5 rounded-full">
                            {app.badge}
                          </span>
                        )}
                      </div>
                      <span className="block font-mono text-[10px] text-crafted-text-dim truncate mt-0.5">
                        {app.target}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectApp({
                        name: app.name,
                        target: app.target,
                        icon: app.icon || 'AppWindow',
                        badge: app.badge,
                      });
                      onClose();
                    }}
                    className="flex items-center space-x-1.5 py-1.5 px-3.5 bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white text-xs font-semibold rounded-xl shadow-crafted-button transition-all shrink-0 ml-3"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Select</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-crafted-border/60 bg-crafted-surface/40 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              onManualBrowse();
            }}
            className="flex items-center space-x-2 text-crafted-brand-lightViolet hover:underline font-medium"
          >
            <Folder className="h-4 w-4 text-crafted-brand-rust" />
            <span>Not listed? Browse executable file manually...</span>
          </button>

          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-crafted-surface border border-crafted-border text-crafted-text-muted hover:text-crafted-text rounded-xl font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
