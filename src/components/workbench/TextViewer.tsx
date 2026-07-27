import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { FileContentResult } from '../../shared/types';

interface TextViewerProps {
  filePath: string;
}

export const TextViewer: React.FC<TextViewerProps> = ({ filePath }) => {
  const [data, setData] = useState<FileContentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI
        .readFileText(filePath)
        .then((result) => {
          if (isMounted) {
            setData(result);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to read file content');
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-crafted-text-muted space-y-2 select-none">
        <Loader2 className="h-6 w-6 animate-spin text-crafted-brand-rust" />
        <span className="text-xs font-mono">Reading file text...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-red-400 space-y-2 select-none">
        <AlertCircle className="h-8 w-8 text-red-400/80" />
        <p className="text-xs font-medium">{error || 'Unable to display file content.'}</p>
        <p className="font-mono text-[10px] text-crafted-text-dim break-all max-w-md">{filePath}</p>
      </div>
    );
  }

  const lines = data.content.split('\n');

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#1B1515] text-crafted-text font-mono text-xs select-text">
      {/* Line Numbers Column */}
      <div className="select-none border-r border-crafted-border/40 bg-crafted-surface/30 px-3 py-4 text-right text-crafted-text-dim font-mono text-[11px] min-w-[3.5rem]">
        {lines.map((_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code Text Viewport */}
      <div className="flex-1 overflow-auto p-4 leading-6 whitespace-pre font-mono text-crafted-text/90">
        {lines.map((line, i) => (
          <div key={i} className="min-h-[1.5rem]">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
