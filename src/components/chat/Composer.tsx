import React, { useRef, useEffect } from 'react';
import { SendHorizontal, Sparkles } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useChatStore } from '../../stores/chatStore';
import { useShortcutStore } from '../../stores/shortcutStore';

export const Composer: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { composerText, setComposerText, sendMessage, isSending } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [composerText]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerText.trim() || !activeProject || isSending) return;

    await sendMessage(composerText);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Register Chat Command Handlers (Ctrl+L for Focus Chat Input)
  useEffect(() => {
    const registerHandler = useShortcutStore.getState().registerHandler;
    const unsubs = [
      registerHandler('chat.focusInput', () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }),
      registerHandler('chat.sendMessage', () => {
        handleSubmit();
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [handleSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-crafted-border/60 bg-crafted-surface/40 p-3 select-none font-sans">
      <form onSubmit={handleSubmit} className="relative flex flex-col space-y-2">
        <div className="relative flex items-end rounded-xl border border-crafted-border bg-crafted-surface p-1.5 focus-within:border-crafted-brand-rust/60 transition-colors shadow-crafted-card">
          <textarea
            ref={textareaRef}
            rows={1}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeProject || isSending}
            placeholder={
              activeProject
                ? `Type a message or prompt for ${activeProject.name}... (Press Enter to send, Ctrl+L to focus input)`
                : 'Select or create a project to start typing messages...'
            }
            className="flex-1 max-h-32 resize-none bg-transparent px-2.5 py-1.5 text-xs text-crafted-text placeholder-crafted-text-dim focus:outline-none disabled:opacity-40 font-sans"
          />

          <button
            type="submit"
            disabled={!activeProject || !composerText.trim() || isSending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition-opacity"
          >
            {isSending ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2 font-mono text-[10px] text-crafted-text-dim">
            <span>Shift+Enter for newline</span>
            <span>•</span>
            <span>Ctrl+L to focus</span>
          </div>
          <span className="font-mono text-[10px] text-crafted-text-dim">
            {composerText.length > 0 ? `${composerText.length} chars` : ''}
          </span>
        </div>
      </form>
    </div>
  );
};
