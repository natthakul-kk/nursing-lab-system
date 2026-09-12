'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Printer,
  X,
  Tag,
  Calendar,
  MapPin,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Box,
  Layers,
  Search,
  Check,
  PackageCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface ConsumableItemForBatch {
  id: string;
  name: string;
  code: string;
  unit: string;
  location?: string | null;
  category?: { name: string } | null;
  stockLots?: Array<{
    id: string;
    lotNumber: string;
    quantityRemaining: number;
    quantityInitial: number;
    packageUnit?: string | null;
    expiryDate?: string | Date | null;
    receivedDate?: string | Date | null;
    boxes?: Array<{
      id: string;
      boxCode: string;
      boxNumberInLot: number;
      boxNumberInYear: number;
      year: string;
      status: string;
    }>;
  }>;
}

interface BatchConsumableStickerModalProps {
  items: ConsumableItemForBatch[];
  onClose: () => void;
}

export default function BatchConsumableStickerModal({
  items,
  onClose,
}: BatchConsumableStickerModalProps) {
  // Only items that have lots and boxes
  const availableItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.stockLots &&
        item.stockLots.some((lot) => lot.boxes && lot.boxes.length > 0)
    );
  }, [items]);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [showDepleted, setShowDepleted] = useState(false);

  // Selected box ids (Default: Only in-stock boxes, exclude DEPLETED)
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>(() => {
    const ids: string[] = [];
    availableItems.forEach((item) => {
      item.stockLots?.forEach((lot) => {
        lot.boxes?.forEach((b) => {
          if (b.status !== 'DEPLETED') {
            ids.push(b.id);
          }
        });
      });
    });
    return ids;
  });

  // Toggle options
  const [includeLotStickers, setIncludeLotStickers] = useState(true);
  const [labelSize, setLabelSize] = useState<'compact' | 'mini'>('compact');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const q = searchQuery.toLowerCase();
    return availableItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.stockLots?.some((l) => l.lotNumber.toLowerCase().includes(q))
    );
  }, [availableItems, searchQuery]);

  // Expand/collapse item
  const toggleExpand = (itemId: string) => {
    setExpandedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Toggle item all boxes
  const toggleItemBoxes = (item: ConsumableItemForBatch) => {
    const itemBoxIds: string[] = [];
    item.stockLots?.forEach((lot) => {
      lot.boxes?.forEach((b) => itemBoxIds.push(b.id));
    });

    const allSelected = itemBoxIds.every((id) => selectedBoxIds.includes(id));
    if (allSelected) {
      setSelectedBoxIds((prev) => prev.filter((id) => !itemBoxIds.includes(id)));
    } else {
      setSelectedBoxIds((prev) => Array.from(new Set([...prev, ...itemBoxIds])));
    }
  };

  // Toggle lot boxes
  const toggleLotBoxes = (lot: any) => {
    const lotBoxIds: string[] = lot.boxes?.map((b: any) => b.id) || [];
    const allSelected = lotBoxIds.every((id) => selectedBoxIds.includes(id));
    if (allSelected) {
      setSelectedBoxIds((prev) => prev.filter((id) => !lotBoxIds.includes(id)));
    } else {
      setSelectedBoxIds((prev) => Array.from(new Set([...prev, ...lotBoxIds])));
    }
  };

  // Toggle individual box
  const toggleBox = (boxId: string) => {
    setSelectedBoxIds((prev) =>
      prev.includes(boxId) ? prev.filter((id) => id !== boxId) : [...prev, boxId]
    );
  };

  // Select all / Deselect all
  const selectAll = () => {
    const allBoxIds: string[] = [];
    filteredItems.forEach((item) => {
      item.stockLots?.forEach((lot) => {
        lot.boxes?.forEach((b) => allBoxIds.push(b.id));
      });
    });
    setSelectedBoxIds(allBoxIds);
  };

  const deselectAll = () => {
    setSelectedBoxIds([]);
  };

  // Count printable units
  const printableStats = useMemo(() => {
    let totalBoxes = 0;
    let totalLots = 0;
    const lotCounted = new Set<string>();

    availableItems.forEach((item) => {
      item.stockLots?.forEach((lot) => {
        const selectedInLot = lot.boxes?.filter((b) => selectedBoxIds.includes(b.id)) || [];
        if (selectedInLot.length > 0) {
          totalBoxes += selectedInLot.length;
          if (!lotCounted.has(lot.id)) {
            lotCounted.add(lot.id);
            totalLots += 1;
          }
        }
      });
    });

    return {
      totalBoxes,
      totalLots,
      totalStickers: totalBoxes + (includeLotStickers ? totalLots : 0),
    };
  }, [availableItems, selectedBoxIds, includeLotStickers]);

  // Generate QR helper
  const getQrCodeUrl = async (payload: string): Promise<string> => {
    if (qrCache[payload]) return qrCache[payload];
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 160,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      return url;
    } catch (e) {
      console.error('Error generating QR:', e);
      return '';
    }
  };

  // Print Handler
  const handlePrint = async () => {
    if (printableStats.totalBoxes === 0) {
      alert('กรุณาเลือกกล่องพัสดุอย่างน้อย 1 กล่องเพื่อพิมพ์สติกเกอร์');
      return;
    }

    setIsGenerating(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrs: Record<string, string> = { ...qrCache };

      // Collect all needed payloads
      const payloadsToGen: string[] = [];

      availableItems.forEach((item) => {
        item.stockLots?.forEach((lot) => {
          const lotBoxes = lot.boxes?.filter((b) => selectedBoxIds.includes(b.id)) || [];
          if (lotBoxes.length > 0) {
            if (includeLotStickers) {
              const lotPayload = `${origin}/consumable/${encodeURIComponent(lot.lotNumber)}`;
              if (!qrs[lotPayload]) payloadsToGen.push(lotPayload);
            }
            lotBoxes.forEach((b) => {
              const boxPayload = `${origin}/consumable/${encodeURIComponent(b.boxCode)}`;
              if (!qrs[boxPayload]) payloadsToGen.push(boxPayload);
            });
          }
        });
      });

      // Batch generate
      for (const p of payloadsToGen) {
        qrs[p] = await QRCode.toDataURL(p, {
          width: 160,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
      }
      setQrCache(qrs);

      // Build HTML
      let cardsHtml = '';

      for (const item of availableItems) {
        for (const lot of item.stockLots || []) {
          const selectedInLot = lot.boxes?.filter((b) => selectedBoxIds.includes(b.id)) || [];
          if (selectedInLot.length === 0) continue;

          const unitLabel = lot.packageUnit || item.unit || 'กล่อง';
          const totalLotBoxes = lot.quantityInitial || lot.boxes?.length || selectedInLot.length;
          const formattedExpiry = lot.expiryDate
            ? new Date(lot.expiryDate).toLocaleDateString('th-TH')
            : 'ไม่ระบุ';
          const formattedReceived = lot.receivedDate
            ? new Date(lot.receivedDate).toLocaleDateString('th-TH')
            : '-';

          // 1. Prepend Lot Header Label if enabled
          if (includeLotStickers) {
            const lotQrUrl = qrs[`${origin}/consumable/${encodeURIComponent(lot.lotNumber)}`] || '';

            if (labelSize === 'mini') {
              cardsHtml += `
                <div class="box-card-mini lot-header-card-mini">
                  <img src="${lotQrUrl}" class="box-qr-mini" />
                  <div class="box-info-mini">
                    <div class="lot-header-badge-mini">🏷️ ป้ายประจำล็อต (${unitLabel})</div>
                    <div class="box-title-mini">${item.name}</div>
                    <div class="box-num-mini font-mono">LOT: ${lot.lotNumber}</div>
                    <div class="box-dates-mini">รวม ${totalLotBoxes} ${unitLabel} | <span class="box-exp">EXP: ${formattedExpiry}</span></div>
                  </div>
                </div>
              `;
            } else {
              cardsHtml += `
                <div class="box-card-compact lot-header-card-compact">
                  <div class="box-header-compact lot-banner-compact">
                    <span class="box-org-text">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</span>
                    <span class="box-org-sub lot-sub-badge">🏷️ ป้ายประจำล็อต</span>
                  </div>
                  <div class="box-body-compact">
                    <img src="${lotQrUrl}" class="box-qr-compact" />
                    <div class="box-info-compact">
                      <div class="box-title-compact">${item.name}</div>
                      <div class="box-num-compact font-mono">LOT: ${lot.lotNumber}</div>
                      <div class="box-code-compact">รหัสพัสดุ: ${item.code} (จำนวน ${totalLotBoxes} ${unitLabel})</div>
                      <div class="box-dates-compact"><span class="box-exp">EXP: ${formattedExpiry}</span> (รับเข้า ${formattedReceived})</div>
                    </div>
                  </div>
                </div>
              `;
            }
          }

          // 2. Print all Box stickers in sequence
          for (const box of selectedInLot) {
            const boxQrUrl = qrs[`${origin}/consumable/${encodeURIComponent(box.boxCode)}`] || '';

            if (labelSize === 'mini') {
              cardsHtml += `
                <div class="box-card-mini">
                  <img src="${boxQrUrl}" class="box-qr-mini" />
                  <div class="box-info-mini">
                    <div class="box-title-mini">${item.name}</div>
                    <div class="box-num-mini">👉 ${unitLabel}ที่ #${box.boxNumberInYear} (B${String(box.boxNumberInYear).padStart(3, '0')})</div>
                    <div class="box-code-mini">Lot: ${lot.lotNumber} (${box.boxNumberInLot}/${totalLotBoxes})</div>
                    <div class="box-dates-mini"><span class="box-exp">EXP: ${formattedExpiry}</span> (รับ ${formattedReceived})</div>
                  </div>
                </div>
              `;
            } else {
              cardsHtml += `
                <div class="box-card-compact">
                  <div class="box-header-compact">
                    <span class="box-org-text">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</span>
                    <span class="box-org-sub">ห้องปฏิบัติการ</span>
                  </div>
                  <div class="box-body-compact">
                    <img src="${boxQrUrl}" class="box-qr-compact" />
                    <div class="box-info-compact">
                      <div class="box-title-compact">${item.name}</div>
                      <div class="box-num-compact">👉 ${unitLabel}ที่ #${box.boxNumberInYear} (B${String(box.boxNumberInYear).padStart(3, '0')})</div>
                      <div class="box-code-compact">Lot: ${lot.lotNumber} (${box.boxNumberInLot}/${totalLotBoxes}) • ${box.boxCode}</div>
                      <div class="box-dates-compact"><span class="box-exp">EXP: ${formattedExpiry}</span> (รับ ${formattedReceived})</div>
                    </div>
                  </div>
                </div>
              `;
            }
          }
        }
      }

      // Page CSS
      let pageCss = '';
      if (labelSize === 'mini') {
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
          .lot-header-card-mini {
            border: 1.2px solid #0d9488 !important;
            background: #f0fdfa !important;
          }
          .lot-header-badge-mini {
            font-size: 6.5px;
            font-weight: 900;
            color: #0f766e;
            line-height: 1;
            margin-bottom: 1px;
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
      } else {
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
          .lot-header-card-compact {
            border: 1.5px solid #0d9488 !important;
            background: #f8fafc !important;
          }
          .lot-banner-compact {
            background: #ccfbf1 !important;
            border-bottom: 1px solid #0f766e !important;
          }
          .lot-sub-badge {
            color: #047857 !important;
            font-weight: 900 !important;
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
            font-size: 9px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.15;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            max-height: 22px;
          }
          .box-num-compact {
            font-size: 10px;
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
          .box-dates-compact {
            font-size: 7.5px;
            color: #64748b;
            margin-top: 0.5px;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .box-exp {
            color: #e11d48;
            font-weight: 800;
          }
        `;
      }

      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (!printWindow) {
        alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตป๊อปอัป');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>พิมพ์สติกเกอร์วัสดุสิ้นเปลืองหลายรายการ - คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</title>
            <meta charset="utf-8" />
            <style>${pageCss}</style>
          </head>
          <body>
            <div class="labels-grid">${cardsHtml}</div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error printing:', err);
      alert('เกิดข้อผิดพลาดในการพิมพ์สติกเกอร์');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                พิมพ์สติกเกอร์วัสดุสิ้นเปลืองทีละหลายรายการ (Batch Printing)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกรายการวัสดุและล็อตที่ต้องการ พิมพ์แยกกล่องต่อเนื่องพร้อมป้ายประจำล็อต
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อวัสดุ, รหัสพัสดุ, หรือหมายเลข Lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Size switch */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setLabelSize('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              กะทัดรัด (3 แถว/A4)
            </button>
            <button
              onClick={() => setLabelSize('mini')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'mini'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              แถบจิ๋ว (4 แถว/A4)
            </button>
          </div>

          {/* Lot Header Sticker Toggle */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-teal-50 dark:bg-teal-950/40 px-3 py-2 rounded-xl border border-teal-200/80 dark:border-teal-800/60">
            <input
              type="checkbox"
              checked={includeLotStickers}
              onChange={(e) => setIncludeLotStickers(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <span>พิมพ์ป้ายประจำล็อตด้วย</span>
          </label>

          {/* Show Depleted Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition">
            <input
              type="checkbox"
              checked={showDepleted}
              onChange={(e) => setShowDepleted(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <span>รวมกล่องที่ใช้หมดแล้ว</span>
          </label>
        </div>

        {/* Selection summary & quick actions */}
        <div className="py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              เลือกแล้ว: <strong className="text-teal-600 dark:text-teal-400 font-bold">{printableStats.totalBoxes}</strong> กล่อง
              {includeLotStickers && (
                <> + ป้ายล็อต <strong className="text-teal-600 dark:text-teal-400 font-bold">{printableStats.totalLots}</strong> ใบ</>
              )}
              {' '}(รวม <strong className="text-slate-900 dark:text-slate-100 font-bold">{printableStats.totalStickers}</strong> สติกเกอร์)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
            >
              เลือกทั้งหมด
            </button>
            <span>•</span>
            <button
              onClick={deselectAll}
              className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-semibold cursor-pointer"
            >
              ล้างการเลือก
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              ไม่พบรายการวัสดุสิ้นเปลืองที่มีสต็อกกล่องตรงกับการค้นหา
            </div>
          ) : (
            filteredItems.map((item) => {
              const itemBoxIds: string[] = [];
              item.stockLots?.forEach((lot) => {
                lot.boxes?.forEach((b) => itemBoxIds.push(b.id));
              });

              const selectedCount = itemBoxIds.filter((id) => selectedBoxIds.includes(id)).length;
              const isAllSelected = itemBoxIds.length > 0 && selectedCount === itemBoxIds.length;
              const isPartiallySelected = selectedCount > 0 && selectedCount < itemBoxIds.length;
              const isExpanded = expandedItemIds.includes(item.id);

              return (
                <div key={item.id} className="pt-3 first:pt-0">
                  {/* Item Row */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleItemBoxes(item)}
                        className="text-teal-600 dark:text-teal-400 cursor-pointer"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : isPartiallySelected ? (
                          <div className="w-5 h-5 rounded border-2 border-teal-600 dark:border-teal-400 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-teal-600 dark:bg-teal-400 rounded-sm" />
                          </div>
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => toggleExpand(item.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.2 rounded font-semibold">
                            {item.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{item.stockLots?.length || 0} ล็อต</span>
                          <span>•</span>
                          <span>
                            เลือก {selectedCount} จากทั้งหมด {itemBoxIds.length} กล่อง ({item.unit})
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Lots & Boxes */}
                  {isExpanded && (
                    <div className="ml-8 mt-2 space-y-2.5 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      {item.stockLots?.map((lot) => {
                        const lotBoxes = (lot.boxes || []).filter((b) => showDepleted ? true : b.status !== 'DEPLETED');
                        const selectedLotBoxCount = lotBoxes.filter((b) => selectedBoxIds.includes(b.id)).length;
                        const isLotAll = lotBoxes.length > 0 && selectedLotBoxCount === lotBoxes.length;
                        const isLotPartial = selectedLotBoxCount > 0 && selectedLotBoxCount < lotBoxes.length;

                        return (
                          <div
                            key={lot.id}
                            className="bg-white dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleLotBoxes(lot)}
                                  className="text-teal-600 dark:text-teal-400 cursor-pointer"
                                >
                                  {isLotAll ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : isLotPartial ? (
                                    <div className="w-4 h-4 rounded border-2 border-teal-600 flex items-center justify-center">
                                      <div className="w-2 h-2 bg-teal-600 rounded-sm" />
                                    </div>
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                  LOT: {lot.lotNumber}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  ({selectedLotBoxCount}/{lotBoxes.length} กล่อง)
                                </span>
                              </div>
                              <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
                                {lot.expiryDate ? `EXP: ${new Date(lot.expiryDate).toLocaleDateString('th-TH')}` : 'ไม่ระบุวันหมดอายุ'}
                              </span>
                            </div>

                            {/* Mini box buttons grid */}
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 mt-2">
                              {lotBoxes.map((box) => {
                                const isBoxSelected = selectedBoxIds.includes(box.id);
                                return (
                                  <button
                                    key={box.id}
                                    onClick={() => toggleBox(box.id)}
                                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer relative ${
                                      isBoxSelected
                                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-700 dark:text-teal-300'
                                        : box.status === 'DEPLETED'
                                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-400'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                    }`}
                                    title={box.status === 'DEPLETED' ? 'กล่องนี้ถูกใช้หมดแล้ว' : `กล่อง #${box.boxNumberInYear}`}
                                  >
                                    #{box.boxNumberInYear}
                                    {box.status === 'DEPLETED' && <span className="block text-[8px] text-rose-500 font-normal">หมด</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            พิมพ์จัดเรียงเรียบร้อย: ตามลำดับรายการ A กล่อง 1..N แล้วต่อด้วยรายการ B กล่อง 1..M
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating || printableStats.totalBoxes === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'กำลังสร้างสติกเกอร์...'
                  : `พิมพ์ ${printableStats.totalStickers} ใบ (A4)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
