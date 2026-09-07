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
  Check,
  GraduationCap,
  Sparkles,
  MapPin,
  QrCode,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function SchedulePage() {
  const { currentUser, isOfficer, isAdmin, isApprover } = useAuth();
  const [borrowList, setBorrowList] = useState<any[]>([]);
  const [requisitionList, setRequisitionList] = useState<any[]>([]);
  const [practiceList, setPracticeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'OVERDUE'>('ALL');
  const [expandedSlotIds, setExpandedSlotIds] = useState<Record<string, boolean>>({});

  const toggleSlotExpand = (slotKey: string) => {
    setExpandedSlotIds((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

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
      const [bRes, rRes, pRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
        fetch('/api/practice/bookings'),
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
      if (pRes.ok) {
        const pData = await pRes.json();
        // Show APPROVED (waiting to practice) and CHECKED_IN (currently in lab)
        const relevantPractices = Array.isArray(pData)
          ? pData.filter((p: any) => ['APPROVED', 'CHECKED_IN'].includes(p.status))
          : [];
        setPracticeList(relevantPractices);
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
        advisorName: b.advisorName || b.course?.instructorName,
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
        advisorName: r.advisorName || r.course?.instructorName,
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

  // Group practiceList by Slot (Event)
  const practiceSlotGroups: Record<string, any> = {};
  practiceList.forEach((p) => {
    const sId = p.slotId || (p.slot ? p.slot.id : `unknown-${p.id}`);
    if (!practiceSlotGroups[sId]) {
      practiceSlotGroups[sId] = {
        id: sId,
        type: 'PRACTICE_EVENT' as const,
        slot: p.slot,
        roomName: p.slot?.room?.name || 'ห้องปฏิบัติการพยาบาล',
        roomCode: p.slot?.room?.code,
        pickupDate: p.slot?.date,
        timeSlot: p.slot ? `${p.slot.startTime} - ${p.slot.endTime} น.` : '-',
        maxCapacity: p.slot?.maxCapacity || 6,
        isPickupToday: isToday(p.slot?.date),
        isReturnToday: false,
        isOverdue: false,
        students: [],
        kitsSummary: {} as Record<string, { name: string; count: number }>,
        additionalItems: [] as string[],
      };
    }
    practiceSlotGroups[sId].students.push(p);

    // Aggregate Kits
    if (p.practiceKit) {
      const kId = p.practiceKit.id;
      if (!practiceSlotGroups[sId].kitsSummary[kId]) {
        practiceSlotGroups[sId].kitsSummary[kId] = {
          name: p.practiceKit.name,
          count: 0,
        };
      }
      practiceSlotGroups[sId].kitsSummary[kId].count += 1;
    }

    // Aggregate Additional equipment
    if (p.additionalEquipment) {
      practiceSlotGroups[sId].additionalItems.push(
        `${p.user?.name || 'นิสิต'}: ${p.additionalEquipment}`
      );
    }
  });

  const practiceEventTasks = Object.values(practiceSlotGroups);

  const allDisplayTasks = [
    ...combinedTasks,
    ...practiceEventTasks,
  ];

  // Apply filters
  const filteredTasks = allDisplayTasks.filter((task: any) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (task.type === 'PRACTICE_EVENT') {
        const matchRoom = task.roomName?.toLowerCase().includes(q);
        const matchStudent = task.students?.some(
          (s: any) =>
            s.user?.name?.toLowerCase().includes(q) ||
            s.user?.studentId?.toLowerCase().includes(q) ||
            s.skillTopic?.toLowerCase().includes(q) ||
            s.advisorName?.toLowerCase().includes(q) ||
            s.bookingNumber?.toLowerCase().includes(q)
        );
        if (!matchRoom && !matchStudent) return false;
      } else {
        const matchNumber = task.requestNumber?.toLowerCase().includes(q);
        const matchUser = task.user?.name?.toLowerCase().includes(q);
        const matchStudentId = task.user?.studentId?.toLowerCase().includes(q);
        const matchCourse = task.course?.name?.toLowerCase().includes(q) || task.course?.code?.toLowerCase().includes(q);
        const matchPurpose = task.purpose?.toLowerCase().includes(q);
        if (!matchNumber && !matchUser && !matchStudentId && !matchCourse && !matchPurpose) {
          return false;
        }
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
      if (task.type === 'PRACTICE_EVENT') {
        return !isPast(task.pickupDate) || task.isPickupToday;
      }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">คิวงานทั้งหมด</span>
            <div className="text-xl font-black text-slate-800 mt-1">
              {allDisplayTasks.length} <span className="text-xs font-normal text-slate-500">งาน</span>
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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase">คิวเข้าฝึกปฏิบัติ (Lab)</span>
            <div className="text-xl font-black text-indigo-700 mt-1">
              {practiceList.length}{' '}
              <span className="text-xs font-normal text-slate-500">คน ({practiceEventTasks.length} รอบ)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: `ทั้งหมด (${allDisplayTasks.length})` },
            { key: 'TODAY', label: `📅 ต้องทำวันนี้ (${allDisplayTasks.filter((t: any) => t.isPickupToday || t.isReturnToday).length})` },
            { key: 'UPCOMING', label: '⏳ ตามกำหนดการ' },
            { key: 'OVERDUE', label: `🚨 เกินกำหนดคืน (${allDisplayTasks.filter((t: any) => t.isOverdue).length})` },
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
          filteredTasks.map((task: any) => {
            if (task.type === 'PRACTICE_EVENT') {
              const isExpanded = expandedSlotIds[task.id] !== false; // default expanded
              const checkedInCount = task.students.filter((s: any) => s.status === 'CHECKED_IN').length;
              const completedCount = task.students.filter((s: any) => s.status === 'COMPLETED').length;
              const kitKeys = Object.keys(task.kitsSummary);

              return (
                <div
                  key={`event-${task.id}`}
                  className="bg-white rounded-3xl border-2 border-indigo-200/90 shadow-md shadow-indigo-500/5 overflow-hidden transition"
                >
                  {/* Event Header Banner */}
                  <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-teal-950 p-4 sm:p-5 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-300" />
                            <span>รอบฝึกปฏิบัติการ (Practice Session Event)</span>
                          </span>
                          {task.isPickupToday && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                              ⚡ เข้าฝึกวันนี้!
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 mt-1">
                          <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0" />
                          <span>{task.roomName}</span>
                          {task.roomCode && (
                            <span className="text-xs font-mono font-bold text-teal-300/80 bg-teal-900/50 px-2 py-0.5 rounded border border-teal-500/30">
                              {task.roomCode}
                            </span>
                          )}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-0.5 font-medium">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <Calendar className="w-3.5 h-3.5 text-teal-400" />
                            <span>{formatDate(task.pickupDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <Clock className="w-3.5 h-3.5 text-teal-400" />
                            <span>รอบเวลา: {task.timeSlot}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Stats & Controls */}
                      <div className="flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
                          <span className="text-[10px] text-slate-300 block uppercase font-bold">ผู้เข้าฝึกในรอบนี้</span>
                          <div className="text-sm font-black text-white flex items-center justify-end gap-1.5">
                            <Users className="w-4 h-4 text-teal-400" />
                            <span>{task.students.length} / {task.maxCapacity} คน</span>
                          </div>
                          {checkedInCount > 0 && (
                            <span className="text-[10px] text-emerald-400 font-bold block">
                              กำลังฝึก {checkedInCount} คน
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSlotExpand(task.id)}
                          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                          title="ย่อ/ขยายรายละเอียดนิสิตในรอบนี้"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar: Kits and Preparation Checklist */}
                  <div className="bg-slate-50 border-b border-slate-200/80 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Equipment & Practice Kits Required in this Slot */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ชุดอุปกรณ์ที่ต้องจัดเตรียมในรอบนี้ ({kitKeys.length} ชนิด):</span>
                      </span>
                      {kitKeys.length === 0 ? (
                        <span className="text-slate-400 text-xs italic block">
                          ใช้อุปกรณ์และหุ่นประจำเตียงห้องแล็บทั่วไป (ไม่ต้องเบิกชุดฝึกเพิ่ม)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {kitKeys.map((kId) => {
                            const kit = task.kitsSummary[kId];
                            return (
                              <span
                                key={kId}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold text-xs shadow-sm"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                <span>{kit.name}</span>
                                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                  {kit.count} ชุด
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Additional Equipment Requests */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-teal-600" />
                        <span>อุปกรณ์เสริมที่นิสิตขอเพิ่มเติม ({task.additionalItems.length} รายการ):</span>
                      </span>
                      {task.additionalItems.length === 0 ? (
                        <span className="text-slate-400 text-xs italic block">ไม่มีอุปกรณ์เสริมเพิ่มเติม</span>
                      ) : (
                        <div className="space-y-1">
                          {task.additionalItems.map((itemStr: string, idx: number) => (
                            <div
                              key={idx}
                              className="text-slate-700 bg-amber-50/70 border border-amber-200 px-2.5 py-1 rounded-lg text-xs"
                            >
                              • {itemStr}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Students Table */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          รายชื่อนิสิตที่ได้รับการอนุมัติในรอบเวลานี้ ({task.students.length} คน):
                        </span>
                        <Link
                          href="/practice"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>ไปจุดสแกน QR เช็คอิน</span>
                        </Link>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {task.students.map((studentBooking: any, idx: number) => {
                          const isPending = studentBooking.status === 'PENDING';
                          const isApproved = studentBooking.status === 'APPROVED';
                          const isCheckedIn = studentBooking.status === 'CHECKED_IN';
                          const isCompleted = studentBooking.status === 'COMPLETED';

                          return (
                            <div
                              key={studentBooking.id}
                              className="p-3.5 bg-white hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {studentBooking.user?.name}
                                    </span>
                                    {studentBooking.user?.studentId && (
                                      <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                        {studentBooking.user.studentId}
                                      </span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-500">
                                      ({studentBooking.bookingNumber})
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-slate-600">
                                    <div>
                                      <span className="text-slate-400 font-semibold">หัตถการ: </span>
                                      <strong className="text-slate-800">{studentBooking.skillTopic}</strong>
                                    </div>
                                    {studentBooking.course ? (
                                      <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                        [{studentBooking.course.code}] {studentBooking.course.name}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        ฝึกอิสระ/OSCE
                                      </span>
                                    )}
                                    {studentBooking.advisorName && (
                                      <span className="text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>อาจารย์: {studentBooking.advisorName}</span>
                                      </span>
                                    )}
                                  </div>

                                  {studentBooking.additionalEquipment && (
                                    <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-medium">
                                      ขอเพิ่ม: {studentBooking.additionalEquipment}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status Badge per student */}
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {isApproved && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-teal-600" />
                                    <span>อนุมัติแล้ว (รอเข้าแล็บ)</span>
                                  </span>
                                )}
                                {isCheckedIn && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 animate-pulse">
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
                                    <span>กำลังฝึกในห้องแล็บ</span>
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>ฝึกเสร็จสิ้น</span>
                                  </span>
                                )}
                                {isPending && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>รออนุมัติ</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Event Card Footer */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-slate-500">
                          * เจ้าหน้าที่สามารถตรวจสอบการเข้าฝึกและสแกน QR Code เพื่อบันทึกเวลาได้ที่หน้าระบบฝึกปฏิบัติ
                        </span>
                        <Link
                          href="/practice"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>เปิดจุดสแกนรับนิสิตรอบนี้</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
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
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                      task.type === 'BORROW'
                        ? 'bg-purple-100 text-purple-800'
                        : task.type === 'REQUISITION'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {task.type === 'BORROW' && 'ยืมครุภัณฑ์'}
                    {task.type === 'REQUISITION' && 'เบิกวัสดุ'}
                    {task.type === 'PRACTICE' && (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>ฝึกปฏิบัติ (Practice)</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {task.requestNumber}
                  </span>

                  {/* Status Badge */}
                  {task.status === 'APPROVED' && task.type !== 'PRACTICE' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <Clock className="w-3 h-3 text-blue-600" />
                      อนุมัติแล้ว (รอจัดเตรียม & จ่ายของ)
                    </span>
                  )}
                  {task.status === 'APPROVED' && task.type === 'PRACTICE' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                      <Clock className="w-3 h-3 text-teal-600" />
                      อนุมัติแล้ว (รอนิสิตเข้าห้องแล็บ)
                    </span>
                  )}
                  {task.status === 'CHECKED_IN' && task.type === 'PRACTICE' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      กำลังฝึกปฏิบัติในห้องแล็บ
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
                    {task.type === 'PRACTICE' ? '🗓️ วันและรอบเวลาเข้าฝึก' : '📦 วันที่ต้องเตรียมของ / ผู้รับมารับของ'}
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
                    {task.type === 'PRACTICE'
                      ? (task.timeSlot ? `รอบ ${task.timeSlot}` : 'ตามรอบเวลาที่ระบุ')
                      : task.status === 'APPROVED'
                      ? 'เจ้าหน้าที่จัดเตรียมไว้ที่ห้องแล็บ'
                      : 'ผู้รับมารับของเรียบร้อย'}
                  </p>
                </div>

                {/* 2. Expected Return Date (Only for Borrow) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {task.type === 'PRACTICE' ? '📍 ห้องปฏิบัติการที่เข้าฝึก' : '🔄 กำหนดวันคืนของ'}
                  </span>
                  {task.type === 'PRACTICE' ? (
                    <div className="space-y-1">
                      <div className="font-bold text-teal-800 flex items-center gap-1.5 text-sm">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        <span>{(task as any).roomName || 'ห้องแล็บพยาบาล'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {task.status === 'CHECKED_IN' ? 'นิสิตเช็คอินแล้ว' : 'เตรียมอุปกรณ์ประจำเตียง/หุ่น'}
                      </p>
                    </div>
                  ) : task.type === 'BORROW' ? (
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

                {/* 3. Course, Advisor & Purpose */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    📚 รายวิชา / อาจารย์ผู้รับทราบ
                  </span>
                  {task.course ? (
                    <div className="font-bold text-teal-800 text-xs">
                      {task.course.code} - {task.course.name}
                    </div>
                  ) : (
                    <div className="text-slate-500 font-medium text-xs">
                      กิจกรรมฝึกทักษะทั่วไป (นอกรายวิชา)
                    </div>
                  )}
                  {task.advisorName && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>อาจารย์: {task.advisorName}</span>
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
                  {canEdit && task.type !== 'PRACTICE' && (
                    <button
                      onClick={() => handleOpenEditDates(task)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>แก้ไขกำหนดวันรับ / วันคืน</span>
                    </button>
                  )}
                </div>

                {/* Direct shortcut to action page */}
                <Link
                  href={task.type === 'BORROW' ? '/borrow' : '/requisitions'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <span>
                    {task.status === 'APPROVED'
                      ? 'ไปหน้าบันทึกจ่ายของ'
                      : 'ไปหน้าตรวจรับคืน'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })
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
