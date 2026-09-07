'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  CheckSquare,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Check,
  Layers,
  History,
  Tag,
  GraduationCap,
  QrCode,
  Sparkles,
  MapPin,
  Package
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ApprovalsPage() {
  const { currentUser, isApprover, isAdmin } = useAuth();
  const [allBorrows, setAllBorrows] = useState<any[]>([]);
  const [allRequisitions, setAllRequisitions] = useState<any[]>([]);
  const [allPracticeBookings, setAllPracticeBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BORROW' | 'REQUISITION' | 'PRACTICE'>('ALL');

  // Reject Modal State
  const [rejectItem, setRejectItem] = useState<{ id: string; type: 'BORROW' | 'REQUISITION' | 'PRACTICE' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [borrowRes, reqRes, practiceRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
        fetch('/api/practice/bookings'),
      ]);

      if (borrowRes.ok) {
        const bData = await borrowRes.json();
        setAllBorrows(bData);
      }
      if (reqRes.ok) {
        const rData = await reqRes.json();
        setAllRequisitions(rData);
      }
      if (practiceRes.ok) {
        const pData = await practiceRes.json();
        setAllPracticeBookings(Array.isArray(pData) ? pData : []);
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

  const handleApprove = async (id: string, type: 'BORROW' | 'REQUISITION' | 'PRACTICE') => {
    setSubmitting(true);
    try {
      const endpoint =
        type === 'BORROW'
          ? `/api/borrow/${id}`
          : type === 'REQUISITION'
          ? `/api/requisitions/${id}`
          : `/api/practice/bookings/${id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId: currentUser?.id,
        }),
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (id: string, type: 'BORROW' | 'REQUISITION') => {
    setAcknowledgingId(id);
    try {
      const endpoint = type === 'BORROW' ? `/api/borrow/${id}` : `/api/requisitions/${id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          userId: currentUser?.id,
          advisorName: currentUser?.name,
        }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกการรับทราบ');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectItem) return;
    setSubmitting(true);
    try {
      const endpoint =
        rejectItem.type === 'BORROW'
          ? `/api/borrow/${rejectItem.id}`
          : rejectItem.type === 'REQUISITION'
          ? `/api/requisitions/${rejectItem.id}`
          : `/api/practice/bookings/${rejectItem.id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId: currentUser?.id,
          reason: rejectionReason,
        }),
      });

      if (res.ok) {
        setRejectItem(null);
        setRejectionReason('');
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const isTeacher =
    currentUser?.role === 'APPROVER' ||
    currentUser?.email?.includes('teacher') ||
    currentUser?.name?.startsWith('อ.') ||
    currentUser?.name?.startsWith('ผศ.') ||
    currentUser?.name?.startsWith('รศ.');

  if (!isApprover && !isAdmin && !isTeacher) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
        <h3 className="font-bold text-base">เฉพาะอาจารย์ ผู้อนุมัติ หรือผู้บริหาร</h3>
        <p className="text-xs mt-1">
          กรุณาสลับบทบาทเป็น "อาจารย์ผู้สอน", "ผู้อนุมัติ (Approver)" หรือ "ผู้ดูแลระบบ (Admin)" เพื่อพิจารณาคำขอ
        </p>
      </div>
    );
  }

  // Filter helper functions
  const isApproved = (status: string) =>
    ['APPROVED', 'BORROWED', 'RETURNED_COMPLETE', 'RETURNED_WITH_ISSUE', 'DISPENSED', 'CHECKED_IN', 'COMPLETED'].includes(status);

  // Filter Borrows by statusFilter
  const filteredBorrows = allBorrows.filter((b) => {
    if (statusFilter === 'PENDING') return b.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(b.status);
    if (statusFilter === 'REJECTED') return b.status === 'REJECTED';
    return true;
  });

  // Filter Requisitions by statusFilter
  const filteredRequisitions = allRequisitions.filter((r) => {
    if (statusFilter === 'PENDING') return r.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(r.status);
    if (statusFilter === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });


  // Filter Practice Bookings by statusFilter
  const filteredPracticeBookings = allPracticeBookings.filter((p) => {
    if (statusFilter === 'PENDING') return p.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(p.status);
    if (statusFilter === 'REJECTED') return p.status === 'REJECTED';
    return true;
  });

  // Total counts for main status tabs
  const pendingCount =
    allBorrows.filter((b) => b.status === 'PENDING').length +
    allRequisitions.filter((r) => r.status === 'PENDING').length +
    allPracticeBookings.filter((p) => p.status === 'PENDING').length;

  const approvedCount =
    allBorrows.filter((b) => isApproved(b.status)).length +
    allRequisitions.filter((r) => isApproved(r.status)).length +
    allPracticeBookings.filter((p) => isApproved(p.status)).length;

  const rejectedCount =
    allBorrows.filter((b) => b.status === 'REJECTED').length +
    allRequisitions.filter((r) => r.status === 'REJECTED').length +
    allPracticeBookings.filter((p) => p.status === 'REJECTED').length;

  const currentTabTotal =
    activeTab === 'ALL'
      ? filteredBorrows.length + filteredRequisitions.length + filteredPracticeBookings.length
      : activeTab === 'BORROW'
      ? filteredBorrows.length
      : activeTab === 'REQUISITION'
      ? filteredRequisitions.length
      : filteredPracticeBookings.length;

  const getStageLabel = (status: string, type: 'BORROW' | 'REQUISITION') => {
    if (type === 'BORROW') {
      switch (status) {
        case 'APPROVED':
          return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">อนุมัติแล้ว (รอจ่ายของ)</span>;
        case 'BORROWED':
          return <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">กำลังยืมอยู่</span>;
        case 'RETURNED_COMPLETE':
          return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">คืนสมบูรณ์แล้ว</span>;
        case 'RETURNED_WITH_ISSUE':
          return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">คืนแล้ว (มีของชำรุด)</span>;
        default:
          return null;
      }
    } else {
      switch (status) {
        case 'APPROVED':
          return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">อนุมัติแล้ว (รอจัดจ่าย)</span>;
        case 'DISPENSED':
          return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">ตัดจ่ายสต็อกแล้ว</span>;
        default:
          return null;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-teal-600" />
            ศูนย์พิจารณาและประวัติการอนุมัติคำขอ (Approval Center)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            พิจารณาอนุมัติคำขอยืมครุภัณฑ์และการเบิกจ่ายวัสดุสิ้นเปลือง พร้อมตรวจสอบประวัติการอนุมัติย้อนหลัง
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" /> มีคำขอรอการพิจารณา {pendingCount} รายการ
            </span>
          </div>
        )}
      </div>

      {/* Main Status Tabs: [ รอพิจารณา | อนุมัติแล้ว | ไม่อนุมัติ ] */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => {
            setStatusFilter('PENDING');
            setActiveTab('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>รอพิจารณาอนุมัติ ({pendingCount})</span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('APPROVED');
            setActiveTab('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>ประวัติที่อนุมัติแล้ว ({approvedCount})</span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('REJECTED');
            setActiveTab('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>รายการที่ไม่อนุมัติ ({rejectedCount})</span>
        </button>
      </div>

      {/* Category Sub-Tabs */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'ALL'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ทั้งหมด ({currentTabTotal})
        </button>
        <button
          onClick={() => setActiveTab('BORROW')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'BORROW'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ยืมครุภัณฑ์ ({filteredBorrows.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUISITION')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'REQUISITION'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          เบิกวัสดุสิ้นเปลือง ({filteredRequisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('PRACTICE')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'PRACTICE'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>ขอฝึกปฏิบัติด้วยตนเอง ({filteredPracticeBookings.length})</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <LoadingSpinner
              message="กำลังโหลดข้อมูลคำขอ..."
              submessage="กำลังดึงข้อมูลคำขอยืมและเบิกจ่ายจาก Supabase"
            />
          </div>
        ) : currentTabTotal === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
            {statusFilter === 'PENDING' ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-75" />
                ยอดเยี่ยม! ไม่มีคำขอค้างรอการอนุมัติในหมวดนี้
              </>
            ) : statusFilter === 'APPROVED' ? (
              <>
                <CheckSquare className="w-10 h-10 text-teal-500 mx-auto mb-2 opacity-75" />
                ยังไม่มีประวัติรายการที่อนุมัติในหมวดนี้
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                ไม่มีรายการที่ไม่อนุมัติในหมวดนี้
              </>
            )}
          </div>
        ) : (
          <>
            {/* Section: Borrows */}
            {(activeTab === 'ALL' || activeTab === 'BORROW') &&
              filteredBorrows.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 border-l-4 ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                        ยืมครุภัณฑ์
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {req.requestNumber}
                      </span>
                      {getStageLabel(req.status, 'BORROW')}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">{req.user?.name}</span>
                        {req.user?.studentId && (
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono border border-teal-200">
                            {req.user.studentId}
                          </span>
                        )}
                      </div>
                      {req.course && (
                        <div className="font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {req.course.code}
                        </div>
                      )}
                      {req.requisitionRequest && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-teal-50 to-indigo-50 text-indigo-800 border border-indigo-200">
                          <Sparkles className="w-3 h-3 text-indigo-600" /> คำขอรวม One-Stop
                        </span>
                      )}
                      {req.instructorAcknowledged ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>อาจารย์รับทราบแล้ว ({req.advisorName || req.course?.instructorName || 'อาจารย์'}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รออาจารย์รับทราบ ({req.advisorName || req.course?.instructorName || 'อาจารย์ผู้สอน'})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>ยืม: {new Date(req.borrowDate).toLocaleDateString('th-TH')}</span>
                      <span>•</span>
                      <span>กำหนดคืน: {new Date(req.expectedReturnDate).toLocaleDateString('th-TH')}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                        ครุภัณฑ์ที่ขอ:
                      </div>
                      <div className="space-y-1">
                        {req.items?.map((it: any) => (
                          <div key={it.id} className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                            <span>• {it.item?.name} ({it.quantity} {it.item?.unit})</span>
                            {it.asset && (
                              <span className="text-[10px] font-mono text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200">
                                {it.asset.assetCode} (เครื่องที่ {it.asset.sequenceNumber || 1})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Linked Consumables in Unified Request */}
                    {req.requisitionRequest && (
                      <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200">
                        <div className="text-[11px] font-bold text-teal-900 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            วัสดุสิ้นเปลืองที่ขอเบิกพร้อมกัน ({req.requisitionRequest.requestNumber}):
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold">
                            คำขอรวม One-Stop
                          </span>
                        </div>
                        <div className="space-y-1">
                          {req.requisitionRequest.items?.map((rIt: any) => (
                            <div key={rIt.id} className="text-xs font-semibold text-teal-900 flex items-center justify-between">
                              <span>• {rIt.item?.name}</span>
                              <span className="font-bold text-teal-700">{rIt.quantityRequested} {rIt.item?.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div>
                        {!req.instructorAcknowledged ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            คำขอนี้ยังไม่ได้รับการกดรับทราบจากอาจารย์ประจำวิชา
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            อาจารย์ {req.advisorName || 'ผู้สอน'} รับทราบเรียบร้อยแล้ว
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {!req.instructorAcknowledged && (isTeacher || isAdmin || isApprover) && (
                          <button
                            disabled={acknowledgingId === req.id || submitting}
                            onClick={() => handleAcknowledge(req.id, 'BORROW')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                            title="อาจารย์ประจำวิชากดรับทราบก่อนส่งต่อการอนุมัติขั้นสุดท้าย"
                          >
                            {acknowledgingId === req.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{acknowledgingId === req.id ? 'กำลังบันทึกการรับทราบ...' : 'อาจารย์กดรับทราบคำขอ'}</span>
                          </button>
                        )}
                        <button
                          disabled={submitting}
                          onClick={() => setRejectItem({ id: req.id, type: 'BORROW' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleApprove(req.id, 'BORROW')}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>กำลังอนุมัติ...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติคำขอยืม</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        อนุมัติแล้ว {req.approvedAt ? `(${new Date(req.approvedAt).toLocaleDateString('th-TH')})` : ''}
                      </span>
                      {req.approver?.name && (
                        <span className="text-slate-500 font-medium">
                          ผู้อนุมัติ: <strong className="text-slate-700">{req.approver.name}</strong>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {req.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          เหตุผล: <strong>{req.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

            {/* Section: Requisitions */}
            {(activeTab === 'ALL' || activeTab === 'REQUISITION') &&
              filteredRequisitions.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 border-l-4 ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                        เบิกวัสดุสิ้นเปลือง
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {req.requestNumber}
                      </span>
                      {getStageLabel(req.status, 'REQUISITION')}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                        [{req.course?.code}] {req.course?.name}
                      </span>
                      <span className="text-slate-500 font-medium">โดย {req.user?.name}</span>
                      {req.instructorAcknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>อาจารย์รับทราบแล้ว ({req.advisorName || req.course?.instructorName || 'อาจารย์'}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รออาจารย์รับทราบ ({req.advisorName || req.course?.instructorName || 'อาจารย์ผู้รับผิดชอบ'})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>ต้องการใช้: {new Date(req.dateNeeded).toLocaleDateString('th-TH')}</span>
                      <span className="font-black text-emerald-700 text-sm">
                        ประมาณการต้นทุน: ฿{req.totalCost.toFixed(2)} บาท
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                        รายการวัสดุที่ขอเบิก:
                      </div>
                      <div className="space-y-1">
                        {req.items?.map((it: any) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-xs font-semibold text-slate-800"
                          >
                            <span>• {it.item?.name}</span>
                            <span>
                              {it.quantityRequested} {it.item?.unit} (~฿{it.totalCost.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div>
                        {!req.instructorAcknowledged ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            คำขอนี้ยังไม่ได้รับการกดรับทราบจากอาจารย์ประจำวิชา
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            อาจารย์ {req.advisorName || 'ผู้รับผิดชอบ'} รับทราบเรียบร้อยแล้ว
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {!req.instructorAcknowledged && (isTeacher || isAdmin || isApprover) && (
                          <button
                            disabled={acknowledgingId === req.id || submitting}
                            onClick={() => handleAcknowledge(req.id, 'REQUISITION')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                            title="อาจารย์ประจำวิชากดรับทราบก่อนส่งต่อการอนุมัติขั้นสุดท้าย"
                          >
                            {acknowledgingId === req.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{acknowledgingId === req.id ? 'กำลังบันทึกการรับทราบ...' : 'อาจารย์กดรับทราบคำขอ'}</span>
                          </button>
                        )}
                        <button
                          disabled={submitting}
                          onClick={() => setRejectItem({ id: req.id, type: 'REQUISITION' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleApprove(req.id, 'REQUISITION')}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>กำลังอนุมัติ...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติการเบิกจ่าย</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        อนุมัติแล้ว {req.approvedAt ? `(${new Date(req.approvedAt).toLocaleDateString('th-TH')})` : ''}
                      </span>
                      {req.approver?.name && (
                        <span className="text-slate-500 font-medium">
                          ผู้อนุมัติ: <strong className="text-slate-700">{req.approver.name}</strong>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {req.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          เหตุผล: <strong>{req.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

            {/* Section: Practice Bookings */}
            {(activeTab === 'ALL' || activeTab === 'PRACTICE') &&
              filteredPracticeBookings.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 border-l-4 ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-teal-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>ขอเข้าฝึกปฏิบัติด้วยตนเอง</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {b.bookingNumber}
                      </span>
                      {b.status === 'PENDING' && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> รออาจารย์อนุมัติ
                        </span>
                      )}
                      {b.status === 'APPROVED' && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" /> อนุมัติแล้ว (พร้อมสแกนเข้า)
                        </span>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 animate-pulse">
                          กำลังฝึกปฏิบัติในห้องแล็บ
                        </span>
                      )}
                      {b.status === 'COMPLETED' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ฝึกเสร็จสิ้นแล้ว ({b.actualMinutes || 0} นาที)
                        </span>
                      )}
                      {b.status === 'REJECTED' && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          ไม่อนุมัติ
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{b.user?.name}</span>
                        {b.user?.studentId && (
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono border border-teal-200">
                            {b.user.studentId}
                          </span>
                        )}
                      </div>
                      {b.course && (
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                          [{b.course.code}] {b.course.name}
                        </span>
                      )}
                      {b.advisorName && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>อาจารย์ผู้ดูแล: {b.advisorName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">หัตถการที่ขอฝึก: </span>
                      <span className="text-slate-900 font-black text-sm">{b.skillTopic}</span>
                    </div>

                    {b.objectives && (
                      <div>
                        <span className="text-slate-400 font-bold">วัตถุประสงค์ / ทักษะที่มุ่งเน้น: </span>
                        <span className="text-slate-700 font-medium">{b.objectives}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>วันที่: <strong className="text-slate-900">{b.slot?.date ? new Date(b.slot.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>เวลา: <strong className="text-slate-900">{b.slot?.startTime} - {b.slot?.endTime} น.</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>ห้องปฏิบัติการ: <strong className="text-teal-800">{b.slot?.room?.name || 'ห้องแล็บพยาบาล'}</strong></span>
                      </div>
                      {b.practiceKit && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>ชุดฝึกที่ขอเบิก: <strong className="text-amber-800">{b.practiceKit.name}</strong></span>
                        </div>
                      )}
                      {b.additionalEquipment && (
                        <div className="flex items-center gap-2 text-slate-700 sm:col-span-2">
                          <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>อุปกรณ์ขอเพิ่ม: <strong className="text-amber-800">{b.additionalEquipment}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>รออาจารย์หรือเจ้าหน้าที่พิจารณาอนุมัติคำขอเข้าฝึกปฏิบัติ</span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={submitting}
                          onClick={() => setRejectItem({ id: b.id, type: 'PRACTICE' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleApprove(b.id, 'PRACTICE')}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>กำลังอนุมัติ...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติการเข้าฝึกปฏิบัติ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        อนุมัติแล้ว {b.approvedAt ? `(${new Date(b.approvedAt).toLocaleDateString('th-TH')})` : ''}
                      </span>
                      {b.approver?.name && (
                        <span className="text-slate-500 font-medium">
                          ผู้อนุมัติ: <strong className="text-slate-700">{b.approver.name}</strong>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {b.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          เหตุผล: <strong>{b.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              ระบุเหตุผลที่ไม่อนุมัติคำขอ
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เหตุผลประกอบการพิจารณา
              </label>
              <textarea
                rows={3}
                required
                placeholder="เช่น จำนวนที่ขอเกินความจำเป็น, ติดการสอนคาบปฏิบัติการวิชาอื่น, งบประมาณคงเหลือไม่พอ"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRejectSubmit}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'กำลังบันทึกไม่อนุมัติ...' : 'ยืนยันไม่อนุมัติ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
