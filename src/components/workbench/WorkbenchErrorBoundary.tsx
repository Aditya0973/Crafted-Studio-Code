import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  filePath?: string;
  onResetTab?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class WorkbenchErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    const targetFile = this.props.filePath || 'Unknown File';

    // Detailed Exception Logging (Requirement 5)
    console.error('==================================================');
    console.error('[CRITICAL WORKBENCH EXCEPTION CAUGHT]');
    console.error(`Target File: ${targetFile}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Stack Trace:\n${error.stack || 'No stack trace available'}`);
    console.error(`Component Stack:\n${errorInfo.componentStack}`);
    console.error('==================================================');
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unhandled render exception occurred.';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#181818] p-6 text-crafted-text font-sans select-none overflow-auto space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 shadow-lg">
            <AlertOctagon className="h-6 w-6" />
          </div>

          <div className="text-center space-y-1 max-w-md">
            <h3 className="text-sm font-bold text-crafted-text">This file could not be opened</h3>
            <p className="text-xs text-crafted-text-muted">
              An unexpected error occurred while loading the editor for{' '}
              <span className="font-mono text-cyan-300">{this.props.filePath || 'this tab'}</span>. The application shell remains safe.
            </p>
          </div>

          {/* Error Details Box */}
          <div className="w-full max-w-lg rounded-xl border border-red-500/20 bg-red-500/5 p-3 font-mono text-[11px] text-red-300 space-y-1.5 overflow-hidden">
            <div className="flex items-center space-x-1.5 text-red-400 font-bold border-b border-red-500/20 pb-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Exception Trace</span>
            </div>
            <p className="font-semibold break-all text-xs">{errorMsg}</p>
            {stack && (
              <pre className="max-h-32 overflow-y-auto text-[10px] text-red-300/80 leading-relaxed whitespace-pre-wrap select-text">
                {stack}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 pt-2">
            {this.props.onResetTab && (
              <button
                onClick={this.props.onResetTab}
                className="flex items-center space-x-1.5 rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-colors shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
                <span>Close Offending Tab</span>
              </button>
            )}

            <button
              onClick={this.handleTryAgain}
              className="flex items-center space-x-1.5 rounded-xl border border-crafted-border bg-crafted-surface px-4 py-2 text-xs font-medium text-crafted-text hover:bg-crafted-surface-hover transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Rendering</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
