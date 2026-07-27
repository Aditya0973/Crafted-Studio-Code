import React from 'react';
import { MessageSquare, Trash2, ShieldCheck } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useChatStore } from '../../stores/chatStore';

export const ConversationHeader: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { messages, clearConversation } = useChatStore();

  return (
    <div className="flex items-center justify-between border-b border-crafted-border/60 bg-crafted-surface/30 px-3 py-2 select-none font-sans">
      {/* Title & Status */}
      <div className="flex items-center space-x-2 min-w-0">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-crafted-brand-rust/15 border border-crafted-brand-rust/30 text-crafted-brand-rust">
          <MessageSquare className="h-3 w-3" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="truncate text-xs font-semibold text-crafted-text">
              {activeProject ? activeProject.name : 'No Active Workspace'}
            </h3>
            <span className="flex items-center space-x-1 rounded-full bg-crafted-surface px-1.5 py-0.2 font-mono text-[9px] font-medium text-crafted-text-dim border border-crafted-border">
              <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
              <span>Project Bound</span>
            </span>
          </div>
        </div>
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center space-x-2 shrink-0">
        {activeProject && messages.length > 0 && (
          <button
            onClick={() => clearConversation()}
            title="Clear Conversation History"
            className="flex items-center space-x-1 rounded-lg border border-crafted-border bg-crafted-surface px-2 py-1 text-[10px] font-medium text-crafted-text-muted hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-3 w-3 text-red-400" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};
