import React, { useEffect, useRef } from 'react';
import { renderPageToCanvas } from '../lib/pdfEngine';
import type { PageDimension, PlacedStamp } from '../types';
import { Layers } from 'lucide-react';

interface ThumbnailSidebarProps {
  arrayBuffer: ArrayBuffer;
  pageDimensions: PageDimension[];
  activePageNumber: number;
  onSelectPage: (pageNumber: number) => void;
  stamps: PlacedStamp[];
}

const PageThumbnailItem: React.FC<{
  pageNumber: number;
  arrayBuffer: ArrayBuffer;
  pageDim: PageDimension;
  isActive: boolean;
  onSelect: () => void;
  stampCount: number;
}> = ({ pageNumber, arrayBuffer, pageDim, isActive, onSelect, stampCount }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !arrayBuffer) return;

    // Render low-res thumbnail with target width 120px
    const handle = renderPageToCanvas(arrayBuffer, pageNumber, canvas, { targetWidth: 120 });
    handle.promise.catch((err) => {
      if (!isCancelled && err?.name !== 'RenderingCancelledException' && !err?.message?.toLowerCase().includes('cancel')) {
        console.error('Thumbnail render error:', err);
      }
    });

    return () => {
      isCancelled = true;
      handle.cancel();
    };
  }, [arrayBuffer, pageNumber]);

  return (
    <div
      onClick={onSelect}
      className={`group flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-1 ring-indigo-500'
          : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
      }`}
    >
      {/* Thumbnail Canvas */}
      <div className="relative rounded bg-white shadow-sm overflow-hidden border border-slate-700/60 w-[110px] flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-auto block" />

        {/* Badge if page has signatures */}
        {stampCount > 0 && (
          <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow flex items-center gap-0.5">
            <span>✍️</span>
            <span>{stampCount}</span>
          </div>
        )}
      </div>

      {/* Page number footer */}
      <div className="mt-1.5 flex items-center justify-between w-full px-1 text-[11px]">
        <span className={`font-medium ${isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
          Page {pageNumber}
        </span>
        <span className="text-[10px] text-slate-500">
          {Math.round(pageDim.width)}×{Math.round(pageDim.height)}
        </span>
      </div>
    </div>
  );
};

export const ThumbnailSidebar: React.FC<ThumbnailSidebarProps> = ({
  arrayBuffer,
  pageDimensions,
  activePageNumber,
  onSelectPage,
  stamps,
}) => {
  return (
    <div className="w-44 flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pages ({pageDimensions.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
        {pageDimensions.map((dim) => {
          const count = stamps.filter((s) => s.pageNumber === dim.pageNumber).length;
          return (
            <PageThumbnailItem
              key={dim.pageNumber}
              pageNumber={dim.pageNumber}
              arrayBuffer={arrayBuffer}
              pageDim={dim}
              isActive={dim.pageNumber === activePageNumber}
              onSelect={() => onSelectPage(dim.pageNumber)}
              stampCount={count}
            />
          );
        })}
      </div>
    </div>
  );
};
