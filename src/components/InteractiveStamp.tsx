import React, { useRef, useState, useEffect } from 'react';
import {
  Copy,
  Trash2,
  Move,
  ArrowRight,
  Layers,
} from 'lucide-react';
import type { PlacedStamp, PageDimension } from '../types';
import { ptToMm } from '../lib/signatureUtils';

interface InteractiveStampProps {
  stamp: PlacedStamp;
  pageDim: PageDimension;
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: PlacedStamp) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDuplicateToNextPage: () => void;
  onApplyToAllPages: () => void;
}

export const InteractiveStamp: React.FC<InteractiveStampProps> = ({
  stamp,
  pageDim,
  containerWidth,
  containerHeight,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onDuplicateToNextPage,
  onApplyToAllPages,
}) => {
  const stampRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);

  // Convert percentages to container pixels
  const leftPx = (stamp.xPercent / 100) * containerWidth;
  const topPx = (stamp.yPercent / 100) * containerHeight;
  const widthPx = (stamp.widthPercent / 100) * containerWidth;
  const heightPx = (stamp.heightPercent / 100) * containerHeight;

  // Real-time coordinates in PDF points & mm
  const pdfXPt = Math.round((stamp.xPercent / 100) * pageDim.width);
  // In PDF, Y is measured from bottom
  const pdfYPt = Math.round(pageDim.height - ((stamp.yPercent / 100) * pageDim.height) - ((stamp.heightPercent / 100) * pageDim.height));
  const xMm = ptToMm(pdfXPt);
  const yMm = ptToMm(pdfYPt);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) {
      return; // Handled by resize
    }
    e.stopPropagation();
    onSelect();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialXPercent = stamp.xPercent;
    const initialYPercent = stamp.yPercent;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const deltaXPercent = (deltaX / containerWidth) * 100;
      const deltaYPercent = (deltaY / containerHeight) * 100;

      const newXPercent = Math.max(0, Math.min(100 - stamp.widthPercent, initialXPercent + deltaXPercent));
      const newYPercent = Math.max(0, Math.min(100 - stamp.heightPercent, initialYPercent + deltaYPercent));

      onUpdate({
        ...stamp,
        xPercent: Math.round(newXPercent * 10) / 10,
        yPercent: Math.round(newYPercent * 10) / 10,
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Handle Resizing (Corner Handles)
  const handleResizeStart = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    setIsResizing(handle);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidthPx = widthPx;
    const initialHeightPx = heightPx;
    const initialXPercent = stamp.xPercent;
    const initialYPercent = stamp.yPercent;
    const aspectRatio = initialWidthPx / initialHeightPx;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidthPx = initialWidthPx;
      let newHeightPx = initialHeightPx;
      let newXPercent = initialXPercent;
      let newYPercent = initialYPercent;

      if (handle === 'se') {
        newWidthPx = Math.max(40, initialWidthPx + deltaX);
        newHeightPx = newWidthPx / aspectRatio;
      } else if (handle === 'sw') {
        newWidthPx = Math.max(40, initialWidthPx - deltaX);
        newHeightPx = newWidthPx / aspectRatio;
        const shiftXPercent = ((initialWidthPx - newWidthPx) / containerWidth) * 100;
        newXPercent = Math.max(0, initialXPercent - shiftXPercent);
      } else if (handle === 'ne') {
        newWidthPx = Math.max(40, initialWidthPx + deltaX);
        newHeightPx = newWidthPx / aspectRatio;
        const shiftYPercent = ((newHeightPx - initialHeightPx) / containerHeight) * 100;
        newYPercent = Math.max(0, initialYPercent - shiftYPercent);
      } else if (handle === 'nw') {
        newWidthPx = Math.max(40, initialWidthPx - deltaX);
        newHeightPx = newWidthPx / aspectRatio;
        const shiftXPercent = ((initialWidthPx - newWidthPx) / containerWidth) * 100;
        const shiftYPercent = ((newHeightPx - initialHeightPx) / containerHeight) * 100;
        newXPercent = Math.max(0, initialXPercent - shiftXPercent);
        newYPercent = Math.max(0, initialYPercent - shiftYPercent);
      }

      const newWidthPercent = (newWidthPx / containerWidth) * 100;
      const newHeightPercent = (newHeightPx / containerHeight) * 100;

      onUpdate({
        ...stamp,
        xPercent: Math.round(newXPercent * 10) / 10,
        yPercent: Math.round(newYPercent * 10) / 10,
        widthPercent: Math.round(newWidthPercent * 10) / 10,
        heightPercent: Math.round(newHeightPercent * 10) / 10,
      });
    };

    const onPointerUp = () => {
      setIsResizing(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Keyboard navigation when selected
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const step = e.shiftKey ? 2 : 0.5; // fine / coarse nudging

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdate({ ...stamp, xPercent: Math.max(0, stamp.xPercent - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdate({ ...stamp, xPercent: Math.min(100 - stamp.widthPercent, stamp.xPercent + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdate({ ...stamp, yPercent: Math.max(0, stamp.yPercent - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdate({ ...stamp, yPercent: Math.min(100 - stamp.heightPercent, stamp.yPercent + step) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, stamp, onUpdate, onDelete, onDuplicate]);

  return (
    <div
      ref={stampRef}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`absolute select-none cursor-move group touch-none transition-shadow ${
        isSelected
          ? 'ring-2 ring-indigo-500 shadow-xl z-30'
          : 'hover:ring-1 hover:ring-indigo-400/80 z-20'
      }`}
      style={{
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: `rotate(${stamp.rotation || 0}deg)`,
      }}
    >
      {/* Signature image graphic */}
      <img
        src={stamp.dataUrl}
        alt={stamp.title}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
        style={{ opacity: stamp.opacity ?? 1 }}
      />

      {/* Floating Toolbar when selected */}
      {isSelected && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 text-white px-2 py-1 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md z-40 text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Coordinates display */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono text-indigo-300 border-r border-slate-700 mr-0.5">
            <Move className="w-3 h-3 opacity-70" />
            <span>
              {xMm},{yMm}mm
            </span>
          </div>

          <button
            onClick={onDuplicate}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="Duplicate on this page (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onDuplicateToNextPage}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors flex items-center gap-0.5"
            title="Copy to Next Page"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onApplyToAllPages}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="Apply stamp to All Pages (e.g. Initialing)"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onDelete}
            className="p-1 hover:bg-rose-950/80 rounded text-rose-400 hover:text-rose-200 transition-colors ml-0.5"
            title="Delete stamp (Delete key)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-time dragging precision badge */}
      {(isDragging || isResizing) && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600/95 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-40">
          X: {xMm}mm ({pdfXPt}pt) • Y: {yMm}mm ({pdfYPt}pt) • {Math.round(stamp.widthPercent)}% width
        </div>
      )}

      {/* Resize handles when selected */}
      {isSelected && (
        <>
          <div
            data-handle="nw"
            onPointerDown={(e) => handleResizeStart(e, 'nw')}
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
          />
          <div
            data-handle="ne"
            onPointerDown={(e) => handleResizeStart(e, 'ne')}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
          />
          <div
            data-handle="sw"
            onPointerDown={(e) => handleResizeStart(e, 'sw')}
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
          />
          <div
            data-handle="se"
            onPointerDown={(e) => handleResizeStart(e, 'se')}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
          />
        </>
      )}
    </div>
  );
};
