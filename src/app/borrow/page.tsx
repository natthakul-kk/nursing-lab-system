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
  Search,
  GraduationCap,
  Sparkles,
  Boxes,
  Package,
  X,
  QrCode,
  Tag,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import UnifiedRequestModal from '@/components/requests/UnifiedRequestModal';

export default function BorrowPage() {
  const { currentUser, isOfficer, isApprover, isAdmin, isTeacher } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY'>('ALL');

  // New Request Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [newRequest, setNewRequest] = useState<{
    courseId: string;
    advisorName: string;
    purpose: string;
    borrowDate: string;
    expectedReturnDate: string;
    selectedItems: { itemId: string; quantity: number | string; categoryId?: string }[];
  }>({
    courseId: '',
    advisorName: '',
    purpose: '',
    borrowDate: '',
    expectedReturnDate: '',
    selectedItems: [{ itemId: '', quantity: '' }],
  });

  // Action Modals (Checkout & Return)
  const [activeBorrowForAction, setActiveBorrowForAction] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'CHECKOUT' | 'RETURN' | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED'>('GOOD');
  const [returnNote, setReturnNote] = useState('');
  const [itemReturns, setItemReturns] = useState<{ id: string; condition: 'GOOD' | 'DAMAGED'; note: string }[]>([]);
  const [consumablesList, setConsumablesList] = useState<any[]>([]);
  const [checkoutBorrowItems, setCheckoutBorrowItems] = useState<{
    id: string;
    itemId?: string;
    name: string;
    unit: string;
    requestedQty: number;
    quantity: number;
    allowed: boolean;
    assetId?: string | null;
    assetCode: string | null;
  }[]>([]);
  const [checkoutReqItems, setCheckoutReqItems] = useState<{
    id: string;
    itemId?: string;
    name: string;
    unit: string;
    requestedQty: number;
    quantity: number;
    allowed: boolean;
    currentStock: number;
  }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchBorrowData = async () => {
    try {
      const [borrowRes, itemsRes, consumablesRes, coursesRes, usersRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/items?type=EQUIPMENT&compact=true'),
        fetch('/api/items?type=CONSUMABLE&compact=true'),
        fetch('/api/courses?compact=true'),
        fetch('/api/users?role=APPROVER'),
      ]);

      if (borrowRes.ok) {
        const data = await borrowRes.json();
        setRequests(data);
      }
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setEquipmentList(items);
      }
      if (consumablesRes.ok) {
        const cItems = await consumablesRes.json();
        setConsumablesList(cItems);
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        // Filter teachers/approvers or instructors
        const teacherList = uData.filter(
          (u: any) =>
            u.role === 'APPROVER' ||
            u.email.includes('teacher') ||
            u.email.includes('approver') ||
            u.name.startsWith('อ.') ||
            u.name.startsWith('ผศ.') ||
            u.name.startsWith('รศ.')
        );
        setInstructors(teacherList.length > 0 ? teacherList : uData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status') || params.get('tab');
      if (s) setFilterStatus(s);
    }
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    try {
      const validItems = newRequest.selectedItems.filter((i) => i.itemId);
      if (validItems.length === 0) {
        alert('กรุณาเลือกรายการครุภัณฑ์อย่างน้อย 1 รายการ');
        setSubmitting(false);
        return;
      }

      if (currentUser?.role === 'USER' && !isTeacher && !newRequest.advisorName?.trim()) {
        alert('⚠️ เนื่องจากท่านเป็นนิสิต กรุณาระบุหรือเลือกอาจารย์ผู้รับทราบ/อาจารย์ประจำวิชา (ไม่อนุญาตให้เว้นว่าง)');
        setSubmitting(false);
        return;
      }

      // Pre-validation: ensure quantity is entered and >= 1
      for (const reqItem of validItems) {
        const q = Number(reqItem.quantity);
        if (!q || q < 1) {
          alert('กรุณาระบุจำนวนครุภัณฑ์ที่ต้องการยืมให้ถูกต้อง (อย่างน้อย 1)');
          setSubmitting(false);
          return;
        }
      }

      // Pre-validation: ensure requested quantity does not exceed available assets
      for (const reqItem of validItems) {
        const eq = equipmentList.find((e) => e.id === reqItem.itemId);
        const q = Number(reqItem.quantity);
        if (eq) {
          if (eq.currentStock <= 0) {
            alert(`ไม่สามารถขอยืมได้: ครุภัณฑ์ "${eq.name}" ไม่มีอุปกรณ์ที่พร้อมใช้งานในขณะนี้`);
            setSubmitting(false);
            return;
          }
          if (q > eq.currentStock) {
            alert(
              `ไม่สามารถขอยืมเกินจำนวนพร้อมใช้ได้: ครุภัณฑ์ "${eq.name}" มีพร้อมให้ยืมเพียง ${eq.currentStock} ${eq.unit || 'ชิ้น'} (ท่านระบุ ${q} ${eq.unit || 'ชิ้น'})`
            );
            setSubmitting(false);
            return;
          }
        }
      }

      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          courseId: newRequest.courseId || null,
          advisorName: newRequest.advisorName || null,
          purpose: newRequest.purpose,
          borrowDate: newRequest.borrowDate,
          expectedReturnDate: newRequest.expectedReturnDate,
          items: validItems.map((i: any) => ({ ...i, quantity: Number(i.quantity) })),
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewRequest({
          courseId: '',
          advisorName: '',
          purpose: '',
          borrowDate: '',
          expectedReturnDate: '',
          selectedItems: [{ itemId: '', quantity: '' }],
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
          borrowItemAdjustments: actionType === 'CHECKOUT' ? checkoutBorrowItems : undefined,
          assignedAssets:
            actionType === 'CHECKOUT'
              ? checkoutBorrowItems
                  .filter((i) => i.allowed && i.assetId)
                  .map((i) => ({ borrowItemId: i.id, assetId: i.assetId }))
              : undefined,
          requisitionItemAdjustments: actionType === 'CHECKOUT' ? checkoutReqItems : undefined,
        }),
      });

      if (res.ok) {
        setActiveBorrowForAction(null);
        setActionType(null);
        setReturnNote('');
        setItemReturns([]);
        setCheckoutBorrowItems([]);
        setCheckoutReqItems([]);
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

  const handleAcknowledge = async (borrowId: string) => {
    setAcknowledgingId(borrowId);
    try {
      const res = await fetch(`/api/borrow/${borrowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          userId: currentUser?.id,
          advisorName: currentUser?.name,
        }),
      });

      if (res.ok) {
        await fetchBorrowData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to acknowledge');
      }
    } catch (err) {
      alert('Error updating borrow request');
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
            <Boxes className="w-6 h-6 text-teal-600" />
            ระบบเบิก-ยืมพัสดุและครุภัณฑ์ (One-Stop Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์รวมยื่นคำขอเบิกวัสดุสิ้นเปลืองและยืมครุภัณฑ์ในใบเดียว อนุมัติและบันทึกจ่ายของสะดวกพร้อมกัน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowUnifiedModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-teal-600/25 transition cursor-pointer ring-2 ring-teal-400/30"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>ยื่นคำขอเบิก-ยืมพัสดุ (One-Stop)</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-medium transition cursor-pointer shadow-sm"
            title="ยื่นคำขอแบบเดิมเฉพาะครุภัณฑ์"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>ยืมเฉพาะครุภัณฑ์</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Scope */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'PENDING', label: 'รออนุมัติ' },
            { key: 'APPROVED', label: 'รอจ่ายของ' },
            { key: 'BORROWED', label: '🔄 กำลังยืมอยู่ (รอส่งคืน/ตรวจรับคืน)' },
            { key: 'RETURNED_COMPLETE', label: 'คืนแล้ว (สมบูรณ์)' },
            { key: 'RETURNED_WITH_ISSUE', label: 'คืนแล้ว (พบชำรุด)' },
          ].map((tab) => {
            const count = tab.key === 'ALL'
              ? requests.length
              : requests.filter((b: any) => b.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === tab.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === tab.key ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Scope (Toggle for Staff / Info pill for Student) */}
        {isStaff ? (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewScope === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              รายการทั้งหมดในระบบ
            </button>
            <button
              onClick={() => setViewScope('MY')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewScope === 'MY'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              เฉพาะของฉัน
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200/70 dark:border-teal-800 flex items-center gap-1.5 self-start md:self-auto">
            <span>📌</span>
            <span>แสดงเฉพาะรายการยืมของท่าน ({currentUser?.name || 'นิสิต'})</span>
          </div>
        )}
      </div>

      {/* Return Helper Info Banner */}
      {filterStatus === 'BORROWED' && (
        <div className="bg-purple-50/90 border border-purple-200 text-purple-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-600/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-purple-900 text-sm font-bold block">ศูนย์ตรวจรับคืนอุปกรณ์ (Equipment Return & Check-in)</strong>
              <p className="text-purple-700 text-xs font-medium mt-0.5">
                {isOfficer
                  ? 'เมื่อผู้ยืมนำอุปกรณ์มาส่งคืน ให้เจ้าหน้าที่กดปุ่มสีม่วง "ตรวจรับคืนอุปกรณ์ (Check-in & Inspect)" ในรายการด้านล่าง เพื่อตรวจสภาพรายชิ้นและนำกลับเข้าคลังพร้อมใช้'
                  : 'รายการที่ท่านกำลังยืมอยู่ เมื่อใช้งานเสร็จเรียบร้อย กรุณานำอุปกรณ์มาส่งคืนและตรวจเช็คสภาพกับเจ้าหน้าที่ที่ห้องปฏิบัติการ'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <LoadingSpinner
              message="กำลังโหลดรายการคำขอยืม-คืน..."
              submessage="กำลังดึงข้อมูลสถานะการอนุมัติและประวัติการส่งคืนจาก Supabase"
            />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
            ไม่พบคำขอยืมครุภัณฑ์ในหมวดหมู่นี้
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-800/60">
                    {req.requestNumber}
                  </span>
                  <div>{getStatusBadge(req.status)}</div>
                  {req.requisitionRequest && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/60 dark:to-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> คำขอรวม One-Stop
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="dark:text-slate-200">ผู้ยืม: {req.user?.name}</span>
                    {req.user?.studentId && (
                      <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                        {req.user.studentId}
                      </span>
                    )}
                  </div>
                  {req.course && (
                    <div className="flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-800/60">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{req.course.code}</span>
                    </div>
                  )}
                  {req.instructorAcknowledged ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>อ.รับทราบแล้ว ({req.advisorName || req.course?.instructorName || 'อาจารย์'}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>รออาจารย์รับทราบ ({req.advisorName || req.course?.instructorName || 'อาจารย์ผู้สอน'})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Detailed Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                <div className="md:col-span-6">
                  <span className="text-slate-400 dark:text-slate-500 font-bold block mb-1">วัตถุประสงค์การใช้งาน & สถานที่:</span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{req.purpose}</p>
                </div>

                {/* Scheduled Times */}
                <div className="md:col-span-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80 space-y-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block border-b border-slate-200 dark:border-slate-700 pb-1">
                    📅 นัดหมายรับ-คืนของ:
                  </span>
                  <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-800 dark:text-slate-100">เวลานัดรับ:</strong>{' '}
                        {new Date(req.borrowDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-800 dark:text-slate-100">กำหนดคืน:</strong>{' '}
                        {new Date(req.expectedReturnDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actual Operation Logs (Checked out & Returned) */}
                <div className="md:col-span-3 bg-teal-50/40 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/50 space-y-1.5">
                  <span className="text-teal-800 dark:text-teal-300 font-bold text-[11px] block border-b border-teal-200 dark:border-teal-800 pb-1">
                    ⏱️ เวลาดำเนินการจริง:
                  </span>
                  <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-start gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>เวลาจ่ายของ:</strong>{' '}
                        {req.checkedOutAt ? (
                          <span className="text-teal-800 dark:text-teal-300 font-bold">
                            {new Date(req.checkedOutAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                            {req.officer?.name && <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">จนท. ผู้จ่าย: {req.officer.name}</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">ยังไม่จ่ายอุปกรณ์</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>เวลารับคืน:</strong>{' '}
                        {req.actualReturnDate ? (
                          <span className="text-purple-800 dark:text-purple-300 font-bold">
                            {new Date(req.actualReturnDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">ยังไม่ส่งคืน</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
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
                            Asset: {it.asset.assetCode} ({it.item?.unit || 'ชิ้น'}ที่ {it.asset.sequenceNumber || 1})
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

                {/* Linked Requisition Items for Unified Requests */}
                {req.requisitionRequest && (
                  <div className="mt-3 p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                      <span className="flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-teal-600" />
                        🧪 วัสดุสิ้นเปลืองที่ขอเบิกพร้อมกัน ({req.requisitionRequest.requestNumber}):
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold border border-teal-200">
                        {req.requisitionRequest.status === 'DISPENSED' ? '✓ ตัดจ่ายแล้ว (ไม่ต้องคืน)' : 'รอจ่ายพร้อมกัน'}
                      </span>
                    </div>
                    <div className="space-y-1 pl-5 text-[11px] text-teal-900 divide-y divide-teal-100/80">
                      {req.requisitionRequest.items?.map((rItem: any, rIdx: number) => (
                        <div key={rIdx} className="flex items-center justify-between pt-1">
                          <span>• {rItem.item?.name}</span>
                          <span className="font-bold text-teal-700">
                            จำนวน {rItem.quantityRequested} {rItem.item?.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {req.returnNote && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-rose-700 font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>บันทึกความเสียหาย/หมายเหตุ: {req.returnNote}</span>
                  </div>
                )}
              </div>

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

              {/* Action Buttons for Officer */}
              {isOfficer && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setActiveBorrowForAction(req);
                        setActionType('CHECKOUT');
                        setCheckoutBorrowItems(
                          (req.items || []).map((it: any) => ({
                            id: it.id,
                            itemId: it.itemId,
                            name: it.item?.name || 'ครุภัณฑ์',
                            unit: it.item?.unit || 'ชิ้น',
                            requestedQty: it.quantity,
                            quantity: it.quantity,
                            allowed: true,
                            assetId: it.assetId || null,
                            assetCode: it.asset?.assetCode || null,
                          }))
                        );
                        setCheckoutReqItems(
                          (req.requisitionRequest?.items || []).map((it: any) => ({
                            id: it.id,
                            itemId: it.itemId,
                            name: it.item?.name || 'วัสดุสิ้นเปลือง',
                            unit: it.item?.unit || 'หน่วย',
                            requestedQty: it.quantityRequested,
                            quantity: it.quantityRequested,
                            allowed: true,
                            currentStock: it.item?.currentStock || 0,
                          }))
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{req.requisitionRequest ? 'ส่งมอบครุภัณฑ์ & จ่ายวัสดุ (Check-out)' : 'ส่งมอบอุปกรณ์ (Check-out)'}</span>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                ยื่นคำขอยืมครุภัณฑ์ทางการพยาบาล
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายวิชาที่ใช้ (หรือกิจกรรมการเรียนการสอน)
                </label>
                <select
                  value={newRequest.courseId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const cMatch = courses.find((c) => c.id === cid);
                    setNewRequest({
                      ...newRequest,
                      courseId: cid,
                      advisorName: cMatch ? cMatch.instructorName : (newRequest.advisorName || ''),
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- ไม่ระบุรายวิชา (ฝึกทักษะทั่วไป / ซ้อมอิสระนอกหลักสูตร) --</option>
                  <optgroup label="เลือกรายวิชาในหลักสูตร">
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Instructor / Advisor notification box for students */}
              {newRequest.courseId ? (
                <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-teal-900 dark:text-teal-200">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>อาจารย์ประจำรายวิชา (ผู้รับทราบการยืม):</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>ขึ้นให้อัตโนมัติ</span>
                    </span>
                  </div>
                  <div className="text-teal-900 dark:text-teal-200 font-bold pl-5 text-sm">
                    {courses.find((c) => c.id === newRequest.courseId)?.instructorName || 'อาจารย์ผู้รับผิดชอบรายวิชา'}
                  </div>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 pl-5">
                    ✓ ระบบจะแจ้งให้อาจารย์ประจำวิชาทราบโดยอัตโนมัติสำหรับการฝึกปฏิบัติตามหลักสูตร
                  </p>
                </div>
              ) : (
                // Case 2: Not in course -> Select teacher / advisor
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>อาจารย์ผู้รับทราบ / อาจารย์ที่ปรึกษาการฝึกซ้อม *</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    เนื่องจากไม่ได้นำไปใช้ในรายวิชา กรุณาเลือกอาจารย์ผู้รับทราบเพื่อให้เจ้าหน้าที่ตรวจสอบก่อนส่งมอบ
                  </p>
                  <div className="space-y-1.5">
                    <select
                      value={newRequest.advisorName}
                      onChange={(e) => setNewRequest({ ...newRequest, advisorName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="">-- เลือกอาจารย์ผู้รับทราบในระบบ --</option>
                      {instructors.map((ins) => (
                        <option key={ins.id} value={ins.name}>
                          {ins.name} ({ins.department || 'อาจารย์พยาบาล'})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="หรือพิมพ์ระบุชื่ออาจารย์ด้วยตนเอง (หากไม่มีในรายชื่อ)"
                      value={newRequest.advisorName}
                      onChange={(e) => setNewRequest({ ...newRequest, advisorName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันและเวลาที่ต้องการรับของ *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newRequest.borrowDate}
                    onChange={(e) => setNewRequest({ ...newRequest, borrowDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400">ระบุวันและเวลาที่จะมารับอุปกรณ์ที่ห้องแล็บ</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันและเวลาที่กำหนดส่งคืน *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newRequest.expectedReturnDate}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, expectedReturnDate: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400">ระบุวันและเวลาที่จะนำอุปกรณ์มาส่งคืน</span>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    เลือกครุภัณฑ์ที่ต้องการยืม <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRequest((prev) => ({
                        ...prev,
                        selectedItems: [...prev.selectedItems, { itemId: '', quantity: '', categoryId: '' } as any],
                      }));
                    }}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    + เพิ่มรายการยืม
                  </button>
                </div>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {newRequest.selectedItems.map((sItem: any, idx: number) => {
                    // Extract unique categories from equipmentList
                    const categoryMap = new Map<string, string>();
                    equipmentList.forEach((eq: any) => {
                      if (eq.category?.name) {
                        categoryMap.set(eq.category.id || eq.category.name, eq.category.name);
                      }
                    });
                    const selectedCat = sItem.categoryId || '';
                    const filteredEquipments = selectedCat
                      ? equipmentList.filter((eq: any) => (eq.category?.id === selectedCat || eq.category?.name === selectedCat))
                      : equipmentList;

                    const chosenEq = equipmentList.find((eq: any) => eq.id === sItem.itemId);
                    const isOutOfStock = chosenEq && chosenEq.currentStock <= 0;
                    const isOverStock = chosenEq && chosenEq.currentStock > 0 && sItem.quantity !== '' && Number(sItem.quantity) > chosenEq.currentStock;

                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border space-y-2 transition ${
                        isOutOfStock || isOverStock
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          {/* 1. Category Filter Dropdown */}
                          <div className="sm:col-span-4">
                            <select
                              value={selectedCat}
                              onChange={(e) => {
                                const catVal = e.target.value;
                                setNewRequest((prev: any) => {
                                  const updated = [...prev.selectedItems];
                                  updated[idx].categoryId = catVal;
                                  // Reset selected item if current item is not in this category
                                  if (catVal && updated[idx].itemId) {
                                    const it = equipmentList.find((x) => x.id === updated[idx].itemId);
                                    if (it && (it.category?.id !== catVal && it.category?.name !== catVal)) {
                                      updated[idx].itemId = '';
                                    }
                                  }
                                  return { ...prev, selectedItems: updated };
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-teal-500/20"
                            >
                              <option value="">-- ทุกหมวดหมู่ --</option>
                              {Array.from(categoryMap.entries()).map(([id, name]) => (
                                <option key={id} value={id}>
                                  📁 {name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Item Dropdown */}
                          <div className="sm:col-span-5">
                            <select
                              value={sItem.itemId}
                              required
                              onChange={(e) => {
                                const val = e.target.value;
                                const it = equipmentList.find((x) => x.id === val);
                                setNewRequest((prev: any) => {
                                  const updated = [...prev.selectedItems];
                                  updated[idx].itemId = val;
                                  if (it?.category?.id) {
                                    updated[idx].categoryId = it.category.id;
                                  }
                                  // Auto-adjust quantity if exceeding new item's available count
                                  if (it && it.currentStock > 0 && updated[idx].quantity !== '' && Number(updated[idx].quantity) > it.currentStock) {
                                    updated[idx].quantity = it.currentStock;
                                  }
                                  return { ...prev, selectedItems: updated };
                                });
                              }}
                              className={`w-full bg-white dark:bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 ${
                                isOutOfStock
                                  ? 'border-rose-400 text-rose-800 dark:text-rose-300'
                                  : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-teal-500/20'
                              }`}
                            >
                              <option value="">-- กรุณาเลือกครุภัณฑ์ ({filteredEquipments.length} รายการ) --</option>
                              {filteredEquipments.map((eq) => {
                                const avail = eq.availableStock ?? eq.currentStock;
                                const isReserved = eq.reservedStock > 0;
                                return (
                                  <option key={eq.id} value={eq.id}>
                                    {eq.name} (พร้อมให้ยืม {avail} {eq.unit}){isReserved ? ` [รอส่งมอบ ${eq.reservedStock}]` : ''}{avail <= 0 ? ' [คิวเต็ม]' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* 3. Quantity & Remove button */}
                          <div className="sm:col-span-3 flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max={chosenEq ? Math.max(1, chosenEq.currentStock) : undefined}
                              value={sItem.quantity}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const val = raw === '' ? '' : Math.max(1, parseInt(raw, 10));
                                setNewRequest((prev: any) => {
                                  const updated = [...prev.selectedItems];
                                  updated[idx].quantity = val;
                                  return { ...prev, selectedItems: updated };
                                });
                              }}
                              className={`w-full bg-white dark:bg-slate-950 border rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-800 dark:text-slate-100 ${
                                isOverStock || isOutOfStock
                                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                  : 'border-slate-300 dark:border-slate-700'
                              }`}
                              placeholder="ระบุจำนวน"
                            />
                            {newRequest.selectedItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewRequest((prev: any) => ({
                                    ...prev,
                                    selectedItems: prev.selectedItems.filter((_: any, i: number) => i !== idx),
                                  }));
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="ลบแถวนี้"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Real-time Availability Information / Alert */}
                        {chosenEq && (
                          <div className="mt-1 pt-1 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] gap-1">
                            {isOutOfStock ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                {chosenEq.physicalStock > 0 && chosenEq.reservedStock > 0
                                  ? `มีในคลัง ${chosenEq.physicalStock} ${chosenEq.unit || 'ชิ้น'} แต่ถูกจองรอส่งมอบแล้ว ${chosenEq.reservedStock} (ไม่เหลือพร้อมให้ยืม)`
                                  : `ครุภัณฑ์นี้ไม่มีเครื่องพร้อมใช้งานในขณะนี้ ไม่สามารถขอยืมได้`}
                              </span>
                            ) : isOverStock ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                ขอยืมเกินยอดพร้อมใช้ (พร้อมให้ยืม {chosenEq.currentStock} จากคลัง {chosenEq.physicalStock ?? chosenEq.currentStock} {chosenEq.unit || 'ชิ้น'}{chosenEq.reservedStock ? ` | รอส่งมอบ ${chosenEq.reservedStock}` : ''})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                พร้อมให้ยืม: <strong className="font-bold text-slate-900">{chosenEq.currentStock} {chosenEq.unit || 'ชิ้น'}</strong>
                                {chosenEq.reservedStock > 0 && (
                                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                                    คลัง {chosenEq.physicalStock} | รอส่งมอบ {chosenEq.reservedStock}
                                  </span>
                                )}
                              </span>
                            )}
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
                    <span>{submitting ? 'กำลังส่งคำขอยืมครุภัณฑ์...' : 'ส่งคำขอยืมครุภัณฑ์'}</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Checkout / Return Action */}
      {activeBorrowForAction && actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
          <div className={`bg-white dark:bg-slate-900 rounded-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[94vh] flex flex-col overflow-hidden ${actionType === 'CHECKOUT' ? 'max-w-2xl' : 'max-w-md'}`}>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {actionType === 'CHECKOUT' ? (
                <>
                  <ClipboardCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  {activeBorrowForAction.requisitionRequest
                    ? 'ตรวจจ่ายพัสดุและส่งมอบครุภัณฑ์ (Check-out & Dispense)'
                    : 'ยืนยันการส่งมอบครุภัณฑ์ (Check-out)'}
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  ตรวจรับคืนครุภัณฑ์ (Check-in)
                </>
              )}
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  คำขอเลขที่: {activeBorrowForAction.requestNumber}
                  {activeBorrowForAction.requisitionRequest && ` + ${activeBorrowForAction.requisitionRequest.requestNumber}`}
                </span>
                <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  ผู้ยืม/เบิก: {activeBorrowForAction.user?.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">เวลานัดรับของ:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeBorrowForAction.borrowDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">กำหนดส่งคืน (เฉพาะครุภัณฑ์):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeBorrowForAction.expectedReturnDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                  </span>
                </div>
              </div>
            </div>

            {actionType === 'CHECKOUT' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 1. Equipment Section */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      รายการครุภัณฑ์ที่ส่งมอบ (ตรวจสอบ / ปรับจำนวนจ่ายได้):
                    </span>
                    <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                      อนุญาต {checkoutBorrowItems.filter((i) => i.allowed).length}/{checkoutBorrowItems.length} รายการ
                    </span>
                  </div>

                  <div className="space-y-2">
                    {checkoutBorrowItems.map((it, idx) => {
                      const matchEq = equipmentList.find((e) => e.id === it.itemId);
                      const availableAssets = matchEq?.availableAssets || [];

                      return (
                        <div
                          key={it.id}
                          className={`p-2.5 rounded-xl border transition text-xs ${
                            it.allowed
                              ? 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/60 shadow-sm'
                              : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 opacity-80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{it.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                ขอมา: {it.requestedQty} {it.unit}
                                {it.assetCode && (
                                  <span className="ml-1.5 font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-bold">
                                    เครื่องที่เลือก: {it.assetCode}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {it.allowed && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">จ่าย:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={it.requestedQty}
                                    value={it.quantity}
                                    onChange={(e) => {
                                      const val = Math.max(1, Number(e.target.value));
                                      setCheckoutBorrowItems((prev) =>
                                        prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                                      );
                                    }}
                                    className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200"
                                  />
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{it.unit}</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setCheckoutBorrowItems((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, allowed: !item.allowed } : item))
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  it.allowed
                                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-800'
                                    : 'bg-rose-600 text-white hover:bg-rose-700'
                                }`}
                              >
                                {it.allowed ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>อนุญาต</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3.5 h-3.5" />
                                    <span>ไม่อนุญาต</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Asset Selection Dropdown for Specific Serial/AssetCode */}
                          {it.allowed && availableAssets.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center gap-2">
                              <span className="text-[11px] text-indigo-900 dark:text-indigo-300 font-semibold flex items-center gap-1">
                                <Tag className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                ระบุหมายเลขเครื่องเฉพาะ (ถ้าต้องการ):
                              </span>
                              <select
                                value={it.assetCode || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCheckoutBorrowItems((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, assetCode: val } : item))
                                  );
                                }}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 flex-1"
                              >
                                <option value="">-- อัตโนมัติ (หยิบเครื่องใดก็ได้) --</option>
                                {availableAssets.map((ast: any) => (
                                  <option key={ast.id} value={ast.assetCode}>
                                    {ast.assetCode} {ast.serialNumber ? `(S/N: ${ast.serialNumber})` : ''} - สถานที่: {ast.location || 'ห้องแล็บ'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Linked Consumables Section */}
                {activeBorrowForAction.requisitionRequest && checkoutReqItems.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        รายการวัสดุสิ้นเปลืองที่จ่ายร่วม (ตัดสต็อก FIFO):
                      </span>
                      <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
                        อนุญาต {checkoutReqItems.filter((i) => i.allowed).length}/{checkoutReqItems.length} รายการ
                      </span>
                    </div>

                    <div className="space-y-2">
                      {checkoutReqItems.map((it, idx) => {
                        const matchCons = consumablesList.find((c) => c.id === it.itemId);
                        const recPacks = matchCons?.nextRecommendedPacks;

                        return (
                          <div
                            key={it.id}
                            className={`p-2.5 rounded-xl border transition text-xs ${
                              it.allowed
                                ? 'bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900/60 shadow-sm'
                                : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 opacity-80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200">{it.name}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  ขอมา: {it.requestedQty} {it.unit}
                                  {it.currentStock !== undefined && (
                                    <span className="ml-1.5 text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                      คงคลัง: {it.currentStock} {it.unit}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {it.allowed && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">จ่าย:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max={it.requestedQty}
                                      value={it.quantity}
                                      onChange={(e) => {
                                        const val = Math.max(1, Number(e.target.value));
                                        setCheckoutReqItems((prev) =>
                                          prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                                        );
                                      }}
                                      className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200"
                                    />
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{it.unit}</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCheckoutReqItems((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, allowed: !item.allowed } : item))
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    it.allowed
                                      ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-200 border border-teal-300 dark:border-teal-800'
                                      : 'bg-rose-600 text-white hover:bg-rose-700'
                                  }`}
                                >
                                  {it.allowed ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>ให้เบิก</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5" />
                                      <span>ไม่อนุญาต</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Sterile Repack Recommendation */}
                            {recPacks && it.allowed && (
                              <div className="mt-2 pt-2 border-t border-teal-100/80 dark:border-teal-900/60 flex flex-wrap items-center justify-between gap-1 text-[11px] text-teal-900 dark:text-teal-200 bg-teal-50/80 dark:bg-teal-950/40 px-2.5 py-1.5 rounded-lg">
                                <span className="font-bold flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                  📦 แนะนำหยิบซองปลอดเชื้อตามลำดับ (FEFO):
                                </span>
                                <span className="font-mono font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                  {recPacks.packs.slice(0, it.quantity).map((p: any) => `#${p.packNumber} (${p.packCode})`).join(', ')}
                                </span>
                                {recPacks.expiryDate && (
                                  <span className="text-[10px] text-teal-700 dark:text-teal-400">
                                    วันหมดอายุ: {new Date(recPacks.expiryDate).toLocaleDateString('th-TH')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                  💡 เมื่อกดยืนยัน ระบบจะส่งมอบเฉพาะรายการที่ <b>"อนุญาต"</b> เท่านั้น พร้อมตัดสต็อกวัสดุสิ้นเปลืองอัตโนมัติ (FIFO) ตามจำนวนที่จ่ายจริง
                </p>
              </div>
            )}

            {actionType === 'RETURN' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                              ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                              : 'bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${condition === 'DAMAGED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                <span>{it.item?.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                จำนวน {it.quantity} {it.item?.unit}
                                {it.asset && (
                                  <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300 ml-1.5">
                                    รหัส: {it.asset.assetCode} ({it.item?.unit || 'ชิ้น'}ที่ {it.asset.sequenceNumber || 1})
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
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>ชำรุด</span>
                              </button>
                            </div>
                          </div>

                          {condition === 'DAMAGED' && (
                            <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/60">
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
                                className="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-800 rounded-lg px-2.5 py-1 text-xs text-rose-900 dark:text-rose-200 placeholder:text-rose-300 dark:placeholder:text-rose-500 focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุภาพรวมการตรวจรับคืน (ถ้ามี)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="บันทึกเพิ่มเติมจากเจ้าหน้าที่ประจำห้องปฏิบัติการ..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveBorrowForAction(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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

      {/* Unified Request Modal (All-in-One: Borrow & Requisition) */}
      <UnifiedRequestModal
        isOpen={showUnifiedModal}
        onClose={() => setShowUnifiedModal(false)}
        onSuccess={fetchBorrowData}
      />
    </div>
  );
}
