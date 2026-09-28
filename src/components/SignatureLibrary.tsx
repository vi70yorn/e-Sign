import React from 'react';
import {
  Plus,
  PenTool,
  Calendar,
  Layers,
  Trash2,
  GripVertical,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import type { SignaturePreset, StampType } from '../types';

interface SignatureLibraryProps {
  presets: SignaturePreset[];
  onOpenCreateModal: (type?: StampType) => void;
  onDeletePreset: (id: string) => void;
  onQuickPlace: (preset: SignaturePreset) => void;
  activePageNumber: number;
}

export const SignatureLibrary: React.FC<SignatureLibraryProps> = ({
  presets,
  onOpenCreateModal,
  onDeletePreset,
  onQuickPlace,
  activePageNumber,
}) => {
  const handleDragStart = (e: React.DragEvent, preset: SignaturePreset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(preset));
    e.dataTransfer.effectAllowed = 'copy';

    // Create a ghost drag image if possible
    const img = new Image();
    img.src = preset.dataUrl;
    img.width = 120;
    try {
      e.dataTransfer.setDragImage(img, 60, 20);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-80 flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <PenTool className="w-4 h-4 text-indigo-400" />
            Signature Stamps
          </h2>
          <p className="text-[11px] text-slate-400">Drag & drop anywhere on the PDF</p>
        </div>
        <button
          onClick={() => onOpenCreateModal('signature')}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center cursor-pointer"
          title="Create New Signature"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-3 border-b border-slate-800/80 grid grid-cols-2 gap-2 bg-slate-950/30">
        <button
          onClick={() => onOpenCreateModal('signature')}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-colors cursor-pointer"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>New Signature</span>
        </button>
        <button
          onClick={() => onOpenCreateModal('date')}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Today&apos;s Date</span>
        </button>
      </div>

      {/* Instruction banner */}
      <div className="mx-3 mt-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed">
        <GripVertical className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          <strong>Drag any stamp</strong> from this list and drop directly onto target page coordinates, or click &quot;Place on Page {activePageNumber}&quot;.
        </span>
      </div>

      {/* Presets List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {presets.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-800 rounded-2xl">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No signature presets yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Click &quot;New Signature&quot; to draw, type, or upload your signature.
            </p>
            <button
              onClick={() => onOpenCreateModal('signature')}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Signature
            </button>
          </div>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              draggable
              onDragStart={(e) => handleDragStart(e, preset)}
              className="group relative bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/80 rounded-xl p-3 shadow-md transition-all cursor-grab active:cursor-grabbing hover:shadow-indigo-500/10"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium text-slate-300 truncate max-w-[170px]" title={preset.title}>
                  {preset.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(preset.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-700/50 transition-all cursor-pointer"
                  title="Delete Preset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Preview image */}
              <div className="h-16 w-full rounded-lg bg-white flex items-center justify-center p-2 overflow-hidden shadow-inner border border-slate-200">
                <img
                  src={preset.dataUrl}
                  alt={preset.title}
                  draggable={false}
                  className="max-h-full max-w-full object-contain pointer-events-none filter drop-shadow-sm"
                />
              </div>

              {/* Drag indicator & Quick Place Button */}
              <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-700/40">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <GripVertical className="w-3 h-3 text-slate-500" />
                  Drag to place
                </span>
                <button
                  onClick={() => onQuickPlace(preset)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
                >
                  + Place on Page {activePageNumber}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="leading-tight">
          <strong>100% Private:</strong> Signatures and PDFs stay strictly in your browser.
        </span>
      </div>
    </div>
  );
};
