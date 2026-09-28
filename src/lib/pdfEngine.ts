import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import type { PDFDocState, PageDimension, PlacedStamp } from '../types';

// Configure pdfjs worker
// Use unpkg/cdnjs worker with fallback to avoid bundler dynamic worker URL issues
if (typeof window !== 'undefined') {
  try {
    // Set worker from unpkg or cdnjs corresponding to pdfjs version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('Failed to set pdfjs workerSrc:', err);
  }
}

// Cache loaded PDF documents to avoid re-parsing on every page and thumbnail render
const docPromiseCache = new WeakMap<ArrayBuffer, Promise<pdfjsLib.PDFDocumentProxy>>();

export function getOrLoadPdfDocument(arrayBuffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  let promise = docPromiseCache.get(arrayBuffer);
  if (!promise) {
    const bufferCopy = arrayBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bufferCopy),
      useSystemFonts: true,
    });
    promise = loadingTask.promise;
    docPromiseCache.set(arrayBuffer, promise);
  }
  return promise;
}

/**
 * Load a PDF from an ArrayBuffer and return metadata and page dimensions
 */
export async function loadPdfMetadata(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  fileSize: number
): Promise<PDFDocState> {
  const pdfDoc = await getOrLoadPdfDocument(arrayBuffer);
  const numPages = pdfDoc.numPages;
  const pageDimensions: PageDimension[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    pageDimensions.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height,
    });
  }

  return {
    file: null,
    fileName,
    fileSize,
    arrayBuffer,
    numPages,
    pageDimensions,
  };
}

export interface RenderHandle {
  promise: Promise<{ width: number; height: number; scale: number }>;
  cancel: () => void;
}

/**
 * Render a single page to a canvas element at a target scale or width safely
 * using a fresh offscreen canvas to prevent any collision between concurrent renders.
 */
export function renderPageToCanvas(
  arrayBuffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: { scale?: number; targetWidth?: number } = {}
): RenderHandle {
  let isCancelled = false;
  let activeRenderTask: any = null;

  const promise = (async () => {
    const pdfDoc = await getOrLoadPdfDocument(arrayBuffer);
    if (isCancelled) {
      return { width: 0, height: 0, scale: 1 };
    }

    const page = await pdfDoc.getPage(pageNumber);
    if (isCancelled) {
      return { width: 0, height: 0, scale: 1 };
    }

    let scale = options.scale ?? 1.5;
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    if (options.targetWidth) {
      scale = options.targetWidth / unscaledViewport.width;
    }

    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });

    // Render to a detached offscreen canvas so pdfjs never encounters concurrent renders on the same canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.max(1, Math.round(viewport.width));
    tempCanvas.height = Math.max(1, Math.round(viewport.height));

    const tempCtx = tempCanvas.getContext('2d', { alpha: false });
    if (!tempCtx) throw new Error('Could not get canvas context');

    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    const renderTask = page.render({
      canvasContext: tempCtx,
      viewport: viewport,
      canvas: tempCanvas,
    });
    activeRenderTask = renderTask;

    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException' || isCancelled) {
        return {
          width: viewport.width / dpr,
          height: viewport.height / dpr,
          scale,
        };
      }
      throw err;
    }

    if (isCancelled) {
      return {
        width: viewport.width / dpr,
        height: viewport.height / dpr,
        scale,
      };
    }

    // Paint onto the visible canvas
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    const targetCtx = canvas.getContext('2d');
    if (targetCtx) {
      targetCtx.drawImage(tempCanvas, 0, 0);
    }

    return {
      width: viewport.width / dpr,
      height: viewport.height / dpr,
      scale,
    };
  })();

  return {
    promise,
    cancel: () => {
      isCancelled = true;
      if (activeRenderTask) {
        try {
          activeRenderTask.cancel();
        } catch {
          // ignore
        }
      }
    },
  };
}

/**
 * Generate a multi-page sample contract PDF for instant demonstration
 */
export async function generateSamplePdf(templateType: 'nda' | 'service' | 'employment' = 'nda'): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.1, 0.2, 0.45);
  const textColor = rgb(0.2, 0.22, 0.25);
  const mutedColor = rgb(0.45, 0.5, 0.55);
  const accentColor = rgb(0.15, 0.4, 0.8);
  const lightBg = rgb(0.96, 0.97, 0.99);

  if (templateType === 'nda') {
    // PAGE 1: Standard Non-Disclosure Agreement
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page1.getSize();

    // Header band
    page1.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: lightBg,
    });
    page1.drawRectangle({
      x: 0,
      y: height - 6,
      width: width,
      height: 6,
      color: accentColor,
    });

    page1.drawText('MUTUAL NON-DISCLOSURE AGREEMENT', {
      x: 50,
      y: height - 55,
      size: 18,
      font: fontBold,
      color: primaryColor,
    });
    page1.drawText('CONFIDENTIAL & PROPRIETARY  •  DOCUMENT REF: NDA-2026-084', {
      x: 50,
      y: height - 75,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    let currentY = height - 130;

    const writeParagraph = (page: typeof page1, text: string, isHeading = false) => {
      if (isHeading) {
        currentY -= 14;
        page.drawText(text, { x: 50, y: currentY, size: 12, font: fontBold, color: primaryColor });
        currentY -= 16;
      } else {
        const words = text.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line + (line ? ' ' : '') + word;
          const textWidth = fontRegular.widthOfTextAtSize(testLine, 10);
          if (textWidth > width - 100) {
            page.drawText(line, { x: 50, y: currentY, size: 10, font: fontRegular, color: textColor });
            currentY -= 15;
            line = word;
          } else {
            line = testLine;
          }
        }
        if (line) {
          page.drawText(line, { x: 50, y: currentY, size: 10, font: fontRegular, color: textColor });
          currentY -= 16;
        }
      }
    };

    writeParagraph(page1, '1. PREAMBLE & PARTIES', true);
    writeParagraph(
      page1,
      'This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of the date of final electronic signature by and between Acorn Technologies Inc., a Delaware corporation having its principal office at 450 Innovation Parkway, Suite 800, San Francisco, CA 94105 ("Disclosing Party"), and the undersigned individual or entity ("Receiving Party").'
    );

    writeParagraph(page1, '2. PURPOSE OF DISCLOSURE', true);
    writeParagraph(
      page1,
      'The parties wish to explore a mutually beneficial business and technical collaboration regarding proprietary software development, intellectual property synthesis, and enterprise services (the "Authorized Purpose"). In connection therewith, each party may disclose to the other certain confidential technical and business information.'
    );

    writeParagraph(page1, '3. DEFINITION OF CONFIDENTIAL INFORMATION', true);
    writeParagraph(
      page1,
      '"Confidential Information" means any and all proprietary data, code repositories, trade secrets, customer records, financial terms, product roadmaps, and business strategies disclosed by either party, whether orally, in writing, electronically, or by inspection of tangible objects, that is designated as confidential or reasonably understood to be confidential given the nature of the information.'
    );

    writeParagraph(page1, '4. NON-USE AND NON-DISCLOSURE OBLIGATIONS', true);
    writeParagraph(
      page1,
      'The Receiving Party agrees to treat all Confidential Information with the same degree of care as it uses for its own confidential information (but not less than a reasonable degree of care), and not to disclose or communicate such Confidential Information to any third party without prior express written consent.'
    );

    // Initial box on page 1
    page1.drawRectangle({
      x: width - 180,
      y: 40,
      width: 130,
      height: 44,
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
      color: rgb(0.98, 0.99, 1),
    });
    page1.drawText('INITIAL HERE (PAGE 1):', {
      x: width - 170,
      y: 70,
      size: 8,
      font: fontBold,
      color: mutedColor,
    });
    page1.drawText('Page 1 of 2  •  Acorn Technologies Inc.', {
      x: 50,
      y: 45,
      size: 9,
      font: fontOblique,
      color: mutedColor,
    });

    // PAGE 2: Execution & Signatures Page
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    page2.drawRectangle({
      x: 0,
      y: height - 60,
      width: width,
      height: 60,
      color: lightBg,
    });
    page2.drawText('MUTUAL NON-DISCLOSURE AGREEMENT — EXECUTION', {
      x: 50,
      y: height - 38,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });

    currentY = height - 90;
    writeParagraph(page2, '5. TERM & SURVIVAL', true);
    writeParagraph(
      page2,
      'This Agreement shall remain in full force and effect for three (3) years from the effective execution date. Obligations concerning trade secrets shall survive indefinitely in accordance with applicable federal and international intellectual property laws.'
    );

    writeParagraph(page2, '6. GOVERNING LAW & JURISDICTION', true);
    writeParagraph(
      page2,
      'This Agreement shall be governed by and construed in accordance with the laws of the State of California, without giving effect to conflicts of laws principles. Any dispute arising under this Agreement shall be adjudicated in the federal or state courts situated in San Francisco County, California.'
    );

    writeParagraph(page2, '7. COUNTERPARTS & ELECTRONIC SIGNATURES', true);
    writeParagraph(
      page2,
      'This Agreement may be executed in counterparts, each of which shall be deemed an original. Delivery of an executed signature page by electronic facsimile or encrypted digital signature software shall be effective as manual physical delivery of an original counterpart.'
    );

    currentY -= 20;
    page2.drawText('IN WITNESS WHEREOF, the parties hereto have executed this Agreement:', {
      x: 50,
      y: currentY,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    // Signatures blocks
    const col1X = 50;
    const col2X = 320;
    const sigBoxY = currentY - 180;

    // Disclosing Party box
    page2.drawRectangle({
      x: col1X,
      y: sigBoxY,
      width: 220,
      height: 160,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
      color: rgb(0.98, 0.99, 1),
    });
    page2.drawText('COMPANY (DISCLOSING PARTY):', {
      x: col1X + 12,
      y: sigBoxY + 140,
      size: 9,
      font: fontBold,
      color: mutedColor,
    });
    page2.drawText('Acorn Technologies Inc.', {
      x: col1X + 12,
      y: sigBoxY + 125,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });
    page2.drawLine({
      start: { x: col1X + 12, y: sigBoxY + 55 },
      end: { x: col1X + 208, y: sigBoxY + 55 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    page2.drawText('Authorized Signature: Marcus Vance, CEO', {
      x: col1X + 12,
      y: sigBoxY + 40,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });
    page2.drawText('Date: September 28, 2026', {
      x: col1X + 12,
      y: sigBoxY + 22,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    // Receiving Party signature target box (Highlighted for drag and drop!)
    page2.drawRectangle({
      x: col2X,
      y: sigBoxY,
      width: 220,
      height: 160,
      borderColor: rgb(0.2, 0.5, 0.9),
      borderWidth: 1.5,
      color: rgb(0.96, 0.98, 1),
    });
    page2.drawText('RECEIVING PARTY (SIGNER):', {
      x: col2X + 12,
      y: sigBoxY + 140,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.4, 0.8),
    });
    page2.drawText('Drag & Place Your Signature Below:', {
      x: col2X + 12,
      y: sigBoxY + 125,
      size: 9,
      font: fontOblique,
      color: mutedColor,
    });
    page2.drawLine({
      start: { x: col2X + 12, y: sigBoxY + 55 },
      end: { x: col2X + 208, y: sigBoxY + 55 },
      thickness: 1,
      color: rgb(0.4, 0.6, 0.9),
    });
    page2.drawText('Signer Name & Title: [Your Signature]', {
      x: col2X + 12,
      y: sigBoxY + 40,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });
    page2.drawText('Date: [Drag Date Stamp]', {
      x: col2X + 12,
      y: sigBoxY + 22,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    page2.drawText('Page 2 of 2  •  Standard Mutual NDA', {
      x: 50,
      y: 45,
      size: 9,
      font: fontOblique,
      color: mutedColor,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const buffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(buffer).set(pdfBytes);
  return buffer;
}

/**
 * Burn all placed stamps onto the PDF pages and return the signed PDF bytes
 */
export async function burnStampsToPdf(
  originalArrayBuffer: ArrayBuffer,
  placedStamps: PlacedStamp[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalArrayBuffer.slice(0));
  const pages = pdfDoc.getPages();

  // Group stamps by pageNumber (1-indexed)
  const stampsByPage = new Map<number, PlacedStamp[]>();
  for (const stamp of placedStamps) {
    const list = stampsByPage.get(stamp.pageNumber) || [];
    list.push(stamp);
    stampsByPage.set(stamp.pageNumber, list);
  }

  for (const [pageNumber, stamps] of stampsByPage.entries()) {
    const pageIndex = pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    for (const stamp of stamps) {
      if (!stamp.dataUrl) continue;

      try {
        // Convert dataUrl (base64 PNG) to bytes
        const base64Data = stamp.dataUrl.split(',')[1] || stamp.dataUrl;
        const binaryString = atob(base64Data);
        const imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }

        const pngImage = await pdfDoc.embedPng(imageBytes);

        // Convert percentage coordinates to PDF points
        // In web: xPercent is from left, yPercent is from TOP
        // In PDF: (0, 0) is at BOTTOM-LEFT
        const stampPdfWidth = (stamp.widthPercent / 100) * pageWidth;
        const stampPdfHeight = (stamp.heightPercent / 100) * pageHeight;
        const stampPdfX = (stamp.xPercent / 100) * pageWidth;
        
        // Compute bottom-left origin in PDF coordinates:
        // top edge in PDF is (pageHeight - yPercent * pageHeight)
        // bottom edge in PDF is top edge - stampPdfHeight
        const stampPdfY = pageHeight - ((stamp.yPercent / 100) * pageHeight) - stampPdfHeight;

        page.drawImage(pngImage, {
          x: stampPdfX,
          y: stampPdfY,
          width: stampPdfWidth,
          height: stampPdfHeight,
          rotate: degrees(stamp.rotation || 0),
          opacity: stamp.opacity ?? 1,
        });
      } catch (err) {
        console.error('Failed to embed stamp into PDF:', stamp, err);
      }
    }
  }

  // Update PDF metadata
  pdfDoc.setTitle('Signed Document');
  pdfDoc.setProducer('SignFlow PDF Engine');
  pdfDoc.setModificationDate(new Date());

  return await pdfDoc.save();
}
