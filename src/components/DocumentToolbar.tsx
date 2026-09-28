import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Upload,
  Sparkles,
  Maximize2,
  Columns,
  Square,
  ShieldCheck,
} from 'lucide-react';
import type { ViewMode } from '../types';

interface DocumentToolbarProps {
  fileName: string;
  numPages: number;
  activePageNumber: number;
  onPageChange: (newPage: number) => void;
  scale: number;
  onZoomChange: (newScale: number) => void;
  viewMode: ViewMode;
  onViewModeToggle: () => void;
  onDownloadPdf: () => void;
  isDownloading: boolean;
  totalStampsCount: number;
  onUploadNew: () => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  fileName,
  numPages,
  activePageNumber,
  onPageChange,
  scale,
  onZoomChange,
  viewMode,
  onViewModeToggle,
  onDownloadPdf,
  isDownloading,
  totalStampsCount,
  onUploadNew,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Document Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs" title={fileName}>
                {fileName}
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 inline mr-0.5" />
                Private & Secure
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {numPages} {numPages === 1 ? 'page' : 'pages'} •{' '}
              {totalStampsCount > 0 ? (
                <span className="text-indigo-400 font-medium">{totalStampsCount} stamps added</span>
              ) : (
                'Ready to sign'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onUploadNew}
          className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/60 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>New File</span>
        </button>
      </div>

      {/* Center: Page Controls & Zoom */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Page navigation */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
          <button
            onClick={() => onPageChange(Math.max(1, activePageNumber - 1))}
            disabled={activePageNumber <= 1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[11px] min-w-[50px] text-center">
            {activePageNumber} / {numPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(numPages, activePageNumber + 1))}
            disabled={activePageNumber >= numPages}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <button
          onClick={onViewModeToggle}
          className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:flex items-center gap-1 text-xs"
          title={viewMode === 'continuous' ? 'Switch to Single Page View' : 'Switch to Continuous Scroll View'}
        >
          {viewMode === 'continuous' ? (
            <>
              <Square className="w-3.5 h-3.5 text-indigo-400" />
              <span>Single</span>
            </>
          ) : (
            <>
              <Columns className="w-3.5 h-3.5 text-indigo-400" />
              <span>Scroll</span>
            </>
          )}
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
          <button
            onClick={() => onZoomChange(Math.max(0.6, scale - 0.15))}
            disabled={scale <= 0.6}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onZoomChange(1.0)}
            className="px-1.5 font-mono text-[11px] hover:text-white"
            title="Reset Zoom (100%)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={() => onZoomChange(Math.min(2.5, scale + 0.15))}
            disabled={scale >= 2.5}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Download Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDownloadPdf}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Signing &amp; Saving...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Signed PDF</span>
              {totalStampsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {totalStampsCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </header>
  );
};
