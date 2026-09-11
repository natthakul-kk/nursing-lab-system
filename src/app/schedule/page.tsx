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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Building2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function SchedulePage() {
  const { currentUser, isOfficer, isAdmin, isApprover } = useAuth();
  const [borrowList, setBorrowList] = useState<any[]>([]);
  const [requisitionList, setRequisitionList] = useState<any[]>([]);
  const [practiceList, setPracticeList] = useState<any[]>([]);
  const [roomBookingList, setRoomBookingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'OVERDUE'>('ALL');
  const [expandedSlotIds, setExpandedSlotIds] = useState<Record<string, boolean>>({});

  // Calendar View States
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [dayTypeFilter, setDayTypeFilter] = useState<'ALL' | 'PICKUP' | 'RETURN' | 'PRACTICE'>('ALL');

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today.toISOString().slice(0, 10));
  };

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
      const [bRes, rRes, pRes, rmRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
        fetch('/api/practice/bookings'),
        fetch('/api/room-bookings?status=APPROVED'),
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        const relevantBorrows = bData.filter((b: any) =>
          ['APPROVED', 'BORROWED'].includes(b.status)
        );
        setBorrowList(relevantBorrows);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        const relevantReqs = rData.filter((r: any) => r.status === 'APPROVED');
        setRequisitionList(relevantReqs);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        const relevantPractices = Array.isArray(pData)
          ? pData.filter((p: any) => ['APPROVED', 'CHECKED_IN'].includes(p.status))
          : [];
        setPracticeList(relevantPractices);
      }
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        setRoomBookingList(Array.isArray(rmData) ? rmData : []);
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

  const formatThaiFullDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
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
    ...roomBookingList.map((rb) => {
      const isUsageToday = isToday(rb.bookingDate);
      return {
        id: rb.id,
        type: 'ROOM_BOOKING' as const,
        requestNumber: rb.bookingNumber,
        status: rb.status,
        user: rb.user,
        course: rb.course,
        advisorName: rb.advisorName,
        purpose: rb.title,
        usagePurpose: rb.purpose,
        pickupDate: rb.bookingDate,
        returnDate: undefined,
        timeSlot: `${rb.startTime} - ${rb.endTime} น.`,
        roomName: rb.room?.name || 'ห้องปฏิบัติการ',
        roomCode: rb.room?.code,
        attendeesCount: rb.attendeesCount,
        equipmentNeeded: rb.equipmentNeeded,
        contactPhone: rb.contactPhone || rb.user?.phone,
        items: [],
        isOverdue: false,
        isPickupToday: isUsageToday,
        isReturnToday: false,
      };
    }),

    ...combinedTasks,
    ...practiceEventTasks,
  ];

  // Apply filters for List View
  const filteredTasks = allDisplayTasks.filter((task: any) => {
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

  // Calendar calculations
  const thaiMonthDisplay = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const currentYear = currentMonth.getFullYear();
  const currentMonthIdx = currentMonth.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonthIdx, 0).getDate();

  const calendarCells: {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  const todayDateStr = new Date().toISOString().slice(0, 10);

  // 1. Prev month padding
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(currentYear, currentMonthIdx - 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
    });
  }

  // 2. Current month days
  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
    });
  }

  // 3. Next month padding
  const remainingCells = 42 - calendarCells.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const d = new Date(currentYear, currentMonthIdx + 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Helper: tasks for any given date
  const getTasksForDate = (dateStr: string) => {
    return allDisplayTasks.filter((t: any) => {
      const pDate = t.pickupDate ? new Date(t.pickupDate).toISOString().slice(0, 10) : '';
      const rDate = t.returnDate ? new Date(t.returnDate).toISOString().slice(0, 10) : '';
      return pDate === dateStr || rDate === dateStr;
    });
  };

  // Selected date tasks with sub-filter
  const selectedDateAllTasks = getTasksForDate(selectedDate);
  const selectedDateTasks = selectedDateAllTasks.filter((t: any) => {
    const pDate = t.pickupDate ? new Date(t.pickupDate).toISOString().slice(0, 10) : '';
    const rDate = t.returnDate ? new Date(t.returnDate).toISOString().slice(0, 10) : '';

    if (dayTypeFilter === 'PICKUP') return pDate === selectedDate && t.type !== 'PRACTICE_EVENT';
    if (dayTypeFilter === 'RETURN') return rDate === selectedDate;
    if (dayTypeFilter === 'PRACTICE') return pDate === selectedDate && t.type === 'PRACTICE_EVENT';
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

  // Render individual task card
  const renderTaskCard = (task: any) => {
    if (task.type === 'ROOM_BOOKING') {
      return (
        <div
          key={`room-${task.id}`}
          className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/60 p-5 shadow-sm space-y-3 transition hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>จองใช้ห้องปฏิบัติการ (Room Reservation)</span>
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {task.requestNumber}
              </span>
              <span className="font-bold text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-100">
                {task.roomName} {task.roomCode ? `(${task.roomCode})` : ''}
              </span>
              {task.isPickupToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                  ⚡ ใช้งานวันนี้!
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{task.user?.name}</span>
              {task.user?.studentId && (
                <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                  {task.user.studentId}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-2 space-y-1.5">
              <div>
                <span className="text-slate-400 font-bold">ชื่องาน/การใช้งาน: </span>
                <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{task.purpose}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                <span>{task.usagePurpose}</span>
              </div>
              {task.course && (
                <div className="text-teal-700 font-semibold">
                  รายวิชา: [{task.course.code}] {task.course.name}
                </div>
              )}
              {task.advisorName && (
                <div className="text-indigo-700 font-medium flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>อาจารย์: {task.advisorName}</span>
                </div>
              )}
              {task.equipmentNeeded && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-start gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>อุปกรณ์ที่ขอจัดเตรียม: <strong>{task.equipmentNeeded}</strong></span>
                </div>
              )}
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>วันที่: {formatDate(task.pickupDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-teal-700">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>เวลา: {task.timeSlot}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>ผู้เข้าใช้: ~{task.attendeesCount || 1} คน</span>
              </div>
              {task.contactPhone && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>โทร: {task.contactPhone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              * ได้รับอนุมัติให้เข้าใช้ห้องเรียบร้อยแล้ว
            </span>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
            >
              <span>ดูตารางการใช้ห้อง</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    if (task.type === 'PRACTICE_EVENT') {
      const isExpanded = expandedSlotIds[task.id] !== false; // default expanded
      const checkedInCount = task.students.filter((s: any) => s.status === 'CHECKED_IN').length;
      const completedCount = task.students.filter((s: any) => s.status === 'COMPLETED').length;
      const kitKeys = Object.keys(task.kitsSummary);

      return (
        <div
          key={`event-${task.id}`}
          className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-200/90 dark:border-indigo-900/60 shadow-md shadow-indigo-500/5 overflow-hidden transition"
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
                </div>

                <button
                  onClick={() => toggleSlotExpand(task.id)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title={isExpanded ? 'ย่อรายละเอียด' : 'ขยายดูรายชื่อนิสิต'}
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-white/10 text-xs">
              <span className="text-slate-300">
                สถานะผู้เข้าฝึก: <strong>{checkedInCount}</strong> กำลังฝึก • <strong>{completedCount}</strong> ฝึกเสร็จแล้ว • <strong>{task.students.length - checkedInCount - completedCount}</strong> รอเข้าฝึก
              </span>
            </div>
          </div>

          {/* Collapsible Content */}
          {isExpanded && (
            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Materials Summary */}
              {kitKeys.length > 0 && (
                <div className="bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl p-3.5 text-xs space-y-1.5">
                  <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>ชุดพัสดุหัตถการที่ต้องจัดเตรียมล่วงหน้าประจำรอบนี้:</span>
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {kitKeys.map((kId) => {
                      const kit = task.kitsSummary[kId];
                      return (
                        <span
                          key={kId}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-300 font-bold shadow-sm"
                        >
                          <span>{kit.name}</span>
                          <span className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.2 rounded text-[11px]">
                            x{kit.count} ชุด
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Student List in this slot */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  รายชื่อนิสิตในรอบเวลานี้ ({task.students.length} คน):
                </span>
                {task.students.map((studentBooking: any) => {
                  const isApproved = studentBooking.status === 'APPROVED';
                  const isCheckedIn = studentBooking.status === 'CHECKED_IN';
                  const isCompleted = studentBooking.status === 'COMPLETED';
                  const isPending = studentBooking.status === 'PENDING';

                  return (
                    <div
                      key={studentBooking.id}
                      className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {studentBooking.user?.name}
                            </span>
                            {studentBooking.user?.studentId && (
                              <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                                {studentBooking.user.studentId}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              ({studentBooking.bookingNumber})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-slate-600">
                            <div>
                              <span className="text-slate-400 font-semibold">หัตถการ: </span>
                              <strong className="text-slate-800 dark:text-slate-200">{studentBooking.skillTopic}</strong>
                            </div>
                            {studentBooking.course ? (
                              <span className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-800">
                                [{studentBooking.course.code}] {studentBooking.course.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                ฝึกอิสระ/OSCE
                              </span>
                            )}
                            {studentBooking.advisorName && (
                              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
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

    // Borrow or Requisition card
    return (
      <div
        key={`${task.type}-${task.id}`}
        className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm space-y-4 transition hover:shadow-md ${
          task.isOverdue
            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
            : task.isReturnToday
            ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20'
            : task.status === 'APPROVED'
            ? 'border-blue-200 dark:border-blue-900/60'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                task.type === 'BORROW'
                  ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
              }`}
            >
              {task.type === 'BORROW' ? 'ยืมครุภัณฑ์' : 'เบิกวัสดุ'}
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {task.requestNumber}
            </span>

            {/* Status Badge */}
            {task.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                อนุมัติแล้ว (รอจัดเตรียม & จ่ายของ)
              </span>
            )}
            {task.status === 'BORROWED' && !task.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <RefreshCw className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                จ่ายของแล้ว (กำลังยืมใช้งาน)
              </span>
            )}
            {task.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
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
              <span className="font-bold text-slate-800 dark:text-slate-200">{task.user?.name}</span>
              {task.user?.studentId && (
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 dark:bg-slate-850/80 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          {/* 1. Preparation & Pickup Date */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              📦 วันที่ต้องเตรียมของ / ผู้รับมารับของ
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{formatDate(task.pickupDate)}</span>
              {task.isPickupToday && (
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.2 rounded-full">
                  วันนี้!
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {task.status === 'APPROVED'
                ? 'เจ้าหน้าที่จัดเตรียมไว้ที่ห้องแล็บ'
                : 'ผู้รับมารับของเรียบร้อย'}
            </p>
          </div>

          {/* 2. Expected Return Date */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              🔄 กำหนดวันคืนของ
            </span>
            {task.type === 'BORROW' ? (
              <>
                <div
                  className={`font-bold flex items-center gap-1.5 text-sm ${
                    task.isOverdue
                      ? 'text-rose-600 dark:text-rose-400'
                      : task.isReturnToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>{formatDate(task.returnDate)}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {task.isOverdue
                    ? '⚠️ เกินกำหนดส่งคืน กรุณาโทรติดตาม'
                    : 'นำมาส่งคืนเพื่อตรวจเช็คสภาพ'}
                </p>
              </>
            ) : (
              <div className="text-slate-400 dark:text-slate-500 italic text-xs py-1">
                วัสดุสิ้นเปลือง (ไม่ต้องส่งคืน)
              </div>
            )}
          </div>

          {/* 3. Course, Advisor & Purpose */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              📚 รายวิชา / อาจารย์ผู้รับทราบ
            </span>
            {task.course ? (
              <div className="font-bold text-teal-800 dark:text-teal-300 text-xs">
                {task.course.code} - {task.course.name}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                กิจกรรมฝึกทักษะทั่วไป (นอกรายวิชา)
              </div>
            )}
            {task.advisorName && (
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>อาจารย์: {task.advisorName}</span>
              </div>
            )}
            <div className="text-slate-600 dark:text-slate-400 line-clamp-2 text-xs">
              "{task.purpose}"
            </div>
          </div>
        </div>

        {/* Items List inside task */}
        <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
            รายการของที่ต้องจัดเตรียม:
          </span>
          <div className="flex flex-wrap gap-2">
            {task.items.map((it: any) => (
              <div
                key={it.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{it.item?.name}</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">
                  ({it.quantity || it.quantityRequested} {it.item?.unit})
                </span>
                {it.asset && (
                  <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                    {it.asset.assetCode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => handleOpenEditDates(task)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>แก้ไขกำหนดวันรับ / วันคืน</span>
              </button>
            )}
          </div>

          <Link
            href={
              task.type === 'BORROW'
                ? task.status === 'APPROVED'
                  ? '/borrow?status=APPROVED'
                  : '/borrow?status=BORROWED'
                : '/requisitions'
            }
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-600" />
            ตารางงานเจ้าหน้าที่ & กำหนดการรับ-คืน (Duty Schedule)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ติดตามรายการที่อนุมัติแล้ว: วันที่ต้องจัดเตรียมของ วันที่ผู้รับจะมารับ กำหนดส่งคืน และคิวฝึกปฏิบัติการในห้องแล็บ
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>สิทธิ์แอดมิน/เจ้าหน้าที่: สามารถแก้ไขกำหนดวันรับและวันคืนได้</span>
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">คิวงานทั้งหมด</span>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {allDisplayTasks.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">งาน</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">รอจัดเตรียม & จ่ายของ</span>
            <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
              {combinedTasks.filter((t) => t.status === 'APPROVED').length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">กำลังยืม (รอส่งคืน)</span>
            <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
              {combinedTasks.filter((t) => t.status === 'BORROWED').length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">เกินกำหนดคืน</span>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
              {combinedTasks.filter((t) => t.isOverdue).length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">คิวเข้าฝึกปฏิบัติ (Lab)</span>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
              {practiceList.length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">คน ({practiceEventTasks.length} รอบ)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* View Switcher & Calendar Navigator Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'CALENDAR' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                title="เดือนก่อนหน้า"
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-0.5 text-center min-w-[150px]">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                  {thaiMonthDisplay}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  (พ.ศ. {currentMonth.getFullYear() + 543})
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                title="เดือนถัดไป"
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {viewMode === 'CALENDAR' && (
            <button
              onClick={handleTodayMonth}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              วันนี้
            </button>
          )}
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setViewMode('CALENDAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'CALENDAR'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>📅 ปฏิทินรายเดือน (Calendar View)</span>
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'LIST'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>📋 มุมมองรายการ (List View)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE MONTHLY CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-6">
          {/* Calendar Grid Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Legend Bar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">สัญลักษณ์งาน:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                  📦 จ่ายของ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                  🔄 กำหนดคืน
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  🏥 คิวแล็บ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                  🚨 เกินกำหนดคืน
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                คลิกที่วันที่เพื่อดูรายละเอียดงานและจัดการรายการประจำวัน
              </span>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-center text-xs font-black text-slate-700 dark:text-slate-300 py-3">
              <div className="text-rose-500">อาทิตย์</div>
              <div>จันทร์</div>
              <div>อังคาร</div>
              <div>พุธ</div>
              <div>พฤหัสบดี</div>
              <div>ศุกร์</div>
              <div className="text-teal-600">เสาร์</div>
            </div>

            {/* 42 Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {calendarCells.map((cell) => {
                const dayTasks = getTasksForDate(cell.dateStr);
                const pickups = dayTasks.filter((t: any) => {
                  const pDate = t.pickupDate ? new Date(t.pickupDate).toISOString().slice(0, 10) : '';
                  return pDate === cell.dateStr && t.type !== 'PRACTICE_EVENT';
                });
                const returns = dayTasks.filter((t: any) => {
                  const rDate = t.returnDate ? new Date(t.returnDate).toISOString().slice(0, 10) : '';
                  return rDate === cell.dateStr;
                });
                const practices = dayTasks.filter((t: any) => {
                  const pDate = t.pickupDate ? new Date(t.pickupDate).toISOString().slice(0, 10) : '';
                  return pDate === cell.dateStr && t.type === 'PRACTICE_EVENT';
                });
                const roomTasks = dayTasks.filter((t: any) => {
                  const pDate = t.pickupDate ? new Date(t.pickupDate).toISOString().slice(0, 10) : '';
                  return pDate === cell.dateStr && t.type === 'ROOM_BOOKING';
                });
                const overdues = dayTasks.filter((t: any) => {
                  const rDate = t.returnDate ? new Date(t.returnDate).toISOString().slice(0, 10) : '';
                  return rDate === cell.dateStr && t.isOverdue;
                });

                const isSelected = selectedDate === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`min-h-[105px] p-2 transition cursor-pointer flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40'
                        : isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500 z-10'
                        : cell.isToday
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/40'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-lg w-6 h-6 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-teal-600 text-white font-black shadow-sm'
                            : isSelected
                            ? 'bg-teal-100 text-teal-900 font-black'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayTasks.length} งาน
                        </span>
                      )}
                    </div>

                    {/* Task Badges Stack */}
                    <div className="space-y-1 my-1">
                      {pickups.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 truncate flex items-center gap-1">
                          <span>📦 จ่าย</span>
                          <span className="ml-auto font-black">{pickups.length}</span>
                        </div>
                      )}
                      {returns.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 truncate flex items-center gap-1">
                          <span>🔄 คืน</span>
                          <span className="ml-auto font-black">{returns.length}</span>
                        </div>
                      )}
                      {practices.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 truncate flex items-center gap-1">
                          <span>🏥 แล็บ</span>
                          <span className="ml-auto font-black">{practices.length}</span>
                        </div>
                      )}
                      {roomTasks.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 truncate flex items-center gap-1">
                          <span>🏢 ใช้ห้อง</span>
                          <span className="ml-auto font-black">{roomTasks.length}</span>
                        </div>
                      )}
                      {overdues.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 truncate flex items-center gap-1 animate-pulse">
                          <span>🚨 เกิน</span>
                          <span className="ml-auto font-black">{overdues.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="h-1">
                      {isSelected && (
                        <div className="w-full h-1 bg-teal-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Duty Detail Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    ตารางคิวงานประจำวัน: {formatThaiFullDate(selectedDate)}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  พบทั้งหมด {selectedDateAllTasks.length} รายการที่ต้องดำเนินการในวันที่เลือก
                </p>
              </div>

              {/* Sub-filter chips for selected day */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: `ทั้งหมด (${selectedDateAllTasks.length})` },
                  { key: 'PICKUP', label: `📦 จ่ายของ (${selectedDateAllTasks.filter((t: any) => t.pickupDate?.slice(0, 10) === selectedDate && t.type !== 'PRACTICE_EVENT').length})` },
                  { key: 'RETURN', label: `🔄 กำหนดคืน (${selectedDateAllTasks.filter((t: any) => t.returnDate?.slice(0, 10) === selectedDate).length})` },
                  { key: 'PRACTICE', label: `🏥 คิวแล็บ (${selectedDateAllTasks.filter((t: any) => t.pickupDate?.slice(0, 10) === selectedDate && t.type === 'PRACTICE_EVENT').length})` },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setDayTypeFilter(chip.key as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      dayTypeFilter === chip.key
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Tasks for Selected Date */}
            {selectedDateTasks.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  ไม่มีคิวงานที่ต้องจ่ายของ ส่งคืน หรือฝึกแล็บในวันที่เลือก ({formatDate(selectedDate)})
                </p>
                <p>สามารถคลิกเลือกวันอื่นบนปฏิทิน หรือเปลี่ยนตัวกรองเพื่อดูรายการทั้งหมดได้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateTasks.map((task) => renderTaskCard(task))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL LIST VIEW */}
      {viewMode === 'LIST' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    timeFilter === tab.key
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Schedule Table / Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                <LoadingSpinner
                  message="กำลังโหลดตารางงานและกำหนดการ..."
                  submessage="กำลังดึงข้อมูลคิวงานของเจ้าหน้าที่จาก Supabase"
                />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-75" />
                ไม่มีคิวงานที่ตรงกับเงื่อนไขในขณะนี้
              </div>
            ) : (
              filteredTasks.map((task: any) => renderTaskCard(task))
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Dates (Admin & Officer) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                แก้ไขกำหนดวันรับและวันคืน
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              รายการ: <strong className="text-slate-800 dark:text-slate-200">{editingItem.title}</strong>
            </p>

            <form onSubmit={handleSaveDates} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วันที่ผู้รับมารับของ / วันที่ต้องจัดเตรียม
                </label>
                <input
                  type="date"
                  required
                  value={newBorrowDate}
                  onChange={(e) => setNewBorrowDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {editingItem.type === 'BORROW' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    กำหนดวันส่งคืนของ
                  </label>
                  <input
                    type="date"
                    required
                    value={newReturnDate}
                    onChange={(e) => setNewReturnDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingDates}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
