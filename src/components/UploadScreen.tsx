import React, { useState } from 'react';
import {
  Upload,
  FileText,
  ShieldCheck,
  Sparkles,
  Lock,
  Layers,
  Move,
  CheckCircle2,
} from 'lucide-react';

interface UploadScreenProps {
  onFileSelected: (file: File) => void;
  onLoadSample: (sampleType: 'nda' | 'service') => void;
  isLoading: boolean;
  loadingMessage?: string;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onFileSelected,
  onLoadSample,
  isLoading,
  loadingMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelected(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full select-none">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Privacy-First Multi-Page PDF E-Signer</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white text-center tracking-tight mb-4 max-w-2xl">
        Sign PDF Documents <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
          Easily, Freely &amp; Securely
        </span>
      </h1>

      <p className="text-slate-400 text-center max-w-xl text-sm sm:text-base mb-8">
        Add handwritten signatures, cursive stamps, initials, and dates with precision drag-and-drop.
        Everything runs 100% locally in your browser.
      </p>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full max-w-2xl rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01] shadow-2xl shadow-indigo-500/20'
            : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600'
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-base font-semibold text-white">{loadingMessage || 'Processing PDF...'}</p>
            <p className="text-xs text-slate-400 mt-1">Preparing pages and coordinates...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Drag &amp; drop your PDF here, or click to browse
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Supports any multi-page PDF agreement, lease, tax form, or NDA.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors pointer-events-none">
              <FileText className="w-4 h-4" />
              <span>Select PDF File</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Try Sample Button (Crucial for immediate testing) */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs text-slate-400">Don&apos;t have a PDF ready?</span>
        <button
          onClick={() => onLoadSample('nda')}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500/50 text-xs font-medium transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Load Sample 2-Page NDA</span>
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-4xl">
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Move className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Precision Drag &amp; Drop</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Place signature stamps at exact coordinates on any page with resize and rotation controls.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Multi-Page Navigation</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Interactive thumbnails strip, scroll or single-page view, and batch-stamp to all pages with 1 click.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">100% Client-Side Privacy</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Files are processed in your local browser memory. Zero document uploads or server storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
