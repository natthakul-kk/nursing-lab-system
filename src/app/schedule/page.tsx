'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Package,
  ArrowRight,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  Phone,
  BookOpen,
  Boxes,
  ShieldCheck,
  Check
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function SchedulePage() {
  const { currentUser, isOfficer, isAdmin, isApprover } = useAuth();
  const [borrowList, setBorrowList] = useState<any[]>([]);
  const [requisitionList, setRequisitionList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'OVERDUE'>('ALL');

  // Edit Dates Modal State (For Admin & Officer)
  const [editingItem, setEditingItem] = useState<{
    id: string;
    type: 'BORROW' | 'REQUISITION';
    title: string;
    borrowDate: string;
    expectedReturnDate?: string;
  } | null>(null);
  const [newBorrowDate, setNewBorrowDate] = useState('');
  const [newReturnDate, setNewReturnDate] = useState('');
  const [savingDates, setSavingDates] = useState(false);

  const fetchScheduleData = async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        // Show APPROVED (waiting for pickup) and BORROWED (active borrowing, waiting for return)
        const relevantBorrows = bData.filter((b: any) =>
          ['APPROVED', 'BORROWED'].includes(b.status)
        );
        setBorrowList(relevantBorrows);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        // Show APPROVED (waiting to prepare & dispense)
        const relevantReqs = rData.filter((r: any) => r.status === 'APPROVED');
        setRequisitionList(relevantReqs);
      }
    } catch (err) {
      console.error('Failed to load schedule data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const toInputDateFormat = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isPast = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d < now;
  };

  // Combine borrow and requisition items into unified schedule tasks
  const combinedTasks = [
    ...borrowList.map((b) => {
      const returnOverdue = b.status === 'BORROWED' && isPast(b.expectedReturnDate);
      const pickupToday = isToday(b.borrowDate);
      const returnToday = isToday(b.expectedReturnDate);

      return {
        id: b.id,
        type: 'BORROW' as const,
        requestNumber: b.requestNumber,
        status: b.status,
        user: b.user,
        course: b.course,
        purpose: b.purpose,
        pickupDate: b.borrowDate,
        returnDate: b.expectedReturnDate,
        items: b.items || [],
        isOverdue: returnOverdue,
        isPickupToday: pickupToday,
        isReturnToday: returnToday,
      };
    }),
    ...requisitionList.map((r) => {
      const pickupToday = isToday(r.dateNeeded);
      return {
        id: r.id,
        type: 'REQUISITION' as const,
        requestNumber: r.requestNumber,
        status: r.status,
        user: r.user,
        course: r.course,
        purpose: r.purpose,
        pickupDate: r.dateNeeded,
        returnDate: undefined,
        items: r.items || [],
        isOverdue: false,
        isPickupToday: pickupToday,
        isReturnToday: false,
      };
    }),
  ];

  // Apply filters
  const filteredTasks = combinedTasks.filter((task) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = task.requestNumber?.toLowerCase().includes(q);
      const matchUser = task.user?.name?.toLowerCase().includes(q);
      const matchStudentId = task.user?.studentId?.toLowerCase().includes(q);
      const matchCourse = task.course?.name?.toLowerCase().includes(q) || task.course?.code?.toLowerCase().includes(q);
      const matchPurpose = task.purpose?.toLowerCase().includes(q);
      if (!matchNumber && !matchUser && !matchStudentId && !matchCourse && !matchPurpose) {
        return false;
      }
    }

    // Time filter
    if (timeFilter === 'TODAY') {
      return task.isPickupToday || task.isReturnToday;
    }
    if (timeFilter === 'OVERDUE') {
      return task.isOverdue;
    }
    if (timeFilter === 'UPCOMING') {
      return !task.isOverdue && (task.status === 'APPROVED' || !isPast(task.returnDate));
    }
    return true;
  });

  // Open Edit Dates modal
  const handleOpenEditDates = (task: typeof combinedTasks[0]) => {
    setEditingItem({
      id: task.id,
      type: task.type,
      title: `${task.requestNumber} - ${task.user?.name || ''}`,
      borrowDate: task.pickupDate,
      expectedReturnDate: task.returnDate,
    });
    setNewBorrowDate(toInputDateFormat(task.pickupDate));
    setNewReturnDate(toInputDateFormat(task.returnDate));
  };

  // Submit Edit Dates
  const handleSaveDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingDates(true);

    try {
      const endpoint =
        editingItem.type === 'BORROW'
          ? `/api/borrow/${editingItem.id}`
          : `/api/requisitions/${editingItem.id}`;

      const payload: any = {
        action: 'UPDATE_DATES',
      };

      if (editingItem.type === 'BORROW') {
        payload.borrowDate = newBorrowDate;
        payload.expectedReturnDate = newReturnDate;
      } else {
        payload.dateNeeded = newBorrowDate;
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingItem(null);
        fetchScheduleData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการแก้ไขวันที่');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSavingDates(false);
    }
  };

  const canEdit = isAdmin || isOfficer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-600" />
            ตารางงานเจ้าหน้าที่ & กำหนดการรับ-คืน (Duty Schedule)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ติดตามรายการที่อนุมัติแล้ว: วันที่ต้องจัดเตรียมของ วันที่ผู้รับจะมารับ และกำหนดวันส่งคืนห้องปฏิบัติการ
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>สิทธิ์แอดมิน/เจ้าหน้าที่: สามารถแก้ไขกำหนดวันรับและวันคืนได้</span>
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">คิวงานทั้งหมด</span>
            <div className="text-xl font-black text-slate-800 mt-1">
              {combinedTasks.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase">รอจัดเตรียม & จ่ายของ</span>
            <div className="text-xl font-black text-blue-700 mt-1">
              {combinedTasks.filter((t) => t.status === 'APPROVED').length}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-purple-600 uppercase">กำลังยืม (รอส่งคืน)</span>
            <div className="text-xl font-black text-purple-700 mt-1">
              {combinedTasks.filter((t) => t.status === 'BORROWED').length}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 uppercase">เกินกำหนดคืน</span>
            <div className="text-xl font-black text-rose-700 mt-1">
              {combinedTasks.filter((t) => t.isOverdue).length}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: `ทั้งหมด (${combinedTasks.length})` },
            { key: 'TODAY', label: `📅 ต้องทำวันนี้ (${combinedTasks.filter((t) => t.isPickupToday || t.isReturnToday).length})` },
            { key: 'UPCOMING', label: '⏳ ตามกำหนดการ' },
            { key: 'OVERDUE', label: `🚨 เกินกำหนดคืน (${combinedTasks.filter((t) => t.isOverdue).length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTimeFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                timeFilter === tab.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="ค้นหาชื่อนิสิต / รหัส / รายวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Schedule Table / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <LoadingSpinner
              message="กำลังโหลดตารางงานและกำหนดการ..."
              submessage="กำลังดึงข้อมูลคิวงานของเจ้าหน้าที่จาก Supabase"
            />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-75" />
            ไม่มีคิวงานที่ตรงกับเงื่อนไขในขณะนี้
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={`${task.type}-${task.id}`}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition hover:shadow-md ${
                task.isOverdue
                  ? 'border-rose-300 bg-rose-50/20'
                  : task.isReturnToday
                  ? 'border-amber-300 bg-amber-50/20'
                  : task.status === 'APPROVED'
                  ? 'border-blue-200'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      task.type === 'BORROW'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {task.type === 'BORROW' ? 'ยืมครุภัณฑ์' : 'เบิกวัสดุ'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {task.requestNumber}
                  </span>

                  {/* Status Badge */}
                  {task.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <Clock className="w-3 h-3 text-blue-600" />
                      อนุมัติแล้ว (รอจัดเตรียม & จ่ายของ)
                    </span>
                  )}
                  {task.status === 'BORROWED' && !task.isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      <RefreshCw className="w-3 h-3 text-purple-600" />
                      จ่ายของแล้ว (กำลังยืมใช้งาน)
                    </span>
                  )}
                  {task.isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      เกินกำหนดส่งคืนห้องแล็บ!
                    </span>
                  )}
                  {task.isReturnToday && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                      ครบกำหนดส่งคืนวันนี้ (16:30 น.)
                    </span>
                  )}
                </div>

                {/* User & Course info */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800">{task.user?.name}</span>
                    {task.user?.studentId && (
                      <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                        {task.user.studentId}
                      </span>
                    )}
                  </div>
                  {task.user?.phone && (
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {task.user.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule Timeline Dates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
                {/* 1. Preparation & Pickup Date */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    📦 วันที่ต้องเตรียมของ / ผู้รับมารับของ
                  </span>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{formatDate(task.pickupDate)}</span>
                    {task.isPickupToday && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.2 rounded-full">
                        วันนี้!
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {task.status === 'APPROVED' ? 'เจ้าหน้าที่จัดเตรียมไว้ที่ห้องแล็บ' : 'ผู้รับมารับของเรียบร้อย'}
                  </p>
                </div>

                {/* 2. Expected Return Date (Only for Borrow) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    🔄 กำหนดวันคืนของ
                  </span>
                  {task.type === 'BORROW' ? (
                    <>
                      <div
                        className={`font-bold flex items-center gap-1.5 text-sm ${
                          task.isOverdue
                            ? 'text-rose-600'
                            : task.isReturnToday
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>{formatDate(task.returnDate)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {task.isOverdue
                          ? '⚠️ เกินกำหนดส่งคืน กรุณาโทรติดตาม'
                          : 'นำมาส่งคืนเพื่อตรวจเช็คสภาพ'}
                      </p>
                    </>
                  ) : (
                    <div className="text-slate-400 italic text-xs py-1">
                      วัสดุสิ้นเปลือง (ไม่ต้องส่งคืน)
                    </div>
                  )}
                </div>

                {/* 3. Course & Purpose */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    📚 รายวิชา & วัตถุประสงค์
                  </span>
                  {task.course && (
                    <div className="font-bold text-teal-800 text-xs">
                      {task.course.code} - {task.course.name}
                    </div>
                  )}
                  <div className="text-slate-600 line-clamp-2 text-xs">
                    "{task.purpose}"
                  </div>
                </div>
              </div>

              {/* Items List inside task */}
              <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  รายการของที่ต้องจัดเตรียม:
                </span>
                <div className="flex flex-wrap gap-2">
                  {task.items.map((it: any) => (
                    <div
                      key={it.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-semibold"
                    >
                      <Package className="w-3.5 h-3.5 text-teal-600" />
                      <span>{it.item?.name}</span>
                      <span className="text-slate-500 font-normal">
                        ({it.quantity || it.quantityRequested} {it.item?.unit})
                      </span>
                      {it.asset && (
                        <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                          {it.asset.assetCode}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {/* Button for Admin / Officer to Reschedule Dates */}
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEditDates(task)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>แก้ไขกำหนดวันรับ / วันคืน</span>
                    </button>
                  )}
                </div>

                {/* Direct shortcut to Borrow / Requisition page for action */}
                <Link
                  href={task.type === 'BORROW' ? '/borrow' : '/requisitions'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <span>
                    {task.status === 'APPROVED' ? 'ไปหน้าบันทึกจ่ายของ' : 'ไปหน้าตรวจรับคืน'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Edit Dates (Admin & Officer) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                แก้ไขกำหนดวันรับและวันคืน
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              รายการ: <strong className="text-slate-800">{editingItem.title}</strong>
            </p>

            <form onSubmit={handleSaveDates} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่ผู้รับมารับของ / วันที่ต้องจัดเตรียม
                </label>
                <input
                  type="date"
                  required
                  value={newBorrowDate}
                  onChange={(e) => setNewBorrowDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {editingItem.type === 'BORROW' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กำหนดวันส่งคืนของ
                  </label>
                  <input
                    type="date"
                    required
                    value={newReturnDate}
                    onChange={(e) => setNewReturnDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingDates}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingDates ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
