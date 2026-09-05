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
      // Mini Strip: ~36x18 mm
      pageCss = `
        @page { size: auto; margin: 4mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 6px;
          background: #fff;
        }
        .labels-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-start;
        }
        .box-card-mini {
          border: 1px dashed #0d9488;
          border-radius: 6px;
          padding: 3px 5px;
          width: 165px;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 5px;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .box-qr-mini {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          display: block;
        }
        .box-info-mini {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.15;
        }
        .box-title-mini {
          font-size: 8px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100px;
        }
        .box-num-mini {
          font-size: 9px;
          font-weight: 900;
          color: #0d9488;
          margin-top: 1px;
        }
        .box-code-mini {
          font-family: monospace;
          font-size: 7.5px;
          color: #475569;
          font-weight: bold;
        }
        .box-dates-mini {
          font-size: 7px;
          color: #64748b;
          margin-top: 1px;
          white-space: nowrap;
        }
      `;

      cardsHtml = boxesToPrint
        .map(
          (box) => `
        <div class="box-card-mini">
          <img src="${boxQrs[box.boxCode] || ''}" class="box-qr-mini" />
          <div class="box-info-mini">
            <div class="box-title-mini">${item.name}</div>
            <div class="box-num-mini">กล่องที่ ${box.boxNumberInLot}/${totalLotBoxes} (กล่อง ${box.boxNumberInYear}/${box.year})</div>
            <div class="box-code-mini">${box.boxCode}</div>
            <div class="box-dates-mini">รับ: ${formattedReceived} | EXP: ${formattedExpiry}</div>
          </div>
        </div>
      `
        )
        .join('');
    } else {
      // Compact: ~48x28 mm (ขนาดกะทัดรัด ไม่ใหญ่มาก ติดหน้ากล่องพอดีสวยงาม)
      pageCss = `
        @page { size: auto; margin: 5mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 8px;
          background: #fff;
        }
        .labels-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-start;
        }
        .box-card-compact {
          border: 1.2px dashed #0d9488;
          border-radius: 8px;
          padding: 6px 8px;
          width: 220px;
          height: 84px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .box-qr-compact {
          width: 66px;
          height: 66px;
          flex-shrink: 0;
          display: block;
        }
        .box-info-compact {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.22;
        }
        .box-org-compact {
          font-size: 7px;
          font-weight: 700;
          color: #0d9488;
          text-transform: uppercase;
        }
        .box-title-compact {
          font-size: 9.5px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 135px;
          margin-top: 0.5px;
        }
        .box-num-compact {
          font-size: 10.5px;
          font-weight: 900;
          color: #0f766e;
          margin-top: 1px;
        }
        .box-code-compact {
          font-family: monospace;
          font-size: 8px;
          color: #334155;
          font-weight: bold;
        }
        .box-meta-compact {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.2;
        }
        .box-exp {
          color: #e11d48;
          font-weight: 700;
        }
      `;

      cardsHtml = boxesToPrint
        .map(
          (box) => `
        <div class="box-card-compact">
          <img src="${boxQrs[box.boxCode] || ''}" class="box-qr-compact" />
          <div class="box-info-compact">
            <div class="box-org-compact">คณะพยาบาลศาสตร์ • แล็บปฏิบัติการ</div>
            <div class="box-title-compact">${item.name}</div>
            <div class="box-num-compact">กล่องที่ ${box.boxNumberInLot}/${totalLotBoxes} (กล่อง ${box.boxNumberInYear}/${box.year})</div>
            <div class="box-code-compact">${box.boxCode} • Lot: ${lot.lotNumber}</div>
            <div class="box-meta-compact">
              <div>รับเข้า: ${formattedReceived}</div>
              <div>วันหมดอายุ: <span class="box-exp">${formattedExpiry}</span></div>
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
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                สติกเกอร์ประจำกล่อง (Box-Level Labels)
              </h3>
              <p className="text-[11px] text-slate-500">
                ระบุลำดับกล่องในล็อตและลำดับกล่องประจำปี สำหรับแปะหน้ากล่องก่อนนำเข้าชั้น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item & Lot Summary Bar */}
        <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-extrabold text-slate-900">{item.name}</div>
            <div className="text-[11px] text-teal-800 font-medium">
              Lot: <b className="font-mono">{lot.lotNumber}</b> | ทั้งหมด {boxes.length} {item.unit} | รับเข้า: {formattedReceived} | หมดอายุ: {formattedExpiry}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLabelSize('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'compact'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              ขนาดกะทัดรัด (~48x28 มม.)
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('mini')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'mini'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              ขนาดแถบจิ๋ว (~36x18 มม.)
            </button>
          </div>
        </div>

        {/* Multi-Select Toolbar */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
          >
            {selectedBoxIds.length === boxes.length ? (
              <CheckSquare className="w-4 h-4 text-teal-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedBoxIds.length === boxes.length
                ? 'เลือกครบทุกกล่อง (' + boxes.length + ' กล่อง)'
                : 'เลือกทั้งหมด (' + selectedBoxIds.length + '/' + boxes.length + ' กล่อง)'}
            </span>
          </button>
          <span className="text-[11px] text-slate-400">
            * สติกเกอร์ขนาดพอดีกล่อง ไม่บดบังฉลากสำคัญของบรรจุภัณฑ์เดิม
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
                      ? 'border-teal-500 bg-teal-50/30'
                      : 'border-slate-200 bg-slate-50 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={box.boxCode}
                      className="w-12 h-12 rounded border border-slate-200 bg-white p-0.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                      QR...
                    </div>
                  )}

                  <div className="overflow-hidden flex-1 leading-tight space-y-0.5">
                    <div className="font-mono font-black text-xs text-teal-900 flex items-center justify-between">
                      <span>กล่องที่ {box.boxNumberInLot}/{totalLotBoxes}</span>
                      <span className="text-[10px] text-slate-500 font-medium">กล่อง {box.boxNumberInYear}/{box.year}</span>
                    </div>
                    <div className="font-bold text-slate-800 text-[11px] truncate">
                      {item.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">
                      {box.boxCode}
                    </div>
                    <div className="text-[9.5px] text-slate-400 flex items-center justify-between pt-0.5">
                      <span>รับ: {formattedReceived}</span>
                      <span className="text-rose-600 font-semibold">EXP: {formattedExpiry}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            พร้อมพิมพ์ <b className="text-teal-700">{selectedBoxIds.length}</b> กล่อง จากทั้งหมด {boxes.length} กล่อง
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
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
              <span>พิมพ์สติกเกอร์กล่อง ({selectedBoxIds.length} กล่อง)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
