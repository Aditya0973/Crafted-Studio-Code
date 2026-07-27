import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTermInstanceProps {
  terminalId: string;
  cwd: string;
  isActive: boolean;
}

export const XTermInstance: React.FC<XTermInstanceProps> = ({ terminalId, cwd, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize xterm.js instance with enhanced input and selection settings
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      rightClickSelectsWord: true,
      theme: {
        background: '#151111',
        foreground: '#F3EFEF',
        cursor: '#6864F6',
        selectionBackground: 'rgba(104, 100, 246, 0.35)',
        black: '#1b1515',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Load Clickable Web Links Addon (Next.js, Vite, Flutter localhost links)
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        window.craftedAPI.openProjectFolder(uri);
      }
    });
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Key Event Interceptor for Clipboard Copy/Paste
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // Ctrl+V / Cmd+V / Shift+Insert -> Paste Clipboard Text
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && e.type === 'keydown') {
        if (navigator.clipboard) {
          navigator.clipboard.readText().then((text) => {
            if (text && typeof window !== 'undefined' && window.craftedAPI) {
              window.craftedAPI.terminalData(terminalId, text);
            }
          });
          return false;
        }
      }

      if (e.shiftKey && e.key === 'Insert' && e.type === 'keydown') {
        if (navigator.clipboard) {
          navigator.clipboard.readText().then((text) => {
            if (text && typeof window !== 'undefined' && window.craftedAPI) {
              window.craftedAPI.terminalData(terminalId, text);
            }
          });
          return false;
        }
      }

      // Ctrl+C / Cmd+C -> Copy if selection exists, else SIGINT
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && e.type === 'keydown') {
        const selection = term.getSelection();
        if (selection && selection.length > 0) {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(selection);
          }
          return false; // Prevent terminal from sending SIGINT when copying text
        }
      }

      return true;
    });

    // Create PTY backend process
    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI.terminalCreate({
        id: terminalId,
        cwd,
        cols: term.cols,
        rows: term.rows,
      });

      // Send terminal input to PTY
      const disposableData = term.onData((data) => {
        window.craftedAPI.terminalData(terminalId, data);
      });

      // Receive stdout/stderr from PTY
      const removeDataListener = window.craftedAPI.onTerminalData(terminalId, (data) => {
        term.write(data);
      });

      // Handle PTY exit
      const removeExitListener = window.craftedAPI.onTerminalExit(terminalId, (code) => {
        term.writeln(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m`);
      });

      // Send resize event to PTY on window/panel resize
      const disposableResize = term.onResize(({ cols, rows }) => {
        window.craftedAPI.terminalResize(terminalId, cols, rows);
      });

      return () => {
        disposableData.dispose();
        disposableResize.dispose();
        removeDataListener();
        removeExitListener();
        term.dispose();
      };
    }

    return () => {
      term.dispose();
    };
  }, [terminalId, cwd]);

  // Auto-focus terminal on mount or active tab switch
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch {
          /* ignore */
        }
      }, 60);
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{ display: isActive ? 'block' : 'none' }}
      className="h-full w-full bg-[#151111] p-2 overflow-hidden"
    />
  );
};
