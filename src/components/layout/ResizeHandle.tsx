import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  direction?: 'left' | 'right';
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResize,
  onDragStateChange,
  direction = 'left',
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastXRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    lastXRef.current = e.clientX;
    setIsDragging(true);
    if (onDragStateChange) onDragStateChange(true);
  };

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        const deltaX = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        onResize(direction === 'right' ? -deltaX : deltaX);
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        setIsDragging(false);
        if (onDragStateChange) onDragStateChange(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize, onDragStateChange]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'group relative z-30 w-2 cursor-col-resize select-none touch-none transition-colors hover:bg-crafted-brand-rust/60',
        isDragging && 'bg-crafted-brand-rust',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 -left-1 -right-1 opacity-0 transition-opacity group-hover:opacity-100',
          isDragging && 'opacity-100'
        )}
      />
      <div
        className={cn(
          'h-full w-full border-r border-crafted-border/60 transition-colors group-hover:border-crafted-brand-rust/80',
          isDragging && 'border-crafted-brand-rust'
        )}
      />
    </div>
  );
};
