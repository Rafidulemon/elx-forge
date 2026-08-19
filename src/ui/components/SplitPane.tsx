import type { PointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { cn } from '../lib/cn';

interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  initial?: number;
  min?: number;
  max?: number;
  children: [ReactNode, ReactNode];
  className?: string;
}

/**
 * A lightweight resizable split pane. `initial`/`min`/`max` are fractions
 * (0..1) of the container along the split axis.
 */
export function SplitPane({
  direction = 'horizontal',
  initial = 0.5,
  min = 0.2,
  max = 0.8,
  children,
  className,
}: SplitPaneProps) {
  const [ratio, setRatio] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const position = direction === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top;
    const size = direction === 'horizontal' ? rect.width : rect.height;
    if (size === 0) return;
    const next = Math.min(max, Math.max(min, position / size));
    setRatio(next);
  };

  const handlePointerUp = (): void => {
    draggingRef.current = false;
  };

  const horizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={cn('flex min-h-0 min-w-0', horizontal ? 'flex-row' : 'flex-col', className)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flex: `0 0 ${ratio * 100}%` }}>
        {children[0]}
      </div>
      <div
        role="separator"
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        onPointerDown={handlePointerDown}
        className={cn(
          'z-10 shrink-0 touch-none bg-transparent transition-colors hover:bg-brand/50',
          horizontal ? 'w-[5px] -mx-[2px] cursor-col-resize' : 'h-[5px] -my-[2px] cursor-row-resize',
        )}
      />
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flex: `0 0 ${(1 - ratio) * 100}%` }}>
        {children[1]}
      </div>
    </div>
  );
}