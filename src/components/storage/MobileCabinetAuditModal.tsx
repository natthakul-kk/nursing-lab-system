'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  X,
  Package,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  Building,
  MapPin,
  ChevronRight,
  Info,
} from 'lucide-react';

interface MobileCabinetAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: any;
  items: any[];
  assets: any[];
  currentUser: any;
  onSuccess: () => void;
}

const REASON_OPTIONS = [
  'ปรับยอดตรวจนับหน้าตู้ประจำงวด',
  'ใช้งานในการเรียนการสอน / ฝึกซ้อม',
  'ชำรุด / แตกหัก / เสื่อมสภาพ',
  'สูญหาย / หาไม่พบ',
  'เติมสต็อกจากห้องคลังพัสดุกลาง',
  'ยอดคลาดเคลื่อนจากการนับรอบก่อน',
  'อื่นๆ',
];

export default function MobileCabinetAuditModal({
  isOpen,
  onClose,
  storage,
  items,
  assets,
  currentUser,
  onSuccess,
}: MobileCabinetAuditModalProps) {
  const [activeTab, setActiveTab] = useState<'CONSUMABLE' | 'EQUIPMENT'>('CONSUMABLE');
  const [submitting, setSubmitting] = useState(false);

  // Consumables state: itemId -> { physicalCount, reason, isModified }
  const [consumableCounts, setConsumableCounts] = useState<
    Record<string, { physicalCount: number; reason: string; isModified: boolean }>
  >({});

  // Equipment assets state: assetId -> { condition, isPresent, note }
  const [assetStatuses, setAssetStatuses] = useState<
    Record<string, { condition: string; isPresent: boolean; status: string }>
  >({});

  // Filter consumables only
  const consumableItems = useMemo(() => {
    return (items || []).filter((item: any) => item.type === 'CONSUMABLE');
  }, [items]);

  // Equipment assets
  const equipmentAssets = useMemo(() => {
    return assets || [];
  }, [assets]);

  // Initialize counts when opened
  useEffect(() => {
    if (!isOpen) return;

    // Consumables init
    const cMap: Record<string, { physicalCount: number; reason: string; isModified: boolean }> = {};
    consumableItems.forEach((it: any) => {
      const current = Number(it.currentStock) || 0;
      cMap[it.id] = {
        physicalCount: current,
        reason: REASON_OPTIONS[0],
        isModified: false,
      };
    });
    setConsumableCounts(cMap);

    // Assets init
    const aMap: Record<string, { condition: string; isPresent: boolean; status: string }> = {};
    equipmentAssets.forEach((ast: any) => {
      aMap[ast.id] = {
        condition: ast.condition || 'GOOD',
        isPresent: ast.status !== 'MISSING',
        status: ast.status || 'AVAILABLE',
      };
    });
    setAssetStatuses(aMap);

    // Switch tab to the one that has items
    if (consumableItems.length === 0 && equipmentAssets.length > 0) {
      setActiveTab('EQUIPMENT');
    } else {
      setActiveTab('CONSUMABLE');
    }
  }, [isOpen, consumableItems, equipmentAssets]);

  if (!isOpen) return null;

  // Handlers for consumable steppers
  const handleCountChange = (itemId: string, newCount: number) => {
    const val = Math.max(0, newCount);
    setConsumableCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { reason: REASON_OPTIONS[0] }),
        physicalCount: val,
        isModified: true,
      },
    }));
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setConsumableCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { physicalCount: 0, isModified: true }),
        reason,
        isModified: true,
      },
    }));
  };

  const handleSetMatchSystem = (itemId: string, systemStock: number) => {
    handleCountChange(itemId, systemStock);
  };

  // Handlers for equipment
  const handleAssetConditionChange = (assetId: string, condition: 'GOOD' | 'FAIR' | 'DAMAGED') => {
    setAssetStatuses((prev) => ({
      ...prev,
      [assetId]: {
        ...(prev[assetId] || { isPresent: true, status: 'AVAILABLE' }),
        condition,
        status: condition === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE',
      },
    }));
  };

  const handleAssetMissingToggle = (assetId: string) => {
    setAssetStatuses((prev) => {
      const cur = prev[assetId] || { condition: 'GOOD', isPresent: true, status: 'AVAILABLE' };
      const nextPresent = !cur.isPresent;
      return {
        ...prev,
        [assetId]: {
          ...cur,
          isPresent: nextPresent,
          status: nextPresent ? 'AVAILABLE' : 'MISSING',
        },
      };
    });
  };

  // Calculate audit stats
  const totalAuditedConsumables = Object.values(consumableCounts).filter((c) => c.isModified).length;
  const changedConsumablesCount = consumableItems.filter((it: any) => {
    const st = consumableCounts[it.id];
    return st && st.physicalCount !== Number(it.currentStock);
  }).length;

  const damagedAssetsCount = Object.values(assetStatuses).filter((a) => a.condition === 'DAMAGED').length;
  const missingAssetsCount = Object.values(assetStatuses).filter((a) => !a.isPresent).length;

  // Submit Audit
  const handleSubmitAudit = async () => {
    setSubmitting(true);
    try {
      // Build consumable reconcile records
      const records: any[] = [];
      consumableItems.forEach((it: any) => {
        const state = consumableCounts[it.id];
        if (!state) return;
        const systemCount = Number(it.currentStock) || 0;
        const physicalCount = Number(state.physicalCount);
        const variance = physicalCount - systemCount;

        if (variance !== 0) {
          records.push({
            itemId: it.id,
            systemCount,
            physicalCount,
            variance,
            reason: state.reason,
          });
        }
      });

      // Build asset audit updates
      const assetAudits: any[] = [];
      equipmentAssets.forEach((ast: any) => {
        const state = assetStatuses[ast.id];
        if (!state) return;
        if (state.condition !== ast.condition || state.status !== ast.status) {
          assetAudits.push({
            assetId: ast.id,
            condition: state.condition,
            status: state.status,
          });
        }
      });

      if (records.length === 0 && assetAudits.length === 0) {
        alert('ผลการตรวจนับตรงตามระบบทุกรายการ ไม่พบผลต่างที่ต้องปรับปรุงยอด');
        onSuccess();
        onClose();
        return;
      }

      const res = await fetch('/api/inventory/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          assetAudits,
          countedBy: currentUser?.name || 'เจ้าหน้าที่ห้องปฏิบัติการ',
          note: `ตรวจนับหน้าตู้ ${storage.code} (${storage.name})`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'เกิดข้อผิดพลาดในการบันทึกผลการตรวจนับ');
      }

      const resData = await res.json();
      alert(resData.message || 'บันทึกผลการตรวจนับและกระทบยอดสต็อกเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'ไม่สามารถบันทึกผลการตรวจนับได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white border border-white/20">
                  {storage.code}
                </span>
                <span className="text-[11px] font-semibold text-teal-200">
                  {storage.name}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                โหมดตรวจนับสต็อกหน้าตู้ด้วยมือถือ
              </h2>
              <p className="text-[11px] text-teal-200/80">
                ผู้ตรวจนับ: {currentUser?.name || 'เจ้าหน้าที่ห้องปฏิบัติการ'} • {storage.roomName || 'ห้องปฏิบัติการ'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('CONSUMABLE')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'CONSUMABLE'
                ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-teal-600" />
            <span>วัสดุสิ้นเปลือง ({consumableItems.length})</span>
            {changedConsumablesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                แก้ {changedConsumablesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EQUIPMENT')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'EQUIPMENT'
                ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-teal-600" />
            <span>ครุภัณฑ์ประจำตู้ ({equipmentAssets.length})</span>
            {(damagedAssetsCount > 0 || missingAssetsCount > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                พบปัญหา {damagedAssetsCount + missingAssetsCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'CONSUMABLE' && (
            <div className="space-y-3">
              {consumableItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ไม่มีรายการวัสดุสิ้นเปลืองจัดเก็บในตู้นี้
                </div>
              ) : (
                consumableItems.map((item: any) => {
                  const state = consumableCounts[item.id] || {
                    physicalCount: Number(item.currentStock) || 0,
                    reason: REASON_OPTIONS[0],
                    isModified: false,
                  };
                  const systemCount = Number(item.currentStock) || 0;
                  const physicalCount = Number(state.physicalCount);
                  const variance = physicalCount - systemCount;
                  const isMatch = variance === 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        !isMatch
                          ? variance > 0
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Item Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {item.code}
                            </span>
                            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                              {item.categoryName || 'เวชภัณฑ์'}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                            {item.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            ในระบบ: <strong className="text-slate-800 dark:text-slate-200">{systemCount}</strong> {item.unit || 'ชิ้น'}
                          </p>
                        </div>

                        {/* Variance Badge */}
                        <div className="shrink-0 text-right">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ยอดตรง (0)
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                                variance > 0
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300'
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {variance > 0 ? `เกิน +${variance}` : `ขาด ${variance}`} {item.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stepper Input Controls */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            นับจริงหน้าตู้:
                          </span>
                          <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleCountChange(item.id, physicalCount - 1)}
                              className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={physicalCount}
                              onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-9 text-center font-mono font-black text-sm text-slate-900 dark:text-white bg-transparent outline-none border-x border-slate-200 dark:border-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => handleCountChange(item.id, physicalCount + 1)}
                              className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Match Button */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCountChange(item.id, physicalCount + 5)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetMatchSystem(item.id, systemCount)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                          >
                            ✓ ตรงกับระบบ ({systemCount})
                          </button>
                        </div>
                      </div>

                      {/* Reason Dropdown if not matching */}
                      {!isMatch && (
                        <div className="pt-2 border-t border-dashed border-amber-200 dark:border-amber-900/60 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                            สาเหตุผลต่าง:
                          </span>
                          <select
                            value={state.reason}
                            onChange={(e) => handleReasonChange(item.id, e.target.value)}
                            className="flex-1 text-xs py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {REASON_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'EQUIPMENT' && (
            <div className="space-y-3">
              {equipmentAssets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ไม่มีรายการครุภัณฑ์จัดเก็บในตู้นี้
                </div>
              ) : (
                equipmentAssets.map((asset: any) => {
                  const state = assetStatuses[asset.id] || {
                    condition: asset.condition || 'GOOD',
                    isPresent: asset.status !== 'MISSING',
                    status: asset.status || 'AVAILABLE',
                  };

                  return (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        !state.isPresent
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : state.condition === 'DAMAGED'
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                              รหัส: {asset.assetCode}
                            </span>
                            {asset.sequenceNumber && (
                              <span className="text-[11px] font-medium text-slate-500">
                                เครื่องที่ {asset.sequenceNumber}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                            {asset.itemName}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            S/N: {asset.serialNumber || '-'} • ครุภัณฑ์ราชการ: {asset.govAssetCode || '-'}
                          </p>
                        </div>
                      </div>

                      {/* 1-Click State Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!state.isPresent) handleAssetMissingToggle(asset.id);
                            handleAssetConditionChange(asset.id, 'GOOD');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            state.isPresent && state.condition === 'GOOD'
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ตรวจพบปกติ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!state.isPresent) handleAssetMissingToggle(asset.id);
                            handleAssetConditionChange(asset.id, 'DAMAGED');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            state.isPresent && state.condition === 'DAMAGED'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>พบชำรุด</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAssetMissingToggle(asset.id)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            !state.isPresent
                              ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>ไม่พบที่ตู้</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {changedConsumablesCount > 0 || damagedAssetsCount > 0 || missingAssetsCount > 0 ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                พบการเปลี่ยนแปลง {changedConsumablesCount + damagedAssetsCount + missingAssetsCount} รายการที่จะปรับปรุง
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-4 h-4 shrink-0" />
                สต็อกตรงตามระบบทั้งหมด
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitAudit}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกและกระทบยอดสต็อก'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
