import React, { useEffect, useRef } from 'react';
import { MessageSquare, FolderGit2, Sparkles, Loader2 } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useChatStore } from '../../stores/chatStore';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC = () => {
  const { activeProject, setCreateDialogOpen } = useProjectStore();
  const { messages, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-sans">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-crafted-text-muted space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-crafted-brand-rust" />
          <span className="text-xs font-mono">Loading project conversation...</span>
        </div>
      ) : !activeProject ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-crafted-text-muted space-y-4 max-w-sm mx-auto my-auto font-sans">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-crafted-surface border border-crafted-border text-crafted-text-dim shadow-crafted-card">
            <FolderGit2 className="h-6 w-6 text-crafted-brand-rust" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-crafted-text font-sans">No Active Workspace Selected</h3>
            <p className="text-xs text-crafted-text-muted mt-1 leading-relaxed font-sans">
              Open an existing software project or create a new workspace project to access its dedicated chat system.
            </p>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-[#433FA9] to-[#A9452D] px-4 py-2 text-xs font-semibold text-white shadow-crafted-glow hover:opacity-90 transition-opacity font-sans"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Create New Workspace</span>
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-crafted-text-muted space-y-3 max-w-md mx-auto my-auto animate-fade-in font-sans">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-crafted-surface border border-crafted-border text-crafted-brand-rust shadow-crafted-card">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-crafted-text font-sans">
              {activeProject.name}
            </h3>
            <p className="text-xs text-crafted-text-muted mt-1 leading-relaxed font-sans">
              Project workspace conversation initialized. Type a message below to start building your project's conversation history.
            </p>
          </div>
          <div className="rounded-xl border border-crafted-border bg-crafted-surface/50 px-3.5 py-2 font-mono text-[10px] text-crafted-text-dim">
            SQLite Table: `conversations` • Bound to Project ID
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};
