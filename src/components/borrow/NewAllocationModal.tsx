'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  BookOpen,
  Calendar,
  CheckCircle2,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

interface NewAllocationModalProps {
  courses: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAllocationModal({
  courses,
  onClose,
  onSuccess,
}: NewAllocationModalProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [advisorName, setAdvisorName] = useState('');
  const [targetLocation, setTargetLocation] = useState('ห้อง Lab 401 (แล็ปสูติศาสตร์-เด็ก)');
  const [purpose, setPurpose] = useState('จัดสรรหุ่นและครุภัณฑ์ประจำรายวิชาตลอดภาคการศึกษา');

  // Dates: Default 4 months
  const todayStr = new Date().toISOString().slice(0, 10);
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 4);
  const futureStr = futureDate.toISOString().slice(0, 10);

  const [borrowDate, setBorrowDate] = useState(todayStr);
  const [expectedReturnDate, setExpectedReturnDate] = useState(futureStr);

  // Equipment assets list
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load available assets
  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch('/api/items?type=EQUIPMENT');
        if (res.ok) {
          const items = await res.json();
          // Flatten all available assets
          const assets: any[] = [];
          items.forEach((it: any) => {
            if (it.assets && Array.isArray(it.assets)) {
              it.assets.forEach((a: any) => {
                if (a.status === 'AVAILABLE') {
                  assets.push({
                    ...a,
                    itemName: it.name,
                    itemCode: it.code,
                    itemUnit: it.unit,
                  });
                }
              });
            }
          });
          setAvailableAssets(assets);
        }
      } catch (err) {
        console.error('Failed to load assets for allocation', err);
      } finally {
        setLoadingAssets(false);
      }
    }
    fetchAssets();
  }, []);

  // Update advisor name when course changes
  useEffect(() => {
    const sel = courses.find((c) => c.id === courseId);
    if (sel && sel.instructors && sel.instructors.length > 0) {
      setAdvisorName(sel.instructors[0]?.user?.name || '');
    }
  }, [courseId, courses]);

  const toggleSelectAsset = (id: string) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter((aId) => aId !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const filteredAssets = availableAssets.filter((a) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      a.assetCode.toLowerCase().includes(q) ||
      a.itemName.toLowerCase().includes(q) ||
      (a.location && a.location.toLowerCase().includes(q))
    );
  });

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredAssets.map((a) => a.id);
    const allSelected = filteredIds.every((id) => selectedAssetIds.includes(id));
    if (allSelected) {
      setSelectedAssetIds(selectedAssetIds.filter((id) => !filteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedAssetIds, ...filteredIds]));
      setSelectedAssetIds(merged);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      alert('กรุณาเลือกรายวิชา');
      return;
    }
    if (!targetLocation.trim()) {
      alert('กรุณาระบุห้องปฏิบัติการเป้าหมาย');
      return;
    }
    if (selectedAssetIds.length === 0) {
      alert('กรุณาเลือกอุปกรณ์หรือหุ่นจำลองอย่างน้อย 1 ชิ้น');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseId,
        advisorName,
        purpose,
        targetLocation,
        borrowDate,
        expectedReturnDate,
        assetIds: selectedAssetIds,
      };

      const res = await fetch('/api/borrow/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('สร้างและจัดสรรครุภัณฑ์ประจำวิชาตลอดเทอมเรียบร้อยแล้ว');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการสร้างคำขอ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                จัดสรรครุภัณฑ์ประจำรายวิชาตลอดภาคการศึกษา (Course Allocation)
              </h3>
              <p className="text-xs text-slate-500">
                ย้ายตำแหน่งหุ่นและอุปกรณ์ไปตั้งประจำห้องปฏิบัติการตลอดเทอม โดยไม่ต้องกดยืม-คืนทุกวัน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Course & Location Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                รายวิชาที่จัดสรร *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ห้องปฏิบัติการที่นำไปติดตั้งประจำ *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ห้อง Lab 401 (แล็ปสูติศาสตร์), ห้อง Lab 302"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                อาจารย์ผู้รับผิดชอบ / ผู้ประสานงาน
              </label>
              <input
                type="text"
                placeholder="ระบุชื่ออาจารย์"
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                วันที่เริ่มจัดสรร (วันเปิดเทอม)
              </label>
              <input
                type="date"
                required
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                กำหนดส่งคืน (วันปิดเทอม / จบ OSCE)
              </label>
              <input
                type="date"
                required
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Asset Selection Table */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                <span>เลือกครุภัณฑ์และหุ่นจำลองที่ต้องการจัดสรร</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-black">
                  เลือกแล้ว {selectedAssetIds.length} ชิ้น
                </span>
              </div>

              {filteredAssets.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  เลือกทั้งหมดในหน้านี้ ({filteredAssets.length} ชิ้น)
                </button>
              )}
            </div>

            {/* Filter Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหารหัสครุภัณฑ์ หรือชื่อหุ่น (เช่น หุ่นทำคลอด, EQ-MNK-001)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Assets List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              {loadingAssets ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  กำลังโหลดรายการครุภัณฑ์พร้อมใช้...
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredAssets.map((asset) => {
                    const isChecked = selectedAssetIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleSelectAsset(asset.id)}
                        className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/40 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          )}
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {asset.assetCode}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 truncate">
                            {asset.itemName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 whitespace-nowrap">
                          ที่ตั้งเดิม: {asset.location || 'คลังพัสดุ'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  ไม่พบคลังครุภัณฑ์พร้อมใช้ที่ตรงกับคำค้นหา
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || selectedAssetIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกและจัดสรร...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ยืนยันจัดสรรประจำวิชา ({selectedAssetIds.length} ชิ้น)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
