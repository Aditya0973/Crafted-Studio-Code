import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, MessageSquare, Square, RefreshCw } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useProjectStore } from '../../stores/projectStore';
import { MessageBubble } from './MessageBubble';

export const ChatWorkspace: React.FC = () => {
  const {
    messages,
    isLoading,
    isSending,
    isGenerating,
    composerText,
    setComposerText,
    sendMessage,
    cancelGeneration,
    clearConversation,
    subscribeStreamEvents,
    debugLog,
  } = useChatStore();

  const { activeProject } = useProjectStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  const isBusy = isGenerating || isSending;

  // Subscribe to live streaming IPC events on mount
  useEffect(() => {
    const unsub = subscribeStreamEvents();
    return () => unsub();
  }, [subscribeStreamEvents]);

  // Handle user manual scroll behavior during streaming
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setUserHasScrolledUp(!isNearBottom);
  };

  // Auto scroll to bottom during streaming unless user manually scrolled up
  useEffect(() => {
    if (!userHasScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBusy, userHasScrolledUp]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (composerText.trim() && !isBusy) {
        setUserHasScrolledUp(false);
        sendMessage(composerText);
      }
    }
  };

  const handleSend = () => {
    if (composerText.trim() && !isBusy) {
      setUserHasScrolledUp(false);
      sendMessage(composerText);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-crafted-surface border border-crafted-border text-crafted-text-dim mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-crafted-text">No Active Project Selected</h3>
        <p className="text-xs text-crafted-text-muted mt-1 max-w-xs">
          Open or create a project to launch your project-aware AI chat workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-crafted-bg min-w-0 select-none font-sans relative">
      {/* Live State Debug Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-1 text-[10px] font-mono flex items-center justify-between text-amber-200 z-30">
        <div className="flex items-center space-x-3">
          <span>
            STATE DEBUG: <strong className={isSending ? 'text-emerald-400' : 'text-crafted-text-dim'}>isSending: {String(isSending)}</strong> |{' '}
            <strong className={isGenerating ? 'text-emerald-400' : 'text-crafted-text-dim'}>isGenerating: {String(isGenerating)}</strong> |{' '}
            <strong className={isBusy ? 'text-emerald-400' : 'text-crafted-text-dim'}>isBusy: {String(isBusy)}</strong>
          </span>
        </div>
        <span className="text-[9px] text-amber-400/80">Live State Monitor</span>
      </div>

      {/* Header Toolbar */}
      <div className="flex h-10 w-full items-center justify-between border-b border-crafted-border bg-crafted-surface/50 px-4 text-xs">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-3.5 w-3.5 text-crafted-brand-rust" />
          <span className="font-semibold text-crafted-text">Project Chat</span>
          <span className="font-mono text-[10px] text-crafted-text-dim">({messages.length} messages)</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Header Stop Generation Action Button */}
          {isBusy && (
            <button
              onClick={cancelGeneration}
              title="Stop AI Response Generation"
              className="flex items-center space-x-1 rounded border border-red-500/50 bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-200 hover:bg-red-500/30 transition-all cursor-pointer animate-pulse shadow-sm"
            >
              <Square className="h-3 w-3 fill-current text-red-400" />
              <span>Stop Generation</span>
            </button>
          )}

          <button
            onClick={() => clearConversation()}
            className="font-mono text-[10px] text-crafted-text-dim hover:text-crafted-text hover:underline transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Messages Scroll Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 relative"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-crafted-text-dim">
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white shadow-crafted-glow">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-crafted-text">Crafted Studio AI Workspace</h3>
              <p className="text-xs text-crafted-text-muted max-w-sm leading-relaxed">
                Ask questions, plan architecture, or request guidance for{' '}
                <strong className="text-crafted-text">{activeProject.name}</strong>.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Stop Generation Overlay Pill */}
      {isBusy && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <button
            onClick={cancelGeneration}
            className="flex items-center space-x-2 rounded-full border border-red-500/60 bg-red-950/95 px-5 py-2 text-xs font-bold text-red-200 shadow-2xl backdrop-blur-md hover:bg-red-900 transition-all cursor-pointer ring-2 ring-red-500/40"
          >
            <Square className="h-3.5 w-3.5 fill-current text-red-400" />
            <span>STOP DEBUG: Stop Generation Active</span>
          </button>
        </div>
      )}

      {/* Composer Input Area */}
      <div className="border-t border-crafted-border bg-crafted-surface/60 p-3 font-sans relative">
        <div className="relative flex items-end rounded-xl border border-crafted-border bg-crafted-bg focus-within:border-crafted-brand-rust/60 focus-within:ring-1 focus-within:ring-crafted-brand-rust/30 transition-all">
          <textarea
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            placeholder={
              isBusy
                ? 'AI is generating a response...'
                : `Message Crafted Studio AI (${activeProject.name})...`
            }
            className="w-full resize-none bg-transparent px-3 py-2.5 text-xs text-crafted-text placeholder:text-crafted-text-dim focus:outline-none disabled:opacity-50 min-h-[42px] max-h-[160px] font-sans"
            rows={1}
          />

          <div className="p-1.5 flex items-center space-x-1.5">
            {/* Direct State Conditional Render */}
            {isBusy ? (
              <button
                onClick={cancelGeneration}
                title="Stop Generation"
                className="flex items-center space-x-1.5 rounded-lg bg-red-500/30 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/40 transition-colors cursor-pointer border border-red-500/50 shadow-sm"
              >
                <Square className="h-3 w-3 fill-current text-red-400" />
                <span>STOP DEBUG</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!composerText.trim() || isBusy}
                title="Send Message"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-[#433FA9] to-[#A9452D] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
