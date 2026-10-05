'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatImageUrl } from '@/lib/image-helper';
import { QrCode, Printer, X, Tag, MapPin, Calendar, Coins, Image as ImageIcon, SlidersHorizontal, Copy } from 'lucide-react';

interface AssetQrModalProps {
  itemUnit?: string;
  asset: {
    id: string;
    assetCode: string;
    govAssetCode?: string | null;
    sequenceNumber?: number | null;
    serialNumber?: string | null;
    location?: string | null;
    receivedDate?: string | Date | null;
    cost?: number | null;
    imageUrl?: string | null;
    status: string;
    item?: {
      name: string;
      code: string;
      unit: string;
      imageUrl?: string | null;
    };
  };
  itemName?: string;
  onClose: () => void;
}

export default function AssetQrModal({ asset, itemName, itemUnit, onClose }: AssetQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact' | 'mini' | 'template_doc'>('compact');
  const [startPosition, setStartPosition] = useState<number>(1);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [copies, setCopies] = useState<number>(1);
  const title = itemName || asset.item?.name || 'ครุภัณฑ์ห้องปฏิบัติการพยาบาล';
  const unit = itemUnit || asset.item?.unit || 'ชิ้น';

  useEffect(() => {
    async function generateQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const qrPayload = `${origin}/asset/${encodeURIComponent(asset.assetCode)}`;

        const url = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: labelSize === 'mini' ? 1 : 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    }

    generateQr();
  }, [asset, labelSize]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    let singleCardHtml = '';
    let pageCss = '';

    if (labelSize === 'mini') {
      // Mini: Strip layout ~45x15 mm (แสดง 2 บรรทัด ไม่ตัดคำทิ้ง)
      pageCss = `
        @page { size: A4 portrait; margin: 6mm 5mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
          margin: 0;
          padding: 0;
          background: #fff;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .labels-container {
          display: flex;
          flex-wrap: wrap;
          gap: 2.5mm 3mm;
        }
        .mini-card {
          border: 1px solid #334155;
          border-radius: 3px;
          padding: 2px 4px;
          width: 175px;
          height: 58px;
          display: flex;
          align-items: center;
          gap: 5px;
          background: #fff;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .mini-qr {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          display: block;
        }
        .mini-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.14;
          flex: 1;
          min-width: 0;
        }
        .mini-org {
          font-size: 6.5px;
          font-weight: 800;
          color: #0f766e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mini-code-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 3px;
          margin-top: 0.5px;
        }
        .mini-code {
          font-family: monospace;
          font-size: 9px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
        .mini-seq {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 7px;
          font-weight: 800;
          color: #0f766e;
          background: #f0fdfa;
          border: 0.5px solid #99f6e4;
          border-radius: 2px;
          padding: 0.5px 3px;
          white-space: nowrap;
        }
        .mini-title {
          font-size: 7.5px;
          font-weight: bold;
          color: #334155;
          margin-top: 0.5px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.12;
          word-break: break-word;
        }
        .mini-loc {
          font-size: 6.5px;
          color: #64748b;
          margin-top: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `;
      singleCardHtml = `
        <div class="mini-card">
          <img src="${qrDataUrl}" class="mini-qr" />
          <div class="mini-info">
            <div class="mini-org">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</div>
            <div class="mini-code-row">
              <span class="mini-code">${asset.assetCode}</span>
              <span class="mini-seq">${unit}ที่ ${asset.sequenceNumber || 1}</span>
            </div>
            <div class="mini-title">${title}</div>
            <div class="mini-loc">📍 ${asset.location || 'ห้องแล็บพยาบาล'}</div>
          </div>
        </div>
      `;
    } else if (labelSize === 'compact') {
      // Compact: Horizontal ~64x26 mm (ชื่อยาวแสดงได้สูงสุด 3 บรรทัดเต็ม ไม่ถูกตัดทอน, ไม่มีคำว่าเลขพัสดุ)
      pageCss = `
        @page { size: A4 portrait; margin: 6mm 5mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
          margin: 0;
          padding: 0;
          background: #fff;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .labels-container {
          display: flex;
          flex-wrap: wrap;
          gap: 3mm 3mm;
        }
        .compact-card {
          border: 1.2px solid #334155;
          border-radius: 4px;
          padding: 2.5px 5px 3px 5px;
          width: 250px;
          min-height: 104px;
          height: auto;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .compact-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0fdfa;
          border-bottom: 1px solid #0d9488;
          border-top-left-radius: 3px;
          border-top-right-radius: 3px;
          padding: 1.5px 5px;
          margin: -2.5px -5px 2.5px -5px;
          box-sizing: border-box;
        }
        .compact-org-text {
          font-size: 7.5px;
          font-weight: 800;
          color: #0f766e;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .compact-org-sub {
          font-size: 6.5px;
          font-weight: 700;
          color: #0d9488;
          white-space: nowrap;
        }
        .compact-body {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-height: 0;
        }
        .compact-qr {
          width: 65px;
          height: 65px;
          flex-shrink: 0;
          display: block;
        }
        .compact-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.15;
          flex: 1;
          min-width: 0;
        }
        .compact-code-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }
        .compact-code {
          font-family: monospace;
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.2px;
        }
        .compact-seq {
          font-size: 8px;
          font-weight: 800;
          color: #0f766e;
          background: #f0fdfa;
          border: 0.8px solid #99f6e4;
          border-radius: 3px;
          padding: 0.5px 4px;
          white-space: nowrap;
        }
        .compact-gov {
          font-family: monospace;
          font-size: 8px;
          color: #334155;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.5px;
        }
        .compact-title {
          font-size: 8.5px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.15;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          margin-top: 1px;
        }
        .compact-meta {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 1px;
          line-height: 1.14;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `;
      singleCardHtml = `
        <div class="compact-card">
          <div class="compact-header">
            <span class="compact-org-text">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</span>
            <span class="compact-org-sub">ห้องปฏิบัติการ</span>
          </div>
          <div class="compact-body">
            <img src="${qrDataUrl}" class="compact-qr" />
            <div class="compact-info">
              <div class="compact-code-row">
                <span class="compact-code">${asset.assetCode}</span>
                <span class="compact-seq">${unit}ที่ ${asset.sequenceNumber || 1}</span>
              </div>
              ${asset.govAssetCode ? `<div class="compact-gov">${asset.govAssetCode}</div>` : ''}
              <div class="compact-title">${title}</div>
              <div class="compact-meta">
                <span>📍 ${asset.location || 'ห้องแล็บพยาบาล'}</span>
                ${asset.serialNumber ? ` | SN: ${asset.serialNumber}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (labelSize === 'standard') {
      // Standard: Full card ~60x38 mm (ย่อขนาดลงพอดี 230px, QR 90px, แยก 2 บรรทัดไม่ตัดคำ, ชื่อเต็มไม่ตัดคำ)
      pageCss = `
        @page { size: A4 portrait; margin: 8mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
          margin: 0;
          padding: 0;
          background: #fff;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .labels-container {
          display: flex;
          flex-wrap: wrap;
          gap: 3.5mm 3.5mm;
        }
        .label-card {
          border: 1.5px solid #334155;
          border-radius: 6px;
          padding: 8px 10px;
          width: 230px;
          text-align: center;
          background: #fff;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .header-org {
          border-bottom: 1px solid #ccfbf1;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .header-org-main {
          font-size: 8px;
          font-weight: 800;
          color: #0f766e;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
        .header-org-sub {
          font-size: 7px;
          font-weight: 700;
          color: #0d9488;
          margin-top: 1px;
          white-space: nowrap;
        }
        .item-title {
          font-size: 10.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 3px;
          line-height: 1.25;
          word-break: break-word;
        }
        .seq-badge {
          display: inline-block;
          background: #f0fdfa;
          color: #0f766e;
          border: 0.8px solid #99f6e4;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 999px;
          margin-bottom: 5px;
        }
        .qr-img {
          width: 90px;
          height: 90px;
          margin: 0 auto 5px;
          display: block;
        }
        .asset-code {
          font-family: monospace;
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.4px;
        }
        .gov-code {
          font-family: monospace;
          font-size: 9px;
          color: #334155;
          font-weight: bold;
          margin-top: 1px;
        }
        .details {
          font-size: 8px;
          color: #475569;
          text-align: left;
          border-top: 1px solid #e2e8f0;
          padding-top: 4px;
          margin-top: 4px;
          line-height: 1.35;
        }
      `;
      singleCardHtml = `
        <div class="label-card">
          <div class="header-org">
            <div class="header-org-main">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</div>
            <div class="header-org-sub">ห้องปฏิบัติการ</div>
          </div>
          <div class="item-title">${title}</div>
          <div class="seq-badge">${unit}ที่ ${asset.sequenceNumber || 1}</div>
          <img src="${qrDataUrl}" class="qr-img" />
          <div class="asset-code">${asset.assetCode}</div>
          ${asset.govAssetCode ? `<div class="gov-code">${asset.govAssetCode}</div>` : ''}
          <div class="details">
            <div><strong>สถานที่เก็บ:</strong> ${asset.location || 'ห้องปฏิบัติการพยาบาล'}</div>
            ${asset.serialNumber ? `<div><strong>Serial No.:</strong> ${asset.serialNumber}</div>` : ''}
            ${asset.receivedDate ? `<div><strong>รับเข้า:</strong> ${new Date(asset.receivedDate).toLocaleDateString('th-TH')}</div>` : ''}
            ${asset.cost ? `<div><strong>มูลค่า:</strong> ฿${Number(asset.cost).toLocaleString('th-TH')} บาท</div>` : ''}
          </div>
        </div>
      `;
    } else if (labelSize === 'template_doc') {
      pageCss = `
        @page {
          size: 205mm 175mm;
          margin: 0;
        }
        html, body {
          width: 205mm;
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .doc-sheet-page {
          width: 202mm;
          height: 168mm;
          margin: 2.5mm auto 0 auto;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
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
          max-height: 21mm;
          min-height: 21mm;
        }
        .doc-cell {
          width: 38mm;
          max-width: 38mm;
          height: 21mm;
          max-height: 21mm;
          min-height: 21mm;
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
        .doc-seq {
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
          color: #64748b;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.5px;
        }
      `;

      const singleCard = `
        <div class="doc-card-inner">
          <div class="doc-qr-wrap">
            <img src="${qrDataUrl}" class="doc-qr" />
          </div>
          <div class="doc-info">
            <div class="doc-org-text">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</div>
            <div class="doc-code-row">
              <span class="doc-code">${asset.govAssetCode || asset.assetCode}</span>
              <span class="doc-seq">${unit}ที่ ${asset.sequenceNumber || 1}</span>
            </div>
            <div class="doc-name" title="${title}">${title}</div>
            <div class="doc-loc">📍 ${asset.location || 'ห้องปฏิบัติการ'}</div>
          </div>
        </div>
      `;

      const allCardItems = Array.from({ length: copies }).map(() => singleCard);
      const effectiveCards: string[] = [];
      const startOffset = Math.max(0, startPosition - 1);
      for (let i = 0; i < startOffset; i++) {
        effectiveCards.push('');
      }
      effectiveCards.push(...allCardItems);

      const CARDS_PER_PAGE = 40;
      const totalSheets = Math.ceil(effectiveCards.length / CARDS_PER_PAGE) || 1;

      let sheetHtmlOutput = '';
      for (let s = 0; s < totalSheets; s++) {
        const sheetCards = effectiveCards.slice(s * CARDS_PER_PAGE, (s + 1) * CARDS_PER_PAGE);
        while (sheetCards.length < CARDS_PER_PAGE) {
          sheetCards.push('');
        }

        let sheetTableRows = '';
        for (let r = 0; r < 8; r++) {
          const rowCards = sheetCards.slice(r * 5, (r + 1) * 5);
          let rowCellsHtml = '';
          for (let c = 0; c < 5; c++) {
            const cardContent = rowCards[c];
            rowCellsHtml += `
              <td class="doc-cell">
                ${cardContent || '<div class="doc-empty-cell"></div>'}
              </td>
            `;
            if (c < 4) {
              rowCellsHtml += `<td class="doc-spacer-col"></td>`;
            }
          }
          sheetTableRows += `<tr class="doc-sticker-row">${rowCellsHtml}</tr>`;
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

      singleCardHtml = sheetHtmlOutput;
    }

    const cardsHtml = labelSize === 'template_doc'
      ? singleCardHtml
      : Array.from({ length: copies })
          .map(() => singleCardHtml)
          .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${labelSize === 'template_doc' ? '' : `ป้าย QR Code ครุภัณฑ์ - ${asset.assetCode}`}</title>
          <style>
            ${pageCss}
          </style>
        </head>
        <body>
          ${labelSize === 'template_doc' ? cardsHtml : `<div class="labels-container">${cardsHtml}</div>`}
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

  const formattedImg = formatImageUrl(asset.imageUrl || asset.item?.imageUrl);

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
                ป้ายสติกเกอร์และ QR Code ครุภัณฑ์
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size Preset Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              เลือกขนาดสติกเกอร์:
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setLabelSize('compact')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'compact'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div>กะทัดรัด (แนะนำ)</div>
              <div className="text-[10px] font-normal text-slate-400">~6.4x2.6 ซม.</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('standard')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div>มาตรฐาน</div>
              <div className="text-[10px] font-normal text-slate-400">~6.0x3.8 ซม.</div>
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
              <div>แถบจิ๋ว</div>
              <div className="text-[10px] font-normal text-slate-400">~4.5x1.5 ซม.</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('template_doc')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'template_doc'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title="เทมเพลต 175×205 มม. (5 แถว × 8 ช่อง = 40 ดวง/แผ่น)"
            >
              <div>เทมเพลต 19×38</div>
              <div className={`text-[10px] font-normal ${labelSize === 'template_doc' ? 'text-teal-100' : 'text-slate-400'}`}>40 ดวง (175×205)</div>
            </button>
          </div>
        </div>

        {/* Template Doc Configuration */}
        {labelSize === 'template_doc' && (
          <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2 text-xs animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse inline-block" />
                  <span>แผ่นสติกเกอร์ 40 ดวง (8 แถว × 5 ช่อง แนวนอน • สติกเกอร์ 38 × 19 มม.)</span>
                </div>
                <span className="text-teal-300 dark:text-teal-700 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">เริ่มพิมพ์ช่องที่:</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={startPosition}
                    onChange={(e) => setStartPosition(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
                    className="w-14 px-2 py-1 text-center font-bold bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-teal-800 dark:text-teal-200 focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">(1-40)</span>
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showBorders}
                  onChange={(e) => setShowBorders(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span>เส้นประไกด์จัดตำแหน่ง</span>
              </label>
            </div>

            {/* Print Help Guide */}
            <div className="p-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span className="font-bold flex-shrink-0">💡 การตั้งค่าตอนสั่งพิมพ์:</span>
              <span>Margins (ระยะขอบ) เลือก <b>&quot;None&quot; (ไม่มี)</b> • Scale เลือก <b>100%</b> • เอาติ๊กถูกออกที่ <b>&quot;ส่วนหัวและส่วนท้าย&quot;</b> • ติ๊กถูกที่ <b>&quot;กราฟิกพื้นหลัง&quot;</b></span>
            </div>
          </div>
        )}

        {/* Copy Count Selector */}
        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
            <Copy className="w-3.5 h-3.5 text-teal-600" />
            จำนวนดวงที่จะพิมพ์:
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCopies(num)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  copies === num
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {num} {num === 2 ? '(เครื่อง+กล่อง)' : 'ดวง'}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Label Card Preview according to Size */}
        {labelSize === 'mini' ? (
          /* Mini Strip Preview */
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-700 rounded p-2 flex items-center gap-2.5 shadow-sm max-w-[260px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${asset.assetCode}`}
                  className="w-12 h-12 rounded border border-slate-200 p-0.5 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-0.5 flex-1 min-w-0">
                <div className="text-[8px] font-bold text-teal-700 dark:text-teal-400 truncate">
                  คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                    {asset.assetCode}
                  </span>
                  <span className="text-[9px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800 flex-shrink-0">
                    {unit}ที่ {asset.sequenceNumber || 1}
                  </span>
                </div>
                <div className="text-[9px] font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight">
                  {title}
                </div>
                <div className="text-[8.5px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-teal-600" />
                  <span>{asset.location || 'ห้องแล็บพยาบาล'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : labelSize === 'compact' ? (
          /* Compact Horizontal Preview */
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col shadow-sm max-w-[320px] w-full">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-teal-200 dark:border-teal-800 pb-1 mb-2 bg-teal-50/50 dark:bg-teal-950/30 -mx-3 -mt-3 p-2 rounded-t-lg">
                <span className="text-[9px] font-extrabold text-teal-800 dark:text-teal-300 truncate">
                  คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
                </span>
                <span className="text-[8px] font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
                  ห้องปฏิบัติการ
                </span>
              </div>
              <div className="flex items-center gap-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${asset.assetCode}`}
                    className="w-16 h-16 rounded border border-slate-200 p-0.5 bg-white flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                )}
                <div className="overflow-hidden space-y-0.5 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 leading-none">
                      {asset.assetCode}
                    </span>
                    <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      {unit}ที่ {asset.sequenceNumber || 1}
                    </span>
                  </div>
                  {asset.govAssetCode && (
                    <div className="font-mono text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate">
                      {asset.govAssetCode}
                    </div>
                  )}
                  <div className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 line-clamp-3 leading-tight">
                    {title}
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-teal-600 flex-shrink-0" />
                    <span className="truncate">{asset.location || 'ห้องแล็บพยาบาล'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : labelSize === 'standard' ? (
          /* Standard Card Preview */
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-center space-y-1.5 max-w-[240px] w-full">
              <div className="border-b border-teal-100 dark:border-teal-900 pb-1">
                <div className="text-[9px] font-extrabold text-teal-800 dark:text-teal-300">
                  คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
                </div>
                <div className="text-[8px] font-bold text-teal-600 dark:text-teal-400">
                  ห้องปฏิบัติการ
                </div>
              </div>

              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">{title}</div>

              <div>
                <span className="inline-block bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 text-[10px] font-bold px-2 py-0.2 rounded-full border border-teal-200 dark:border-teal-800">
                  {unit}ที่ {asset.sequenceNumber || 1}
                </span>
              </div>

              {/* QR Image */}
              <div className="flex justify-center my-0.5">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${asset.assetCode}`}
                    className="w-24 h-24 rounded border border-slate-200 p-0.5 bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center text-xs text-slate-400">
                    กำลังสร้าง QR...
                  </div>
                )}
              </div>

              {/* Asset Code */}
              <div>
                <div className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 tracking-wider">
                  {asset.assetCode}
                </div>
                {asset.govAssetCode && (
                  <div className="mt-0.5">
                    <span className="font-mono text-[9px] text-slate-600 dark:text-slate-300 font-bold">
                      {asset.govAssetCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Detailed attributes in label */}
              <div className="text-left text-[9.5px] text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-1.5 space-y-0.5">
                <div className="flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="truncate">ที่เก็บ: {asset.location || 'ห้องปฏิบัติการพยาบาล'}</span>
                </div>
                {asset.serialNumber && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span>SN: {asset.serialNumber}</span>
                  </div>
                )}
                {asset.receivedDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span>รับเข้า: {new Date(asset.receivedDate).toLocaleDateString('th-TH')}</span>
                  </div>
                )}
                {asset.cost && asset.cost > 0 ? (
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                    <span>ราคา: ฿{Number(asset.cost).toLocaleString('th-TH')} บาท</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          /* Template 175x205 mm Preview (Horizontal 38x19 mm card) */
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-700 rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm max-w-[280px] w-full">
              <div className="w-12 h-12 bg-white p-0.5 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center flex-shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR Code ${asset.assetCode}`} className="w-full h-full object-contain" />
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
                    {asset.govAssetCode || asset.assetCode}
                  </span>
                  <span className="text-[8px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1 rounded border border-teal-200 dark:border-teal-800 flex-shrink-0">
                    {unit}ที่ {asset.sequenceNumber || 1}
                  </span>
                </div>
                <div className="text-[8.5px] font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight">
                  {title}
                </div>
                <div className="text-[8px] text-slate-500 dark:text-slate-400 truncate">
                  📍 {asset.location || 'ห้องปฏิบัติการ'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Preview if Available */}
        {formattedImg && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
            <img
              src={formattedImg}
              alt={title}
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                รูปภาพตัวเครื่องในระบบ
              </div>
              <a
                href={asset.imageUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline truncate max-w-[240px] block"
              >
                เปิดดูภาพต้นฉบับ
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            พิมพ์ {copies} ดวง ({labelSize === 'mini' ? 'จิ๋ว' : labelSize === 'compact' ? 'กะทัดรัด' : labelSize === 'template_doc' ? 'เทมเพลต 175×205 มม.' : 'มาตรฐาน'})
          </span>
          <div className="flex items-center gap-2">
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
              <span>พิมพ์สติกเกอร์ ({copies} ดวง)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
