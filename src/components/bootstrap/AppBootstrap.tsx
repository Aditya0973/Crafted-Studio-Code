import React from 'react';
import { Check, Loader2, AlertCircle, X } from 'lucide-react';
import { useAppBootstrapStore } from '../../stores/appBootstrapStore';

interface AppBootstrapProps {
  isFadingOut?: boolean;
  onDismiss?: () => void;
}

export const AppBootstrap: React.FC<AppBootstrapProps> = ({ isFadingOut = false, onDismiss }) => {
  const { steps, error } = useAppBootstrapStore();

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1B1515] text-[#F3EFEF] select-none font-sans p-6 transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div className="flex flex-col items-center space-y-6 max-w-sm w-full relative">
        {/* Dismiss Button if Error occurs */}
        {error && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute -top-10 right-0 rounded-full p-2 text-crafted-text-dim hover:bg-crafted-surface hover:text-crafted-text transition-colors"
            title="Dismiss overlay"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Official Crafted Co Rotating Logo Brand Loader */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-16 w-16 animate-[spin_2.4s_cubic-bezier(0.4,0,0.2,1)_infinite] drop-shadow-crafted-glow">
            <svg viewBox="0 0 100 100" fill="none" className="h-full w-full">
              <defs>
                <linearGradient id="craftedGradBootstrap" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#433FA9" />
                  <stop offset="50%" stopColor="#A9452D" />
                  <stop offset="100%" stopColor="#4641A9" />
                </linearGradient>
              </defs>
              <rect
                x="20"
                y="20"
                width="60"
                height="60"
                rx="18"
                transform="rotate(45 50 50)"
                stroke="url(#craftedGradBootstrap)"
                strokeWidth="6"
                fill="none"
              />
              <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="url(#craftedGradBootstrap)" opacity="0.9" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold text-crafted-text tracking-tight">Crafted Studio</h1>
            <p className="text-xs text-crafted-text-muted">Loading workspace engine...</p>
          </div>
        </div>

        {/* Error Alert or Progress Checklist */}
        {error ? (
          <div className="flex flex-col items-center space-y-3 w-full">
            <div className="flex items-center space-x-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 w-full">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="w-full rounded-xl bg-crafted-surface border border-crafted-border py-2 text-xs font-bold text-crafted-text hover:bg-crafted-surface-hover transition-colors"
              >
                Continue to Studio Workspace
              </button>
            )}
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-crafted-border/60 bg-crafted-surface/40 p-4 space-y-2.5 shadow-crafted-card">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center justify-between text-xs">
                <span
                  className={
                    step.status === 'done'
                      ? 'text-crafted-text font-medium'
                      : step.status === 'loading'
                      ? 'text-crafted-brand-lightViolet font-semibold'
                      : 'text-crafted-text-dim'
                  }
                >
                  {step.label}
                </span>

                <div className="flex h-4 w-4 items-center justify-center shrink-0">
                  {step.status === 'done' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  {step.status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
                  {step.status === 'pending' && <div className="h-1.5 w-1.5 rounded-full bg-crafted-border" />}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="font-mono text-[10px] text-crafted-text-dim tracking-wider">
          v1.0.0 • Native Monaco Active
        </div>
      </div>
    </div>
  );
};
