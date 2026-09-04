'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
  ClipboardCheck,
  RotateCcw,
  Check,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function BorrowPage() {
  const { currentUser, isOfficer, isApprover } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY'>('ALL');

  // New Request Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    courseId: '',
    purpose: '',
    borrowDate: '',
    expectedReturnDate: '',
    selectedItems: [{ itemId: '', quantity: 1 }],
  });

  // Action Modals (Checkout & Return)
  const [activeBorrowForAction, setActiveBorrowForAction] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'CHECKOUT' | 'RETURN' | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED'>('GOOD');
  const [returnNote, setReturnNote] = useState('');
  const [itemReturns, setItemReturns] = useState<{ id: string; condition: 'GOOD' | 'DAMAGED'; note: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchBorrowData = async () => {
    try {
      const [borrowRes, itemsRes, coursesRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/items?type=EQUIPMENT'),
        fetch('/api/courses'),
      ]);

      if (borrowRes.ok) {
        const data = await borrowRes.json();
        setRequests(data);
      }
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setEquipmentList(items);
        if (items.length > 0 && !newRequest.selectedItems[0].itemId) {
          setNewRequest((prev) => ({
            ...prev,
            selectedItems: [{ itemId: items[0].id, quantity: 1 }],
          }));
        }
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData);
        if (cData.length > 0 && !newRequest.courseId) {
          setNewRequest((prev) => ({ ...prev, courseId: cData[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.purpose || !newRequest.borrowDate || !newRequest.expectedReturnDate) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          courseId: newRequest.courseId || null,
          purpose: newRequest.purpose,
          borrowDate: newRequest.borrowDate,
          expectedReturnDate: newRequest.expectedReturnDate,
          items: newRequest.selectedItems,
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewRequest({
          courseId: courses[0]?.id || '',
          purpose: '',
          borrowDate: '',
          expectedReturnDate: '',
          selectedItems: [{ itemId: equipmentList[0]?.id || '', quantity: 1 }],
        });
        fetchBorrowData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create request');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSubmit = async () => {
    if (!activeBorrowForAction || !actionType) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/borrow/${activeBorrowForAction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userId: currentUser?.id,
          returnCondition: actionType === 'RETURN' ? returnCondition : undefined,
          returnNote: actionType === 'RETURN' ? returnNote : undefined,
          itemReturns: actionType === 'RETURN' ? itemReturns : undefined,
        }),
      });

      if (res.ok) {
        setActiveBorrowForAction(null);
        setActionType(null);
        setReturnNote('');
        setItemReturns([]);
        fetchBorrowData();
      } else {
        const err = await res.json();
        alert(err.error || 'Action failed');
      }
    } catch (err) {
      alert('Error updating borrow request');
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
      case 'BORROWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <RefreshCw className="w-3 h-3 text-purple-600" /> กำลังยืมอยู่
          </span>
        );
      case 'RETURNED_COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ส่งคืนเรียบร้อย
          </span>
        );
      case 'RETURNED_WITH_ISSUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> คืนแล้ว (ชำรุด/มีปัญหา)
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

  const isStaff = isOfficer || isApprover || currentUser?.role === 'ADMIN';

  const filteredRequests = requests.filter((r) => {
    // If not staff (e.g. student/general user) or if viewScope is 'MY', only show own requests
    if (!isStaff || viewScope === 'MY') {
      if (r.userId !== currentUser?.id) return false;
    }
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-teal-600" />
            ระบบยืม-คืน ครุภัณฑ์และอุปกรณ์ห้องปฏิบัติการ
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ยื่นคำขอยืมหุ่นจำลอง เครื่องมือตรวจวัด ติดตามการอนุมัติ และบันทึกการตรวจรับคืน
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ยื่นคำขอยืมครุภัณฑ์</span>
        </button>
      </div>

      {/* Filter Tabs & Scope */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'PENDING', label: 'รออนุมัติ' },
            { key: 'APPROVED', label: 'รอจ่ายของ' },
            { key: 'BORROWED', label: 'กำลังยืมอยู่' },
            { key: 'RETURNED_COMPLETE', label: 'คืนสมบูรณ์' },
            { key: 'RETURNED_WITH_ISSUE', label: 'ชำรุด/มีปัญหา' },
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

        {/* View Scope (Toggle for Staff / Info pill for Student) */}
        {isStaff ? (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewScope === 'ALL'
                  ? 'bg-white text-teal-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายการทั้งหมดในระบบ
            </button>
            <button
              onClick={() => setViewScope('MY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewScope === 'MY'
                  ? 'bg-white text-teal-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เฉพาะของฉัน
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200/70 flex items-center gap-1.5 self-start md:self-auto">
            <span>📌</span>
            <span>แสดงเฉพาะรายการยืมของท่าน ({currentUser?.name || 'นิสิต'})</span>
          </div>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            กำลังโหลดรายการคำขอยืม...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
            ไม่พบคำขอยืมครุภัณฑ์ในหมวดหมู่นี้
          </div>
        ) : (
          filteredRequests.map((req) => (
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

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>ผู้ยืม: {req.user?.name}</span>
                  </div>
                  {req.course && (
                    <div className="flex items-center gap-1.5 font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{req.course.code}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2">
                  <span className="text-slate-400 font-bold block mb-1">วัตถุประสงค์การใช้งาน:</span>
                  <p className="text-slate-800 font-medium leading-relaxed">{req.purpose}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-1">กำหนดเวลาการยืม-คืน:</span>
                  <div className="space-y-1 text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>ยืม: {new Date(req.borrowDate).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      <span>คืน: {new Date(req.expectedReturnDate).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>รายการครุภัณฑ์ที่ยืม:</span>
                  {(req.status === 'RETURNED_COMPLETE' || req.status === 'RETURNED_WITH_ISSUE') && (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      ผลการตรวจรับคืน
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {req.items?.map((it: any) => (
                    <div
                      key={it.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-800 p-1.5 rounded-lg hover:bg-white/60 transition"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        <span>{it.item?.name}</span>
                        {it.asset && (
                          <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                            Asset: {it.asset.assetCode} (เครื่องที่ {it.asset.sequenceNumber || 1})
                          </span>
                        )}
                        <span className="text-slate-500 font-normal text-[11px]">
                          จำนวน {it.quantity} {it.item?.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {it.isReturned && (
                          it.returnCondition === 'DAMAGED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              ชำรุด / เสียหาย
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              คืนสมบูรณ์
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {req.returnNote && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-rose-700 font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>บันทึกความเสียหาย/หมายเหตุ: {req.returnNote}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Officer */}
              {isOfficer && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setActiveBorrowForAction(req);
                        setActionType('CHECKOUT');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>ส่งมอบ/ตรวจจ่ายอุปกรณ์ (Check-out)</span>
                    </button>
                  )}

                  {req.status === 'BORROWED' && (
                    <button
                      onClick={() => {
                        setActiveBorrowForAction(req);
                        setActionType('RETURN');
                        setReturnCondition('GOOD');
                        setReturnNote('');
                        setItemReturns(
                          (req.items || []).map((it: any) => ({
                            id: it.id,
                            condition: 'GOOD',
                            note: '',
                          }))
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>ตรวจรับคืนอุปกรณ์ (Check-in & Inspect)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: New Borrow Request */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                ยื่นคำขอยืมครุภัณฑ์ทางการพยาบาล
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายวิชาที่ใช้ (หรือกิจกรรมการเรียนการสอน)
                </label>
                <select
                  value={newRequest.courseId}
                  onChange={(e) => setNewRequest({ ...newRequest, courseId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- ไม่ระบุรายวิชา (ฝึกทักษะทั่วไป) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่ต้องการยืม *
                  </label>
                  <input
                    type="date"
                    required
                    value={newRequest.borrowDate}
                    onChange={(e) => setNewRequest({ ...newRequest, borrowDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กำหนดวันส่งคืน *
                  </label>
                  <input
                    type="date"
                    required
                    value={newRequest.expectedReturnDate}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, expectedReturnDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์และสถานที่ใช้งาน *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น ฝึกหัตถการแทงเส้นและตรวจสัญญาณชีพ ห้อง Lab 2"
                  value={newRequest.purpose}
                  onChange={(e) => setNewRequest({ ...newRequest, purpose: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Items Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลือกครุภัณฑ์ที่ต้องการยืม
                </label>
                <div className="space-y-2">
                  {newRequest.selectedItems.map((sItem, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={sItem.itemId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewRequest((prev) => {
                            const updated = [...prev.selectedItems];
                            updated[idx].itemId = val;
                            return { ...prev, selectedItems: updated };
                          });
                        }}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        {equipmentList.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} (พร้อมใช้ {eq.currentStock} {eq.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={sItem.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewRequest((prev) => {
                            const updated = [...prev.selectedItems];
                            updated[idx].quantity = val;
                            return { ...prev, selectedItems: updated };
                          });
                        }}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center"
                      />
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
                  {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอยืมครุภัณฑ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Checkout / Return Action */}
      {activeBorrowForAction && actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {actionType === 'CHECKOUT' ? (
                <>
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  ยืนยันการส่งมอบครุภัณฑ์ (Check-out)
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 text-purple-600" />
                  ตรวจรับคืนครุภัณฑ์ (Check-in)
                </>
              )}
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800">
                คำขอ: {activeBorrowForAction.requestNumber}
              </div>
              <div className="text-slate-600">ผู้ยืม: {activeBorrowForAction.user?.name}</div>
            </div>

            {actionType === 'RETURN' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ตรวจรับคืนและประเมินสภาพแยกตามรายชิ้น (Item Inspection) *
                  </label>
                  <div className="space-y-2.5">
                    {activeBorrowForAction.items?.map((it: any) => {
                      const currentItemRet = itemReturns.find((ir) => ir.id === it.id);
                      const condition = currentItemRet?.condition || 'GOOD';

                      return (
                        <div
                          key={it.id}
                          className={`p-3 rounded-xl border transition ${
                            condition === 'DAMAGED'
                              ? 'bg-rose-50/60 border-rose-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${condition === 'DAMAGED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                <span>{it.item?.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                จำนวน {it.quantity} {it.item?.unit}
                                {it.asset && (
                                  <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-teal-700 ml-1.5">
                                    รหัส: {it.asset.assetCode} (เครื่องที่ {it.asset.sequenceNumber || 1})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setItemReturns((prev) =>
                                    prev.map((ir) =>
                                      ir.id === it.id ? { ...ir, condition: 'GOOD' } : ir
                                    )
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  condition === 'GOOD'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>สมบูรณ์</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setItemReturns((prev) =>
                                    prev.map((ir) =>
                                      ir.id === it.id ? { ...ir, condition: 'DAMAGED' } : ir
                                    )
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  condition === 'DAMAGED'
                                    ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                                    : 'bg-white border border-slate-200 text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>ชำรุด</span>
                              </button>
                            </div>
                          </div>

                          {condition === 'DAMAGED' && (
                            <div className="mt-2 pt-2 border-t border-rose-200/60">
                              <input
                                type="text"
                                placeholder="ระบุอาการชำรุดของรายการนี้ เช่น หูฟังยางฉีกขาด, หน้าจอไม่ติด"
                                value={currentItemRet?.note || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItemReturns((prev) =>
                                    prev.map((ir) =>
                                      ir.id === it.id ? { ...ir, note: val } : ir
                                    )
                                  );
                                }}
                                className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1 text-xs text-rose-900 placeholder:text-rose-300 focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมายเหตุภาพรวมการตรวจรับคืน (ถ้ามี)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="บันทึกเพิ่มเติมจากเจ้าหน้าที่ประจำห้องปฏิบัติการ..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveBorrowForAction(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleActionSubmit}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
