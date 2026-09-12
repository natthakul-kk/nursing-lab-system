'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Printer, X, Tag, Calendar, MapPin, SlidersHorizontal, Layers, CheckSquare, Square, Box } from 'lucide-react';

export interface BoxItem {
  id: string;
  boxCode: string;
  boxNumberInLot: number;
  boxNumberInYear: number;
  year: string;
  status: string; // "IN_STOCK", "IN_USE", "DEPLETED"
}

interface BoxStickerModalProps {
  item: {
    name: string;
    code: string;
    unit: string;
    location?: string | null;
  };
  lot: {
    lotNumber: string;
    packageUnit?: string | null;
    expiryDate?: string | Date | null;
    receivedDate?: string | Date | null;
    quantityInitial: number;
  };
  boxes: BoxItem[];
  onClose: () => void;
}

export default function BoxStickerModal({ item, lot, boxes, onClose }: BoxStickerModalProps) {
  const [boxQrs, setBoxQrs] = useState<{ [key: string]: string }>({});
  const [labelSize, setLabelSize] = useState<'compact' | 'mini'>('compact');
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>(boxes.map((b) => b.id));

  const totalLotBoxes = lot.quantityInitial || boxes.length;
  const unitLabel = lot.packageUnit || item.unit || 'กล่อง';

  useEffect(() => {
    async function generateAllQrs() {
      const qrs: { [key: string]: string } = {};
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      for (const box of boxes) {
        try {
          const payload = `${origin}/consumable/${encodeURIComponent(box.boxCode)}`;
          qrs[box.boxCode] = await QRCode.toDataURL(payload, {
            width: 160,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
        } catch (e) {
          console.error('Error generating box QR', e);
        }
      }
      setBoxQrs(qrs);
    }

    if (boxes && boxes.length > 0) {
      generateAllQrs();
    }
  }, [boxes]);

  const toggleSelectAll = () => {
    if (selectedBoxIds.length === boxes.length) {
      setSelectedBoxIds([]);
    } else {
      setSelectedBoxIds(boxes.map((b) => b.id));
    }
  };

  const toggleBox = (id: string) => {
    if (selectedBoxIds.includes(id)) {
      setSelectedBoxIds(selectedBoxIds.filter((bId) => bId !== id));
    } else {
      setSelectedBoxIds([...selectedBoxIds, id]);
    }
  };

  const formattedReceived = lot.receivedDate
    ? new Date(lot.receivedDate).toLocaleDateString('th-TH')
    : new Date().toLocaleDateString('th-TH');

  const formattedExpiry = lot.expiryDate
    ? new Date(lot.expiryDate).toLocaleDateString('th-TH')
    : 'ไม่ระบุ';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const boxesToPrint = boxes.filter((b) => selectedBoxIds.includes(b.id));
    if (boxesToPrint.length === 0) {
      alert('กรุณาเลือกกล่องที่ต้องการพิมพ์อย่างน้อย 1 กล่อง');
      return;
    }

    let cardsHtml = '';
    let pageCss = '';

    if (labelSize === 'mini') {
      // Mini Strip: ~45x14.5 mm (ขนาดแถบจิ๋ว แน่นกระชับ สัดส่วนพอดี)
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
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 2mm 2.5mm;
          width: 100%;
          box-sizing: border-box;
        }
        .box-card-mini {
          border: 1px solid #334155;
          border-radius: 3px;
          padding: 2px 3.5px;
          width: 100%;
          height: 14.5mm;
          max-height: 14.5mm;
          display: flex;
          align-items: center;
          gap: 4px;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .box-qr-mini {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          display: block;
        }
        .box-info-mini {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.14;
          flex: 1;
          min-width: 0;
        }
        .box-title-mini {
          font-size: 8px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.14;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          max-height: 18px;
        }
        .box-num-mini {
          font-size: 9px;
          font-weight: 900;
          color: #0f766e;
          margin-top: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .box-code-mini {
          font-family: monospace;
          font-size: 7px;
          color: #334155;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.5px;
        }
        .box-dates-mini {
          font-size: 6.5px;
          color: #64748b;
          margin-top: 0.5px;
          line-height: 1.12;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .box-exp {
          color: #e11d48;
          font-weight: 800;
        }
      `;

      cardsHtml = boxesToPrint
        .map(
          (box) => `
        <div class="box-card-mini">
          <img src="${boxQrs[box.boxCode] || ''}" class="box-qr-mini" />
          <div class="box-info-mini">
            <div class="box-title-mini">${item.name}</div>
            <div class="box-num-mini">👉 ${unitLabel}ที่ #${box.boxNumberInYear} (B${String(box.boxNumberInYear).padStart(3, '0')})</div>
            <div class="box-code-mini">Lot: ${lot.lotNumber} (${box.boxNumberInLot}/${totalLotBoxes})</div>
            <div class="box-dates-mini"><span class="box-exp">EXP: ${formattedExpiry}</span> (รับ ${formattedReceived})</div>
          </div>
        </div>
      `
        )
        .join('');
    } else {
      // Compact: ~48x28 mm (ขนาดกะทัดรัด สัดส่วนพอดี ไม่เวิ้งว้าง ไม่ล้นขอบ)
      pageCss = `
        @page {
          size: A4 portrait;
          margin: 6mm 5mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
          margin: 0;
          padding: 0;
          background: #fff;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 2.5mm 2.5mm;
          width: 100%;
          box-sizing: border-box;
        }
        .box-card-compact {
          border: 1.2px solid #334155;
          border-radius: 4px;
          padding: 2.5px 5px 3px 5px;
          width: 100%;
          height: 22.5mm;
          max-height: 22.5mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .box-header-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0fdfa;
          border-bottom: 1px solid #0d9488;
          border-top-left-radius: 3px;
          border-top-right-radius: 3px;
          padding: 1.5px 5px;
          margin: -2.5px -5px 2px -5px;
          box-sizing: border-box;
        }
        .box-org-text {
          font-size: 7.5px;
          font-weight: 800;
          color: #0f766e;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .box-org-sub {
          font-size: 6.5px;
          font-weight: 700;
          color: #0d9488;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .box-body-compact {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-height: 0;
        }
        .box-qr-compact {
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          display: block;
        }
        .box-info-compact {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.15;
          flex: 1;
          min-width: 0;
        }
        .box-title-compact {
          font-size: 9.5px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.16;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          max-height: 23px;
        }
        .box-num-compact {
          font-size: 10.5px;
          font-weight: 900;
          color: #0f766e;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .box-code-compact {
          font-family: monospace;
          font-size: 7.5px;
          color: #334155;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.5px;
        }
        .box-meta-compact {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 0.5px;
          line-height: 1.14;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .box-exp {
          color: #e11d48;
          font-weight: 800;
        }
      `;

      cardsHtml = boxesToPrint
        .map(
          (box) => `
        <div class="box-card-compact">
          <div class="box-header-compact">
            <span class="box-org-text">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</span>
            <span class="box-org-sub">ห้องปฏิบัติการ</span>
          </div>
          <div class="box-body-compact">
            <img src="${boxQrs[box.boxCode] || ''}" class="box-qr-compact" />
            <div class="box-info-compact">
              <div class="box-title-compact">${item.name}</div>
              <div class="box-num-compact">👉 ${unitLabel}ที่ #${box.boxNumberInYear} • B${String(box.boxNumberInYear).padStart(3, '0')}</div>
              <div class="box-code-compact">Lot: ${lot.lotNumber} (${box.boxNumberInLot}/${totalLotBoxes})</div>
              <div class="box-meta-compact">
                <span class="box-exp">EXP: ${formattedExpiry}</span> | รับ: ${formattedReceived}
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>สติกเกอร์กล่อง - ${item.name}</title>
          <style>
            ${pageCss}
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${cardsHtml}
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                สติกเกอร์ประจำ{unitLabel} ({unitLabel}-Level Labels)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ระบุลำดับ{unitLabel}ในล็อตและลำดับประจำปี สำหรับแปะหน้า{unitLabel}ก่อนนำเข้าชั้น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item & Lot Summary Bar */}
        <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-extrabold text-slate-900 dark:text-slate-100">{item.name}</div>
            <div className="text-[11px] text-teal-800 dark:text-teal-300 font-medium">
              Lot: <b className="font-mono">{lot.lotNumber}</b> | ทั้งหมด {boxes.length} {unitLabel} | รับเข้า: {formattedReceived} | หมดอายุ: {formattedExpiry}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLabelSize('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'compact'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              ขนาดกะทัดรัด (~64x22.5 มม.)
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('mini')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'mini'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              ขนาดแถบจิ๋ว (~47x14.5 มม.)
            </button>
          </div>
        </div>

        {/* Multi-Select Toolbar */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 px-1">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 cursor-pointer"
          >
            {selectedBoxIds.length === boxes.length ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedBoxIds.length === boxes.length
                ? `เลือกครบทุก${unitLabel} (${boxes.length} ${unitLabel})`
                : `เลือกทั้งหมด (${selectedBoxIds.length}/${boxes.length} ${unitLabel})`}
            </span>
          </button>
          <span className="text-[11px] text-slate-400">
            * สติกเกอร์ขนาดพอดี{unitLabel} ไม่บดบังฉลากสำคัญของบรรจุภัณฑ์เดิม
          </span>
        </div>

        {/* Scrollable Preview Grid of Boxes */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[50vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {boxes.map((box) => {
              const isChecked = selectedBoxIds.includes(box.id);
              const qrUrl = boxQrs[box.boxCode];

              return (
                <div
                  key={box.id}
                  onClick={() => toggleBox(box.id)}
                  className={`border-2 p-2.5 rounded-2xl flex items-center gap-2.5 cursor-pointer transition select-none ${
                    isChecked
                      ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={box.boxCode}
                      className="w-12 h-12 rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                      QR...
                    </div>
                  )}

                  <div className="overflow-hidden flex-1 leading-tight space-y-0.5">
                    <div className="font-mono font-black text-xs text-teal-900 dark:text-teal-300 flex items-center justify-between">
                      <span>👉 {unitLabel}ที่ #{box.boxNumberInYear} • B{String(box.boxNumberInYear).padStart(3, '0')}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">({box.boxNumberInLot}/{totalLotBoxes})</span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                      {item.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {box.boxCode}
                    </div>
                    <div className="text-[9.5px] text-slate-400 flex items-center justify-between pt-0.5">
                      <span>รับ: {formattedReceived}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">EXP: {formattedExpiry}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            พร้อมพิมพ์ <b className="text-teal-700 dark:text-teal-400">{selectedBoxIds.length}</b> {unitLabel} จากทั้งหมด {boxes.length} {unitLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              disabled={selectedBoxIds.length === 0}
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์สติกเกอร์{unitLabel} ({selectedBoxIds.length} {unitLabel})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
