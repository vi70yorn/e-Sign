import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderPageToCanvas } from '../lib/pdfEngine';
import type { PageDimension, PlacedStamp, SignaturePreset } from '../types';
import { InteractiveStamp } from './InteractiveStamp';
import { Sparkles } from 'lucide-react';

interface PdfPageViewProps {
  pageNumber: number;
  arrayBuffer: ArrayBuffer;
  pageDim: PageDimension;
  scale: number;
  stamps: PlacedStamp[];
  selectedStampId: string | null;
  onSelectStamp: (id: string | null) => void;
  onUpdateStamp: (stamp: PlacedStamp) => void;
  onDeleteStamp: (id: string) => void;
  onDuplicateStamp: (stamp: PlacedStamp) => void;
  onDuplicateToNextPage: (stamp: PlacedStamp) => void;
  onApplyToAllPages: (stamp: PlacedStamp) => void;
  onDropNewStamp: (preset: SignaturePreset, pageNumber: number, xPercent: number, yPercent: number) => void;
  isActivePage?: boolean;
}

export const PdfPageView: React.FC<PdfPageViewProps> = ({
  pageNumber,
  arrayBuffer,
  pageDim,
  scale,
  stamps,
  selectedStampId,
  onSelectStamp,
  onUpdateStamp,
  onDeleteStamp,
  onDuplicateStamp,
  onDuplicateToNextPage,
  onApplyToAllPages,
  onDropNewStamp,
  isActivePage = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropHoverPos, setDropHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Compute container dimensions in display CSS pixels based on target scale
  const displayWidth = Math.round(pageDim.width * scale);
  const displayHeight = Math.round(pageDim.height * scale);

  // Render PDF page to canvas
  useEffect(() => {
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !arrayBuffer) return;

    setIsRendering(true);
    setRenderError(null);

    const handle = renderPageToCanvas(arrayBuffer, pageNumber, canvas, { scale });

    handle.promise
      .then(() => {
        if (!isCancelled) {
          setIsRendering(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          if (err?.name === 'RenderingCancelledException' || err?.message?.toLowerCase().includes('cancel')) {
            return;
          }
          console.error(`Failed to render page ${pageNumber}:`, err);
          setRenderError(err?.message || 'Render failed');
          setIsRendering(false);
        }
      });

    return () => {
      isCancelled = true;
      handle.cancel();
    };
  }, [arrayBuffer, pageNumber, scale]);

  // Handle Drag Over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropHoverPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    setDropHoverPos(null);
  }, []);

  // Handle Drop on Page
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropHoverPos(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const preset: SignaturePreset = JSON.parse(rawData);
      if (!preset || !preset.dataUrl) return;

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      // Base default width is roughly 25% of page width, or proportional
      const widthPercent = 25;
      const aspectRatio = (preset.naturalWidth || 200) / (preset.naturalHeight || 80);
      // In CSS pixels: widthPx = (widthPercent / 100) * rect.width
      // heightPx = widthPx / aspectRatio
      // heightPercent = (heightPx / rect.height) * 100
      const widthPx = (widthPercent / 100) * rect.width;
      const heightPx = widthPx / Math.max(0.5, aspectRatio);
      const heightPercent = (heightPx / rect.height) * 100;

      // Center around cursor
      let xPercent = (dropX / rect.width) * 100 - (widthPercent / 2);
      let yPercent = (dropY / rect.height) * 100 - (heightPercent / 2);

      // Clamp within page bounds
      xPercent = Math.max(0, Math.min(100 - widthPercent, xPercent));
      yPercent = Math.max(0, Math.min(100 - heightPercent, yPercent));

      onDropNewStamp(preset, pageNumber, Math.round(xPercent * 10) / 10, Math.round(yPercent * 10) / 10);
    } catch (err) {
      console.error('Failed to parse dropped stamp:', err);
    }
  }, [pageNumber, onDropNewStamp]);

  return (
    <div className="flex flex-col items-center my-6 group">
      {/* Page Header info bar */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 font-mono select-none mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            isActivePage ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            Page {pageNumber}
          </span>
          <span className="text-slate-500">
            {Math.round(pageDim.width)} × {Math.round(pageDim.height)} pt
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          {stamps.length > 0 ? (
            <span className="text-emerald-400 flex items-center gap-1 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {stamps.length} {stamps.length === 1 ? 'stamp' : 'stamps'} placed
            </span>
          ) : (
            <span>Drag signature here to place</span>
          )}
        </div>
      </div>

      {/* Main Page Rendering Surface with Drop Target */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelectStamp(null)}
        className={`relative bg-white shadow-2xl rounded-sm transition-all duration-150 overflow-hidden ${
          isDragOver
            ? 'ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-900 shadow-indigo-500/20 scale-[1.005]'
            : isActivePage
            ? 'ring-2 ring-indigo-500/50'
            : 'ring-1 ring-slate-800'
        }`}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }}
      >
        {/* PDF Page Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
        />

        {/* Loading Spinner */}
        {isRendering && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-xs">
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Rendering page {pageNumber}...</span>
            </div>
          </div>
        )}

        {/* Render Error */}
        {renderError && (
          <div className="absolute inset-0 bg-rose-50/90 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-semibold text-rose-600">Error rendering page {pageNumber}</p>
            <p className="text-xs text-rose-500 mt-1">{renderError}</p>
          </div>
        )}

        {/* Drag-over hover ghost indicator */}
        {isDragOver && dropHoverPos && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-indigo-600 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-700 font-semibold text-xs transition-all"
            style={{
              left: `${dropHoverPos.x}px`,
              top: `${dropHoverPos.y}px`,
              width: `${displayWidth * 0.25}px`,
              height: `${displayWidth * 0.1}px`,
            }}
          >
            <span className="flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded shadow">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Drop Stamp Here
            </span>
          </div>
        )}

        {/* Placed Interactive Stamps */}
        {stamps.map((stamp) => (
          <InteractiveStamp
            key={stamp.id}
            stamp={stamp}
            pageDim={pageDim}
            containerWidth={displayWidth}
            containerHeight={displayHeight}
            isSelected={selectedStampId === stamp.id}
            onSelect={() => onSelectStamp(stamp.id)}
            onUpdate={onUpdateStamp}
            onDelete={() => onDeleteStamp(stamp.id)}
            onDuplicate={() => onDuplicateStamp(stamp)}
            onDuplicateToNextPage={() => onDuplicateToNextPage(stamp)}
            onApplyToAllPages={() => onApplyToAllPages(stamp)}
          />
        ))}
      </div>
    </div>
  );
};
