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
  Package,
  Building2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ApprovalsPage() {
  const { currentUser, isApprover, isAdmin, isOfficer, isTeacher } = useAuth();
  const canApprove = isApprover || isAdmin || isOfficer;
  const isPureTeacher = !canApprove && isTeacher;
  const [allBorrows, setAllBorrows] = useState<any[]>([]);
  const [allRequisitions, setAllRequisitions] = useState<any[]>([]);
  const [allPracticeBookings, setAllPracticeBookings] = useState<any[]>([]);
  const [allRoomBookings, setAllRoomBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM'>('ALL');
  const [viewScope, setViewScope] = useState<'RELEVANT' | 'ALL'>('RELEVANT');

  useEffect(() => {
    if (isAdmin) {
      setViewScope('ALL');
    } else {
      setViewScope('RELEVANT');
    }
  }, [isAdmin]);

  // Reject Modal State
  const [rejectItem, setRejectItem] = useState<{ id: string; type: 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [borrowRes, reqRes, practiceRes, roomRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
        fetch('/api/practice/bookings'),
        fetch('/api/room-bookings'),
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
      if (roomRes.ok) {
        const rmData = await roomRes.json();
        setAllRoomBookings(Array.isArray(rmData) ? rmData : []);
      }
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string, type: 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM') => {
    setApprovingId(id);
    setSubmitting(true);
    try {
      const endpoint =
        type === 'BORROW'
          ? `/api/borrow/${id}`
          : type === 'REQUISITION'
          ? `/api/requisitions/${id}`
          : type === 'ROOM'
          ? `/api/room-bookings/${id}`
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
      setApprovingId(null);
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
          : rejectItem.type === 'ROOM'
          ? `/api/room-bookings/${rejectItem.id}`
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

  // Normalize Thai academic titles and prefixes for matching
  const cleanThaiTitle = (name?: string | null) => {
    if (!name) return '';
    return name
      .replace(/^(ศ\.ดร\.|ศ\.|รศ\.ดร\.|รศ\.|ผศ\.ดร\.|ผศ\.|ดร\.|อ\.นพ\.|อ\.พญ\.|อ\.|นพ\.|พญ\.|นายแพทย์|แพทย์หญิง|อาจารย์)\s*/i, '')
      .trim()
      .toLowerCase();
  };

  // Check if an item is directly relevant to the current user (as teacher, advisor, course instructor, or creator)
  const isRelevantToTeacher = (item: any, user: any): boolean => {
    if (!user) return false;
    const uClean = cleanThaiTitle(user.name);
    const uId = user.id;

    // Direct creator, assigned approver, or acknowledger
    if (item.userId === uId || item.approverId === uId || item.approvedById === uId || item.acknowledgedById === uId) {
      return true;
    }

    // Check advisorName
    if (item.advisorName) {
      const advClean = cleanThaiTitle(item.advisorName);
      if (advClean && (advClean.includes(uClean) || uClean.includes(advClean))) {
        return true;
      }
    }

    // Check course instructorName
    if (item.course?.instructorName) {
      const instClean = cleanThaiTitle(item.course.instructorName);
      if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
        return true;
      }
    }

    // Check practice booking instructor
    if (item.instructor) {
      const instClean = cleanThaiTitle(item.instructor);
      if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
        return true;
      }
    }

    // Check linked requisition request
    if (item.requisitionRequest) {
      if (item.requisitionRequest.advisorName) {
        const advClean = cleanThaiTitle(item.requisitionRequest.advisorName);
        if (advClean && (advClean.includes(uClean) || uClean.includes(advClean))) {
          return true;
        }
      }
      if (item.requisitionRequest.course?.instructorName) {
        const instClean = cleanThaiTitle(item.requisitionRequest.course.instructorName);
        if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
          return true;
        }
      }
    }

    // Check linked borrow request
    if (item.borrowRequest) {
      if (item.borrowRequest.advisorName) {
        const advClean = cleanThaiTitle(item.borrowRequest.advisorName);
        if (advClean && (advClean.includes(uClean) || uClean.includes(advClean))) {
          return true;
        }
      }
      if (item.borrowRequest.course?.instructorName) {
        const instClean = cleanThaiTitle(item.borrowRequest.course.instructorName);
        if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
          return true;
        }
      }
    }

    return false;
  };

  // Base datasets filtered by scope (RELEVANT: only requests involving this teacher vs ALL: all faculty requests)
  const scopedBorrows =
    viewScope === 'ALL'
      ? allBorrows
      : allBorrows.filter((b) => isRelevantToTeacher(b, currentUser));

  const scopedRequisitions =
    viewScope === 'ALL'
      ? allRequisitions
      : allRequisitions.filter((r) => isRelevantToTeacher(r, currentUser));

  const scopedPracticeBookings =
    viewScope === 'ALL'
      ? allPracticeBookings
      : allPracticeBookings.filter((p) => isRelevantToTeacher(p, currentUser));

  const scopedRoomBookings =
    viewScope === 'ALL'
      ? allRoomBookings
      : allRoomBookings.filter((r) => isRelevantToTeacher(r, currentUser));

  // Filter Borrows by statusFilter
  const filteredBorrows = scopedBorrows.filter((b) => {
    if (statusFilter === 'PENDING') return b.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(b.status);
    if (statusFilter === 'REJECTED') return b.status === 'REJECTED';
    return true;
  });

  // Filter Requisitions by statusFilter (exclude requisitions that are already linked & shown inside a unified BorrowRequest)
  const filteredRequisitions = scopedRequisitions.filter((r) => {
    if (r.borrowRequest) return false;
    if (statusFilter === 'PENDING') return r.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(r.status);
    if (statusFilter === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  // Filter Practice Bookings by statusFilter
  const filteredPracticeBookings = scopedPracticeBookings.filter((p) => {
    if (statusFilter === 'PENDING') return p.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(p.status);
    if (statusFilter === 'REJECTED') return p.status === 'REJECTED';
    return true;
  });

  // Filter Room Bookings by statusFilter
  const filteredRoomBookings = scopedRoomBookings.filter((r) => {
    if (statusFilter === 'PENDING') return r.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(r.status);
    if (statusFilter === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  // Total counts for main status tabs (unified requests counted once)
  const pendingCount =
    scopedBorrows.filter((b) => b.status === 'PENDING').length +
    scopedRequisitions.filter((r) => !r.borrowRequest && r.status === 'PENDING').length +
    scopedPracticeBookings.filter((p) => p.status === 'PENDING').length +
    scopedRoomBookings.filter((r) => r.status === 'PENDING').length;

  const approvedCount =
    scopedBorrows.filter((b) => isApproved(b.status)).length +
    scopedRequisitions.filter((r) => !r.borrowRequest && isApproved(r.status)).length +
    scopedPracticeBookings.filter((p) => isApproved(p.status)).length +
    scopedRoomBookings.filter((r) => isApproved(r.status)).length;

  const rejectedCount =
    scopedBorrows.filter((b) => b.status === 'REJECTED').length +
    scopedRequisitions.filter((r) => !r.borrowRequest && r.status === 'REJECTED').length +
    scopedPracticeBookings.filter((p) => p.status === 'REJECTED').length +
    scopedRoomBookings.filter((r) => r.status === 'REJECTED').length;

  const currentTabTotal =
    activeTab === 'ALL'
      ? filteredBorrows.length + filteredRequisitions.length + filteredPracticeBookings.length + filteredRoomBookings.length
      : activeTab === 'BORROW'
      ? filteredBorrows.length
      : activeTab === 'REQUISITION'
      ? filteredRequisitions.length
      : activeTab === 'PRACTICE'
      ? filteredPracticeBookings.length
      : filteredRoomBookings.length;

  // Total items in system vs relevant to teacher
  const totalSystemItems =
    allBorrows.length +
    allRequisitions.filter((r) => !r.borrowRequest).length +
    allPracticeBookings.length +
    allRoomBookings.length;

  const totalRelevantItems =
    allBorrows.filter((b) => isRelevantToTeacher(b, currentUser)).length +
    allRequisitions.filter((r) => !r.borrowRequest && isRelevantToTeacher(r, currentUser)).length +
    allPracticeBookings.filter((p) => isRelevantToTeacher(p, currentUser)).length +
    allRoomBookings.filter((r) => isRelevantToTeacher(r, currentUser)).length;

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

        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
              อัปเดตล่าสุด: {lastUpdated} น.
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60 transition active:scale-95"
            title="กดเพื่อดึงข้อมูลคำขอและการอนุมัติล่าสุดทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
          </button>

          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" /> มีคำขอรอการพิจารณา {pendingCount} รายการ
            </span>
          )}
        </div>
      </div>

      {/* Scope Selector: [ เฉพาะคำขอที่ฉันรับผิดชอบ | ทั้งหมดในระบบ ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-50/70 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 p-3.5 rounded-2xl border border-teal-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>ขอบเขตรายการที่แสดง:</span>
              <span className="text-teal-700 dark:text-teal-400 font-extrabold">
                {viewScope === 'RELEVANT' ? 'เฉพาะคำขอที่เกี่ยวข้องกับท่าน (ตามรายวิชา/อาจารย์ที่ปรึกษา)' : 'คำขอทั้งหมดในระบบ (ทุกรายวิชา)'}
              </span>
            </div>
            {currentUser && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                อาจารย์ผู้ใช้งาน: <strong className="text-slate-700 dark:text-slate-300">{currentUser.name}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-transparent dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewScope('RELEVANT')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'RELEVANT'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>เฉพาะที่เกี่ยวข้องกับฉัน ({totalRelevantItems})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>ทั้งหมดในระบบ ({totalSystemItems})</span>
          </button>
        </div>
      </div>

      {/* Main Status Tabs: [ รอพิจารณา | อนุมัติแล้ว | ไม่อนุมัติ ] */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <button
          onClick={() => {
            setStatusFilter('PENDING');
            setActiveTab('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>ประวัติไม่อนุมัติ ({rejectedCount})</span>
        </button>
      </div>

      {/* Sub-tabs: Filter by Request Type */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit border border-transparent dark:border-slate-700">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          ทั้งหมด ({currentTabTotal})
        </button>
        <button
          onClick={() => setActiveTab('BORROW')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'BORROW'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          คำขอเบิก-ยืมพัสดุ ({filteredBorrows.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUISITION')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'REQUISITION'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          คำขอเบิกเฉพาะวัสดุ ({filteredRequisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('PRACTICE')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PRACTICE'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>ขอฝึกปฏิบัติด้วยตนเอง ({filteredPracticeBookings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ROOM')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ROOM'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>จองห้องใช้งาน ({filteredRoomBookings.length})</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <LoadingSpinner
              message="กำลังโหลดข้อมูลคำขอ..."
              submessage="กำลังดึงข้อมูลคำขอยืมและเบิกจ่ายจาก Supabase"
            />
          </div>
        ) : currentTabTotal === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-10 sm:p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs space-y-3 transition-colors">
            {statusFilter === 'PENDING' ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-1 opacity-85" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ไม่มีคำขอค้างรอการอนุมัติในหมวดนี้</p>
                {viewScope === 'RELEVANT' && totalSystemItems > 0 && (
                  <div className="pt-2 text-slate-500 dark:text-slate-400 text-[11px] max-w-md mx-auto space-y-2">
                    <p>ขณะนี้ไม่มีคำขอที่ระบุชื่อของท่านเป็นอาจารย์ผู้รับทราบหรืออาจารย์ประจำวิชาในสถานะนี้</p>
                    <button
                      type="button"
                      onClick={() => setViewScope('ALL')}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/80 font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>สลับไปดูคำขอทั้งหมดในระบบ ({totalSystemItems} รายการ)</span>
                    </button>
                  </div>
                )}
              </>
            ) : statusFilter === 'APPROVED' ? (
              <>
                <CheckSquare className="w-10 h-10 text-teal-500 mx-auto mb-1 opacity-85" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ยังไม่มีประวัติรายการที่อนุมัติในหมวดนี้</p>
                {viewScope === 'RELEVANT' && totalSystemItems > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setViewScope('ALL')}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/80 font-bold transition inline-flex items-center gap-1.5 cursor-pointer text-[11px]"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>ดูประวัติการอนุมัติทั้งหมดในระบบ</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ไม่มีรายการที่ไม่อนุมัติในหมวดนี้</p>
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
                  className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 transition-colors ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {req.requisitionRequest ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          คำขอรวม (เบิกวัสดุ + ยืมครุภัณฑ์)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
                          ยืมครุภัณฑ์
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {req.requestNumber}
                        {req.requisitionRequest && ` + ${req.requisitionRequest.requestNumber}`}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                      {req.useTarget === 'HUMAN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                          🚨 ใช้กับคนจริง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          🧪 ฝึกกับหุ่นจำลอง
                        </span>
                      )}
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
                              <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/80">
                                {it.asset.assetCode} ({it.item?.unit || 'ชิ้น'}ที่ {it.asset.sequenceNumber || 1})
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

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!req.instructorAcknowledged && (isTeacher || canApprove) && (
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

                        {isPureTeacher && req.instructorAcknowledged && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ท่านรับทราบแล้ว (รอผู้อนุมัติ/หัวหน้าภาคปล่อยของ)
                          </span>
                        )}

                        <button
                          disabled={submitting}
                          onClick={() => setRejectItem({ id: req.id, type: 'BORROW' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>

                        {canApprove && (
                          <button
                            disabled={submitting}
                            onClick={() => handleApprove(req.id, 'BORROW')}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                          >
                            {approvingId === req.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>กำลังอนุมัติ...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>
                                  {!req.instructorAcknowledged && isRelevantToTeacher(req, currentUser)
                                    ? req.requisitionRequest
                                      ? 'อนุมัติคำขอรวม (ควบรวมรับทราบ)'
                                      : 'อนุมัติคำขอยืม (ควบรวมรับทราบ)'
                                    : req.requisitionRequest
                                    ? 'อนุมัติคำขอรวม (ยืม+เบิก)'
                                    : 'อนุมัติคำขอยืม'}
                                </span>
                              </>
                            )}
                          </button>
                        )}
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
                  className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 transition-colors ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                      {req.useTarget === 'HUMAN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                          🚨 ใช้กับคนจริง (ห้ามของหมดอายุ)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          🧪 ฝึกกับหุ่นจำลอง
                        </span>
                      )}
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

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!req.instructorAcknowledged && (isTeacher || canApprove) && (
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

                        {isPureTeacher && req.instructorAcknowledged && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ท่านรับทราบแล้ว (รอหัวหน้าภาค/เจ้าหน้าที่แล็บอนุมัติจ่ายของ)
                          </span>
                        )}

                        <button
                          disabled={submitting}
                          onClick={() => setRejectItem({ id: req.id, type: 'REQUISITION' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>

                        {canApprove && (
                          <button
                            disabled={submitting}
                            onClick={() => handleApprove(req.id, 'REQUISITION')}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                          >
                            {approvingId === req.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>กำลังอนุมัติ...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>
                                  {!req.instructorAcknowledged && isRelevantToTeacher(req, currentUser)
                                    ? 'อนุมัติการเบิกจ่าย (ควบรวมรับทราบ)'
                                    : 'อนุมัติการเบิกจ่าย'}
                                </span>
                              </>
                            )}
                          </button>
                        )}
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
                  className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 transition-colors ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-teal-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
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
                          {approvingId === b.id ? (
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

            {/* Room Booking Cards */}
            {(activeTab === 'ALL' || activeTab === 'ROOM') &&
              filteredRoomBookings.map((rm) => (
                <div
                  key={rm.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 hover:shadow-md transition shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        จองห้องใช้งาน
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {rm.bookingNumber}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      ยื่นคำขอเมื่อ: {new Date(rm.createdAt).toLocaleDateString('th-TH')} {new Date(rm.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{rm.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rm.purpose}
                        </span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>ผู้จอง: <strong className="text-slate-700 dark:text-slate-300">{rm.user?.name || '-'}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>ห้อง: <strong className="text-indigo-800 dark:text-indigo-300">{rm.room?.name || 'ห้องปฏิบัติการ'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>วันที่: <strong className="text-slate-900 dark:text-slate-100">{new Date(rm.bookingDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>เวลา: <strong className="text-slate-900 dark:text-slate-100">{rm.startTime} - {rm.endTime} น.</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>ผู้เข้าร่วม: <strong className="text-slate-900 dark:text-slate-100">{rm.attendeesCount} คน</strong></span>
                      </div>
                    </div>

                    {(rm.course || rm.advisorName || rm.contactPhone || rm.equipmentNeeded || rm.note) && (
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                        {rm.course && (
                          <div>
                            <span className="font-bold text-slate-500">วิชาที่เกี่ยวข้อง: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.course.courseCode} {rm.course.courseName}</span>
                          </div>
                        )}
                        {rm.advisorName && (
                          <div>
                            <span className="font-bold text-slate-500">อาจารย์ผู้รับผิดชอบ/ที่ปรึกษา: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.advisorName}</span>
                          </div>
                        )}
                        {rm.contactPhone && (
                          <div>
                            <span className="font-bold text-slate-500">เบอร์โทรศัพท์ติดต่อ: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.contactPhone}</span>
                          </div>
                        )}
                        {rm.equipmentNeeded && (
                          <div>
                            <span className="font-bold text-amber-700 dark:text-amber-400">อุปกรณ์/ครุภัณฑ์ที่ต้องการใช้: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.equipmentNeeded}</span>
                          </div>
                        )}
                        {rm.note && (
                          <div>
                            <span className="font-bold text-slate-500">หมายเหตุเพิ่มเติม: </span>
                            <span className="text-slate-800 dark:text-slate-200">{rm.note}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>รออาจารย์หรือเจ้าหน้าที่พิจารณาอนุมัติคำขอใช้ห้องปฏิบัติการ</span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={submitting}
                          onClick={() => setRejectItem({ id: rm.id, type: 'ROOM' })}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleApprove(rm.id, 'ROOM')}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
                        >
                          {approvingId === rm.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>กำลังอนุมัติ...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติการใช้ห้อง</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        อนุมัติแล้ว {rm.approvedAt ? `(${new Date(rm.approvedAt).toLocaleDateString('th-TH')})` : ''}
                      </span>
                      {rm.approver?.name && (
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          ผู้อนุมัติ: <strong className="text-slate-700 dark:text-slate-200">{rm.approver.name}</strong>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {rm.rejectionReason && (
                        <span className="text-rose-700 dark:text-rose-400 font-medium">
                          เหตุผล: <strong>{rm.rejectionReason}</strong>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              ระบุเหตุผลที่ไม่อนุมัติคำขอ
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                เหตุผลประกอบการพิจารณา
              </label>
              <textarea
                rows={3}
                required
                placeholder="เช่น จำนวนที่ขอเกินความจำเป็น, ติดการสอนคาบปฏิบัติการวิชาอื่น, งบประมาณคงเหลือไม่พอ"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
