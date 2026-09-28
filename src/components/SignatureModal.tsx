import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Type,
  Upload,
  Calendar,
  RotateCcw,
  Trash2,
  Check,
  X,
  Sliders,
  Sparkles,
  Ban,
  Palette,
  Square,
} from 'lucide-react';
import type { SignaturePreset, StampType } from '../types';
import {
  generateTypedSignatureDataUrl,
  cleanSignatureImage,
  generateDateStampDataUrl,
  generateInitialsDataUrl,
  type StampStyleConfig,
} from '../lib/signatureUtils';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreset: (preset: SignaturePreset, autoPlace?: boolean) => void;
  initialType?: StampType;
}

const INK_COLORS = [
  { name: 'Classic Navy', value: '#1e3a8a' },
  { name: 'Charcoal Black', value: '#111827' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Crimson Red', value: '#991b1b' },
  { name: 'Emerald', value: '#065f46' },
];

const BG_PALETTE = [
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Warm Cream', value: '#fefce8' },
  { name: 'Soft Ice', value: '#eff6ff' },
  { name: 'Light Slate', value: '#f1f5f9' },
  { name: 'Soft Mint', value: '#f0fdf4' },
  { name: 'Soft Rose', value: '#fff1f2' },
  { name: 'Slate Dark', value: '#0f172a' },
];

const STROKE_PALETTE = [
  { name: 'Classic Navy', value: '#1e3a8a' },
  { name: 'Charcoal Black', value: '#111827' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Crimson Red', value: '#991b1b' },
  { name: 'Emerald Green', value: '#065f46' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'Slate Gray', value: '#64748b' },
];

const SIGNATURE_FONTS = [
  { id: 'Caveat', name: 'Caveat (Natural Flow)', family: 'Caveat' },
  { id: 'Dancing Script', name: 'Dancing Script (Elegant)', family: 'Dancing Script' },
  { id: 'Great Vibes', name: 'Great Vibes (Formal Cursive)', family: 'Great Vibes' },
  { id: 'Alex Brush', name: 'Alex Brush (Classic Calligraphy)', family: 'Alex Brush' },
  { id: 'Marck Script', name: 'Marck Script (Modern Script)', family: 'Marck Script' },
];

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSavePreset,
  initialType = 'signature',
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'quick'>('draw');
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  const [penThickness, setPenThickness] = useState<number>(3);

  // Background and Stroke styling controls (Remove background, remove stroke, change colors)
  const [hasBackground, setHasBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [hasStroke, setHasStroke] = useState<boolean>(true);
  const [strokeColor, setStrokeColor] = useState<string>(INK_COLORS[0].value);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  // Type mode state
  const [typedName, setTypedName] = useState('John Doe');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].family);

  // Upload mode state
  const [uploadedRawImg, setUploadedRawImg] = useState<string | null>(null);
  const [bgRemovalThreshold, setBgRemovalThreshold] = useState<number>(220);
  const [cleanedUploadDataUrl, setCleanedUploadDataUrl] = useState<string | null>(null);

  // Quick stamps state
  const [quickType, setQuickType] = useState<'date' | 'initials' | 'text'>('date');
  const [initialsText, setInitialsText] = useState('JD');
  const [dateFormat, setDateFormat] = useState<'standard' | 'iso' | 'eu'>('standard');
  const [customBadgeText, setCustomBadgeText] = useState('APPROVED');

  // Drawing canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const strokeHistory = useRef<ImageData[]>([]);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (initialType === 'date' || initialType === 'initials') {
      setActiveTab('quick');
      setQuickType(initialType === 'date' ? 'date' : 'initials');
    } else {
      setActiveTab('draw');
    }
  }, [initialType, isOpen]);

  // Canvas drawing setup
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Clear background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokeHistory.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      }
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPoint.current = { x, y };

    ctx.beginPath();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penThickness;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current || !lastPoint.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penThickness;

    // Smooth quadratic curve interpolation
    const midX = (lastPoint.current.x + x) / 2;
    const midY = (lastPoint.current.y + y) / 2;

    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX, midY);

    lastPoint.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing.current || !canvasRef.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      strokeHistory.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    }
  };

  const undoLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokeHistory.current.length <= 1) return;
    strokeHistory.current.pop();
    const prevState = strokeHistory.current[strokeHistory.current.length - 1];
    const ctx = canvas.getContext('2d');
    if (ctx && prevState) {
      ctx.putImageData(prevState, 0, 0);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokeHistory.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    }
  };

  // Upload image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedRawImg(result);
      processUploadedImage(result, bgRemovalThreshold);
    };
    reader.readAsDataURL(file);
  };

  const processUploadedImage = (dataUrl: string, threshold: number) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cleaned = cleanSignatureImage(img, threshold);
      setCleanedUploadDataUrl(cleaned.dataUrl);
    };
    img.src = dataUrl;
  };

  const handleThresholdChange = (val: number) => {
    setBgRemovalThreshold(val);
    if (uploadedRawImg) {
      processUploadedImage(uploadedRawImg, val);
    }
  };

  const getTodayDateStr = () => {
    const today = new Date();
    if (dateFormat === 'iso') {
      return today.toISOString().split('T')[0];
    } else if (dateFormat === 'eu') {
      return today.toLocaleDateString('en-GB');
    } else {
      return today.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  // Finish and save signature
  const handleSave = (autoPlace: boolean = true) => {
    let resultDataUrl = '';
    let naturalWidth = 240;
    let naturalHeight = 80;
    let stampType: StampType = 'signature';
    let title = 'My Signature';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      resultDataUrl = canvas.toDataURL('image/png');
      naturalWidth = canvas.width;
      naturalHeight = canvas.height;
      title = 'Drawn Signature';
    } else if (activeTab === 'type') {
      const res = generateTypedSignatureDataUrl(typedName, selectedFont, inkColor, 64);
      resultDataUrl = res.dataUrl;
      naturalWidth = res.width;
      naturalHeight = res.height;
      title = `${typedName} (${selectedFont})`;
    } else if (activeTab === 'upload') {
      if (!cleanedUploadDataUrl) return;
      resultDataUrl = cleanedUploadDataUrl;
      title = 'Scanned Signature';
    } else if (activeTab === 'quick') {
      const styleConfig: StampStyleConfig = {
        textColor: inkColor,
        hasBackground,
        backgroundColor: hasBackground ? backgroundColor : 'transparent',
        hasStroke,
        strokeColor: hasStroke ? strokeColor : 'transparent',
        strokeWidth: hasStroke ? strokeWidth : 0,
      };

      if (quickType === 'date') {
        stampType = 'date';
        const dateStr = getTodayDateStr();
        const res = generateDateStampDataUrl(dateStr, styleConfig);
        resultDataUrl = res.dataUrl;
        naturalWidth = res.width;
        naturalHeight = res.height;
        title = `Date: ${dateStr}`;
      } else if (quickType === 'initials') {
        stampType = 'initials';
        const res = generateInitialsDataUrl(initialsText || 'JD', 'Caveat', styleConfig);
        resultDataUrl = res.dataUrl;
        naturalWidth = res.width;
        naturalHeight = res.height;
        title = `Initials: ${initialsText.toUpperCase()}`;
      } else {
        stampType = 'seal';
        const res = generateDateStampDataUrl(customBadgeText, styleConfig);
        resultDataUrl = res.dataUrl;
        naturalWidth = res.width;
        naturalHeight = res.height;
        title = `Badge: ${customBadgeText}`;
      }
    }

    if (!resultDataUrl) return;

    const preset: SignaturePreset = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: stampType,
      title,
      dataUrl: resultDataUrl,
      naturalWidth,
      naturalHeight,
      inkColor,
      createdAt: Date.now(),
    };

    onSavePreset(preset, autoPlace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create E-Signature / Stamp</h2>
              <p className="text-xs text-slate-400">Design a digital signature to drag & drop onto your PDF pages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'draw'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Draw with Pen
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'type'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-4 h-4" />
            Type Cursive
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Scan
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'quick'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Date & Initials
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-5">
          {/* DRAW TAB */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sign inside the canvas with your mouse, trackpad, or touch:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undoLastStroke}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Undo stroke"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Undo
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition-colors"
                    title="Clear canvas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Drawing Canvas Area */}
              <div className="relative border-2 border-dashed border-slate-700 rounded-xl bg-white overflow-hidden shadow-inner cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={190}
                  className="w-full h-48 block touch-none"
                  onPointerDown={startDrawing}
                  onPointerMove={drawMove}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
                <div className="absolute bottom-2 right-3 pointer-events-none text-[11px] text-slate-400 select-none bg-white/80 px-2 py-0.5 rounded">
                  Sign on line above
                </div>
              </div>

              {/* Controls: Color & Thickness */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Ink Color:</span>
                  <div className="flex items-center gap-1.5">
                    {INK_COLORS.map((col) => (
                      <button
                        key={col.value}
                        onClick={() => setInkColor(col.value)}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                          inkColor === col.value ? 'scale-115 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.name}
                      >
                        {inkColor === col.value && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Stroke:</span>
                  <div className="inline-flex rounded-lg bg-slate-800 p-1">
                    {[
                      { label: 'Fine', width: 2 },
                      { label: 'Regular', width: 3.5 },
                      { label: 'Bold', width: 5.5 },
                    ].map((st) => (
                      <button
                        key={st.width}
                        onClick={() => setPenThickness(st.width)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          penThickness === st.width
                            ? 'bg-indigo-600 text-white font-medium shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TYPE TAB */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Full Name or Signature Text</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your name..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={40}
                />
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Ink Color:</span>
                <div className="flex items-center gap-1.5">
                  {INK_COLORS.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => setInkColor(col.value)}
                      className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                        inkColor === col.value ? 'scale-115 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    >
                      {inkColor === col.value && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Previews List */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-medium">Choose Cursive Style:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {SIGNATURE_FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFont(f.family)}
                      className={`relative text-left p-3 rounded-xl border transition-all ${
                        selectedFont === f.family
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>{f.name}</span>
                        {selectedFont === f.family && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <div
                        className="text-2xl truncate py-1.5 px-2 bg-white/95 rounded-lg border border-slate-200"
                        style={{ fontFamily: f.family, color: inkColor }}
                      >
                        {typedName || 'Your Signature'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!uploadedRawImg ? (
                <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-800/30 hover:bg-indigo-500/5 transition-all text-center">
                  <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    Upload a photo or scan of your handwritten signature
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    PNG, JPG, or WEBP. Our smart algorithm will remove the paper background automatically.
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Signature Preview (Background Removed):</span>
                    <label className="text-xs text-indigo-400 hover:underline cursor-pointer">
                      Upload different photo
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Cleaned Result Box with transparent checkerboard */}
                  <div className="h-40 rounded-xl border border-slate-700 flex items-center justify-center p-4 bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-white overflow-hidden shadow-inner">
                    {cleanedUploadDataUrl ? (
                      <img
                        src={cleanedUploadDataUrl}
                        alt="Signature clean preview"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Processing image...</span>
                    )}
                  </div>

                  {/* Background removal tolerance slider */}
                  <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        White Paper Removal Sensitivity
                      </span>
                      <span className="text-indigo-400 font-mono">{bgRemovalThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min={150}
                      max={250}
                      value={bgRemovalThreshold}
                      onChange={(e) => handleThresholdChange(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Keep more ink</span>
                      <span>Remove lighter shadows / noise</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QUICK STAMPS TAB (Date, Initials, Custom Stamp) */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'date', label: 'Date Stamp', icon: Calendar },
                  { id: 'initials', label: 'Initials Monogram', icon: PenTool },
                  { id: 'text', label: 'Custom Badge', icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setQuickType(item.id as typeof quickType)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        quickType === item.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Comprehensive Styling Panel: Background, Stroke, and Text Colors */}
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3 shadow-inner">
                {/* 1. Background Control (Remove background or change background color) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5 text-indigo-400" />
                      Background:
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-900 p-0.5 text-xs border border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => setHasBackground(false)}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                          !hasBackground
                            ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Ban className="w-3 h-3 text-rose-400" />
                        <span>Remove Background</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasBackground(true)}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                          hasBackground
                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Filled Color</span>
                      </button>
                    </div>
                  </div>

                  {/* Background Color Swatches + Color Picker (Shown when hasBackground is true) */}
                  {hasBackground && (
                    <div className="flex items-center gap-2 pt-1 pl-1">
                      <span className="text-[11px] text-slate-400">Background Color:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {BG_PALETTE.map((bg) => (
                          <button
                            key={bg.value}
                            type="button"
                            onClick={() => setBackgroundColor(bg.value)}
                            className={`w-6 h-6 rounded-full border border-slate-600 transition-transform flex items-center justify-center cursor-pointer ${
                              backgroundColor === bg.value
                                ? 'scale-115 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                                : 'hover:scale-105 opacity-90 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: bg.value }}
                            title={bg.name}
                          >
                            {backgroundColor === bg.value && (
                              <Check className={`w-3 h-3 ${bg.value === '#0f172a' ? 'text-white' : 'text-slate-900'}`} />
                            )}
                          </button>
                        ))}
                        {/* Custom color picker */}
                        <label
                          className="relative w-6 h-6 rounded-full border border-slate-600 overflow-hidden cursor-pointer hover:scale-105 transition-transform flex items-center justify-center shadow-sm"
                          title="Choose custom background color"
                        >
                          <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                          />
                          <div className="w-full h-full bg-[conic-gradient(at_center,#f43f5e,#eab308,#22c55e,#06b6d4,#6366f1,#f43f5e)]" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-700/60" />

                {/* 2. Stroke / Border Control (Remove stroke or change stroke color & width) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-400" />
                      Border / Stroke:
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-900 p-0.5 text-xs border border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => setHasStroke(false)}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                          !hasStroke
                            ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Ban className="w-3 h-3 text-rose-400" />
                        <span>Remove Stroke</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasStroke(true)}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                          hasStroke
                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Visible Stroke</span>
                      </button>
                    </div>
                  </div>

                  {/* Stroke Color Swatches + Color Picker + Width (Shown when hasStroke is true) */}
                  {hasStroke && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pl-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Stroke Color:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {STROKE_PALETTE.map((st) => (
                            <button
                              key={st.value}
                              type="button"
                              onClick={() => setStrokeColor(st.value)}
                              className={`w-6 h-6 rounded-full border border-slate-600 transition-transform flex items-center justify-center cursor-pointer ${
                                strokeColor === st.value
                                  ? 'scale-115 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                                  : 'hover:scale-105 opacity-90 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: st.value }}
                              title={st.name}
                            >
                              {strokeColor === st.value && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                          {/* Custom stroke color picker */}
                          <label
                            className="relative w-6 h-6 rounded-full border border-slate-600 overflow-hidden cursor-pointer hover:scale-105 transition-transform flex items-center justify-center shadow-sm"
                            title="Choose custom stroke color"
                          >
                            <input
                              type="color"
                              value={strokeColor}
                              onChange={(e) => setStrokeColor(e.target.value)}
                              className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                            />
                            <div className="w-full h-full bg-[conic-gradient(at_center,#f43f5e,#eab308,#22c55e,#06b6d4,#6366f1,#f43f5e)]" />
                          </label>
                        </div>
                      </div>

                      {/* Stroke Thickness */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Thickness:</span>
                        <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                          {[
                            { label: '1px', w: 1 },
                            { label: '2px', w: 2 },
                            { label: '3.5px', w: 3.5 },
                          ].map((sw) => (
                            <button
                              key={sw.w}
                              type="button"
                              onClick={() => setStrokeWidth(sw.w)}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                                strokeWidth === sw.w
                                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {sw.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-700/60" />

                {/* 3. Text / Ink Color */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">Text / Ink Color:</span>
                    <div className="flex items-center gap-1.5">
                      {INK_COLORS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setInkColor(col.value)}
                          className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                            inkColor === col.value
                              ? 'scale-115 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                              : 'opacity-80 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.name}
                        >
                          {inkColor === col.value && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                      {/* Custom ink color input */}
                      <label
                        className="relative w-6 h-6 rounded-full border border-slate-600 overflow-hidden cursor-pointer hover:scale-105 transition-transform flex items-center justify-center shadow-sm"
                        title="Choose custom text/ink color"
                      >
                        <input
                          type="color"
                          value={inkColor}
                          onChange={(e) => setInkColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                        />
                        <div className="w-full h-full bg-[conic-gradient(at_center,#f43f5e,#eab308,#22c55e,#06b6d4,#6366f1,#f43f5e)]" />
                      </label>
                    </div>
                  </div>

                  {/* Sync stroke with text button */}
                  {hasStroke && strokeColor !== inkColor && (
                    <button
                      type="button"
                      onClick={() => setStrokeColor(inkColor)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                    >
                      Match stroke to text color
                    </button>
                  )}
                </div>
              </div>

              {/* Date format options */}
              {quickType === 'date' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { id: 'standard', label: 'Sep 28, 2026' },
                      { id: 'iso', label: '2026-09-28' },
                      { id: 'eu', label: '28/09/2026' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDateFormat(f.id as typeof dateFormat)}
                        className={`flex-1 py-2 text-xs rounded-lg border transition-all cursor-pointer ${
                          dateFormat === f.id
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-semibold shadow-sm'
                            : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Preview Container with Checkerboard Transparency Grid */}
                  <div className="relative p-6 rounded-xl border border-slate-700/80 flex items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-slate-950 shadow-inner">
                    <div
                      className="px-6 py-2 rounded-lg font-bold font-sans text-sm tracking-wide shadow-md transition-all select-none"
                      style={{
                        color: inkColor,
                        backgroundColor: hasBackground ? backgroundColor : 'transparent',
                        borderColor: hasStroke ? strokeColor : 'transparent',
                        borderWidth: hasStroke ? `${strokeWidth}px` : '0px',
                        borderStyle: hasStroke ? 'solid' : 'none',
                      }}
                    >
                      {getTodayDateStr()}
                    </div>

                    {/* Status badges */}
                    {!hasBackground && (
                      <div className="absolute top-2 right-2 text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/60 pointer-events-none">
                        ✓ Transparent (No Background)
                      </div>
                    )}
                    {!hasStroke && (
                      <div className="absolute top-2 left-2 text-[10px] bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                        ✓ No Border Stroke
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Initials options */}
              {quickType === 'initials' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Initials (2-3 letters)</label>
                    <input
                      type="text"
                      value={initialsText}
                      onChange={(e) => setInitialsText(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono uppercase tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Live Preview Container with Checkerboard Transparency Grid */}
                  <div className="relative p-6 rounded-xl border border-slate-700/80 flex items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-slate-950 shadow-inner">
                    <div
                      className="px-6 py-2 rounded-lg transition-all"
                      style={{
                        backgroundColor: hasBackground ? backgroundColor : 'transparent',
                      }}
                    >
                      <div
                        className="text-4xl font-bold px-4 py-1 select-none"
                        style={{
                          fontFamily: 'Caveat',
                          color: inkColor,
                          borderBottomWidth: hasStroke ? `${strokeWidth}px` : '0px',
                          borderBottomColor: hasStroke ? strokeColor : 'transparent',
                          borderBottomStyle: hasStroke ? 'solid' : 'none',
                        }}
                      >
                        {initialsText || 'JD'}
                      </div>
                    </div>

                    {!hasBackground && (
                      <div className="absolute top-2 right-2 text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/60 pointer-events-none">
                        ✓ Transparent (No Background)
                      </div>
                    )}
                    {!hasStroke && (
                      <div className="absolute top-2 left-2 text-[10px] bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                        ✓ No Underline Stroke
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Badge options */}
              {quickType === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Stamp Text</label>
                    <div className="flex gap-2">
                      {['APPROVED', 'CONFIDENTIAL', 'FINAL DRAFT', 'DIGITALLY VERIFIED'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomBadgeText(preset)}
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={customBadgeText}
                      onChange={(e) => setCustomBadgeText(e.target.value.toUpperCase())}
                      className="w-full mt-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono uppercase tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Live Preview Container with Checkerboard Transparency Grid */}
                  <div className="relative p-6 rounded-xl border border-slate-700/80 flex items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-slate-950 shadow-inner">
                    <div
                      className="px-6 py-2 rounded-lg font-bold font-mono text-sm tracking-wider shadow-md uppercase transition-all select-none"
                      style={{
                        color: inkColor,
                        backgroundColor: hasBackground ? backgroundColor : 'transparent',
                        borderColor: hasStroke ? strokeColor : 'transparent',
                        borderWidth: hasStroke ? `${strokeWidth}px` : '0px',
                        borderStyle: hasStroke ? 'solid' : 'none',
                      }}
                    >
                      ✓ {customBadgeText || 'APPROVED'}
                    </div>

                    {!hasBackground && (
                      <div className="absolute top-2 right-2 text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/60 pointer-events-none">
                        ✓ Transparent (No Background)
                      </div>
                    )}
                    {!hasStroke && (
                      <div className="absolute top-2 left-2 text-[10px] bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                        ✓ No Border Stroke
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
            >
              Save to Library
            </button>
            <button
              onClick={() => handleSave(true)}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Place on Current Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
