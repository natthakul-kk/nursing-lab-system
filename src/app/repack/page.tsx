'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/lib/auth-context';
import {
  PackageCheck,
  Plus,
  Search,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scissors,
  Flame,
  Tag,
  X,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Boxes,
  QrCode,
  Info,
  ListOrdered,
  CheckCircle,
  Hash,
  Eye
} from 'lucide-react';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function RepackPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const isStaff = isOfficer || isAdmin;

  const [records, setRecords] = useState<any[]>([]);
  const [consumableItems, setConsumableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Repack Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    sourceItemId: '',
    sourceLotId: '',
    sourceQtyUsed: 1,
    customUsageUnit: '',
    customRatio: 50,
    subLotNumber: '',
    unitsPerPack: 10,
    totalPacksProduced: 10,
    packedDate: new Date().toISOString().split('T')[0],
    sterileExpiryDate: '',
    sterilizeMethod: 'Autoclave ไอน้ำแรงดันสูง (121°C)',
    note: '',
    targetOption: 'auto', // 'auto' | 'existing'
    targetItemId: '',
    targetItemName: '',
    targetItemCode: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // View Pack Items Modal
  const [selectedRecordForPacks, setSelectedRecordForPacks] = useState<any | null>(null);

  // Print Label Modal
  const [selectedRecordForLabel, setSelectedRecordForLabel] = useState<any | null>(null);
  const [printMode, setPrintMode] = useState<'all_packs' | 'lot_summary' | 'single_pack'>('all_packs');
  const [selectedPackForSinglePrint, setSelectedPackForSinglePrint] = useState<any | null>(null);
  const [labelQrs, setLabelQrs] = useState<{ [key: string]: string }>({});
  const [previewQrModal, setPreviewQrModal] = useState<{ code: string; name: string; qrUrl: string } | null>(null);
  const [labelSize, setLabelSize] = useState<'compact' | 'mini'>('compact');
  const [includeLotSticker, setIncludeLotSticker] = useState(true);

  useEffect(() => {
    if (!selectedRecordForLabel) return;
    async function genPackQrs() {
      const qrs: { [key: string]: string } = {};
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      if (selectedRecordForLabel.subLotNumber) {
        try {
          const payload = `${origin}/consumable/${encodeURIComponent(selectedRecordForLabel.subLotNumber)}`;
          qrs[selectedRecordForLabel.subLotNumber] = await QRCode.toDataURL(payload, {
            width: 360,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
          });
        } catch (e) {}
      }

      const packs = selectedRecordForLabel.packItems && selectedRecordForLabel.packItems.length > 0
        ? selectedRecordForLabel.packItems
        : Array.from({ length: selectedRecordForLabel.totalPacksProduced }).map((_, idx) => ({
            packCode: `${selectedRecordForLabel.subLotNumber}-P${String(idx + 1).padStart(2, '0')}`,
          }));

      for (const p of packs) {
        if (p.packCode) {
          try {
            const payload = `${origin}/consumable/${encodeURIComponent(p.packCode)}`;
            qrs[p.packCode] = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#ffffff' }
            });
          } catch (e) {}
        }
      }
      setLabelQrs(qrs);
    }
    genPackQrs();
  }, [selectedRecordForLabel]);

  // Handle Dedicated Print Popup for Repack Stickers
  const handlePrint = () => {
    if (!selectedRecordForLabel) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตป๊อปอัป');
      return;
    }

    const rec = selectedRecordForLabel;
    const itemName = rec.targetItem?.name || rec.sourceItem?.name || 'เวชภัณฑ์ปลอดเชื้อ';
    const itemCode = rec.targetItem?.code || rec.sourceItem?.code || '-';
    const usageUnit = rec.sourceItem?.usageUnit || 'ชิ้น';
    const totalPacks = rec.packItems?.length || rec.totalPacksProduced || 1;
    const formattedPacked = rec.packedDate ? new Date(rec.packedDate).toLocaleDateString('th-TH') : '-';
    const formattedExpiry = rec.sterileExpiryDate ? new Date(rec.sterileExpiryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ';

    let cardsHtml = '';
    let pageCss = '';

    const packsToPrint = printMode === 'single_pack' && selectedPackForSinglePrint
      ? [selectedPackForSinglePrint]
      : printMode === 'all_packs'
      ? (rec.packItems && rec.packItems.length > 0
          ? rec.packItems
          : Array.from({ length: totalPacks }).map((_, idx) => ({
              packNumber: idx + 1,
              packCode: `${rec.subLotNumber}-P${String(idx + 1).padStart(2, '0')}`,
              unitsCount: rec.unitsPerPack,
            }))
        )
      : [];

    // Prepend Sub-lot Header Label if lot_summary or all_packs with includeLotSticker
    if (printMode === 'lot_summary' || (printMode === 'all_packs' && includeLotSticker)) {
      const lotQr = labelQrs[rec.subLotNumber] || '';
      if (labelSize === 'mini') {
        cardsHtml += `
          <div class="box-card-mini lot-header-card-mini">
            <img src="${lotQr}" class="box-qr-mini" />
            <div class="box-info-mini">
              <div class="lot-header-badge-mini">🏷️ ป้ายประจำ Sub-lot (${totalPacks} ซอง)</div>
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
                <div class="box-code-compact">รวม ${totalPacks} ซอง (ซองละ ${rec.unitsPerPack} ${usageUnit}) • รหัส: ${itemCode}</div>
                <div class="box-dates-compact"><span class="box-exp">EXP ปลอดเชื้อ: ${formattedExpiry}</span> (อบ ${formattedPacked})</div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Print pack cards
    if (printMode !== 'lot_summary') {
      packsToPrint.forEach((pack: any) => {
        const packQr = labelQrs[pack.packCode] || '';
        const packNum = pack.packNumber || 1;
        const packUnits = pack.unitsCount || rec.unitsPerPack;

        if (labelSize === 'mini') {
          cardsHtml += `
            <div class="box-card-mini">
              <img src="${packQr}" class="box-qr-mini" />
              <div class="box-info-mini">
                <div class="box-title-mini">${itemName}</div>
                <div class="box-num-mini">👉 ซองที่ #${packNum}/${totalPacks} (${packUnits} ${usageUnit})</div>
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
                  <div class="box-num-compact">👉 ซองที่ #${packNum}/${totalPacks} (${packUnits} ${usageUnit})</div>
                  <div class="box-code-compact">Lot: ${rec.subLotNumber} • ${pack.packCode}</div>
                  <div class="box-dates-compact"><span class="box-exp">EXP ปลอดเชื้อ: ${formattedExpiry}</span> (อบ ${formattedPacked})</div>
                </div>
              </div>
            </div>
          `;
        }
      });
    }

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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>พิมพ์สติกเกอร์ซองแบ่งบรรจุ - คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</title>
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
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repack');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setConsumableItems(data.consumableItems || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // กรองเฉพาะเวชภัณฑ์ต้นทางของโรงงาน (ตัดของแบ่งบรรจุแล้ว และตัดล็อต SL ออก)
  const sourceAvailableItems = consumableItems.filter(
    (item) =>
      !item.code.startsWith('RP-') &&
      item.unit !== 'ซอง' &&
      item.stockLots &&
      item.stockLots.some((lot: any) => !lot.lotNumber.startsWith('SL-') && !lot.lotNumber.startsWith('RP-'))
  );

  // Selected Source Item & Lot object
  const selectedSourceItem = consumableItems.find((i) => i.id === form.sourceItemId);
  const selectedSourceLot = selectedSourceItem?.stockLots?.find(
    (l: any) => l.id === form.sourceLotId && !l.lotNumber.startsWith('SL-') && !l.lotNumber.startsWith('RP-')
  );

  // When source item changes, select first lot and suggest sublot
  const handleSourceItemChange = (itemId: string) => {
    const item = consumableItems.find((i) => i.id === itemId);
    const validLots = (item?.stockLots || []).filter(
      (l: any) => !l.lotNumber.startsWith('SL-') && !l.lotNumber.startsWith('RP-')
    );
    const firstLot = validLots[0];
    const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const baseSubLotPrefix = 'SL-' + (item?.code || 'MED') + '-' + todayStr;
    const existingForToday = records.filter(
      (r) => r.subLotNumber && r.subLotNumber.startsWith(baseSubLotPrefix)
    );
    const nextIndex = existingForToday.length + 1;
    const suggestedSubLot = `${baseSubLotPrefix}-${String(nextIndex).padStart(2, '0')}`;

    // Default sterile expiry: 3 months from now
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const defaultSterileExpiry = threeMonths.toISOString().split('T')[0];

    const defaultRatio = firstLot?.packSize || item?.conversionRatio || 50;
    const defaultUsageUnit = item?.usageUnit || 'คู่';
    const suggestedUnitsPerPack = Math.max(1, Math.round(defaultRatio / 10) || 2);
    const suggestedTotalPacks = Math.max(1, Math.floor(defaultRatio / suggestedUnitsPerPack));
    const suggestedTargetCode = `RP-${item?.code || 'MED'}-${suggestedUnitsPerPack}`;
    const suggestedTargetName = `${item?.name || 'เวชภัณฑ์'} (ซองละ ${suggestedUnitsPerPack} ${defaultUsageUnit} ปลอดเชื้อ)`;

    setForm((prev) => ({
      ...prev,
      sourceItemId: itemId,
      sourceLotId: firstLot?.id || '',
      sourceQtyUsed: 1,
      customUsageUnit: defaultUsageUnit,
      customRatio: defaultRatio,
      unitsPerPack: suggestedUnitsPerPack,
      totalPacksProduced: suggestedTotalPacks,
      subLotNumber: suggestedSubLot,
      sterileExpiryDate: defaultSterileExpiry,
      targetOption: 'auto',
      targetItemId: '',
      targetItemName: suggestedTargetName,
      targetItemCode: suggestedTargetCode,
    }));
  };

  // Auto calculate total packs produced using dynamic customRatio
  const handleCalcPacks = (qtyUsed: number, unitsPerPack: number, ratioOverride?: number, usageUnitOverride?: string) => {
    const ratio = ratioOverride !== undefined ? ratioOverride : (form.customRatio || selectedSourceItem?.conversionRatio || 50);
    const uUnit = usageUnitOverride !== undefined ? usageUnitOverride : (form.customUsageUnit || selectedSourceItem?.usageUnit || 'ชิ้น');
    const totalUnits = qtyUsed * ratio;
    const produced = unitsPerPack > 0 ? Math.floor(totalUnits / unitsPerPack) : 1;
    const suggestedTargetCode = `RP-${selectedSourceItem?.code || 'MED'}-${unitsPerPack}`;
    const suggestedTargetName = `${selectedSourceItem?.name || 'เวชภัณฑ์'} (ซองละ ${unitsPerPack} ${uUnit} ปลอดเชื้อ)`;

    setForm((prev) => ({
      ...prev,
      sourceQtyUsed: qtyUsed,
      unitsPerPack,
      customRatio: ratio,
      customUsageUnit: uUnit,
      totalPacksProduced: produced > 0 ? produced : 1,
      targetItemCode: prev.targetOption === 'auto' ? suggestedTargetCode : prev.targetItemCode,
      targetItemName: prev.targetOption === 'auto' ? suggestedTargetName : prev.targetItemName,
    }));
  };

  const handleSubmitRepack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !form.sourceItemId || !form.sourceLotId) {
      alert('กรุณาเลือกรายการเวชภัณฑ์และล็อตที่นำมาแบ่งแพ็ค');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/repack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          operatorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('บันทึกการแบ่งบรรจุย่อยสำเร็จ! ล็อตย่อย: ' + data.record?.subLotNumber + ' พร้อมสร้างรหัสซอง 1 ถึง ' + (data.record?.packItems?.length || form.totalPacksProduced) + ' เรียบร้อย');
        setShowModal(false);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const term = searchQuery.toLowerCase();
    return (
      r.recordNumber.toLowerCase().includes(term) ||
      r.subLotNumber.toLowerCase().includes(term) ||
      r.sourceItem?.name.toLowerCase().includes(term) ||
      r.sourceLot?.lotNumber.toLowerCase().includes(term) ||
      r.operator?.name.toLowerCase().includes(term) ||
      (r.packItems && r.packItems.some((p: any) => p.packCode.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-teal-600" />
            งานแบ่งบรรจุเวชภัณฑ์ & สเตอร์ไรด์ (Repacking & Sterilization)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            จัดการเบิกเวชภัณฑ์ห่อใหญ่มาแบ่งเป็นซองย่อย กำหนด Sub-lot อบฆ่าเชื้อ ติดตามรายซอง (Pack 1..N) และพิมพ์สติกเกอร์ฉลาก
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isStaff && (
            <button
              onClick={() => {
                const initialItem = sourceAvailableItems[0] || consumableItems[0];
                if (initialItem) {
                  handleSourceItemChange(initialItem.id);
                }
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              <span>บันทึกการแบ่งบรรจุใหม่ (+ Repack)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>บันทึกการแบ่งบรรจุทั้งหมด</span>
            <PackageCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {records.length}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รอบ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>ซองย่อยที่ผลิตได้รวม</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {records.reduce((sum, r) => sum + (r.totalPacksProduced || 0), 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ซองย่อย</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>เวชภัณฑ์ที่พร้อมนำมาแพ็ค</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {consumableItems.length}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>มาตรฐานการสเตอร์ไรด์</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
            Autoclave 121°C / ETO
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">ปราศจากเชื้อตามมาตรฐาน CSSD</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 print:hidden">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่บันทึก, รหัส Sub-lot, รหัสซองย่อย, ชื่อเวชภัณฑ์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Repack History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden print:border-slate-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">รหัสบันทึก / วันที่แพ็ค</th>
                <th className="py-3 px-4">เวชภัณฑ์ต้นทาง</th>
                <th className="py-3 px-4">ล็อตโรงงานเดิม (Source Lot)</th>
                <th className="py-3 px-4">รหัส Sub-lot ใหม่ของแล็บ</th>
                <th className="py-3 px-4 text-center">ขนาดบรรจุ</th>
                <th className="py-3 px-4 text-center">จำนวนซองย่อย</th>
                <th className="py-3 px-4">วันหมดอายุสเตอร์ไรด์</th>
                <th className="py-3 px-4">ผู้บันทึก / วิธีการ</th>
                <th className="py-3 px-4 text-right print:hidden">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableLoadingRow colSpan={10} message="กำลังโหลดประวัติการแบ่งบรรจุเวชภัณฑ์..." />
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>ยังไม่มีประวัติการแบ่งบรรจุเวชภัณฑ์ในระบบ</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold font-mono text-slate-900 text-xs">{r.recordNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(r.packedDate).toLocaleDateString('th-TH')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{r.sourceItem?.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-semibold">
                          {r.sourceItem?.code}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (หน่วย: {r.sourceItem?.unit})
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {r.targetItem ? (
                        <div>
                          <div className="font-bold text-teal-900 text-xs">{r.targetItem.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                              {r.targetItem.code}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">
                              (หน่วย: {r.targetItem.unit})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-xs italic">
                          {r.sourceItem?.name} (ซองย่อย)
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {r.sourceLot?.lotNumber}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        เบิก: <b className="text-slate-800">{r.sourceQtyUsed}</b> {r.sourceItem?.unit}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {r.subLotNumber}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                      {r.unitsPerPack} {r.sourceItem?.usageUnit || 'ชิ้น'}/ซอง
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-sm">
                          {r.totalPacksProduced}
                        </span>{' '}
                        <span className="text-slate-400 text-xs">ซอง</span>
                      </div>
                      {r.packItems && r.packItems.length > 0 && (
                        <div className="mt-1">
                          <button
                            onClick={() => setSelectedRecordForPacks(r)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200/60 transition cursor-pointer"
                          >
                            <ListOrdered className="w-3 h-3" />
                            <span>ดูซอง 1-{r.packItems.length}</span>
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {r.sterileExpiryDate ? (
                        <div className="font-semibold text-emerald-700 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>{new Date(r.sterileExpiryDate).toLocaleDateString('th-TH')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">ตามวันหมดอายุเดิม</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-800 font-medium">{r.operator?.name}</div>
                      <div className="text-[10px] text-slate-400">{r.sterilizeMethod}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        {r.packItems && r.packItems.length > 0 && (
                          <button
                            onClick={() => setSelectedRecordForPacks(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-bold transition text-[11px] text-slate-700 cursor-pointer"
                            title="ดูรายซองย่อย"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>รายซอง</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedRecordForLabel(r);
                            setPrintMode('all_packs');
                            setSelectedPackForSinglePrint(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 font-bold transition text-[11px] cursor-pointer"
                          title="พิมพ์สติกเกอร์ฉลากซองสเตอร์ไรด์"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์ฉลาก</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: VIEW INDIVIDUAL PACK ITEMS (รายซองย่อย 1..N) */}
      {/* ========================================================================= */}
      {selectedRecordForPacks && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                    <span>รายการซองย่อยในล็อต</span>
                    <span className="font-mono text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {selectedRecordForPacks.subLotNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedRecordForPacks.sourceItem?.name} | ผลิตได้ทั้งหมด {selectedRecordForPacks.totalPacksProduced} ซอง (ซองละ {selectedRecordForPacks.unitsPerPack} {selectedRecordForPacks.sourceItem?.usageUnit || 'ชิ้น'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForPacks(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: List of Packs */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const nextPackNumber = selectedRecordForPacks.packItems?.find((p: any) => p.status === 'AVAILABLE')?.packNumber;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedRecordForPacks.packItems && selectedRecordForPacks.packItems.length > 0 ? (
                      selectedRecordForPacks.packItems.map((pack: any) => {
                        const isNext = pack.packNumber === nextPackNumber;
                        return (
                          <div
                            key={pack.id || pack.packNumber}
                            className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                              isNext
                                ? 'border-amber-400 bg-amber-50/40 shadow-sm'
                                : pack.status === 'AVAILABLE'
                                ? 'border-slate-200/80 bg-white hover:border-teal-300'
                                : 'border-slate-200 bg-slate-50/60 opacity-80'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center font-mono ${
                                  isNext ? 'bg-amber-500' : pack.status === 'AVAILABLE' ? 'bg-teal-600' : 'bg-slate-400'
                                }`}>
                                  #{pack.packNumber}
                                </span>
                                <span className="font-mono font-black text-slate-900 text-xs">
                                  {pack.packCode}
                                </span>
                                {isNext && (
                                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                    คิวถัดไป
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 pl-7">
                                บรรจุ: <b>{pack.unitsCount || selectedRecordForPacks.unitsPerPack}</b> {selectedRecordForPacks.sourceItem?.usageUnit || 'ชิ้น'}
                              </div>
                              {pack.status === 'DISPENSED' && pack.dispensedTo && (
                                <div className="text-[10px] text-slate-600 pl-7">
                                  เบิกโดย: <strong className="text-slate-800">{pack.dispensedTo}</strong>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  pack.status === 'AVAILABLE'
                                    ? isNext
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {pack.status === 'AVAILABLE' ? (isNext ? '👉 พร้อมจ่าย' : 'พร้อมใช้') : 'เบิกแล้ว'}
                              </span>
                        <a
                          href={`/consumable/${encodeURIComponent(pack.packCode)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer text-slate-500"
                          title="ดูหน้ารายละเอียดสาธารณะ (หน้าเดียวกับตอนสแกน QR)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            setSelectedRecordForLabel(selectedRecordForPacks);
                            setSelectedPackForSinglePrint(pack);
                            setPrintMode('single_pack');
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer text-slate-600"
                          title="พิมพ์ฉลากเฉพาะซองนี้"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                            </div>
                          </div>
                        );
                      })
                ) : (
                  <div className="col-span-2 py-8 text-center text-slate-400">
                    ไม่มีรายการซองย่อยที่ถูกสร้างสำหรับบันทึกนี้
                  </div>
                )}
              </div>
            );
          })()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                รวมทั้งหมด <b>{selectedRecordForPacks.packItems?.length || 0}</b> ซองย่อย
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedRecordForLabel(selectedRecordForPacks);
                    setPrintMode('all_packs');
                    setSelectedPackForSinglePrint(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์สติกเกอร์ครบทุกซอง (1..{selectedRecordForPacks.packItems?.length || selectedRecordForPacks.totalPacksProduced})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW REPACK FORM */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    บันทึกการแบ่งบรรจุเวชภัณฑ์ย่อย (Sub-packaging & Sterilization)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เบิกจากห่อใหญ่/ถุงใหญ่ ตัดสต็อกเดิม และสร้าง Sub-lot ปราศจากเชื้อใหม่พร้อมสร้างรหัสรายซองอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRepack} className="space-y-4 flex-1">
              {/* Box 1: เลือกของที่จะเบิก */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    เลือกเวชภัณฑ์ที่ต้องการนำมาแบ่งบรรจุ (ของโรงงาน/ห่อใหญ่)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รายการเวชภัณฑ์ *
                    </label>
                    <select
                      value={form.sourceItemId}
                      onChange={(e) => handleSourceItemChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                      required
                    >
                      <option value="">-- เลือกเวชภัณฑ์ที่มีในสต็อก --</option>
                      {sourceAvailableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      เลือกล็อตเดิมของโรงงาน *
                    </label>
                    <select
                      value={form.sourceLotId}
                      onChange={(e) => {
                        const newLotId = e.target.value;
                        const targetLot = selectedSourceItem?.stockLots?.find((l: any) => l.id === newLotId);
                        const lotRatio = targetLot?.packSize || form.customRatio || selectedSourceItem?.conversionRatio || 50;
                        setForm((prev) => ({
                          ...prev,
                          sourceLotId: newLotId,
                          customRatio: lotRatio,
                        }));
                        handleCalcPacks(form.sourceQtyUsed, form.unitsPerPack, lotRatio);
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                      required
                      disabled={!selectedSourceItem}
                    >
                      {selectedSourceItem?.stockLots?.filter((l: any) => !l.lotNumber.startsWith('SL-') && !l.lotNumber.startsWith('RP-')).length ? (
                        selectedSourceItem.stockLots
                          .filter((l: any) => !l.lotNumber.startsWith('SL-') && !l.lotNumber.startsWith('RP-'))
                          .map((lot: any) => (
                            <option key={lot.id} value={lot.id}>
                              Lot: {lot.lotNumber}{lot.brand ? ` (${lot.brand})` : ''} - คงเหลือ {lot.quantityRemaining} {lot.packageUnit || selectedSourceItem.unit} (ห่อละ {lot.packSize || selectedSourceItem.conversionRatio || 1} {selectedSourceItem.usageUnit || 'ชิ้น'})
                            </option>
                          ))
                      ) : (
                        <option value="">ไม่มีสต็อกล็อตโรงงานคงเหลือ</option>
                      )}
                    </select>
                  </div>
                </div>

                {selectedSourceItem && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        คงเหลือในล็อตนี้: <b className="text-teal-700 font-black">{selectedSourceLot?.quantityRemaining || 0}</b> {selectedSourceItem.unit}
                      </span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        1 {selectedSourceItem.unit} = {form.customRatio} {form.customUsageUnit || selectedSourceItem.usageUnit || 'ชิ้น'}
                      </span>
                    </div>

                    {/* Pick Guidance for Boxes */}
                    {selectedSourceLot && (() => {
                      const recommendedBox =
                        selectedSourceLot.boxes?.find((b: any) => b.status === 'IN_USE') ||
                        selectedSourceLot.boxes?.find((b: any) => b.status === 'IN_STOCK');

                      if (!recommendedBox) return null;

                      return (
                        <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                              📦
                            </div>
                            <div>
                              <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                <span>💡 ระบบแนะนำให้หยิบ: <b>กล่องที่ {recommendedBox.boxNumberInLot}</b></span>
                                <span className="font-mono text-[11px] text-emerald-800 font-black">[{recommendedBox.boxCode}]</span>
                                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                                  กล่อง {recommendedBox.boxNumberInYear}/{recommendedBox.year}
                                </span>
                                {recommendedBox.status === 'IN_USE' && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                    เปิดใช้อยู่
                                  </span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-emerald-800 pt-0.5">
                                รับเข้า: {new Date(selectedSourceLot.receivedDate).toLocaleDateString('th-TH')} | หมดอายุ: {selectedSourceLot.expiryDate ? new Date(selectedSourceLot.expiryDate).toLocaleDateString('th-TH') : '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Box 2: กรอกจำนวนที่เบิก และขนาดซอง (คำนวณอัตโนมัติ) */}
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-3">
                <div className="text-xs font-bold text-teal-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    ระบุจำนวนที่เบิก และขนาดต่อ 1 ซอง
                  </span>
                  <span className="text-[11px] text-teal-700 font-medium">
                    ระบบคำนวณจำนวนซองให้ทันที
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-teal-100 dark:border-teal-900/60 shadow-sm">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. เบิกออกมากี่{selectedSourceItem?.unit || 'กล่อง'} ? *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={selectedSourceLot?.quantityRemaining || 9999}
                        value={form.sourceQtyUsed}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          handleCalcPacks(val, form.unitsPerPack);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-center text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500"
                        required
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap min-w-[3rem]">
                        {selectedSourceItem?.unit || 'กล่อง'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-teal-100 dark:border-teal-900/60 shadow-sm">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      2. แพ็คซองละกี่{form.customUsageUnit || selectedSourceItem?.usageUnit || 'คู่/ชิ้น'} ? *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={form.unitsPerPack}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          handleCalcPacks(form.sourceQtyUsed, val);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-center text-teal-800 dark:text-teal-300 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500"
                        required
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap min-w-[3rem]">
                        {form.customUsageUnit || selectedSourceItem?.usageUnit || 'คู่/ชิ้น'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live calculation banner */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-emerald-400/80 dark:border-emerald-600/80 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      รวมเนื้อเวชภัณฑ์ที่นำมาแพ็ค: <b className="text-slate-800">{form.sourceQtyUsed * (form.customRatio || 1)}</b> {form.customUsageUnit || selectedSourceItem?.usageUnit || 'หน่วย'}
                    </div>
                    <div className="text-xs font-bold text-emerald-900 mt-0.5">
                      ➡️ จะได้เวชภัณฑ์ปลอดเชื้อสำเร็จรูป:
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      {form.totalPacksProduced}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 ml-1">ซอง</span>
                  </div>
                </div>
              </div>

              {/* Box 3: สรุปข้อมูลรับเข้า & สเตอร์ไรด์ (ค่าเริ่มต้นพร้อมใช้ทันที ไม่ต้องกรอกเพิ่ม) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    การสเตอร์ไรด์และวันหมดอายุ
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (ระบบตั้งค่ามาตรฐานให้อัตโนมัติ ปรับเปลี่ยนได้หากต้องการ)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      วิธีทำให้ปราศจากเชื้อ
                    </label>
                    <select
                      value={form.sterilizeMethod}
                      onChange={(e) => setForm({ ...form, sterilizeMethod: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value="Autoclave ไอน้ำแรงดันสูง (121°C)">Autoclave ไอน้ำแรงดันสูง (121°C)</option>
                      <option value="ก๊าซเอทิลีนออกไซด์ (ETO Gas)">ก๊าซเอทิลีนออกไซด์ (ETO Gas)</option>
                      <option value="พลาสมาไฮโดรเจนเปอร์ออกไซด์ (Plasma)">พลาสมาไฮโดรเจนเปอร์ออกไซด์ (Plasma)</option>
                      <option value="บรรจุซองสะอาดพร้อมใช้ (Clean Pack / ไม่ต้องอบ)">บรรจุซองสะอาดพร้อมใช้ (Clean Pack / ไม่ต้องอบ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      วันที่แบ่งบรรจุ / อบ
                    </label>
                    <input
                      type="date"
                      value={form.packedDate}
                      onChange={(e) => setForm({ ...form, packedDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      วันหมดอายุความปลอดเชื้อ
                    </label>
                    <input
                      type="date"
                      value={form.sterileExpiryDate}
                      onChange={(e) => setForm({ ...form, sterileExpiryDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300"
                    />
                  </div>
                </div>

                {/* Sublot info note */}
                <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>
                    รหัส Sub-lot อัตโนมัติ: <b className="font-mono text-slate-800">{form.subLotNumber}</b>
                  </span>
                  <span>
                    ชื่อในทะเบียน: <b className="text-teal-800">{form.targetItemName || selectedSourceItem?.name}</b>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'กำลังบันทึก...' : 'ยืนยันการแบ่งบรรจุ (' + form.totalPacksProduced + ' ซอง)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT SUB-LOT STERILE LABELS (ครบทุกซองย่อย หรือ ล็อตรวม) */}
      {/* ========================================================================= */}
      {selectedRecordForLabel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    พิมพ์สติกเกอร์ฉลากซองเวชภัณฑ์ปราศจากเชื้อ (Sterile Label)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เลือกรูปแบบการพิมพ์สำหรับติดหน้าซองเวชภัณฑ์
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForLabel(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector & Size Toolbar */}
            <div className="space-y-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Mode Tabs */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold flex-1 min-w-[280px]">
                  <button
                    onClick={() => setPrintMode('all_packs')}
                    className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      printMode === 'all_packs'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>พิมพ์ครบทุกซอง ({selectedRecordForLabel.packItems?.length || selectedRecordForLabel.totalPacksProduced} ซอง)</span>
                  </button>
                  <button
                    onClick={() => setPrintMode('lot_summary')}
                    className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      printMode === 'lot_summary'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    <span>ฉลากสรุป Sub-lot (1 ใบ)</span>
                  </button>
                </div>

                {/* Label Size Selection */}
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
              </div>

              {/* Sub-lot Header Sticker Option (When all_packs) */}
              {printMode === 'all_packs' && (
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-200/80 dark:border-teal-800/60">
                    <input
                      type="checkbox"
                      checked={includeLotSticker}
                      onChange={(e) => setIncludeLotSticker(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span>พิมพ์ป้ายประจำ Sub-lot ด้วย (1 แผ่น นำหน้าซองย่อยทั้งหมด)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    รวมพิมพ์: <strong className="text-teal-700 dark:text-teal-400 font-bold">{(selectedRecordForLabel.packItems?.length || selectedRecordForLabel.totalPacksProduced) + (includeLotSticker ? 1 : 0)}</strong> ใบ
                  </span>
                </div>
              )}
            </div>

            {/* Printable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* MODE 1: ALL PACKS GRID */}
              {printMode === 'all_packs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
                  {(selectedRecordForLabel.packItems && selectedRecordForLabel.packItems.length > 0
                    ? selectedRecordForLabel.packItems
                    : Array.from({ length: selectedRecordForLabel.totalPacksProduced }).map((_, idx) => ({
                        packNumber: idx + 1,
                        packCode: `${selectedRecordForLabel.subLotNumber}-P${String(idx + 1).padStart(2, '0')}`,
                        unitsCount: selectedRecordForLabel.unitsPerPack,
                      }))
                  ).map((pack: any) => (
                    <div
                      key={pack.packCode || pack.packNumber}
                      className="border-2 border-dashed border-teal-500/40 bg-teal-50/20 p-2.5 rounded-2xl space-y-1.5 text-slate-900 print:border-slate-800 print:bg-white print:p-2 print:rounded-lg print:break-inside-avoid"
                    >
                      <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          คณะพยาบาลศาสตร์ แล็บปฏิบัติการ
                        </span>
                        <span className="font-mono font-black text-[10px] text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded">
                          ซองที่ {pack.packNumber}/{selectedRecordForLabel.totalPacksProduced}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {labelQrs[pack.packCode] ? (
                          <div
                            onClick={() =>
                              setPreviewQrModal({
                                code: pack.packCode,
                                name: selectedRecordForLabel.targetItem?.name || selectedRecordForLabel.sourceItem?.name || 'ซองเวชภัณฑ์',
                                qrUrl: labelQrs[pack.packCode],
                              })
                            }
                            className="relative group cursor-pointer flex-shrink-0"
                            title="คลิกเพื่อดู QR ขยายใหญ่สำหรับสแกนผ่านหน้าจอ"
                          >
                            <img
                              src={labelQrs[pack.packCode]}
                              alt={pack.packCode}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-slate-300 bg-white p-1 shadow-sm transition transform group-hover:scale-105 print:w-16 print:h-16 print:border-slate-800 print:shadow-none"
                              style={{ imageRendering: 'pixelated' }}
                            />
                            <div className="absolute inset-0 bg-teal-900/10 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition print:hidden">
                              <span className="bg-white/90 text-[9px] font-bold text-teal-800 px-1 py-0.5 rounded shadow">ขยาย</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                            QR...
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden space-y-0.5">
                          <div className="font-black text-slate-900 text-xs truncate">
                            {selectedRecordForLabel.targetItem?.name || selectedRecordForLabel.sourceItem?.name}
                          </div>
                          <div className="font-mono font-black text-teal-900 text-xs">
                            {pack.packCode}
                          </div>
                          <div className="text-[11px] font-bold text-slate-700">
                            บรรจุ {pack.unitsCount || selectedRecordForLabel.unitsPerPack} {selectedRecordForLabel.sourceItem?.usageUnit || 'ชิ้น'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[9.5px] text-slate-600 pt-1 border-t border-slate-200">
                        <div>
                          <span>อบ: </span>
                          <span className="font-medium">
                            {new Date(selectedRecordForLabel.packedDate).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <div>
                          <span>หมดอายุ: </span>
                          <span className="font-bold text-rose-600">
                            {selectedRecordForLabel.sterileExpiryDate
                              ? new Date(selectedRecordForLabel.sterileExpiryDate).toLocaleDateString('th-TH')
                              : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[8.5px] text-slate-400 flex justify-between pt-0.5">
                        <span className="truncate max-w-[120px]">วิธี: {selectedRecordForLabel.sterilizeMethod?.split(' ')[0]}</span>
                        <span className="truncate max-w-[100px]">ผู้เตรียม: {selectedRecordForLabel.operator?.name?.split(' ')[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MODE 2: LOT SUMMARY */}
              {printMode === 'lot_summary' && (
                <div className="border-2 border-dashed border-teal-500/40 bg-teal-50/30 p-5 rounded-2xl space-y-3 text-slate-900 print:border-slate-800 print:bg-white">
                  <div className="border-b border-slate-300 pb-2 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      คณะพยาบาลศาสตร์ - หน่วยจ่ายกลางและแล็บฝึกปฏิบัติการ
                    </div>
                    <div className="text-base font-black text-slate-900 mt-1">
                      {selectedRecordForLabel.targetItem?.name || selectedRecordForLabel.sourceItem?.name}
                    </div>
                    <div className="text-xs font-bold text-teal-800">
                      บรรจุซองละ {selectedRecordForLabel.unitsPerPack} {selectedRecordForLabel.sourceItem?.usageUnit || 'ชิ้น'} (รวม {selectedRecordForLabel.totalPacksProduced} ซอง)
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {labelQrs[selectedRecordForLabel.subLotNumber] ? (
                      <img
                        src={labelQrs[selectedRecordForLabel.subLotNumber]}
                        alt={selectedRecordForLabel.subLotNumber}
                        className="w-20 h-20 rounded-xl border border-slate-200 bg-white p-1 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                        สร้าง QR...
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs font-medium flex-1">
                      <div>
                        <span className="text-slate-500 text-[10px] block">รหัส Sub-lot:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedRecordForLabel.subLotNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">อ้างอิง Lot เดิม:</span>
                        <span className="font-mono text-slate-700">{selectedRecordForLabel.sourceLot?.lotNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">วันที่แพ็ค/อบ:</span>
                        <span>{new Date(selectedRecordForLabel.packedDate).toLocaleDateString('th-TH')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">วันหมดอายุสเตอร์ไรด์:</span>
                        <span className="font-bold text-rose-600">
                          {selectedRecordForLabel.sterileExpiryDate
                            ? new Date(selectedRecordForLabel.sterileExpiryDate).toLocaleDateString('th-TH')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                    <span>วิธี: {selectedRecordForLabel.sterilizeMethod}</span>
                    <span>ผู้เตรียม: {selectedRecordForLabel.operator?.name}</span>
                  </div>
                </div>
              )}

              {/* MODE 3: SINGLE PACK */}
              {printMode === 'single_pack' && selectedPackForSinglePrint && (
                <div className="max-w-sm mx-auto border-2 border-dashed border-teal-500/40 bg-teal-50/30 p-4 rounded-2xl space-y-2.5 text-slate-900 print:border-slate-800 print:bg-white">
                  <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      คณะพยาบาลศาสตร์ แล็บปฏิบัติการ
                    </span>
                    <span className="font-mono font-black text-xs text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      ซองที่ {selectedPackForSinglePrint.packNumber}/{selectedRecordForLabel.totalPacksProduced}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {labelQrs[selectedPackForSinglePrint.packCode] ? (
                      <div
                        onClick={() =>
                          setPreviewQrModal({
                            code: selectedPackForSinglePrint.packCode,
                            name: selectedRecordForLabel.targetItem?.name || selectedRecordForLabel.sourceItem?.name || 'ซองเวชภัณฑ์',
                            qrUrl: labelQrs[selectedPackForSinglePrint.packCode],
                          })
                        }
                        className="relative group cursor-pointer flex-shrink-0"
                        title="คลิกเพื่อดู QR ขยายใหญ่สำหรับสแกนผ่านหน้าจอ"
                      >
                        <img
                          src={labelQrs[selectedPackForSinglePrint.packCode]}
                          alt={selectedPackForSinglePrint.packCode}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-slate-300 bg-white p-1 shadow-sm transition transform group-hover:scale-105 print:w-16 print:h-16"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="absolute inset-0 bg-teal-900/10 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition print:hidden">
                          <span className="bg-white/90 text-[9px] font-bold text-teal-800 px-1 py-0.5 rounded shadow">ขยาย</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                        QR...
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden space-y-0.5">
                      <div className="font-black text-slate-900 text-sm truncate">
                        {selectedRecordForLabel.sourceItem?.name}
                      </div>
                      <div className="font-mono font-bold text-teal-900 text-xs">
                        {selectedPackForSinglePrint.packCode}
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        บรรจุ {selectedPackForSinglePrint.unitsCount || selectedRecordForLabel.unitsPerPack} {selectedRecordForLabel.sourceItem?.usageUnit || 'ชิ้น'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200">
                    <div>
                      <span className="block text-[9px] text-slate-400">วันที่อบฆ่าเชื้อ:</span>
                      <span className="font-medium">
                        {new Date(selectedRecordForLabel.packedDate).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400">วันหมดอายุสเตอร์ไรด์:</span>
                      <span className="font-bold text-rose-600">
                        {selectedRecordForLabel.sterileExpiryDate
                          ? new Date(selectedRecordForLabel.sterileExpiryDate).toLocaleDateString('th-TH')
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-200">
                    <span>วิธี: {selectedRecordForLabel.sterilizeMethod}</span>
                    <span>ผู้เตรียม: {selectedRecordForLabel.operator?.name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 print:hidden">
              <span className="text-xs text-slate-500">
                {printMode === 'all_packs'
                  ? `พร้อมพิมพ์สติกเกอร์จำนวน ${selectedRecordForLabel.packItems?.length || selectedRecordForLabel.totalPacksProduced} ใบ`
                  : printMode === 'single_pack'
                  ? `พิมพ์สติกเกอร์ซองที่ ${selectedPackForSinglePrint?.packNumber}`
                  : 'พิมพ์ฉลากสรุปรวมทั้งล็อต 1 ใบ'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRecordForLabel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์สติกเกอร์ (A4)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged QR Code Preview Modal for Screen Scanning */}
      {previewQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                สแกน QR ผ่านหน้าจอ
              </span>
              <button
                onClick={() => setPreviewQrModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-2">
                {previewQrModal.name}
              </h4>
              <p className="font-mono font-bold text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                {previewQrModal.code}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl inline-block border-2 border-dashed border-teal-500/40">
              <img
                src={previewQrModal.qrUrl}
                alt={previewQrModal.code}
                className="w-56 h-56 mx-auto rounded-xl bg-white p-2 shadow-sm"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              📱 ใช้กล้องโทรศัพท์มือถือ หรือสแกนเนอร์ในระบบเพื่อดูรายละเอียดของซองนี้ได้ทันที
            </p>

            <button
              onClick={() => setPreviewQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
