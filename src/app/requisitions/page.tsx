'use client';

import React, { useState, useEffect } from 'react';
import {
  useAuth } from '@/lib/auth-context';
import {
  RefreshCw,
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
  AlertCircle,
  GraduationCap,
  Sparkles,
  Package,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import UnifiedRequestModal from '@/components/requests/UnifiedRequestModal';

export default function RequisitionsPage() {
  const { currentUser, isOfficer, isApprover, isAdmin } = useAuth();
  const isTeacher =
    currentUser?.role === 'APPROVER' ||
    currentUser?.email?.includes('teacher') ||
    currentUser?.name?.startsWith('อ.') ||
    currentUser?.name?.startsWith('ผศ.') ||
    currentUser?.name?.startsWith('รศ.');
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New Requisition Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [newReq, setNewReq] = useState({
    courseId: '',
    purpose: '',
    dateNeeded: '',
    items: [{ itemId: '', quantity: 10 }],
  });

  // Action Dispense Modal
  const [activeReqForDispense, setActiveReqForDispense] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchRequisitions = async () => {
    try {
      const [reqRes, itemsRes, coursesRes] = await Promise.all([
        fetch('/api/requisitions'),
        fetch('/api/items?type=CONSUMABLE&compact=true'),
        fetch('/api/courses?compact=true'),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequisitions(data);
      }
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setConsumables(items);
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData);
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
      alert('กรุณากรอกข้อมูลและเลือกรายวิชาทางการพยาบาลให้ครบถ้วน');
      return;
    }
    const emptyRow = newReq.items.find((it) => !it.itemId);
    if (emptyRow) {
      alert('กรุณาเลือกรายการวัสดุสิ้นเปลืองให้ครบทุกแถว');
      return;
    }

    // Validate that none of the items exceed available stock
    for (const it of newReq.items) {
      const itemInfo = consumables.find((c) => c.id === it.itemId);
      if (itemInfo) {
        if (itemInfo.currentStock <= 0) {
          alert(`วัสดุ "${itemInfo.name}" สินค้าหมดในคลัง ไม่สามารถขอเบิกได้`);
          return;
        }
        if (it.quantity > itemInfo.currentStock) {
          alert(
            `ไม่สามารถขอเบิกเกินสต็อกได้:\nวัสดุ "${itemInfo.name}" มีคงเหลือในคลังเพียง ${itemInfo.currentStock} ${itemInfo.unit} (ท่านระบุ ${it.quantity} ${itemInfo.unit})`
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          courseId: newReq.courseId,
          advisorName: courses.find((c) => c.id === newReq.courseId)?.instructorName || null,
          purpose: newReq.purpose,
          dateNeeded: newReq.dateNeeded,
          items: newReq.items,
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewReq({
          courseId: '',
          purpose: '',
          dateNeeded: '',
          items: [{ itemId: '', quantity: 10 }],
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

  const handleAcknowledge = async (reqId: string) => {
    setAcknowledgingId(reqId);
    try {
      const res = await fetch(`/api/requisitions/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          userId: currentUser?.id,
          advisorName: currentUser?.name,
        }),
      });

      if (res.ok) {
        await fetchRequisitions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to acknowledge');
      }
    } catch (err) {
      alert('Error updating requisition');
    } finally {
      setAcknowledgingId(null);
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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowUnifiedModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-teal-600/25 transition cursor-pointer ring-2 ring-teal-400/30"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>ยื่นคำขอรวม (เบิกวัสดุ + ยืมครุภัณฑ์)</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ขอเบิกเฉพาะวัสดุ</span>
          </button>
        </div>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <LoadingSpinner
              message="กำลังโหลดรายการคำขอเบิกวัสดุ..."
              submessage="กำลังดึงข้อมูลการจัดสรรตามรายวิชาและสต็อกคงเหลือจาก Supabase"
            />
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
                  {req.borrowRequest && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-teal-50 to-indigo-50 text-indigo-800 border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-indigo-600" /> คำขอรวม One-Stop
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                    [{req.course?.code}] {req.course?.name}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{req.user?.name}</span>
                  </div>
                  {req.instructorAcknowledged ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>อ.รับทราบแล้ว ({req.advisorName || req.course?.instructorName || 'อาจารย์'}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>รออาจารย์รับทราบ ({req.advisorName || req.course?.instructorName || 'อาจารย์ผู้รับผิดชอบ'})</span>
                    </span>
                  )}
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

                <div className="text-right flex flex-col justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold block mb-0.5">มูลค่าต้นทุนวัสดุ:</span>
                  <div className="text-base font-black text-emerald-700">
                    ฿{req.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                    <div>
                      <strong>กำหนดใช้:</strong> {new Date(req.dateNeeded).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                    </div>
                    {req.dispensedAt && (
                      <div className="text-teal-700 font-bold">
                        ✓ <strong>จ่ายของจริง:</strong> {new Date(req.dispensedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                        {req.officer?.name && <span className="block text-[10px] text-slate-500 font-normal">จนท. ผู้จ่าย: {req.officer.name}</span>}
                      </div>
                    )}
                  </div>
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

              {/* Linked Borrow Items for Unified Requests */}
              {req.borrowRequest && (
                <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      📦 ครุภัณฑ์ที่ขอยืมพร้อมกัน ({req.borrowRequest.requestNumber}):
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold border border-blue-200">
                      สถานะ: {req.borrowRequest.status}
                    </span>
                  </div>
                  <div className="space-y-1 pl-5 text-[11px] text-blue-900 divide-y divide-blue-100/80">
                    {req.borrowRequest.items?.map((bItem: any, bIdx: number) => (
                      <div key={bIdx} className="flex items-center justify-between pt-1">
                        <span>• {bItem.item?.name} {bItem.asset ? `(${bItem.asset.assetCode})` : ''}</span>
                        <span className="font-bold text-blue-700">
                          จำนวน {bItem.quantity} {bItem.item?.unit || 'ชิ้น'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructor Acknowledgment Button for Pending Requests */}
              {req.status === 'PENDING' && !req.instructorAcknowledged && (isTeacher || isApprover || isAdmin) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 bg-indigo-50/40 -mx-5 -mb-5 p-3.5 rounded-b-2xl">
                  <span className="text-xs text-indigo-900 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    คำขอนี้ยังรอยืนยันการรับทราบจากอาจารย์ประจำวิชา
                  </span>
                  <button
                    disabled={acknowledgingId === req.id || submitting}
                    onClick={() => handleAcknowledge(req.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    {acknowledgingId === req.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึกการรับทราบ...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4" />
                        <span>อาจารย์กดรับทราบคำขอ (Acknowledge)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

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
                    required
                    onChange={(e) => setNewReq({ ...newReq, courseId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">-- กรุณาเลือกรายวิชาที่ขอเบิกใช้งาน --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันและเวลาที่ต้องการรับของ *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newReq.dateNeeded}
                    onChange={(e) => setNewReq({ ...newReq, dateNeeded: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400">ระบุวันและเวลาที่จะมารับวัสดุที่ห้องแล็บ</span>
                </div>
              </div>

              {newReq.courseId && (
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-teal-700 shrink-0" />
                    <span className="text-slate-600">อาจารย์ประจำรายวิชา:</span>
                    <span className="font-bold text-teal-900">
                      {courses.find((c) => c.id === newReq.courseId)?.instructorName || 'อาจารย์ผู้รับผิดชอบ'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>ขึ้นให้อัตโนมัติ</span>
                  </span>
                </div>
              )}

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

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {newReq.items.map((row: any, idx) => {
                    const categoryMap = new Map<string, string>();
                    consumables.forEach((c: any) => {
                      if (c.category?.name) {
                        categoryMap.set(c.category.id || c.category.name, c.category.name);
                      }
                    });
                    const selectedCat = row.categoryId || '';
                    const filteredConsumables = selectedCat
                      ? consumables.filter((c: any) => (c.category?.id === selectedCat || c.category?.name === selectedCat))
                      : consumables;

                    const chosenItem = consumables.find((c: any) => c.id === row.itemId);
                    const isOutOfStock = chosenItem && chosenItem.currentStock <= 0;
                    const isOverStock = chosenItem && chosenItem.currentStock > 0 && row.quantity > chosenItem.currentStock;

                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border transition ${
                        isOutOfStock || isOverStock
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          {/* Category Filter */}
                          <div className="sm:col-span-4">
                            <select
                              value={selectedCat}
                              onChange={(e) => {
                                const catVal = e.target.value;
                                setNewReq((prev: any) => {
                                  const updated = [...prev.items];
                                  updated[idx].categoryId = catVal;
                                  if (catVal && updated[idx].itemId) {
                                    const it = consumables.find((x) => x.id === updated[idx].itemId);
                                    if (it && (it.category?.id !== catVal && it.category?.name !== catVal)) {
                                      updated[idx].itemId = '';
                                    }
                                  }
                                  return { ...prev, items: updated };
                                });
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-teal-500/20"
                            >
                              <option value="">-- ทุกหมวดหมู่ --</option>
                              {Array.from(categoryMap.entries()).map(([id, name]) => (
                                <option key={id} value={id}>
                                  📁 {name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Item Dropdown */}
                          <div className="sm:col-span-5">
                            <select
                              value={row.itemId}
                              required
                              onChange={(e) => {
                                const val = e.target.value;
                                const it = consumables.find((x) => x.id === val);
                                setNewReq((prev: any) => {
                                  const updated = [...prev.items];
                                  updated[idx].itemId = val;
                                  if (it?.category?.id) {
                                    updated[idx].categoryId = it.category.id;
                                  }
                                  // Auto-adjust quantity if exceeding new item's stock
                                  if (it && it.currentStock > 0 && updated[idx].quantity > it.currentStock) {
                                    updated[idx].quantity = it.currentStock;
                                  }
                                  return { ...prev, items: updated };
                                });
                              }}
                              className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 ${
                                isOutOfStock
                                  ? 'border-rose-400 text-rose-800'
                                  : 'border-slate-300 focus:ring-teal-500/20'
                              }`}
                            >
                              <option value="">-- เลือกรายการวัสดุ ({filteredConsumables.length}) --</option>
                              {filteredConsumables.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (คงเหลือ: {c.currentStock} {c.unit}){c.currentStock <= 0 ? ' [หมดในคลัง]' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity & Delete */}
                          <div className="sm:col-span-3 flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max={chosenItem ? Math.max(1, chosenItem.currentStock) : undefined}
                              value={row.quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewReq((prev: any) => {
                                  const updated = [...prev.items];
                                  updated[idx].quantity = val;
                                  return { ...prev, items: updated };
                                });
                              }}
                              className={`w-full bg-white border rounded-lg px-2 py-1.5 text-xs font-bold text-center ${
                                isOverStock || isOutOfStock
                                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                                  : 'border-slate-300'
                              }`}
                              placeholder="จำนวน"
                            />
                            {newReq.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Real-time Stock Information / Alert */}
                        {chosenItem && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] gap-1">
                            {isOutOfStock ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                วัสดุนี้หมดในคลัง (คงเหลือ 0 {chosenItem.unit}) ไม่สามารถส่งขอเบิกได้
                              </span>
                            ) : isOverStock ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                ขอเกินสต็อกคงเหลือ! (ในคลังมีเพียง {chosenItem.currentStock} {chosenItem.unit})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                ✓ คงเหลือพร้อมเบิก: <strong className="font-bold text-emerald-800">{chosenItem.currentStock} {chosenItem.unit}</strong>
                              </span>
                            )}
                            <span className="text-slate-500">
                              ประมาณการ: <strong className="text-slate-700">฿{((chosenItem.unitCost || 0) * (row.quantity || 0)).toFixed(2)}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  <span className="inline-flex items-center gap-1.5">
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{submitting ? 'กำลังส่งคำขอเบิกวัสดุ...' : 'ส่งคำขอเบิกวัสดุ'}</span>
                  </span>
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

            {/* Item Breakdown in Dispense Modal */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-slate-700 block">
                รายการวัสดุที่กำลังจะจ่ายและตัดสต็อก:
              </span>
              {activeReqForDispense.items?.map((it: any, i: number) => (
                <div key={it.id || i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{it.item?.name}</span>
                    <span className="text-slate-500 block text-[11px]">คงคลัง: {it.item?.currentStock} {it.item?.unit}</span>
                  </div>
                  <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    จ่าย {it.quantityRequested} {it.item?.unit}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-800">
              💡 เมื่อกดยืนยันจ่ายของ ระบบจะบันทึก <b>เวลาที่จ่ายของจริง ({new Date().toLocaleTimeString('th-TH')} น.)</b> พร้อมชื่อเจ้าหน้าที่ผู้จ่าย และตัดสต็อกจาก Lot ที่หมดอายุก่อน (FIFO) โดยอัตโนมัติ
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

      {/* Unified Request Modal (All-in-One: Borrow & Requisition) */}
      <UnifiedRequestModal
        isOpen={showUnifiedModal}
        onClose={() => setShowUnifiedModal(false)}
        onSuccess={fetchRequisitions}
      />
    </div>
  );
}
