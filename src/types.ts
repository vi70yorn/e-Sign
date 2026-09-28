export type StampType = 'signature' | 'initials' | 'date' | 'text' | 'seal';

export interface SignaturePreset {
  id: string;
  type: StampType;
  title: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  inkColor: string;
  createdAt: number;
}

export interface PlacedStamp {
  id: string;
  presetId?: string;
  pageNumber: number; // 1-indexed
  type: StampType;
  title: string;
  dataUrl: string;
  // Normalized coordinates (0 to 100 as percentage of page width/height)
  xPercent: number; 
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotation: number; // degrees (e.g. 0)
  opacity?: number; // 0 to 1
  label?: string;
}

export interface PageDimension {
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PDFDocState {
  file: File | null;
  fileName: string;
  fileSize: number;
  arrayBuffer: ArrayBuffer;
  numPages: number;
  pageDimensions: PageDimension[];
}

export type ViewMode = 'continuous' | 'single';

export interface CoordinateDisplay {
  xPt: number;
  yPt: number;
  xMm: number;
  yMm: number;
}
