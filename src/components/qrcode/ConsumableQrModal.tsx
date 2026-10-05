'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Printer, X, Tag, Calendar, MapPin, SlidersHorizontal, Copy, Check } from 'lucide-react';

interface ConsumableQrModalProps {
  item: {
    id: string;
    name: string;
    code: string;
    unit: string;
    usageUnit?: string | null;
    location?: string | null;
    category?: { name: string } | null;
  };
  lot: {
    id: string;
    lotNumber: string;
    quantityRemaining: number;
    openPackRemainder?: number | null;
    unitCost?: number | null;
    expiryDate?: string | Date | null;
    supplier?: string | null;
  };
  onClose: () => void;
}

export default function ConsumableQrModal({ item, lot, onClose }: ConsumableQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [labelSize, setLabelSize] = useState<'standard' | 'mini' | 'template_doc'>('standard');
  const [startPosition, setStartPosition] = useState<number>(1);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [printCopies, setPrintCopies] = useState<number>(1);

  useEffect(() => {
    async function generateQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const qrPayload = `${origin}/consumable/${encodeURIComponent(item.code)}?lot=${encodeURIComponent(lot.lotNumber)}`;

        const url = await QRCode.toDataURL(qrPayload, {
          width: 300,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate lot QR code', err);
      }
    }

    generateQr();
  }, [lot, item]);

  const formattedExpiry = lot.expiryDate
    ? new Date(lot.expiryDate).toLocaleDateString('th-TH')
    : 'ไม่ระบุ';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const copiesCount = Math.max(1, Math.min(100, printCopies || 1));

    let singleCardHtml = '';
    let pageCss = '';
    let cardsHtml = '';

    if (labelSize === 'template_doc') {
      // 205 x 175 mm Elephant / ตราช้าง A7 template (8 rows x 5 cols = 40 stickers, 38x19 mm landscape)
      pageCss = `
        @page {
          size: 205mm 175mm landscape;
          margin: 0;
        }
        body {
          width: 205mm;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .doc-sheet-page {
          width: 202mm;
          height: 168mm;
          margin: 3.5mm auto;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
          overflow: hidden;
        }
        .doc-sheet-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }
        .doc-table {
          width: 202mm;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0;
          padding: 0;
        }
        .doc-sticker-row {
          height: 21mm;
          min-height: 21mm;
          max-height: 21mm;
        }
        .doc-cell {
          width: 38mm;
          max-width: 38mm;
          height: 21mm;
          min-height: 21mm;
          max-height: 21mm;
          padding: 1mm 0;
          vertical-align: middle;
          box-sizing: border-box;
          overflow: hidden;
        }
        .doc-spacer-col {
          width: 3mm;
          max-width: 3mm;
          min-width: 3mm;
          padding: 0;
          margin: 0;
          border: none;
        }
        .doc-empty-cell {
          width: 38mm;
          height: 19mm;
          box-sizing: border-box;
          ${showBorders ? 'border: 0.5px dashed #f1f5f9;' : 'border: none;'}
        }
        .doc-card-inner {
          width: 38mm;
          max-width: 38mm;
          height: 19mm;
          max-height: 19mm;
          display: flex;
          align-items: center;
          gap: 1.5mm;
          box-sizing: border-box;
          overflow: hidden;
          padding: 1mm 1.2mm;
          ${showBorders ? 'border: 0.5px dashed #cbd5e1;' : 'border: none;'}
        }
        .doc-qr-wrap {
          width: 13.5mm;
          height: 13.5mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .doc-qr {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .doc-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.15;
          flex: 1;
          min-width: 0;
          text-align: left;
        }
        .doc-org-text {
          font-size: 5.5px;
          font-weight: 800;
          color: #0f766e;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doc-code-row {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-top: 0.5px;
        }
        .doc-code {
          font-family: monospace;
          font-size: 6.5px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doc-badge {
          font-size: 5px;
          font-weight: 700;
          color: #0f766e;
          background: #f0fdfa;
          border: 0.4px solid #99f6e4;
          border-radius: 1.5px;
          padding: 0 1px;
          line-height: 1;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .doc-name {
          font-size: 5.5px;
          font-weight: 700;
          color: #334155;
          line-height: 1.12;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          margin-top: 0.5px;
        }
        .doc-loc {
          font-size: 5px;
          color: #e11d48;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.5px;
        }
      `;

      const allCardItems: string[] = [];
      const singleDocCard = `
        <div class="doc-card-inner">
          <div class="doc-qr-wrap">
            <img src="${qrDataUrl}" class="doc-qr" />
          </div>
          <div class="doc-info">
            <div class="doc-org-text">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</div>
            <div class="doc-code-row">
              <span class="doc-code">Lot: ${lot.lotNumber}</span>
              <span class="doc-badge">${item.code}</span>
            </div>
            <div class="doc-name" title="${item.name}">${item.name}</div>
            <div class="doc-loc">EXP: ${formattedExpiry}</div>
          </div>
        </div>
      `;

      for (let i = 0; i < copiesCount; i++) {
        allCardItems.push(singleDocCard);
      }

      // Add empty cells for starting offset (startPosition is 1-indexed)
      const offset = Math.max(0, startPosition - 1);
      const cellsWithOffset = [...Array(offset).fill(''), ...allCardItems];

      // Partition into sheets of 40 stickers (8 rows x 5 cols)
      const stickersPerSheet = 40;
      const totalSheets = Math.ceil(cellsWithOffset.length / stickersPerSheet) || 1;
      let sheetHtmlOutput = '';

      for (let s = 0; s < totalSheets; s++) {
        const sheetCells = cellsWithOffset.slice(s * stickersPerSheet, (s + 1) * stickersPerSheet);
        while (sheetCells.length < stickersPerSheet) {
          sheetCells.push('');
        }

        let sheetTableRows = '';
        for (let r = 0; r < 8; r++) {
          const rowCells = sheetCells.slice(r * 5, (r + 1) * 5);
          sheetTableRows += `<tr class="doc-sticker-row">`;
          for (let c = 0; c < 5; c++) {
            const cellHtml = rowCells[c];
            sheetTableRows += `<td class="doc-cell">${cellHtml ? cellHtml : '<div class="doc-empty-cell"></div>'}</td>`;
            if (c < 4) {
              sheetTableRows += `<td class="doc-spacer-col"></td>`;
            }
          }
          sheetTableRows += `</tr>`;
        }

        sheetHtmlOutput += `
          <div class="doc-sheet-page">
            <table class="doc-table">
              <tbody>
                ${sheetTableRows}
              </tbody>
            </table>
          </div>
        `;
      }

      cardsHtml = sheetHtmlOutput;
    } else if (labelSize === 'mini') {
      // Mini: ~35x18 mm
      pageCss = `
        @page { size: auto; margin: 4mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 8px;
          background: #fff;
        }
        .labels-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-start;
        }
        .lot-mini-card {
          border: 1px dashed #0d9488;
          border-radius: 6px;
          padding: 4px 6px;
          width: 175px;
          height: 72px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .lot-mini-qr {
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          display: block;
        }
        .lot-mini-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.2;
        }
        .lot-mini-title {
          font-size: 8.5px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 105px;
        }
        .lot-mini-num {
          font-family: monospace;
          font-size: 10.5px;
          font-weight: 900;
          color: #0f766e;
          margin-top: 1px;
        }
        .lot-mini-exp {
          font-size: 8px;
          color: #e11d48;
          font-weight: 700;
          margin-top: 2px;
        }
        .lot-mini-loc {
          font-size: 7.5px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 105px;
        }
      `;

      singleCardHtml = `
        <div class="lot-mini-card">
          <img src="${qrDataUrl}" class="lot-mini-qr" />
          <div class="lot-mini-info">
            <div class="lot-mini-title">${item.name}</div>
            <div class="lot-mini-num">Lot: ${lot.lotNumber}</div>
            <div class="lot-mini-exp">EXP: ${formattedExpiry}</div>
            <div class="lot-mini-loc">📍 ${item.location || 'ห้องปฏิบัติการ'}</div>
          </div>
        </div>
      `;
    } else {
      // Standard: ~50x30 mm
      pageCss = `
        @page { size: auto; margin: 6mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 10px;
          background: #fff;
        }
        .labels-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-start;
        }
        .lot-std-card {
          border: 1.5px dashed #0d9488;
          border-radius: 10px;
          padding: 8px 10px;
          width: 250px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .lot-std-qr {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          display: block;
        }
        .lot-std-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.3;
        }
        .lot-std-org {
          font-size: 8px;
          font-weight: 700;
          color: #0d9488;
          text-transform: uppercase;
        }
        .lot-std-title {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .lot-std-num {
          font-family: monospace;
          font-size: 11.5px;
          font-weight: 900;
          color: #0f766e;
          margin-top: 2px;
        }
        .lot-std-exp {
          font-size: 9px;
          color: #e11d48;
          font-weight: 700;
          margin-top: 2px;
        }
        .lot-std-meta {
          font-size: 8.5px;
          color: #64748b;
          margin-top: 2px;
        }
      `;

      singleCardHtml = `
        <div class="lot-std-card">
          <img src="${qrDataUrl}" class="lot-std-qr" />
          <div class="lot-std-info">
            <div class="lot-std-org">เวชภัณฑ์ • คณะพยาบาลศาสตร์</div>
            <div class="lot-std-title">${item.name}</div>
            <div class="lot-std-num">Lot: ${lot.lotNumber}</div>
            <div class="lot-std-exp">หมดอายุ: ${formattedExpiry}</div>
            <div class="lot-std-meta">📍 ${item.location || 'ห้องปฏิบัติการพยาบาล'}</div>
          </div>
        </div>
      `;
    }

    let cardsList = '';
    if (labelSize !== 'template_doc') {
      for (let i = 0; i < copiesCount; i++) {
        cardsList += singleCardHtml;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${labelSize === 'template_doc' ? '' : `ป้าย QR Lot - ${lot.lotNumber}`}</title>
          <style>
            ${pageCss}
          </style>
        </head>
        <body>
          ${labelSize === 'template_doc' ? cardsHtml : `<div class="labels-grid">${cardsList}</div>`}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ป้ายสติกเกอร์ QR Code ประจำล็อตเวชภัณฑ์
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">สำหรับติดหน้ากล่อง ขวด หลอด หรือซองย่อย</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              เลือกขนาดสติกเกอร์:
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setLabelSize('standard')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div>ขนาดมาตรฐาน</div>
              <div className="text-[10px] font-normal text-slate-400">~5x3 ซม.</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('mini')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'mini'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div>ขนาดจิ๋ว</div>
              <div className="text-[10px] font-normal text-slate-400">~3.5x1.8 ซม.</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('template_doc')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'template_doc'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div>เทมเพลต 19×38</div>
              <div className="text-[10px] font-normal opacity-85">40 ดวง (175×205)</div>
            </button>
          </div>
        </div>

        {/* Template Doc configuration panel */}
        {labelSize === 'template_doc' && (
          <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2 text-xs animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse inline-block" />
                <span className="font-bold text-teal-900 dark:text-teal-200">แผ่นสติกเกอร์ 40 ดวง (8 แถว × 5 ช่อง แนวนอน • สติกเกอร์ 38 × 19 มม.)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">เริ่มพิมพ์ช่องที่:</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={startPosition}
                    onChange={(e) => setStartPosition(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
                    className="w-12 px-1.5 py-0.5 text-center font-bold bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-teal-800 dark:text-teal-200"
                  />
                  <span className="text-[11px] text-slate-400">(1-40)</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showBorders}
                    onChange={(e) => setShowBorders(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <span>เส้นประไกด์ตำแหน่ง</span>
                </label>
              </div>
            </div>

            {/* Print Help Guide */}
            <div className="p-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span className="font-bold flex-shrink-0">💡 คำแนะนำการพิมพ์:</span>
              <span>เลือกแนวนอน (Landscape) • ขนาดกระดาษ A4 หรือ 205×175 มม. • Scale 100% • เอาติ๊กถูกออกที่ &quot;ส่วนหัวและส่วนท้าย&quot; (Headers and footers)</span>
            </div>
          </div>
        )}

        {/* Print Copies Selector */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Copy className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            จำนวนดวงที่ต้องการพิมพ์:
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 3, 5, 10, 40].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setPrintCopies(qty)}
                className={`px-2 py-0.5 rounded-md font-bold text-xs transition cursor-pointer ${
                  printCopies === qty
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {qty}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={200}
              value={printCopies}
              onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
              className="w-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">ดวง</span>
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
          {labelSize === 'template_doc' ? (
            /* Template Doc Horizontal Preview (38x19 mm) */
            <div className="bg-white dark:bg-slate-900 border border-teal-600/50 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm max-w-[280px] w-full">
              <div className="w-12 h-12 bg-white flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700 rounded flex-shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR Code ${lot.lotNumber}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                )}
              </div>
              <div className="overflow-hidden space-y-0.5 flex-1 min-w-0 text-left">
                <div className="text-[8px] font-bold text-teal-700 dark:text-teal-400 truncate">
                  คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                    Lot: {lot.lotNumber}
                  </span>
                  <span className="text-[8px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800 flex-shrink-0">
                    {item.code}
                  </span>
                </div>
                <div className="text-[8.5px] font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight">
                  {item.name}
                </div>
                <div className="text-[8px] font-bold text-rose-600 dark:text-rose-400">
                  EXP: {formattedExpiry}
                </div>
              </div>
            </div>
          ) : labelSize === 'mini' ? (
            /* Mini Preview */
            <div className="bg-white dark:bg-slate-900 border border-teal-600/50 rounded-lg p-2 flex items-center gap-2.5 shadow-sm max-w-[270px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${lot.lotNumber}`}
                  className="w-14 h-14 rounded border border-slate-200 p-0.5 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-0.5">
                <div className="text-[10.5px] font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {item.name}
                </div>
                <div className="font-mono font-black text-xs text-teal-800 dark:text-teal-300">
                  Lot: {lot.lotNumber}
                </div>
                <div className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                  EXP: {formattedExpiry}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                  <span>{item.location || 'ห้องแล็บพยาบาล'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Preview */
            <div className="bg-white dark:bg-slate-900 border border-teal-600/50 rounded-xl p-3 flex items-center gap-3 shadow-sm max-w-[320px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${lot.lotNumber}`}
                  className="w-20 h-20 rounded-lg border border-slate-200 p-1 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-1">
                <div className="text-[9px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                  เวชภัณฑ์ • คณะพยาบาลศาสตร์
                </div>
                <div className="font-mono font-black text-sm text-teal-900 dark:text-teal-300 leading-none">
                  Lot: {lot.lotNumber}
                </div>
                <div className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                  {item.name}
                </div>
                <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  วันหมดอายุ: {formattedExpiry}
                </div>
                <div className="text-[9.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  <span className="truncate">{item.location || 'ห้องปฏิบัติการพยาบาล'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lot Meta Summary */}
        <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl space-y-1 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">คงเหลือในสต็อก:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {lot.quantityRemaining} {item.unit}
              {lot.openPackRemainder ? ` (+เศษเปิด ${lot.openPackRemainder} ${item.usageUnit || 'ชิ้น'})` : ''}
            </span>
          </div>
          {lot.supplier && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">ผู้จัดจำหน่าย:</span>
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{lot.supplier}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {labelSize === 'template_doc'
                ? `พิมพ์สติกเกอร์เทมเพลต (${printCopies} ดวง • ${Math.ceil(((startPosition - 1) + printCopies) / 40)} แผ่น)`
                : `พิมพ์สติกเกอร์ QR ล็อต (${printCopies} ดวง)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
