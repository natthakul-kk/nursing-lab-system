'use client';

import React, { useState } from 'react';
import { PackagePlus, Search, X } from 'lucide-react';

interface AssignItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
  availableItems: any[];
  onRefresh: () => void;
}

export default function AssignItemsModal({
  isOpen,
  onClose,
  location,
  availableItems,
  onRefresh,
}: AssignItemsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !location) return null;

  const handleExecuteAssign = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/storage/locations/${location.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedIds,
          action: 'ASSIGN',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'จัดเก็บเข้าตู้เรียบร้อยแล้ว');
        setSelectedIds([]);
        onRefresh();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      alert(err.message || 'เชื่อมต่อล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (itemId: string) => {
    try {
      const res = await fetch(`/api/storage/locations/${location.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [itemId],
          action: 'UNASSIGN',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {}
  };

  const currentItems = location.items || [];
  const selectableItems = availableItems.filter((item) => {
    const notInCabinet = !currentItems.some((i: any) => i.id === item.id);
    const matches =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase());
    return notInCabinet && matches;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black bg-teal-600 text-white px-2 py-0.5 rounded">
                {location.code}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {location.name}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              จัดพัสดุเข้าตู้ หรือย้ายพัสดุข้ามตู้ (ข้อมูลจะอัปเดตตำแหน่งและหน้าสแกนแบบเรียลไทม์)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Currently Assigned */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>พัสดุในตู้นี้ ({currentItems.length} รายการ)</span>
              <span className="text-[11px] text-slate-400">คลิก &quot;นำออก&quot; เพื่อปลดออกจากตู้</span>
            </h4>
            {currentItems.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center text-xs text-slate-400">
                ตู้นี้ยังไม่มีพัสดุจัดเก็บอยู่
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {currentItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.code} • คงเหลือ {item.totalQuantity} {item.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassign(item.id)}
                      className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 text-[10px] font-bold hover:bg-rose-100 cursor-pointer shrink-0"
                    >
                      นำออก
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select Additional Items */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-teal-600" />
                <span>เลือกพัสดุเพิ่มเติมเพื่อจัดเก็บเข้าตู้นี้</span>
              </h4>
              <span className="text-[11px] text-teal-600 font-bold">
                เลือกแล้ว {selectedIds.length} รายการ
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสพัสดุในระบบเพื่อเลือกเข้าตู้..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {selectableItems.slice(0, 50).map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isSelected) setSelectedIds(selectedIds.filter((id) => id !== item.id));
                      else setSelectedIds([...selectedIds, item.id]);
                    }}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-teal-50/80 dark:bg-teal-950/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.code} • คงเหลือ {item.totalQuantity} {item.unit}
                          {item.location && (
                            <span className="ml-2 text-slate-400">(อยู่ที่: {item.location})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {item.category?.name || item.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <span className="text-xs text-slate-500">
            เมื่อกดบันทึก พัสดุจะถูกระบุจุดจัดเก็บเป็นตู้นี้ทันที
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleExecuteAssign}
              disabled={selectedIds.length === 0 || loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'กำลังจัดเก็บ...' : `บันทึกจัดเก็บเข้าตู้ (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
