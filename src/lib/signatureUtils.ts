/**
 * Helper to generate transparent PNG data URL from a cursive font string
 */
export function generateTypedSignatureDataUrl(
  text: string,
  fontFamily: string,
  color: string,
  fontSize: number = 72
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 200, height: 80 };

  const font = `600 ${fontSize}px "${fontFamily}", cursive, sans-serif`;
  ctx.font = font;

  const metrics = ctx.measureText(text || 'Signature');
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(fontSize * 1.5);

  canvas.width = Math.max(textWidth + 40, 200);
  canvas.height = Math.max(textHeight, 80);

  // Clear transparent
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.fillText(text || 'Signature', canvas.width / 2, canvas.height / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Clean up uploaded signature image (remove white/off-white background and enhance ink)
 */
export function cleanSignatureImage(
  imageElement: HTMLImageElement,
  threshold: number = 220, // 0 - 255: pixels brighter than this become transparent
  inkDarkness: number = 1.2
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.naturalWidth || imageElement.width;
  canvas.height = imageElement.naturalHeight || imageElement.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 100, height: 50 };

  ctx.drawImage(imageElement, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Process pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceived brightness
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    if (brightness > threshold) {
      // Off-white / paper background -> transparent
      data[i + 3] = 0;
    } else {
      // Calculate alpha based on how dark it is
      const alphaFactor = Math.min(1, Math.max(0, (threshold - brightness) / 60));
      // Darken ink for crispness
      data[i] = Math.max(0, Math.floor(r / inkDarkness));
      data[i + 1] = Math.max(0, Math.floor(g / inkDarkness));
      data[i + 2] = Math.max(0, Math.floor(b / inkDarkness));
      data[i + 3] = Math.floor(255 * alphaFactor);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

export interface StampStyleConfig {
  textColor?: string;
  hasBackground?: boolean;
  backgroundColor?: string;
  hasStroke?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
}

/**
 * Generate formatted date stamp badge with customizable background, stroke, and colors
 */
export function generateDateStampDataUrl(
  dateStr: string,
  styleConfigOrColor: StampStyleConfig | string = '#1e3a8a'
): { dataUrl: string; width: number; height: number } {
  const config: StampStyleConfig =
    typeof styleConfigOrColor === 'string'
      ? { textColor: styleConfigOrColor }
      : styleConfigOrColor;

  const textColor = config.textColor || '#1e3a8a';
  const hasBackground = config.hasBackground !== false;
  const backgroundColor = config.backgroundColor || '#ffffff';
  const hasStroke = config.hasStroke !== false;
  const strokeColor = config.strokeColor || textColor;
  const strokeWidth = config.strokeWidth ?? 2;
  const borderRadius = config.borderRadius ?? 8;
  const fontSize = config.fontSize || 18;
  const fontFamily = config.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 240, height: 54 };

  const font = `bold ${fontSize}px ${fontFamily}`;
  ctx.font = font;
  const metrics = ctx.measureText(dateStr);
  const textWidth = Math.ceil(metrics.width);

  // Dynamic padding based on whether frame (stroke/background) is present
  const padX = hasBackground || hasStroke ? 24 : 12;
  const padY = hasBackground || hasStroke ? 14 : 8;

  const totalWidth = Math.max(textWidth + padX * 2, 130);
  const totalHeight = Math.max(fontSize + padY * 2, 44);

  canvas.width = totalWidth;
  canvas.height = totalHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background and stroke if enabled
  if (hasBackground || (hasStroke && strokeWidth > 0)) {
    const margin = Math.ceil(strokeWidth / 2) + 1;
    const x = margin;
    const y = margin;
    const w = canvas.width - margin * 2;
    const h = canvas.height - margin * 2;
    const r = Math.min(borderRadius, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    if (hasBackground && backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fill();
    }

    if (hasStroke && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  // Draw crisp centered text
  ctx.font = font;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dateStr, canvas.width / 2, canvas.height / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Generate initials badge (monogram) with customizable background and stroke
 */
export function generateInitialsDataUrl(
  initials: string,
  fontFamily: string = 'Caveat',
  styleConfigOrColor: StampStyleConfig | string = '#1e3a8a'
): { dataUrl: string; width: number; height: number } {
  const config: StampStyleConfig =
    typeof styleConfigOrColor === 'string'
      ? { textColor: styleConfigOrColor }
      : styleConfigOrColor;

  const textColor = config.textColor || '#1e3a8a';
  const hasBackground = config.hasBackground === true;
  const backgroundColor = config.backgroundColor || '#ffffff';
  const hasStroke = config.hasStroke !== false;
  const strokeColor = config.strokeColor || textColor;
  const strokeWidth = config.strokeWidth ?? 2.5;

  const canvas = document.createElement('canvas');
  canvas.width = 110;
  canvas.height = 76;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 110, height: 76 };

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  if (hasBackground && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    const r = 8;
    const x = 2, y = 2, w = canvas.width - 4, h = canvas.height - 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.font = `bold 42px "${fontFamily}", cursive, sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials.toUpperCase(), canvas.width / 2, canvas.height / 2 - 4);

  // Underline stroke if enabled
  if (hasStroke && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(15, canvas.height - 12);
    ctx.lineTo(canvas.width - 15, canvas.height - 12);
    ctx.stroke();
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Convert PDF points to millimeters for human-readable display
 */
export function ptToMm(pt: number): number {
  return Math.round((pt * 25.4) / 72 * 10) / 10;
}
