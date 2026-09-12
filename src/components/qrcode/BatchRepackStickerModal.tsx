'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Tag,
  Search,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronRight,
  Scissors,
  PackageCheck,
} from 'lucide-react';

export interface RepackRecordForBatch {
  id: string;
  recordNumber: string;
  subLotNumber: string;
  unitsPerPack: number;
  totalPacksProduced: number;
  packedDate: string | Date;
  sterileExpiryDate?: string | Date | null;
  sterilizeMethod?: string | null;
  sourceItem?: {
    name: string;
    code: string;
    unit: string;
    usageUnit?: string | null;
  } | null;
  targetItem?: {
    name: string;
    code: string;
    unit: string;
  } | null;
  operator?: {
    name: string;
  } | null;
  packItems?: Array<{
    id: string;
    packCode: string;
    packNumber: number;
    unitsCount: number;
    status: string; // "AVAILABLE", "DISPENSED", "EXPIRED", "DAMAGED"
  }>;
}

interface BatchRepackStickerModalProps {
  records: RepackRecordForBatch[];
  onClose: () => void;
}

export default function BatchRepackStickerModal({
  records,
  onClose,
}: BatchRepackStickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);
  const [showDispensed, setShowDispensed] = useState(false);
  const [includeLotStickers, setIncludeLotStickers] = useState(true);
  const [labelSize, setLabelSize] = useState<'compact' | 'mini'>('compact');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  // Get effective packs for a record
  const getRecordPacks = (rec: RepackRecordForBatch) => {
    if (rec.packItems && rec.packItems.length > 0) {
      return rec.packItems;
    }
    return Array.from({ length: rec.totalPacksProduced }).map((_, idx) => ({
      id: `${rec.id}-p${idx + 1}`,
      packNumber: idx + 1,
      packCode: `${rec.subLotNumber}-P${String(idx + 1).padStart(2, '0')}`,
      unitsCount: rec.unitsPerPack,
      status: 'AVAILABLE',
    }));
  };

  // Selected pack codes (Default: all AVAILABLE packs across all records)
  const [selectedPackCodes, setSelectedPackCodes] = useState<string[]>(() => {
    const codes: string[] = [];
    records.forEach((rec) => {
      const packs = rec.packItems && rec.packItems.length > 0
        ? rec.packItems
        : Array.from({ length: rec.totalPacksProduced }).map((_, idx) => ({
            packCode: `${rec.subLotNumber}-P${String(idx + 1).padStart(2, '0')}`,
            status: 'AVAILABLE',
          }));
      packs.forEach((p) => {
        if (p.status !== 'DISPENSED') {
          codes.push(p.packCode);
        }
      });
    });
    return codes;
  });

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.subLotNumber.toLowerCase().includes(q) ||
        r.recordNumber.toLowerCase().includes(q) ||
        (r.targetItem?.name && r.targetItem.name.toLowerCase().includes(q)) ||
        (r.sourceItem?.name && r.sourceItem.name.toLowerCase().includes(q)) ||
        (r.targetItem?.code && r.targetItem.code.toLowerCase().includes(q)) ||
        (r.sourceItem?.code && r.sourceItem.code.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  // Toggle record expand
  const toggleExpand = (id: string) => {
    setExpandedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  // Toggle record all packs
  const toggleRecordPacks = (rec: RepackRecordForBatch) => {
    const packs = getRecordPacks(rec);
    const validPacks = packs.filter((p) => (showDispensed ? true : p.status !== 'DISPENSED'));
    const recPackCodes = validPacks.map((p) => p.packCode);

    const allSelected = recPackCodes.every((c) => selectedPackCodes.includes(c));
    if (allSelected) {
      setSelectedPackCodes((prev) => prev.filter((c) => !recPackCodes.includes(c)));
    } else {
      setSelectedPackCodes((prev) => Array.from(new Set([...prev, ...recPackCodes])));
    }
  };

  // Toggle individual pack
  const togglePack = (code: string) => {
    setSelectedPackCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Select all / Deselect all
  const selectAll = () => {
    const allCodes: string[] = [];
    filteredRecords.forEach((rec) => {
      const packs = getRecordPacks(rec);
      packs.forEach((p) => {
        if (showDispensed || p.status !== 'DISPENSED') {
          allCodes.push(p.packCode);
        }
      });
    });
    setSelectedPackCodes(allCodes);
  };

  const deselectAll = () => {
    setSelectedPackCodes([]);
  };

  // Printable statistics
  const printableStats = useMemo(() => {
    let totalPacks = 0;
    let totalLots = 0;

    records.forEach((rec) => {
      const packs = getRecordPacks(rec);
      const selectedInRec = packs.filter((p) => selectedPackCodes.includes(p.packCode));
      if (selectedInRec.length > 0) {
        totalPacks += selectedInRec.length;
        totalLots += 1;
      }
    });

    return {
      totalPacks,
      totalLots,
      totalStickers: totalPacks + (includeLotStickers ? totalLots : 0),
    };
  }, [records, selectedPackCodes, includeLotStickers]);

  // Print Handler
  const handlePrint = async () => {
    if (printableStats.totalPacks === 0) {
      alert('กรุณาเลือกซองเวชภัณฑ์อย่างน้อย 1 ซองเพื่อพิมพ์สติกเกอร์');
      return;
    }

    setIsGenerating(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrs: Record<string, string> = { ...qrCache };

      // Collect QR payloads to generate
      const payloadsToGen: string[] = [];

      records.forEach((rec) => {
        const packs = getRecordPacks(rec);
        const selectedInRec = packs.filter((p) => selectedPackCodes.includes(p.packCode));
        if (selectedInRec.length > 0) {
          if (includeLotStickers) {
            const lotPayload = `${origin}/consumable/${encodeURIComponent(rec.subLotNumber)}`;
            if (!qrs[lotPayload]) payloadsToGen.push(lotPayload);
          }
          selectedInRec.forEach((p) => {
            const packPayload = `${origin}/consumable/${encodeURIComponent(p.packCode)}`;
            if (!qrs[packPayload]) payloadsToGen.push(packPayload);
          });
        }
      });

      // Batch generate QRs
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

      for (const rec of records) {
        const packs = getRecordPacks(rec);
        const selectedInRec = packs.filter((p) => selectedPackCodes.includes(p.packCode));
        if (selectedInRec.length === 0) continue;

        const itemName = rec.targetItem?.name || rec.sourceItem?.name || 'เวชภัณฑ์ปลอดเชื้อ';
        const itemCode = rec.targetItem?.code || rec.sourceItem?.code || '-';
        const usageUnit = rec.sourceItem?.usageUnit || 'ชิ้น';
        const totalPacksInLot = rec.totalPacksProduced || packs.length;
        const formattedPacked = rec.packedDate
          ? new Date(rec.packedDate).toLocaleDateString('th-TH')
          : '-';
        const formattedExpiry = rec.sterileExpiryDate
          ? new Date(rec.sterileExpiryDate).toLocaleDateString('th-TH')
          : 'ไม่ระบุ';

        // 1. Prepend Sub-lot Header Label if enabled
        if (includeLotStickers) {
          const lotQr = qrs[`${origin}/consumable/${encodeURIComponent(rec.subLotNumber)}`] || '';

          if (labelSize === 'mini') {
            cardsHtml += `
              <div class="box-card-mini lot-header-card-mini">
                <img src="${lotQr}" class="box-qr-mini" />
                <div class="box-info-mini">
                  <div class="lot-header-badge-mini">🏷️ ป้ายประจำ Sub-lot (${totalPacksInLot} ซอง)</div>
                  <div class="box-title-mini">${itemName}</div>
                  <div class="box-num-mini font-mono">SUB-LOT: ${rec.subLotNumber}</div>
                  <div class="box-dates-mini">ซองละ ${rec.unitsPerPack} ${usageUnit} | <span class="box-exp">EXP: ${formattedExpiry}</span></div>
                </div>
              </div>
            `;
          } else {
            cardsHtml += `
              <div class="box-card-compact lot-header-card-compact">
                <div class="box-header-compact lot-banner-compact">
                  <span class="box-org-text">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</span>
                  <span class="box-org-sub lot-sub-badge">🏷️ ป้ายประจำ Sub-lot</span>
                </div>
                <div class="box-body-compact">
                  <img src="${lotQr}" class="box-qr-compact" />
                  <div class="box-info-compact">
                    <div class="box-title-compact">${itemName}</div>
                    <div class="box-num-compact font-mono">SUB-LOT: ${rec.subLotNumber}</div>
                    <div class="box-code-compact">รวม ${totalPacksInLot} ซอง (ซองละ ${rec.unitsPerPack} ${usageUnit}) • รหัส: ${itemCode}</div>
                    <div class="box-dates-compact"><span class="box-exp">EXP ปลอดเชื้อ: ${formattedExpiry}</span> (อบ ${formattedPacked})</div>
                  </div>
                </div>
              </div>
            `;
          }
        }

        // 2. Print all selected Pack cards for this Sub-lot
        for (const pack of selectedInRec) {
          const packQr = qrs[`${origin}/consumable/${encodeURIComponent(pack.packCode)}`] || '';
          const packUnits = pack.unitsCount || rec.unitsPerPack;

          if (labelSize === 'mini') {
            cardsHtml += `
              <div class="box-card-mini">
                <img src="${packQr}" class="box-qr-mini" />
                <div class="box-info-mini">
                  <div class="box-title-mini">${itemName}</div>
                  <div class="box-num-mini">👉 ซองที่ #${pack.packNumber}/${totalPacksInLot} (${packUnits} ${usageUnit})</div>
                  <div class="box-code-mini">Lot: ${rec.subLotNumber} • ${pack.packCode}</div>
                  <div class="box-dates-mini"><span class="box-exp">EXP: ${formattedExpiry}</span> (อบ ${formattedPacked})</div>
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
                  <img src="${packQr}" class="box-qr-compact" />
                  <div class="box-info-compact">
                    <div class="box-title-compact">${itemName}</div>
                    <div class="box-num-compact">👉 ซองที่ #${pack.packNumber}/${totalPacksInLot} (${packUnits} ${usageUnit})</div>
                    <div class="box-code-compact">Lot: ${rec.subLotNumber} • ${pack.packCode}</div>
                    <div class="box-dates-compact"><span class="box-exp">EXP ปลอดเชื้อ: ${formattedExpiry}</span> (อบ ${formattedPacked})</div>
                  </div>
                </div>
              </div>
            `;
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
            <title>พิมพ์สติกเกอร์ซองแบ่งบรรจุหลายรายการ - คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</title>
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
      console.error('Error printing repack stickers:', err);
      alert('เกิดข้อผิดพลาดในการพิมพ์สติกเกอร์ซองย่อย');
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
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                พิมพ์สติกเกอร์ซองแบ่งบรรจุทีละหลายรายการ (Batch Repack Stickers)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกหลาย Sub-lot พร้อมกัน พิมพ์ซองย่อยต่อเนื่องพร้อมตัวเลือกป้ายประจำ Sub-lot
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
              placeholder="ค้นหาชื่อเวชภัณฑ์, รหัส Sub-lot, เลขที่บันทึก..."
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
            <span>พิมพ์ป้ายประจำ Sub-lot ด้วย</span>
          </label>

          {/* Show Dispensed Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition">
            <input
              type="checkbox"
              checked={showDispensed}
              onChange={(e) => setShowDispensed(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <span>รวมซองที่เบิกจ่ายแล้ว</span>
          </label>
        </div>

        {/* Selection summary & quick actions */}
        <div className="py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              เลือกแล้ว: <strong className="text-teal-600 dark:text-teal-400 font-bold">{printableStats.totalPacks}</strong> ซอง
              {includeLotStickers && (
                <> + ป้าย Sub-lot <strong className="text-teal-600 dark:text-teal-400 font-bold">{printableStats.totalLots}</strong> ใบ</>
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

        {/* Records List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              ไม่พบรายการแบ่งบรรจุย่อยที่ตรงกับคำค้นหา
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const packs = getRecordPacks(rec);
              const validPacks = packs.filter((p) => (showDispensed ? true : p.status !== 'DISPENSED'));
              const selectedCount = validPacks.filter((p) => selectedPackCodes.includes(p.packCode)).length;
              const isAllSelected = validPacks.length > 0 && selectedCount === validPacks.length;
              const isPartiallySelected = selectedCount > 0 && selectedCount < validPacks.length;
              const isExpanded = expandedRecordIds.includes(rec.id);
              const itemName = rec.targetItem?.name || rec.sourceItem?.name || 'เวชภัณฑ์';
              const usageUnit = rec.sourceItem?.usageUnit || 'ชิ้น';

              return (
                <div key={rec.id} className="pt-3 first:pt-0">
                  {/* Record Row */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleRecordPacks(rec)}
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

                      <div className="flex-1 min-w-0" onClick={() => toggleExpand(rec.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {itemName}
                          </span>
                          <span className="font-mono text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.2 rounded font-semibold">
                            {rec.subLotNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>ซองละ {rec.unitsPerPack} {usageUnit}</span>
                          <span>•</span>
                          <span>
                            เลือก {selectedCount} จาก {validPacks.length} ซอง
                          </span>
                          <span>•</span>
                          <span className="text-rose-500">
                            EXP: {rec.sterileExpiryDate ? new Date(rec.sterileExpiryDate).toLocaleDateString('th-TH') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Packs Grid */}
                  {isExpanded && (
                    <div className="ml-8 mt-2 space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                        {validPacks.map((pack) => {
                          const isPackSelected = selectedPackCodes.includes(pack.packCode);
                          const isDispensed = pack.status === 'DISPENSED';

                          return (
                            <button
                              key={pack.packCode}
                              onClick={() => togglePack(pack.packCode)}
                              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer relative ${
                                isPackSelected
                                  ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-700 dark:text-teal-300'
                                  : isDispensed
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-400'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                              }`}
                              title={isDispensed ? 'ซองนี้ถูกเบิกจ่ายแล้ว' : `ซอง #${pack.packNumber}`}
                            >
                              #{pack.packNumber}
                              {isDispensed && (
                                <span className="block text-[8px] text-rose-500 font-normal">เบิกแล้ว</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
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
            พิมพ์จัดเรียงเรียบร้อย: ตามลำดับ Sub-lot A ซอง 1..N แล้วต่อด้วย Sub-lot B ซอง 1..M
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
              disabled={isGenerating || printableStats.totalPacks === 0}
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
