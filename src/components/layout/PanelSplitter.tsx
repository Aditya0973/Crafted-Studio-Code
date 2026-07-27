import React, { useRef, useEffect } from 'react';
import { WorkspacePanelId, workspaceLayoutEngine } from '../../services/WorkspaceLayoutEngine';

interface PanelSplitterProps {
  splitterIndex: number;
  containerWidth: number;
  visibleIds: WorkspacePanelId[];
  currentProportions: Record<WorkspacePanelId, number>;
  onProportionsChange: (newProportions: Record<WorkspacePanelId, number>) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export const PanelSplitter: React.FC<PanelSplitterProps> = ({
  splitterIndex,
  containerWidth,
  visibleIds,
  currentProportions,
  onProportionsChange,
  onDragStateChange,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const liveProportionsRef = useRef(currentProportions);

  // Keep liveProportionsRef updated when currentProportions prop changes outside drag
  useEffect(() => {
    if (!isDraggingRef.current) {
      liveProportionsRef.current = currentProportions;
    }
  }, [currentProportions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    liveProportionsRef.current = { ...currentProportions };

    if (onDragStateChange) onDragStateChange(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartXRef.current;
      dragStartXRef.current = moveEvent.clientX;

      const updatedProportions = workspaceLayoutEngine.calculateSmartResize(
        containerWidth,
        visibleIds,
        liveProportionsRef.current,
        splitterIndex,
        deltaX
      );

      liveProportionsRef.current = updatedProportions;
      onProportionsChange(updatedProportions);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      if (onDragStateChange) onDragStateChange(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group relative w-1.5 h-full cursor-col-resize hover:bg-crafted-brand-rust/60 transition-colors z-30 shrink-0 flex items-center justify-center bg-crafted-border/40 select-none"
    >
      <div className="w-0.5 h-8 rounded-full bg-crafted-text-dim/40 group-hover:bg-cyan-400 transition-colors" />
    </div>
  );
};
