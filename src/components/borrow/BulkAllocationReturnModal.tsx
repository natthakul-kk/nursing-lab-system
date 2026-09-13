'use client';

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building2,
  BookOpen,
  Calendar,
  RefreshCw,
  Boxes,
} from 'lucide-react';

interface BulkAllocationReturnModalProps {
  allocation: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkAllocationReturnModal({
  allocation,
  onClose,
  onSuccess,
}: BulkAllocationReturnModalProps) {
  const [itemConditions, setItemConditions] = useState<{ [assetId: string]: 'GOOD' | 'DAMAGED' }>(() => {
    const initial: { [assetId: string]: 'GOOD' | 'DAMAGED' } = {};
    allocation.items?.forEach((it: any) => {
      if (it.asset?.id) {
        initial[it.asset.id] = 'GOOD';
      }
    });
    return initial;
  });

  const [returnNote, setReturnNote] = useState('ตรวจรับคืนเข้าคลังทั้งหมดสมบูรณ์เมื่อสิ้นสุดภาคการศึกษา');
  const [submitting, setSubmitting] = useState(false);

  const handleToggleCondition = (assetId: string) => {
    setItemConditions((prev) => ({
      ...prev,
      [assetId]: prev[assetId] === 'GOOD' ? 'DAMAGED' : 'GOOD',
    }));
  };

  const handleMarkAllGood = () => {
    const allGood: { [assetId: string]: 'GOOD' | 'DAMAGED' } = {};
    allocation.items?.forEach((it: any) => {
      if (it.asset?.id) {
        allGood[it.asset.id] = 'GOOD';
      }
    });
    setItemConditions(allGood);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/borrow/allocation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowRequestId: allocation.id,
          itemConditions,
          returnNote,
        }),
      });

      if (res.ok) {
        alert('ตรวจรับคืนครุภัณฑ์ประจำวิชาเข้าคลังทั้งหมดเรียบร้อยแล้ว');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการรับคืน');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const activeItems = allocation.items?.filter((it: any) => !it.isReturned) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                ตรวจรับคืนครุภัณฑ์ประจำวิชาเข้าคลังทั้งหมด (Bulk Return)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {allocation.requestNumber}
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

        {/* Course & Allocation Summary */}
        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 dark:text-indigo-200">
              วิชา: [{allocation.course?.code}] {allocation.course?.name}
            </span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              {allocation.targetLocation || 'ประจำห้องปฏิบัติการ'}
            </span>
          </div>
          <div className="text-slate-500 text-[11px] flex items-center justify-between">
            <span>อาจารย์ผู้รับผิดชอบ: {allocation.advisorName || allocation.user?.name}</span>
            <span>กำหนดคืน: {new Date(allocation.expectedReturnDate).toLocaleDateString('th-TH')}</span>
          </div>
        </div>

        {/* Assets Check List */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              รายการหุ่นและครุภัณฑ์ที่ต้องตรวจรับ ({activeItems.length} ชิ้น):
            </span>
            <button
              type="button"
              onClick={handleMarkAllGood}
              className="text-[11px] text-teal-600 hover:underline font-bold"
            >
              ✓ กำหนดทุกชิ้นเป็นปกติ (GOOD)
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {activeItems.map((it: any) => {
              const asset = it.asset;
              const cond = itemConditions[asset?.id] || 'GOOD';
              const isGood = cond === 'GOOD';

              return (
                <div
                  key={it.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isGood
                      ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                  }`}
                >
                  <div className="overflow-hidden space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {asset?.assetCode}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                        {it.item?.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ย้ายกลับไปที่: <b>{it.previousLocation || asset?.previousLocation || 'คลังพัสดุหลัก'}</b>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCondition(asset?.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                      isGood
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    {isGood ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>สภาพปกติ</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>พบชำรุด</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="space-y-1 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              หมายเหตุการตรวจรับคืนเข้าคลัง:
            </label>
            <input
              type="text"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

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
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>ยืนยันรับคืนเข้าคลังทั้งหมด ({activeItems.length} ชิ้น)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
