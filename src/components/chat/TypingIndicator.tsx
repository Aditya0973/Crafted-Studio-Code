import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex w-full justify-start mb-3 animate-fade-in">
      <div className="flex items-center space-x-2.5 rounded-2xl border border-crafted-border bg-crafted-surface/70 px-3.5 py-2.5 shadow-crafted-card">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-crafted-surface-hover text-crafted-text-muted border border-crafted-border">
          <Bot className="h-3 w-3" />
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-crafted-brand-rust animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-crafted-brand-lightViolet animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-crafted-brand-rust animate-bounce" />
        </div>
      </div>
    </div>
  );
};
