import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  filePath: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ filePath }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      window.craftedAPI
        .readFileDataUrl(filePath)
        .then((url) => {
          if (isMounted) {
            setDataUrl(url);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load image');
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.max(0.5, Math.min(prev * zoomFactor, 5)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-crafted-text-muted space-y-2 select-none">
        <Loader2 className="h-6 w-6 animate-spin text-crafted-brand-rust" />
        <span className="text-xs font-mono">Loading image asset...</span>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-red-400 space-y-2 select-none">
        <AlertCircle className="h-8 w-8 text-red-400/80" />
        <p className="text-xs font-medium">{error || 'Unable to display image.'}</p>
        <p className="font-mono text-[10px] text-crafted-text-dim break-all max-w-md">{filePath}</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-[#151111] select-none">
      {/* Zoom Control Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 rounded-xl border border-crafted-border bg-crafted-surface/90 px-2.5 py-1.5 shadow-crafted-card backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z * 0.85))}
          title="Zoom Out"
          className="p-1 text-crafted-text-dim hover:text-crafted-text transition-colors"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="font-mono text-[10px] text-crafted-text min-w-[2.5rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(5, z * 1.15))}
          title="Zoom In"
          className="p-1 text-crafted-text-dim hover:text-crafted-text transition-colors"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset Zoom"
          className="p-1 text-crafted-text-dim hover:text-crafted-text transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Image Viewport Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 flex items-center justify-center p-6 overflow-hidden ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        <img
          src={dataUrl}
          alt={filePath}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          className="shadow-2xl rounded-lg border border-crafted-border/40 select-none"
        />
      </div>
    </div>
  );
};
