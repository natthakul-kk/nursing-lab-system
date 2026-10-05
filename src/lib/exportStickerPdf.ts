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
async function renderStickerCardToDataUrl(
  card: PdfCardItem,
  showBorders: boolean
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 450;
  canvas.height = 225;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 450, 225);

  // Border if requested
  if (showBorders) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(1, 1, 448, 223);
    ctx.setLineDash([]);
  }

  // Draw QR code
  if (card.qrBase64) {
    try {
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = card.qrBase64;
      });
      // 160 x 160 px centered vertically on left side
      ctx.drawImage(qrImg, 14, 32, 160, 160);
    } catch {
      // Ignore image load error
    }
  }

  const leftTextX = 186;
  const maxTextWidth = 250;

  // 1. Organization Header
  ctx.font = 'bold 15px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f766e';
  ctx.fillText(card.orgText || 'คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์', leftTextX, 36);

  // 2. Code & Badge
  ctx.font = '900 17px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillStyle = '#0f172a';
  const codeText = card.codeText || '';
  ctx.fillText(codeText, leftTextX, 66);

  if (card.badgeText) {
    const codeMetrics = ctx.measureText(codeText);
    ctx.font = 'bold 13px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const badgeMetrics = ctx.measureText(card.badgeText);
    const badgeWidth = badgeMetrics.width + 10;
    const badgeX = Math.min(450 - badgeWidth - 10, leftTextX + codeMetrics.width + 8);
    const badgeY = 51;

    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(badgeX, badgeY, badgeWidth, 18);
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX, badgeY, badgeWidth, 18);

    ctx.fillStyle = '#0f766e';
    ctx.fillText(card.badgeText, badgeX + 5, badgeY + 14);
  }

  // 3. Title / Name (1-2 lines)
  ctx.font = 'bold 16px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#1e293b';
  const titleLines = wrapText(ctx, card.titleText || '', maxTextWidth, 2);
  let textY = 96;
  for (const line of titleLines) {
    ctx.fillText(line, leftTextX, textY);
    textY += 23;
  }

  // 4. Location or Expiry Meta Line
  ctx.font = '600 14px Sarabun, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = (card.locOrExpText || '').includes('EXP') ? '#e11d48' : '#64748b';
  const metaY = Math.max(textY + 2, 175);
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

  // Pre-render unique cards to cache rendering
  const cardDataUrlCache = new Map<PdfCardItem, string>();
  const showBorders = options?.showBorders ?? true;

  for (const item of effectiveCards) {
    if (item && !cardDataUrlCache.has(item)) {
      const dataUrl = await renderStickerCardToDataUrl(item, showBorders);
      cardDataUrlCache.set(item, dataUrl);
    }
  }

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
          const imgData = cardDataUrlCache.get(item);
          if (imgData) {
            doc.addImage(imgData, 'PNG', x, y, STICKER_WIDTH, STICKER_HEIGHT);
          }
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
