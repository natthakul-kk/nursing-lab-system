import { jsPDF } from 'jspdf';

export interface PdfCardItem {
  qrBase64: string;
  orgText?: string;
  codeText: string;
  badgeText?: string;
  titleText: string;
  locOrExpText: string;
}

/**
 * Helper to wrap text into multiple lines given a max width in canvas pixels
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 2
): string[] {
  if (!text) return [];
  
  // First check if text fits in 1 line
  if (ctx.measureText(text).width <= maxWidth) {
    return [text];
  }

  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word;
      if (lines.length >= maxLines - 1) {
        // Last line: truncate with ellipsis if necessary
        const remainingWords = words.slice(i).join('');
        let lastLine = currentLine + remainingWords;
        while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1);
        }
        lines.push(lastLine.trim() + '...');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Fallback character-level wrapping if word wrapping resulted in line overflow
  if (lines.length === 1 && ctx.measureText(lines[0]).width > maxWidth) {
    const str = lines[0];
    const line1 = [];
    let idx = 0;
    while (idx < str.length && ctx.measureText(str.slice(0, idx + 1)).width <= maxWidth) {
      idx++;
    }
    const firstPart = str.slice(0, idx);
    let secondPart = str.slice(idx);
    while (ctx.measureText(secondPart + '...').width > maxWidth && secondPart.length > 0) {
      secondPart = secondPart.slice(0, -1);
    }
    return [firstPart, secondPart + '...'];
  }

  return lines.slice(0, maxLines);
}

/**
 * Render a single 38mm x 19mm sticker card onto an HTML5 Canvas at 450x225 px (300 DPI)
 */
/**
 * Render a single 38mm x 19mm sticker card onto an HTML5 Canvas at 900x450 px (600 DPI Ultra-HD)
 * Supports colIndex (0-4) to add safe-area padding for edge columns (col 0 on left edge, col 4 on right edge)
 * so that laser printers without borderless mode (which have 5-6.5 mm hardware margins) will NEVER clip QR or text.
 */
async function renderStickerCardToDataUrl(
  card: PdfCardItem,
  showBorders: boolean,
  colIndex: number = 2
): Promise<string> {
  const canvas = document.createElement('canvas');
  // 900 x 450 px gives true 600 DPI Ultra-HD resolution for laser printers
  canvas.width = 900;
  canvas.height = 450;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 900, 450);

  // Border if requested
  if (showBorders) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(2, 2, 896, 446);
    ctx.setLineDash([]);
  }

  // Column-aware edge padding:
  // Sheet left margin is 1.5mm. User requested exactly 5.0mm safe margin from paper edge:
  // In Column 0 (leftmost):
  // Offset qrX by 83 px (3.5 mm inside sticker + 1.5 mm paper margin = 5.0 mm from paper edge).
  const isLeftEdge = colIndex === 0;
  const isRightEdge = colIndex === 4;

  const qrX = isLeftEdge ? 83 : 28;
  const qrSize = 270;
  const qrY = 90; // (450 - 270) / 2 = 90 (vertically centered)

  // Draw QR code with nearest-neighbor crispness (imageSmoothingEnabled = false)
  if (card.qrBase64) {
    try {
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = card.qrBase64;
      });
      // Crisp pixel rendering without anti-aliasing blur for barcodes
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      ctx.imageSmoothingEnabled = true;
    } catch {
      // Ignore image load error
    }
  }

  const leftTextX = isLeftEdge ? 375 : 320;
  // If right edge, add 5.0mm padding from paper right edge (3.5mm inside card = 83px)
  const maxRightX = isRightEdge ? 817 : 876;
  const maxTextWidth = maxRightX - leftTextX;

  // 1. Organization Header
  ctx.font = 'bold 28px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f766e';
  ctx.fillText(card.orgText || 'คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์', leftTextX, 74);

  // 2. Code & Badge (Dynamically sized and positioned to guarantee NO overlapping)
  const codeText = card.codeText || '';
  let badgeWidth = 0;
  if (card.badgeText) {
    ctx.font = 'bold 24px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    badgeWidth = ctx.measureText(card.badgeText).width + 20;
  }

  // Calculate available horizontal space for the code
  const maxCodeWidth = card.badgeText ? (maxTextWidth - badgeWidth - 12) : maxTextWidth;

  // Dynamically shrink code font size so code never collides with badge
  let codeFontSize = 30;
  ctx.font = `900 ${codeFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  while (ctx.measureText(codeText).width > maxCodeWidth && codeFontSize > 21) {
    codeFontSize -= 1;
    ctx.font = `900 ${codeFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  }

  // If still overflowing at minimum font size, truncate cleanly with ellipsis
  let displayCode = codeText;
  if (ctx.measureText(displayCode).width > maxCodeWidth) {
    while (ctx.measureText(displayCode + '...').width > maxCodeWidth && displayCode.length > 0) {
      displayCode = displayCode.slice(0, -1);
    }
    displayCode = displayCode.trim() + '...';
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillText(displayCode, leftTextX, 134);
  const actualCodeWidth = ctx.measureText(displayCode).width;

  if (card.badgeText) {
    // Badge is ALWAYS positioned immediately after the code text (never overlaps)
    const badgeX = leftTextX + actualCodeWidth + 12;
    const badgeY = 104;
    const badgeHeight = 34;

    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 24px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(card.badgeText, badgeX + 10, badgeY + 26);
  }

  // 3. Title / Name (1-2 lines)
  ctx.font = 'bold 30px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#1e293b';
  const titleLines = wrapText(ctx, card.titleText || '', maxTextWidth, 2);
  let textY = 194;
  for (const line of titleLines) {
    ctx.fillText(line, leftTextX, textY);
    textY += 44;
  }

  // 4. Location or Expiry Meta Line
  ctx.font = '600 27px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = (card.locOrExpText || '').includes('EXP') ? '#e11d48' : '#64748b';
  const metaY = Math.max(textY + 4, 350);
  ctx.fillText(card.locOrExpText || '', leftTextX, metaY);

  return canvas.toDataURL('image/png');
}

/**
 * Generate a ready-to-print PDF for Elephant A7 sticker sheets (205 mm x 175 mm landscape)
 * 40 stickers per page (8 rows x 5 columns, 38 mm x 19 mm per sticker)
 */
export async function generateStickerPdf(
  cards: (PdfCardItem | null)[],
  options?: { startPosition?: number; showBorders?: boolean }
): Promise<jsPDF> {
  const startOffset = Math.max(0, (options?.startPosition || 1) - 1);
  const effectiveCards: (PdfCardItem | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    effectiveCards.push(null);
  }
  effectiveCards.push(...cards);

  const CARDS_PER_PAGE = 40;
  const totalSheets = Math.ceil(effectiveCards.length / CARDS_PER_PAGE) || 1;

  // Initialize jsPDF with exact Elephant A7 dimensions: 205 mm x 175 mm landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [175, 205],
  });

  const showBorders = options?.showBorders ?? true;

  // Pre-render cache with colIndex support
  const cardDataUrlCache = new Map<string, string>();

  // Elephant A7 exact layout metrics
  // Width: 205mm. Left margin = 1.5mm, 5 cols x 38mm = 190mm, 4 gaps x 3mm = 12mm. Total = 203.5mm (+1.5mm right margin = 205mm)
  // Height: 175mm. Top margin = 3.5mm, 8 rows x 21mm pitch (19mm sticker + 2mm gap). Total = 168mm (+3.5mm margin = 171.5mm)
  const LEFT_MARGIN = 1.5;
  const TOP_MARGIN = 3.5;
  const STICKER_WIDTH = 38.0;
  const STICKER_HEIGHT = 19.0;
  const COL_PITCH = 41.0; // 38mm width + 3mm gap
  const ROW_PITCH = 21.0; // 19mm height + 2mm gap

  for (let s = 0; s < totalSheets; s++) {
    if (s > 0) {
      doc.addPage([175, 205], 'landscape');
    }

    const sheetCards = effectiveCards.slice(s * CARDS_PER_PAGE, (s + 1) * CARDS_PER_PAGE);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        const index = r * 5 + c;
        const item = sheetCards[index];
        const x = LEFT_MARGIN + c * COL_PITCH;
        const y = TOP_MARGIN + r * ROW_PITCH;

        if (item) {
          const cacheKey = `${item.codeText}_${c}_${showBorders}`;
          let imgData = cardDataUrlCache.get(cacheKey);
          if (!imgData) {
            imgData = await renderStickerCardToDataUrl(item, showBorders, c);
            cardDataUrlCache.set(cacheKey, imgData);
          }
          doc.addImage(imgData, 'PNG', x, y, STICKER_WIDTH, STICKER_HEIGHT);
        } else if (showBorders) {
          // Draw empty dashed guide box
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineDashPattern([1, 1], 0);
          doc.rect(x, y, STICKER_WIDTH, STICKER_HEIGHT);
          doc.setLineDashPattern([], 0);
        }
      }
    }
  }

  return doc;
}

/**
 * Trigger immediate client-side download of the Elephant A7 sticker PDF
 */
export async function downloadStickerPdf(
  filename: string,
  cards: (PdfCardItem | null)[],
  options?: { startPosition?: number; showBorders?: boolean }
): Promise<void> {
  const doc = await generateStickerPdf(cards, options);
  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanName);
}
