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
  const [labelSize, setLabelSize] = useState<'standard' | 'mini'>('standard');
  const [printCopies, setPrintCopies] = useState<number>(1);

  useEffect(() => {
    async function generateQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const qrPayload = `${origin}/consumable/${encodeURIComponent(lot.lotNumber)}`;

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
    const printWindow = window.open('', '_blank', 'width=700,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    const copiesCount = Math.max(1, Math.min(100, printCopies || 1));

    let singleCardHtml = '';
    let pageCss = '';

    if (labelSize === 'mini') {
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
    for (let i = 0; i < copiesCount; i++) {
      cardsList += singleCardHtml;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ป้าย QR Lot - ${lot.lotNumber}</title>
          <style>
            ${pageCss}
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${cardsList}
          </div>
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
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ป้ายสติกเกอร์ QR Code ประจำล็อตเวชภัณฑ์
              </h3>
              <p className="text-[11px] text-slate-500">สำหรับติดหน้ากล่อง ขวด หลอด หรือซองย่อย</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
              เลือกขนาดสติกเกอร์:
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setLabelSize('standard')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'standard'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div>ขนาดมาตรฐาน (~5x3 ซม.)</div>
              <div className="text-[10px] font-normal text-slate-400">สำหรับกล่อง / ซองใหญ่</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('mini')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'mini'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div>ขนาดจิ๋ว (~3.5x1.8 ซม.)</div>
              <div className="text-[10px] font-normal text-slate-400">สำหรับหลอด / ซองย่อย / ชิ้นเล็ก</div>
            </button>
          </div>
        </div>

        {/* Print Copies Selector */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Copy className="w-3.5 h-3.5 text-teal-600" />
            จำนวนดวงที่ต้องการพิมพ์:
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 3, 5, 10].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setPrintCopies(qty)}
                className={`px-2 py-0.5 rounded-md font-bold text-xs transition cursor-pointer ${
                  printCopies === qty
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {qty}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={100}
              value={printCopies}
              onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
              className="w-12 text-center bg-white border border-slate-200 rounded-md py-0.5 text-xs font-bold text-slate-800"
            />
            <span className="text-slate-500 font-medium text-[11px]">ดวง</span>
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
          {labelSize === 'mini' ? (
            /* Mini Preview */
            <div className="bg-white border border-teal-600/50 rounded-lg p-2 flex items-center gap-2.5 shadow-sm max-w-[270px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${lot.lotNumber}`}
                  className="w-14 h-14 rounded border border-slate-200 p-0.5 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-slate-100 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-0.5">
                <div className="text-[10.5px] font-extrabold text-slate-900 line-clamp-1">
                  {item.name}
                </div>
                <div className="font-mono font-black text-xs text-teal-800">
                  Lot: {lot.lotNumber}
                </div>
                <div className="text-[9.5px] font-bold text-rose-600">
                  EXP: {formattedExpiry}
                </div>
                <div className="text-[9px] text-slate-500 flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-teal-600" />
                  <span>{item.location || 'ห้องแล็บพยาบาล'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Preview */
            <div className="bg-white border border-teal-600/50 rounded-xl p-3 flex items-center gap-3 shadow-sm max-w-[320px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${lot.lotNumber}`}
                  className="w-20 h-20 rounded-lg border border-slate-200 p-1 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-1">
                <div className="text-[9px] font-bold text-teal-700 uppercase tracking-wide">
                  เวชภัณฑ์ • คณะพยาบาลศาสตร์
                </div>
                <div className="font-mono font-black text-sm text-teal-900 leading-none">
                  Lot: {lot.lotNumber}
                </div>
                <div className="text-[11.5px] font-extrabold text-slate-800 line-clamp-2 leading-tight">
                  {item.name}
                </div>
                <div className="text-[10px] font-bold text-rose-600">
                  วันหมดอายุ: {formattedExpiry}
                </div>
                <div className="text-[9.5px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                  <span className="truncate">{item.location || 'ห้องปฏิบัติการพยาบาล'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lot Meta Summary */}
        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1 border border-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-500">คงเหลือในสต็อก:</span>
            <span className="font-bold text-slate-800">
              {lot.quantityRemaining} {item.unit}
              {lot.openPackRemainder ? ` (+เศษเปิด ${lot.openPackRemainder} ${item.usageUnit || 'ชิ้น'})` : ''}
            </span>
          </div>
          {lot.supplier && (
            <div className="flex justify-between">
              <span className="text-slate-500">ผู้จัดจำหน่าย:</span>
              <span className="text-slate-700 truncate max-w-[200px]">{lot.supplier}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สติกเกอร์ QR ล็อต ({printCopies} ดวง)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
