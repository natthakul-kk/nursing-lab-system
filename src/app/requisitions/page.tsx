'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  FileSpreadsheet,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  Calendar,
  User,
  BookOpen,
  Boxes,
  Trash2,
  PackageCheck,
  Check,
  AlertCircle
} from 'lucide-react';

export default function RequisitionsPage() {
  const { currentUser, isOfficer, isApprover } = useAuth();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New Requisition Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReq, setNewReq] = useState({
    courseId: '',
    purpose: '',
    dateNeeded: '',
    items: [{ itemId: '', quantity: 10 }],
  });

  // Action Dispense Modal
  const [activeReqForDispense, setActiveReqForDispense] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequisitions = async () => {
    try {
      const [reqRes, itemsRes, coursesRes] = await Promise.all([
        fetch('/api/requisitions'),
        fetch('/api/items?type=CONSUMABLE'),
        fetch('/api/courses'),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequisitions(data);
      }
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setConsumables(items);
        if (items.length > 0 && !newReq.items[0].itemId) {
          setNewReq((prev) => ({
            ...prev,
            items: [{ itemId: items[0].id, quantity: 10 }],
          }));
        }
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData);
        if (cData.length > 0 && !newReq.courseId) {
          setNewReq((prev) => ({ ...prev, courseId: cData[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const handleAddItemRow = () => {
    if (consumables.length > 0) {
      setNewReq((prev) => ({
        ...prev,
        items: [...prev.items, { itemId: consumables[0].id, quantity: 5 }],
      }));
    }
  };

  const handleRemoveItemRow = (idx: number) => {
    setNewReq((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.courseId || !newReq.purpose || !newReq.dateNeeded) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          courseId: newReq.courseId,
          purpose: newReq.purpose,
          dateNeeded: newReq.dateNeeded,
          items: newReq.items,
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewReq({
          courseId: courses[0]?.id || '',
          purpose: '',
          dateNeeded: '',
          items: [{ itemId: consumables[0]?.id || '', quantity: 10 }],
        });
        fetchRequisitions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create requisition');
      }
    } catch (err) {
      alert('Error connecting to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispense = async () => {
    if (!activeReqForDispense) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/requisitions/${activeReqForDispense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPENSE',
          userId: currentUser?.id,
        }),
      });

      if (res.ok) {
        setActiveReqForDispense(null);
        fetchRequisitions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to dispense');
      }
    } catch (err) {
      alert('Error updating requisition');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> รออนุมัติ
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Check className="w-3 h-3 text-blue-600" /> อนุมัติแล้ว (รอจ่ายของ)
          </span>
        );
      case 'DISPENSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> จ่ายของและตัดสต็อกแล้ว
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-500" /> ไม่อนุมัติ
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const filteredRequisitions = requisitions.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-600" />
            ระบบเบิกจ่ายวัสดุสิ้นเปลืองประจำรายวิชา
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ยื่นขอเบิกเวชภัณฑ์สำหรับการเรียนการสอนปฏิบัติการพยาบาล ระบบตัดสต็อกอัตโนมัติและบันทึกต้นทุนแยกรายวิชา
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ยื่นขอเบิกวัสดุรายวิชา</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-2">
        {[
          { key: 'ALL', label: 'ทั้งหมด' },
          { key: 'PENDING', label: 'รออนุมัติ' },
          { key: 'APPROVED', label: 'อนุมัติแล้ว (รอจ่าย)' },
          { key: 'DISPENSED', label: 'จ่ายของแล้ว' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === tab.key
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requisitions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            กำลังโหลดรายการคำขอเบิก...
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
            ไม่พบรายการคำขอเบิกวัสดุ
          </div>
        ) : (
          filteredRequisitions.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                    {req.requestNumber}
                  </span>
                  <div>{getStatusBadge(req.status)}</div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                    [{req.course?.code}] {req.course?.name}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{req.user?.name}</span>
                  </div>
                </div>
              </div>

              {/* Purpose & Cost Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2">
                  <span className="text-slate-400 font-bold block mb-1">
                    วัตถุประสงค์ / หัวข้อการสอน:
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed">{req.purpose}</p>
                </div>

                <div className="text-right flex flex-col justify-center">
                  <span className="text-slate-400 font-bold block mb-0.5">มูลค่าต้นทุนวัสดุ:</span>
                  <div className="text-lg font-black text-emerald-700">
                    ฿{req.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    วันที่ต้องการใช้: {new Date(req.dateNeeded).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5">รายการวัสดุสิ้นเปลือง</th>
                      <th className="py-1.5 text-center">ขอเบิก</th>
                      <th className="py-1.5 text-center">จ่ายจริง</th>
                      <th className="py-1.5 text-right">ราคาต่อหน่วย</th>
                      <th className="py-1.5 text-right">รวมต้นทุน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {req.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td className="py-2 text-slate-800 font-semibold">{it.item?.name}</td>
                        <td className="py-2 text-center text-slate-600">
                          {it.quantityRequested} {it.item?.unit}
                        </td>
                        <td className="py-2 text-center font-bold text-emerald-700">
                          {it.quantityDispensed > 0
                            ? `${it.quantityDispensed} ${it.item?.unit}`
                            : '-'}
                        </td>
                        <td className="py-2 text-right text-slate-500">
                          ฿{it.unitCost.toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900">
                          ฿{it.totalCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Button for Lab Officer */}
              {isOfficer && req.status === 'APPROVED' && (
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setActiveReqForDispense(req)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>จ่ายของและตัดสต็อก FIFO (Dispense)</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: New Requisition */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                ยื่นขอเบิกวัสดุสิ้นเปลืองสำหรับรายวิชา
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รายวิชาทางการพยาบาล *
                  </label>
                  <select
                    value={newReq.courseId}
                    onChange={(e) => setNewReq({ ...newReq, courseId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่ต้องการใช้งาน *
                  </label>
                  <input
                    type="date"
                    required
                    value={newReq.dateNeeded}
                    onChange={(e) => setNewReq({ ...newReq, dateNeeded: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์ / หัตถการที่สอน / จำนวนนิสิต *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น ฝึกปฏิบัติการทำแผล Sterile Wound Care นิสิต กลุ่ม 2 จำนวน 35 คน"
                  value={newReq.purpose}
                  onChange={(e) => setNewReq({ ...newReq, purpose: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Items List Dynamic */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    รายการวัสดุและจำนวนที่ต้องการเบิก
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newReq.items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.itemId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewReq((prev) => {
                            const updated = [...prev.items];
                            updated[idx].itemId = val;
                            return { ...prev, items: updated };
                          });
                        }}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        {consumables.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (คงเหลือ: {c.currentStock} {c.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewReq((prev) => {
                            const updated = [...prev.items];
                            updated[idx].quantity = val;
                            return { ...prev, items: updated };
                          });
                        }}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center"
                      />

                      {newReq.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเบิกวัสดุ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Dispense & Cut Stock */}
      {activeReqForDispense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-teal-600" />
              ยืนยันการจ่ายของและตัดสต็อก FIFO
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800">
                คำขอเลขที่: {activeReqForDispense.requestNumber}
              </div>
              <div className="text-slate-600">
                รายวิชา: [{activeReqForDispense.course?.code}] {activeReqForDispense.course?.name}
              </div>
              <div className="text-emerald-700 font-bold">
                ประมาณการมูลค่า: ฿{activeReqForDispense.totalCost.toFixed(2)} บาท
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              เมื่อกดยืนยัน ระบบจะทำการตัดสต็อกจาก Lot ที่มีวันหมดอายุใกล้ที่สุดก่อน (FIFO) และคำนวณต้นทุนจริงเข้าสู่บัญชีรายวิชาโดยอัตโนมัติ
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveReqForDispense(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDispense}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'กำลังตัดสต็อก...' : 'ยืนยันจ่ายของ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
