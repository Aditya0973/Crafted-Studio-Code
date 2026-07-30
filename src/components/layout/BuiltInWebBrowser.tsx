import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, Globe, Copy, Check } from 'lucide-react';
import { ToolDockItem } from '../../shared/types/toolDock';

interface BuiltInWebBrowserProps {
  tool: ToolDockItem;
}

export const BuiltInWebBrowser: React.FC<BuiltInWebBrowserProps> = ({ tool }) => {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState(tool.target);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStart = () => setIsLoading(true);
    const handleStop = () => {
      setIsLoading(false);
      try {
        const wv = webview as any;
        if (wv.getURL) {
          const url = wv.getURL();
          setCurrentUrl(url);
          setCanGoBack(wv.canGoBack());
          setCanGoForward(wv.canGoForward());
        }
      } catch {}
    };

    webview.addEventListener('did-start-loading', handleStart);
    webview.addEventListener('did-stop-loading', handleStop);

    return () => {
      webview.removeEventListener('did-start-loading', handleStart);
      webview.removeEventListener('did-stop-loading', handleStop);
    };
  }, []);

  const handleBack = () => (webviewRef.current as any)?.goBack();
  const handleForward = () => (webviewRef.current as any)?.goForward();
  const handleReload = () => (webviewRef.current as any)?.reload();

  const handleOpenExternal = () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI.openExternalUrl(currentUrl);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-crafted-bg font-sans">
      {/* Webview Navigation Bar */}
      <div className="flex items-center space-x-2 px-3 py-2 border-b border-crafted-border/60 bg-crafted-surface/40 text-xs shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-1.5 rounded-lg text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-1.5 rounded-lg text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface disabled:opacity-30 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface transition-colors"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-crafted-brand-rust' : ''}`} />
          </button>
        </div>

        {/* Address Input Bar */}
        <div className="flex-1 flex items-center bg-crafted-surface border border-crafted-border rounded-xl px-3 py-1.5 font-mono text-xs text-crafted-text">
          <Globe className="h-3.5 w-3.5 text-crafted-brand-rust shrink-0 mr-2" />
          <span className="truncate flex-1">{currentUrl}</span>
          <button
            onClick={handleCopyUrl}
            title="Copy URL"
            className="p-1 text-crafted-text-dim hover:text-crafted-text transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        <button
          onClick={handleOpenExternal}
          title="Open in System Browser"
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text rounded-xl font-medium transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5 text-crafted-brand-rust" />
          <span className="text-[11px]">External</span>
        </button>
      </div>

      {/* Electron Webview Element */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
        <webview
          ref={webviewRef}
          src={tool.target}
          className="w-full h-full border-none"
          allowpopups={true}
        />
      </div>
    </div>
  );
};

