/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  loadPdfMetadata,
  generateSamplePdf,
  burnStampsToPdf,
} from './lib/pdfEngine';
import { generateTypedSignatureDataUrl, generateDateStampDataUrl } from './lib/signatureUtils';
import type { PDFDocState, PlacedStamp, SignaturePreset, StampType, ViewMode } from './types';
import { DocumentToolbar } from './components/DocumentToolbar';
import { SignatureLibrary } from './components/SignatureLibrary';
import { ThumbnailSidebar } from './components/ThumbnailSidebar';
import { PdfPageView } from './components/PdfPageView';
import { SignatureModal } from './components/SignatureModal';
import { UploadScreen } from './components/UploadScreen';
import { Check, Download, AlertCircle, FileCheck } from 'lucide-react';

const STORAGE_PRESETS_KEY = 'signflow_signature_presets_v1';

export default function App() {
  const [pdfState, setPdfState] = useState<PDFDocState | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading PDF...');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Signatures & Stamps
  const [presets, setPresets] = useState<SignaturePreset[]>([]);
  const [stamps, setStamps] = useState<PlacedStamp[]>([]);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);

  // View state
  const [activePageNumber, setActivePageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<StampType>('signature');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Scroll container ref for auto-detecting current page in continuous mode
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Initialize presets from localStorage or default starters
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRESETS_KEY);
      if (saved) {
        setPresets(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore
    }

    // Default starters so the user can immediately drag and drop stamps!
    const defaultSig = generateTypedSignatureDataUrl('John Doe', 'Caveat', '#1e3a8a', 72);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const defaultDate = generateDateStampDataUrl(today, '#1e3a8a');

    const initialPresets: SignaturePreset[] = [
      {
        id: 'starter_1',
        type: 'signature',
        title: 'John Doe (Cursive)',
        dataUrl: defaultSig.dataUrl,
        naturalWidth: defaultSig.width,
        naturalHeight: defaultSig.height,
        inkColor: '#1e3a8a',
        createdAt: Date.now(),
      },
      {
        id: 'starter_2',
        type: 'date',
        title: `Date: ${today}`,
        dataUrl: defaultDate.dataUrl,
        naturalWidth: defaultDate.width,
        naturalHeight: defaultDate.height,
        inkColor: '#1e3a8a',
        createdAt: Date.now() + 1,
      },
    ];

    setPresets(initialPresets);
  }, []);

  // Save presets to localStorage
  const savePresets = (newPresets: SignaturePreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(newPresets));
    } catch {
      // ignore
    }
  };

  // Handle uploaded PDF File
  const handleFileSelected = async (file: File) => {
    try {
      setIsLoadingPdf(true);
      setErrorNotice(null);
      setLoadingMessage(`Reading ${file.name}...`);

      const arrayBuffer = await file.arrayBuffer();
      setLoadingMessage('Parsing document pages and dimensions...');

      const meta = await loadPdfMetadata(arrayBuffer, file.name, file.size);
      meta.file = file;

      setPdfState(meta);
      setActivePageNumber(1);
      setStamps([]);
      setSelectedStampId(null);
    } catch (err: any) {
      console.error('Failed to load PDF file:', err);
      setErrorNotice(err.message || 'Could not load PDF file. Please ensure it is a valid PDF.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Handle loading sample multi-page contract
  const handleLoadSample = async (templateType: 'nda' | 'service' = 'nda') => {
    try {
      setIsLoadingPdf(true);
      setErrorNotice(null);
      setLoadingMessage('Generating sample 2-page Mutual NDA contract...');

      const buffer = await generateSamplePdf(templateType);
      const meta = await loadPdfMetadata(buffer, 'Sample_Mutual_NDA_Agreement.pdf', buffer.byteLength);

      setPdfState(meta);
      setActivePageNumber(1);
      setStamps([]);
      setSelectedStampId(null);
    } catch (err: any) {
      console.error('Failed to load sample:', err);
      setErrorNotice(err.message || 'Failed to generate sample PDF.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Add new preset from modal
  const handleSavePreset = (preset: SignaturePreset, autoPlace: boolean = true) => {
    const updated = [preset, ...presets];
    savePresets(updated);

    if (autoPlace && pdfState) {
      handleQuickPlace(preset);
    }
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    savePresets(updated);
  };

  // Place a stamp from drag-and-drop onto a page
  const handleDropNewStamp = useCallback(
    (preset: SignaturePreset, pageNumber: number, xPercent: number, yPercent: number) => {
      if (!pdfState) return;

      const pageDim = pdfState.pageDimensions.find((p) => p.pageNumber === pageNumber);
      const pageRatio = pageDim?.aspectRatio || 0.707; // standard A4 ratio approx
      const stampRatio = (preset.naturalWidth || 200) / (preset.naturalHeight || 80);

      // Default width is 28% of page width
      const widthPercent = preset.type === 'initials' ? 14 : preset.type === 'date' ? 24 : 28;
      // In PDF coordinate space, heightPercent is calculated:
      // (stampHeight / pageHeight) = (stampWidth / stampRatio) / (pageWidth / pageRatio)
      // = (stampWidth / pageWidth) * (pageRatio / stampRatio)
      const heightPercent = widthPercent * (pageRatio / stampRatio);

      const newStamp: PlacedStamp = {
        id: `placed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        presetId: preset.id,
        pageNumber,
        type: preset.type,
        title: preset.title,
        dataUrl: preset.dataUrl,
        xPercent,
        yPercent,
        widthPercent: Math.round(widthPercent * 10) / 10,
        heightPercent: Math.round(heightPercent * 10) / 10,
        rotation: 0,
        opacity: 1,
      };

      setStamps((prev) => [...prev, newStamp]);
      setSelectedStampId(newStamp.id);
      setActivePageNumber(pageNumber);
    },
    [pdfState]
  );

  // Quick place on current page center
  const handleQuickPlace = (preset: SignaturePreset) => {
    if (!pdfState) return;
    const pageNumber = activePageNumber;
    // Place roughly in lower third where signature blocks typically sit
    handleDropNewStamp(preset, pageNumber, 55, 68);
  };

  // Update existing placed stamp
  const handleUpdateStamp = (updated: PlacedStamp) => {
    setStamps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Delete placed stamp
  const handleDeleteStamp = (id: string) => {
    setStamps((prev) => prev.filter((s) => s.id !== id));
    if (selectedStampId === id) setSelectedStampId(null);
  };

  // Duplicate stamp on current page
  const handleDuplicateStamp = (stamp: PlacedStamp) => {
    const clone: PlacedStamp = {
      ...stamp,
      id: `placed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      xPercent: Math.min(100 - stamp.widthPercent, stamp.xPercent + 3),
      yPercent: Math.min(100 - stamp.heightPercent, stamp.yPercent + 3),
    };
    setStamps((prev) => [...prev, clone]);
    setSelectedStampId(clone.id);
  };

  // Duplicate stamp to next page (e.g. For sequential signing)
  const handleDuplicateToNextPage = (stamp: PlacedStamp) => {
    if (!pdfState) return;
    const nextPage = stamp.pageNumber + 1;
    if (nextPage > pdfState.numPages) {
      alert('This is already the last page of the document.');
      return;
    }

    const clone: PlacedStamp = {
      ...stamp,
      id: `placed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: nextPage,
    };
    setStamps((prev) => [...prev, clone]);
    setActivePageNumber(nextPage);
    setSelectedStampId(clone.id);
    scrollToPage(nextPage);
  };

  // Apply stamp to all pages at the exact same coordinates (e.g. Initialing every page of contract)
  const handleApplyToAllPages = (stamp: PlacedStamp) => {
    if (!pdfState) return;
    const newClones: PlacedStamp[] = [];

    for (let p = 1; p <= pdfState.numPages; p++) {
      if (p === stamp.pageNumber) continue;
      newClones.push({
        ...stamp,
        id: `placed_${Date.now()}_p${p}_${Math.random().toString(36).substring(2, 6)}`,
        pageNumber: p,
      });
    }

    setStamps((prev) => [...prev, ...newClones]);
  };

  // Scroll to a specific page
  const scrollToPage = (pageNumber: number) => {
    setActivePageNumber(pageNumber);
    const element = pageRefs.current.get(pageNumber);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Burn stamps to PDF and trigger download
  const handleDownloadSignedPdf = async () => {
    if (!pdfState) return;
    try {
      setIsDownloading(true);
      setErrorNotice(null);

      // Burn stamps with high-precision coordinates
      const signedPdfBytes = await burnStampsToPdf(pdfState.arrayBuffer, stamps);

      // Generate download blob
      const blob = new Blob([signedPdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Format clean file name
      const baseName = pdfState.fileName.replace(/\.pdf$/i, '');
      const signedFileName = `${baseName}_signed.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = signedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#4f46e5', '#38bdf8', '#34d399', '#f43f5e'],
      });

      setDownloadSuccessNotice(`Successfully downloaded "${signedFileName}"!`);
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to sign and download PDF:', err);
      setErrorNotice(err.message || 'Error occurred while saving signed PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* If No PDF is loaded yet: Show Welcome Upload Screen */}
      {!pdfState ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <UploadScreen
            onFileSelected={handleFileSelected}
            onLoadSample={handleLoadSample}
            isLoading={isLoadingPdf}
            loadingMessage={loadingMessage}
          />
        </div>
      ) : (
        /* Workspace when PDF is loaded */
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {/* Top Document Toolbar */}
          <DocumentToolbar
            fileName={pdfState.fileName}
            numPages={pdfState.numPages}
            activePageNumber={activePageNumber}
            onPageChange={(page) => scrollToPage(page)}
            scale={scale}
            onZoomChange={setScale}
            viewMode={viewMode}
            onViewModeToggle={() => setViewMode(viewMode === 'continuous' ? 'single' : 'continuous')}
            onDownloadPdf={handleDownloadSignedPdf}
            isDownloading={isDownloading}
            totalStampsCount={stamps.length}
            onUploadNew={() => setPdfState(null)}
          />

          {/* Success Banner */}
          {downloadSuccessNotice && (
            <div className="bg-emerald-900/90 border-b border-emerald-700/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>{downloadSuccessNotice}</span>
              </div>
              <button
                onClick={() => setDownloadSuccessNotice(null)}
                className="text-emerald-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorNotice && (
            <div className="bg-rose-900/90 border-b border-rose-700/80 px-4 py-2 flex items-center justify-between text-xs text-rose-200 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{errorNotice}</span>
              </div>
              <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-white">
                Dismiss
              </button>
            </div>
          )}

          {/* Main 3-Column Working Area */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Column 1: Multi-Page Thumbnails */}
            <ThumbnailSidebar
              arrayBuffer={pdfState.arrayBuffer}
              pageDimensions={pdfState.pageDimensions}
              activePageNumber={activePageNumber}
              onSelectPage={(page) => scrollToPage(page)}
              stamps={stamps}
            />

            {/* Center Column: PDF Canvas Viewport with Precision Overlay */}
            <div
              ref={scrollContainerRef}
              className="flex-1 h-full overflow-auto bg-slate-950 p-4 sm:p-8 flex flex-col items-center relative select-none scrollbar-thin"
              onClick={() => setSelectedStampId(null)}
            >
              {viewMode === 'continuous' ? (
                /* Continuous Scroll View: All pages stacked vertically */
                pdfState.pageDimensions.map((dim) => {
                  const pageStamps = stamps.filter((s) => s.pageNumber === dim.pageNumber);
                  return (
                    <div
                      key={dim.pageNumber}
                      ref={(el) => {
                        if (el) pageRefs.current.set(dim.pageNumber, el);
                        else pageRefs.current.delete(dim.pageNumber);
                      }}
                      onMouseEnter={() => setActivePageNumber(dim.pageNumber)}
                    >
                      <PdfPageView
                        pageNumber={dim.pageNumber}
                        arrayBuffer={pdfState.arrayBuffer}
                        pageDim={dim}
                        scale={scale}
                        stamps={pageStamps}
                        selectedStampId={selectedStampId}
                        onSelectStamp={setSelectedStampId}
                        onUpdateStamp={handleUpdateStamp}
                        onDeleteStamp={handleDeleteStamp}
                        onDuplicateStamp={handleDuplicateStamp}
                        onDuplicateToNextPage={handleDuplicateToNextPage}
                        onApplyToAllPages={handleApplyToAllPages}
                        onDropNewStamp={handleDropNewStamp}
                        isActivePage={activePageNumber === dim.pageNumber}
                      />
                    </div>
                  );
                })
              ) : (
                /* Single Page Focus View */
                (() => {
                  const dim =
                    pdfState.pageDimensions.find((d) => d.pageNumber === activePageNumber) ||
                    pdfState.pageDimensions[0];
                  const pageStamps = stamps.filter((s) => s.pageNumber === dim.pageNumber);
                  return (
                    <PdfPageView
                      key={dim.pageNumber}
                      pageNumber={dim.pageNumber}
                      arrayBuffer={pdfState.arrayBuffer}
                      pageDim={dim}
                      scale={scale}
                      stamps={pageStamps}
                      selectedStampId={selectedStampId}
                      onSelectStamp={setSelectedStampId}
                      onUpdateStamp={handleUpdateStamp}
                      onDeleteStamp={handleDeleteStamp}
                      onDuplicateStamp={handleDuplicateStamp}
                      onDuplicateToNextPage={handleDuplicateToNextPage}
                      onApplyToAllPages={handleApplyToAllPages}
                      onDropNewStamp={handleDropNewStamp}
                      isActivePage={true}
                    />
                  );
                })()
              )}
            </div>

            {/* Right Column: Signature Library Sidebar */}
            <SignatureLibrary
              presets={presets}
              onOpenCreateModal={(type) => {
                setModalInitialType(type || 'signature');
                setIsCreateModalOpen(true);
              }}
              onDeletePreset={handleDeletePreset}
              onQuickPlace={handleQuickPlace}
              activePageNumber={activePageNumber}
            />
          </div>
        </div>
      )}

      {/* Signature Creation Modal */}
      <SignatureModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSavePreset={handleSavePreset}
        initialType={modalInitialType}
      />
    </div>
  );
}
