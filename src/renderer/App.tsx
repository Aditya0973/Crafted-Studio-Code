import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { ShellLayout } from '../components/layout/ShellLayout';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { ImportProjectModal } from '../components/projects/ImportProjectModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import { AppBootstrap } from '../components/bootstrap/AppBootstrap';
import { GlobalShortcutListener } from '../components/common/GlobalShortcutListener';
import { ExplorerModals } from '../components/explorer/ExplorerModals';
import { useAppBootstrapStore } from '../stores/appBootstrapStore';
import { useChatStore } from '../stores/chatStore';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught UI Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.setItem('crafted_startup_crash_count', '0');
      useWorkbenchStore.getState().closeAllTabs();
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#181515] text-[#F3EFEF] p-6 font-sans select-none">
          <div className="max-w-md w-full rounded-2xl border border-crafted-border bg-crafted-panel p-6 shadow-2xl space-y-4 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-crafted-text">Application Render Exception</h2>
              <p className="text-xs text-crafted-text-dim">
                An unexpected component error occurred. You can reset the session to recover workspace state.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-crafted-surface border border-crafted-border font-mono text-[10px] text-rose-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-crafted-brand-rust text-white font-bold text-xs shadow-crafted-button hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reload Application Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  const { isBootstrapComplete, runBootstrap } = useAppBootstrapStore();
  const [showBootstrap, setShowBootstrap] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(false);

  useEffect(() => {
    // Startup Crash Protection & Safe Mode
    try {
      const rawCount = localStorage.getItem('crafted_startup_crash_count');
      const crashCount = parseInt(rawCount || '0', 10);

      localStorage.setItem('crafted_startup_crash_count', (crashCount + 1).toString());

      if (crashCount >= 2) {
        console.warn('[SAFE MODE ACTIVATED] 2+ Consecutive Startup Crashes Detected.');
        setIsSafeMode(true);
        useWorkbenchStore.getState().closeAllTabs();
      }

      const stabilityTimer = setTimeout(() => {
        localStorage.setItem('crafted_startup_crash_count', '0');
      }, 3000);

      return () => clearTimeout(stabilityTimer);
    } catch (err) {
      console.error('[App] Error evaluating startup crash counter:', err);
    }
  }, []);

  useEffect(() => {
    runBootstrap();
    const unsubStream = useChatStore.getState().subscribeStreamEvents();

    // Absolute Safety Fail-Safe: Force unmount bootstrap overlay after 1s max
    const failSafeTimer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => setShowBootstrap(false), 200);
    }, 1000);

    return () => {
      unsubStream();
      clearTimeout(failSafeTimer);
    };
  }, [runBootstrap]);

  useEffect(() => {
    if (isBootstrapComplete) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShowBootstrap(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isBootstrapComplete]);

  const handleDismissSafeMode = () => {
    localStorage.setItem('crafted_startup_crash_count', '0');
    setIsSafeMode(false);
  };

  return (
    <AppErrorBoundary>
      <GlobalShortcutListener />
      {showBootstrap && (
        <AppBootstrap
          isFadingOut={isFadingOut}
          onDismiss={() => {
            setIsFadingOut(true);
            setTimeout(() => setShowBootstrap(false), 200);
          }}
        />
      )}
      <ShellLayout isSafeMode={isSafeMode} onDismissSafeMode={handleDismissSafeMode} />
      <CreateProjectModal />
      <ImportProjectModal />
      <SettingsModal />
      <ExplorerModals />
    </AppErrorBoundary>
  );
};

export default App;
