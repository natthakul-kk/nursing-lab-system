'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Boxes,
  Box,
  Calendar,
  Tag,
  MapPin,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  QrCode,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
  ChevronRight,
  PackageCheck
} from 'lucide-react';
import { formatImageUrl } from '@/lib/image-helper';

interface ConsumableDetailModalProps {
  item: any;
  initialLot?: any | null;
  onClose: () => void;
  onOpenQr?: (lot: any, item: any) => void;
  onOpenBoxStickers?: (lot: any, item: any, boxes: any[]) => void;
}

export default function ConsumableDetailModal({
  item,
  initialLot = null,
  onClose,
  onOpenQr,
  onOpenBoxStickers,
}: ConsumableDetailModalProps) {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(
    initialLot?.id || (item.stockLots && item.stockLots.length > 0 ? item.stockLots[0].id : null)
  );

  const lots: any[] = item.stockLots || [];
  const activeLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;

  // Format Date to Thai Buddhist Era
  const formatThaiDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  // Expiry status calculation
  const getExpiryStatus = (dateVal: any) => {
    if (!dateVal) return { label: 'ไม่ระบุวันหมดอายุ', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    const exp = new Date(dateVal);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `หมดอายุแล้ว (${Math.abs(diffDays)} วันก่อน)`,
        color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        isExpired: true,
      };
    }
    if (diffDays <= 60) {
      return {
        label: `ใกล้หมดอายุ (เหลือ ${diffDays} วัน)`,
        color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        isExpiringSoon: true,
      };
    }
    return {
      label: `ปกติ (เหลืออีก ${diffDays} วัน)`,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    };
  };

  // Total item values
  const totalPhysicalStock = lots.reduce((sum, l) => sum + (l.quantityRemaining || 0), 0);
  const totalItemValue = lots.reduce((sum, l) => sum + ((l.quantityRemaining || 0) * (l.unitCost || 0)), 0);
  const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
  const imageUrl = formatImageUrl(item.imageUrl);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-start gap-3.5">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                <Boxes className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                  {item.code}
                </span>
                {item.category?.name && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    หมวด: {item.category.name}
                  </span>
                )}
                {item.allowExpiredForSim !== false && (
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    🧪 รองรับฝึกหุ่น (Sim-Lab)
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Section 1: สรุปภาพรวมรายการใหญ่ (Master Item Overview Cards) */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>ภาพรวมพัสดุและสต็อกคงคลังทั้งหมด</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* ยอดคงเหลือหน่วยหลัก */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  ยอดคงคลังรวม (หน่วยหลัก)
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {(item.currentStock ?? totalPhysicalStock).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                </div>
                {item.isLowStock && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 mt-1">
                    <AlertTriangle className="w-3 h-3" /> ต่ำกว่าเกณฑ์ ({item.minStockAlert} {item.unit})
                  </span>
                )}
              </div>

              {/* ยอดหน่วยย่อย */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  ยอดรวมหน่วยย่อยเบิกใช้
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-teal-700 dark:text-teal-300">
                    {(item.totalPiecesRemaining ?? (totalPhysicalStock * ratio)).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    {item.usageUnit || item.unit}
                  </span>
                </div>
                {ratio > 1 && (
                  <span className="text-[10px] text-slate-400 block mt-1">
                    1 {item.unit} = {ratio} {item.usageUnit}
                  </span>
                )}
              </div>

              {/* เศษเปิดใช้ */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  เศษเปิดใช้ (Opened Pack)
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-purple-700 dark:text-purple-300">
                    {(item.openPackRemainder || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {item.usageUnit || 'ชิ้น'}
                  </span>
                </div>
                <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 block mt-1">
                  หยิบใช้ก่อนเปิดกล่องใหม่
                </span>
              </div>

              {/* มูลค่าคงคลังรวม */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  มูลค่าคงคลังรวมโดยประมาณ
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                    ฿{totalItemValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  จาก {lots.length} ล็อตคงคลัง
                </span>
              </div>
            </div>

            {/* ข้อมูลสถานที่จัดเก็บ & คุณสมบัติทั่วไป */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span>สถานที่จัดเก็บหลัก: <b>{item.storageLocation?.name || item.location || 'ไม่ได้ระบุ'}</b></span>
              </div>
              {item.brand && (
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>ยี่ห้อกลาง: <b>{item.brand}</b> {item.model ? `(${item.model})` : ''}</span>
                </div>
              )}
              <Link
                href={`/consumable/${encodeURIComponent(item.code)}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline ml-auto"
              >
                <span>เปิดดูหน้าสแกนสาธารณะ</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Section 2: รายการทุกล็อต & เจาะลึกเฉพาะล็อต (Lots Master-Detail) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>รายการล็อตคงคลังและวันหมดอายุ ({lots.length} ล็อต)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                * แตะเลือกล็อตด้านซ้ายเพื่อดูรายละเอียดกล่องและข้อมูลเชิงลึก
              </span>
            </div>

            {lots.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                ยังไม่มีล็อตคงคลังที่มีของเหลืออยู่ในระบบ
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Lots Selector List (Col 5) */}
                <div className="md:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {lots.map((lot) => {
                    const isSelected = lot.id === selectedLotId;
                    const expInfo = getExpiryStatus(lot.expiryDate);
                    const unitLabel = lot.packageUnit || item.unit || 'กล่อง';

                    return (
                      <div
                        key={lot.id}
                        onClick={() => setSelectedLotId(lot.id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer text-left relative ${
                          isSelected
                            ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-black text-teal-800 dark:text-teal-300">
                            Lot: {lot.lotNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {lot.quantityRemaining} {unitLabel}
                          </span>
                        </div>

                        {lot.brand && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            ยี่ห้อ: {lot.brand}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${expInfo.color}`}>
                            {expInfo.label}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            ฿{(lot.unitCost || 0).toFixed(2)}/{unitLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Lot Full Breakdown Panel (Col 7) */}
                <div className="md:col-span-7 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-4">
                  {activeLot ? (
                    <>
                      {/* Active Lot Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded">
                              รายละเอียดล็อตที่เลือก
                            </span>
                            <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                              {activeLot.lotNumber}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            {activeLot.brand && <span>ยี่ห้อ: <b>{activeLot.brand}</b></span>}
                            {activeLot.supplier && <span>• ผู้จัดจำหน่าย: <b>{activeLot.supplier}</b></span>}
                          </div>
                        </div>

                        {/* Action Buttons for active lot */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {onOpenQr && (
                            <button
                              type="button"
                              onClick={() => onOpenQr(activeLot, item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                              title="พิมพ์ป้ายสติกเกอร์ QR Code ประจำล็อตนี้"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>ป้าย QR ล็อต</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail Metrics of Selected Lot */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block">จำนวนคงเหลือในล็อต</span>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100">
                            {activeLot.quantityRemaining} {activeLot.packageUnit || item.unit}
                          </div>
                          {(activeLot.packSize > 1 || ratio > 1) && (
                            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold block">
                              รวม ~{((activeLot.piecesRemaining ?? (activeLot.quantityRemaining * (activeLot.packSize || ratio)))).toLocaleString()} {item.usageUnit || 'ชิ้น'}
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block">มูลค่าคงเหลือของล็อตนี้</span>
                          <div className="text-base font-black text-emerald-700 dark:text-emerald-400">
                            ฿{((activeLot.quantityRemaining || 0) * (activeLot.unitCost || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            (ต้นทุน ฿{(activeLot.unitCost || 0).toFixed(2)}/{activeLot.packageUnit || item.unit})
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block">วันที่รับเข้าสู่คลัง</span>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {formatThaiDate(activeLot.receivedDate)}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            รับเข้าเริ่มต้น: {activeLot.quantityInitial ?? activeLot.quantityRemaining} {activeLot.packageUnit || item.unit}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block">วันหมดอายุ (Expiry Date)</span>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {formatThaiDate(activeLot.expiryDate)}
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block ${getExpiryStatus(activeLot.expiryDate).color}`}>
                            {getExpiryStatus(activeLot.expiryDate).label}
                          </span>
                        </div>
                      </div>

                      {/* รายการกล่องย่อยของล็อตนี้ (Boxes in this Lot) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-teal-600" />
                            <span>กล่องย่อยประจำปีของล็อตนี้ ({activeLot.boxes?.length || 0} กล่อง)</span>
                          </h4>

                          {onOpenBoxStickers && activeLot.boxes && activeLot.boxes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenBoxStickers(activeLot, item, activeLot.boxes)}
                              className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Tag className="w-3 h-3" />
                              <span>พิมพ์สติกเกอร์ทุกล็อตย่อย</span>
                            </button>
                          )}
                        </div>

                        {activeLot.boxes && activeLot.boxes.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {activeLot.boxes.map((box: any) => {
                              const isBoxInUse = box.status === 'IN_USE';
                              const isDepleted = box.status === 'DEPLETED';

                              return (
                                <div
                                  key={box.id}
                                  className={`p-2 rounded-xl border text-xs ${
                                    isBoxInUse
                                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200 font-bold'
                                      : isDepleted
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[11px]">#{box.boxNumberInYear}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                      isBoxInUse ? 'bg-amber-200 text-amber-900' : isDepleted ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {isBoxInUse ? 'กำลังเปิดใช้' : isDepleted ? 'หมดแล้ว' : 'พร้อมหยิบ'}
                                    </span>
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {box.boxCode}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
                            ล็อตนี้ไม่มีการแตกกล่องย่อย หรือถูกบันทึกเป็นยอดก้อนรวม
                          </div>
                        )}
                      </div>

                      {/* ลิงก์ตรงไปหน้าสาธารณะของล็อตนี้ */}
                      <div className="pt-2 text-right">
                        <Link
                          href={`/consumable/${encodeURIComponent(item.code)}?lot=${encodeURIComponent(activeLot.lotNumber)}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
                        >
                          <span>เปิดหน้าสแกน QR สำหรับล็อต {activeLot.lotNumber}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      กรุณาเลือกล็อตจากรายการด้านซ้าย
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
          <span className="text-xs text-slate-400">
            ระบบบริหารจัดการพัสดุและเวชภัณฑ์ห้องปฏิบัติการพยาบาล
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
