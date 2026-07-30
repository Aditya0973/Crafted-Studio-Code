import React, { useRef, useEffect, useState } from 'react';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';
import { EditorManager } from '../../services/EditorManager';

interface CodeEditorHostProps {
  filePath: string;
  value: string;
  onChange: (newValue: string) => void;
  onSave?: () => void;
  savedViewState?: unknown;
  onSaveViewState?: (filePath: string, viewState: unknown) => void;
}

export const CodeEditorHost: React.FC<CodeEditorHostProps> = ({
  filePath,
  value,
  onChange,
  onSave,
  savedViewState,
  onSaveViewState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mountError, setMountError] = useState<Error | null>(null);

  const filename = filePath.split(/[/\\]/).pop() || '';
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : filename.toLowerCase();
  const isImage = ['ico', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

  // Load Image Data URL if file is an image asset with cancellation protection & file:// fallback
  useEffect(() => {
    let isCancelled = false;
    if (isImage && typeof window !== 'undefined' && window.craftedAPI) {
      setImageSrc(null);
      window.craftedAPI
        .readFileDataUrl(filePath)
        .then((url) => {
          if (!isCancelled && url) setImageSrc(url);
        })
        .catch((err) => {
          console.warn('[CodeEditorHost] DataURL read failed, using file:// scheme fallback:', err);
          if (!isCancelled) {
            const cleanPath = filePath.replace(/\\/g, '/');
            const fileUrl = cleanPath.startsWith('/') ? `file://${cleanPath}` : `file:///${cleanPath}`;
            setImageSrc(fileUrl);
          }
        });
    } else if (isImage) {
      const cleanPath = filePath.replace(/\\/g, '/');
      const fileUrl = cleanPath.startsWith('/') ? `file://${cleanPath}` : `file:///${cleanPath}`;
      setImageSrc(fileUrl);
    } else {
      setImageSrc(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [filePath, isImage]);

  // Keep references to latest callbacks
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onSaveViewStateRef = useRef(onSaveViewState);
  onSaveViewStateRef.current = onSaveViewState;

  // Activation & Editor Attachment Effect
  useEffect(() => {
    if (isImage) {
      EditorManager.getInstance().hideEditor();
      return;
    }

    if (!containerRef.current) return;

    try {
      const editorManager = EditorManager.getInstance();
      editorManager.showEditor();
      editorManager.mountEditor(containerRef.current, () => onSaveRef.current?.());
      editorManager.activateModel(
        filePath,
        value,
        (newVal: string) => onChangeRef.current(newVal),
        savedViewState
      );
    } catch (err) {
      console.error('[CodeEditorHost] Native Monaco activation error:', err);
      setMountError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [filePath, isImage]);

  // Auto Re-layout Monaco Editor when container resizes or becomes visible using contentRect dimensions
  useEffect(() => {
    if (!containerRef.current || isImage) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          EditorManager.getInstance().layout({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    observer.observe(containerRef.current);

    // Initial explicit layout pass if container already has dimensions
    const initialRect = containerRef.current.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      EditorManager.getInstance().layout({
        width: Math.floor(initialRect.width),
        height: Math.floor(initialRect.height),
      });
    }

    return () => observer.disconnect();
  }, [isImage]);

  // Save viewState safely when switching active files or unmounting (Closure captures exact target file path)
  useEffect(() => {
    const targetPath = filePath;
    return () => {
      if (onSaveViewStateRef.current && !isImage) {
        const vs = EditorManager.getInstance().getActiveViewState();
        if (vs) onSaveViewStateRef.current(targetPath, vs);
      }
    };
  }, [filePath, isImage]);

  return (
    <div className="relative h-full w-full bg-[#1e1e1e] overflow-hidden font-sans select-none">
      {/* Permanent Monaco Editor DOM Container — Keeps layout dimensions; hidden with visibility:hidden & opacity:0 */}
      <div
        ref={containerRef}
        className={`h-full w-full bg-[#1e1e1e] overflow-hidden ${
          isImage || mountError ? 'invisible opacity-0 pointer-events-none absolute inset-0' : 'relative block opacity-100 pointer-events-auto'
        }`}
      />

      {/* Full-Screen Image Viewer Overlay */}
      {isImage && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#181818] p-6 overflow-auto">
          {imageSrc ? (
            <div className="flex flex-col items-center space-y-4 max-w-full max-h-full">
              <div className="p-4 bg-[#1e1e1e] border border-crafted-border rounded-2xl shadow-crafted-card flex items-center justify-center overflow-auto max-w-full max-h-[80vh]">
                <img src={imageSrc} alt={filename} className="max-h-[70vh] max-w-full object-contain rounded-lg" />
              </div>
              <div className="font-mono text-xs text-crafted-text-dim bg-[#1e1e1e] px-3 py-1 rounded-full border border-crafted-border/40">
                {filename} ({ext.toUpperCase()} Image Asset)
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-crafted-text-dim">
              <ImageIcon className="h-8 w-8 text-crafted-border animate-pulse" />
              <span className="text-xs">Loading image asset...</span>
            </div>
          )}
        </div>
      )}

      {/* Fallback Text Editor Overlay if Native Monaco initialization fails */}
      {mountError && !isImage && (
        <div className="absolute inset-0 z-10 flex flex-col h-full w-full bg-[#181818] p-4 text-crafted-text">
          <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-300 text-xs mb-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Editor fallback active. Standard text editor loaded.</span>
          </div>

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 w-full resize-none rounded-xl border border-crafted-border bg-[#1e1e1e] p-4 font-mono text-xs text-crafted-text focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
