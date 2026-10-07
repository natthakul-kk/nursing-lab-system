'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Building2,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X,
  SlidersHorizontal,
  LayoutGrid,
  GraduationCap,
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';

export type RoomCategory = 'ALL' | 'SKILL' | 'SIMULATION' | 'SPECIALTY' | 'SUPPORT';

export interface CalendarActivity {
  id: string;
  sourceType: 'ROOM_BOOKING' | 'PRACTICE_SLOT';
  title: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  roomLocation?: string;
  roomCapacity?: number;
  roomCategory: RoomCategory;
  dateStr: string; // YYYY-MM-DD
  startTime: string; // "08:30"
  endTime: string; // "12:00"
  purpose?: string;
  activityType: 'COURSE' | 'OSCE' | 'PRACTICE' | 'TRAINING' | 'OTHER';
  userOrAdvisorName?: string;
  attendeesCount?: number;
  status: 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  equipmentNeeded?: string;
  notes?: string;
  rawItem?: any;
}

export function getRoomCategory(code: string = '', name: string = ''): RoomCategory {
  const c = code.toUpperCase();
  const n = name;
  if (
    c.includes('SIM') ||
    c.includes('LAB-07') ||
    n.includes('SIM') ||
    n.includes('debrief') ||
    n.includes('จำลอง') ||
    n.includes('สังเกตการณ์')
  ) {
    return 'SIMULATION';
  }
  if (
    c.startsWith('LAB-01') ||
    c.startsWith('LAB-1') ||
    n.includes('พื้นฐาน') ||
    n.includes('Skill')
  ) {
    return 'SKILL';
  }
  if (
    c.includes('CS') ||
    c.includes('EQ') ||
    n.includes('พัสดุ') ||
    n.includes('วัสดุ') ||
    n.includes('ครุภัณฑ์') ||
    n.includes('เก็บของ')
  ) {
    return 'SUPPORT';
  }
  return 'SPECIALTY';
}

function classifyActivityType(title: string = '', purpose: string = ''): 'COURSE' | 'OSCE' | 'PRACTICE' | 'TRAINING' | 'OTHER' {
  const combined = (title + ' ' + purpose).toLowerCase();
  if (combined.includes('osce') || combined.includes('สอบ') || combined.includes('ประเมินทักษะ')) {
    return 'OSCE';
  }
  if (combined.includes('ซ้อม') || combined.includes('ฝึกปฏิบัติ') || combined.includes('practice') || combined.includes('หัตถการ')) {
    return 'PRACTICE';
  }
  if (combined.includes('อบรม') || combined.includes('สัมมนา') || combined.includes('workshop') || combined.includes('ประชุม')) {
    return 'TRAINING';
  }
  if (combined.includes('วิชา') || combined.includes('เรียน') || combined.includes('สอน') || combined.includes('nur')) {
    return 'COURSE';
  }
  return 'OTHER';
}

interface MasterRoomCalendarProps {
  onOpenBookingModal?: (initialData?: { roomId?: string; date?: string; startTime?: string }) => void;
  className?: string;
  hideHeaderBanner?: boolean;
}

export default function MasterRoomCalendar({
  onOpenBookingModal,
  className = '',
  hideHeaderBanner = false,
}: MasterRoomCalendarProps) {
  // Navigation & View Modes
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'MONTH' | 'LIST'>('TIMELINE');

  // Dates
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Data States
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [practiceSlots, setPracticeSlots] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [statusFilter] = useState<'ALL' | 'APPROVED_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Activity Detail Modal
  const [activeActivityModal, setActiveActivityModal] = useState<CalendarActivity | null>(null);

  // Fetch Master Data
  const fetchData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const [roomsRes, bookingsRes, slotsRes] = await Promise.all([
        fetch('/api/practice/rooms?includeInactive=false'),
        fetch(`/api/room-bookings?year=${year}&month=${month}`),
        fetch(`/api/practice/slots?year=${year}&month=${month}`),
      ]);

      if (roomsRes.ok) {
        const rData = await roomsRes.json();
        setRooms(Array.isArray(rData) ? rData : []);
      }
      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setRoomBookings(Array.isArray(bData) ? bData : []);
      }
      if (slotsRes.ok) {
        const sData = await slotsRes.json();
        setPracticeSlots(Array.isArray(sData) ? sData : []);
      }

      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  // Convert Raw Data into Normalized CalendarActivities
  const activities: CalendarActivity[] = useMemo(() => {
    const list: CalendarActivity[] = [];

    // 1. Process RoomBookings
    roomBookings.forEach((b: any) => {
      if (b.status === 'REJECTED' || b.status === 'CANCELLED') return;
      const bDateStr = b.bookingDate ? new Date(b.bookingDate).toISOString().slice(0, 10) : '';
      const r = b.room || rooms.find((rm) => rm.id === b.roomId);
      const cat = r ? getRoomCategory(r.code, r.name) : 'SPECIALTY';
      const type = classifyActivityType(b.title, b.purpose);

      list.push({
        id: `rb-${b.id}`,
        sourceType: 'ROOM_BOOKING',
        title: b.title || 'การขอใช้ห้องปฏิบัติการ',
        roomId: b.roomId,
        roomCode: r?.code || 'LAB',
        roomName: r?.name || 'ห้องปฏิบัติการ',
        roomLocation: r?.location || '',
        roomCapacity: r?.capacity || 10,
        roomCategory: cat,
        dateStr: bDateStr,
        startTime: b.startTime || '09:00',
        endTime: b.endTime || '12:00',
        purpose: b.purpose || '',
        activityType: type,
        userOrAdvisorName: b.advisorName ? formatTeacherName(b.advisorName) : formatUserName(b.user),
        attendeesCount: b.attendeesCount || 1,
        status: b.status,
        equipmentNeeded: b.equipmentNeeded || '',
        notes: b.note || '',
        rawItem: b,
      });
    });

    // 2. Process PracticeSlots (Student Self-practice slots)
    practiceSlots.forEach((s: any) => {
      if (!s.isOpen) return;
      const sDateStr = s.date ? new Date(s.date).toISOString().slice(0, 10) : '';
      const r = s.room || rooms.find((rm) => rm.id === s.roomId);
      const cat = r ? getRoomCategory(r.code, r.name) : 'SPECIALTY';
      const bookedCount = Array.isArray(s.bookings) ? s.bookings.filter((bk: any) => ['APPROVED', 'CHECKED_IN', 'PENDING'].includes(bk.status)).length : 0;
      const title = s.availableSkills ? `รอบฝึกทักษะ: ${s.availableSkills}` : 'รอบฝึกปฏิบัติการอิสระของนิสิต';

      list.push({
        id: `ps-${s.id}`,
        sourceType: 'PRACTICE_SLOT',
        title,
        roomId: s.roomId,
        roomCode: r?.code || 'LAB',
        roomName: r?.name || 'ห้องฝึกทักษะ',
        roomLocation: r?.location || '',
        roomCapacity: s.maxCapacity || 6,
        roomCategory: cat,
        dateStr: sDateStr,
        startTime: s.startTime || '13:00',
        endTime: s.endTime || '16:00',
        purpose: 'การฝึกทักษะหัตถการของนิสิต',
        activityType: 'PRACTICE',
        userOrAdvisorName: `นิสิตจองแล้ว ${bookedCount}/${s.maxCapacity} คน`,
        attendeesCount: bookedCount,
        status: 'APPROVED',
        notes: s.closeReason || '',
        rawItem: s,
      });
    });

    return list;
  }, [roomBookings, practiceSlots, rooms]);

  // Operational Rooms filtered by category and selection
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedCategory !== 'ALL' && getRoomCategory(r.code, r.name) !== selectedCategory) {
        return false;
      }
      if (selectedRoomId !== 'ALL' && r.id !== selectedRoomId) {
        return false;
      }
      return true;
    });
  }, [rooms, selectedCategory, selectedRoomId]);

  // Activities filtered by status and search
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (statusFilter === 'APPROVED_ONLY' && act.status !== 'APPROVED') {
        return false;
      }
      if (selectedCategory !== 'ALL' && act.roomCategory !== selectedCategory) {
        return false;
      }
      if (selectedRoomId !== 'ALL' && act.roomId !== selectedRoomId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          act.title.toLowerCase().includes(q) ||
          act.roomCode.toLowerCase().includes(q) ||
          act.roomName.toLowerCase().includes(q) ||
          (act.userOrAdvisorName && act.userOrAdvisorName.toLowerCase().includes(q)) ||
          (act.purpose && act.purpose.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [activities, statusFilter, selectedCategory, selectedRoomId, searchQuery]);

  // Daily Activities for the Selected Date
  const dailyActivities = useMemo(() => {
    return filteredActivities.filter((act) => act.dateStr === selectedDate);
  }, [filteredActivities, selectedDate]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
    if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
    if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().slice(0, 10));
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const formatThaiDisplayDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  // Month Grid Calculation (42 cells)
  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const d = new Date(year, month - 1, day);
      const str = d.toISOString().slice(0, 10);
      cells.push({ dateStr: str, dayNumber: day, isCurrentMonth: false, isToday: str === todayStr });
    }

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      const str = d.toISOString().slice(0, 10);
      cells.push({ dateStr: str, dayNumber: day, isCurrentMonth: true, isToday: str === todayStr });
    }

    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      const str = d.toISOString().slice(0, 10);
      cells.push({ dateStr: str, dayNumber: day, isCurrentMonth: false, isToday: str === todayStr });
    }

    return cells;
  }, [currentMonth]);

  // Timeline Hours Definition (08:00 to 18:00) = 10 hours
  const TIMELINE_START_HOUR = 8;
  const TIMELINE_END_HOUR = 18;
  const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

  const calculateTimelinePosition = (startTimeStr: string, endTimeStr: string) => {
    const parseTime = (tStr: string) => {
      const [h, m] = tStr.split(':').map((v) => parseInt(v, 10) || 0);
      return h + m / 60;
    };

    const s = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR, parseTime(startTimeStr)));
    const e = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR, parseTime(endTimeStr)));

    const left = ((s - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100;
    const width = Math.max(4, ((e - s) / TOTAL_HOURS) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  const getActivityStyle = (type: CalendarActivity['activityType'], status: CalendarActivity['status']) => {
    if (status === 'PENDING') {
      return {
        bg: 'bg-amber-500/20 border-amber-500/60 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30',
        badge: 'bg-amber-400 text-slate-900',
        dot: 'bg-amber-400',
        icon: '⏳',
      };
    }
    switch (type) {
      case 'COURSE':
        return {
          bg: 'bg-gradient-to-r from-blue-600/90 to-blue-500/90 text-white border-blue-400/50 shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400',
          badge: 'bg-blue-200 text-blue-900',
          dot: 'bg-blue-400',
          icon: '📘',
        };
      case 'OSCE':
        return {
          bg: 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white border-purple-400/50 shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500',
          badge: 'bg-purple-200 text-purple-900',
          dot: 'bg-purple-400',
          icon: '🟣',
        };
      case 'PRACTICE':
        return {
          bg: 'bg-gradient-to-r from-emerald-600/90 to-teal-500/90 text-white border-emerald-400/50 shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-400',
          badge: 'bg-emerald-200 text-emerald-900',
          dot: 'bg-emerald-400',
          icon: '🟢',
        };
      case 'TRAINING':
        return {
          bg: 'bg-gradient-to-r from-amber-600/90 to-orange-500/90 text-white border-amber-400/50 shadow-amber-500/20 hover:from-amber-500 hover:to-orange-400',
          badge: 'bg-amber-200 text-amber-900',
          dot: 'bg-amber-400',
          icon: '🟠',
        };
      default:
        return {
          bg: 'bg-slate-700/90 text-white border-slate-500/50 hover:bg-slate-650',
          badge: 'bg-slate-300 text-slate-900',
          dot: 'bg-slate-400',
          icon: '📋',
        };
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. TOP HEADER BANNER (Optional) */}
      {!hideHeaderBanner && (
        <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-teal-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                <Building2 className="w-4 h-4 text-teal-400" />
                <span>ระบบปฏิทินกิจกรรมและการใช้ห้องรวมศูนย์ (Master Lab Schedule)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                ปฏิทินกิจกรรมการใช้ห้องปฏิบัติการรวมทุกห้อง
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                ศูนย์กลางตารางเวลาห้องแล็บพยาบาลทุกห้อง รวมทั้งการเรียนการสอน การสอบ OSCE และรอบเปิดฝึกทักษะหัตถการของนิสิตไว้ในหน้าจอเดียว
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (onOpenBookingModal) {
                    onOpenBookingModal({ date: selectedDate });
                  } else {
                    window.location.href = `/rooms?action=book&date=${selectedDate}`;
                  }
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/30 transition cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ ยื่นคำขอจองห้องใช้งาน</span>
              </button>

              <button
                type="button"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-white/10"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[11px]">ห้องปฏิบัติการทั้งหมด</span>
              <div className="text-lg font-black text-emerald-300 mt-0.5">
                {rooms.length} <span className="text-xs font-normal text-slate-300">ห้อง</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[11px]">กิจกรรมวันนี้</span>
              <div className="text-lg font-black text-teal-300 mt-0.5">
                {dailyActivities.length} <span className="text-xs font-normal text-slate-300">รายการ</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[11px]">กิจกรรมตลอดทั้งเดือน</span>
              <div className="text-lg font-black text-indigo-300 mt-0.5">
                {activities.length} <span className="text-xs font-normal text-slate-300">รายการ</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[11px]">อัปเดตล่าสุด</span>
              <div className="text-sm font-bold text-slate-200 mt-1">
                {lastUpdated || 'เพิ่งอัปเดต'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTROLS, VIEW SWITCHER & FILTERS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Date / Month Navigator */}
          <div className="flex items-center gap-3 flex-wrap">
            {viewMode === 'TIMELINE' ? (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="px-3 py-0.5 text-center min-w-[210px]">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 block">
                    {formatThaiDisplayDate(selectedDate)}
                  </span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                    พบ {dailyActivities.length} กิจกรรมการใช้ห้อง
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="วันถัดไป"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="px-4 py-0.5 text-center min-w-[170px]">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 block">
                    {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {filteredActivities.length} กิจกรรมในเดือนนี้
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleToday}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              วันนี้
            </button>

            {/* Quick Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  const d = new Date(e.target.value);
                  if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) {
                    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }
                }
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Right: 3 Master View Switcher Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                viewMode === 'TIMELINE'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>📊 ไทม์ไลน์รายวัน (Timeline)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>📅 ปฏิทินรายเดือน</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>📋 ตารางรายการ</span>
            </button>
          </div>
        </div>

        {/* Filters & Category Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> หมวดห้อง:
            </span>
            {[
              { id: 'ALL', label: 'ทุกห้อง', count: rooms.length },
              { id: 'SKILL', label: '🩺 ทักษะพื้นฐาน (Skill)', count: rooms.filter((r) => getRoomCategory(r.code, r.name) === 'SKILL').length },
              { id: 'SIMULATION', label: '🤖 SIM', count: rooms.filter((r) => getRoomCategory(r.code, r.name) === 'SIMULATION').length },
              { id: 'SPECIALTY', label: '🏥 เฉพาะทาง', count: rooms.filter((r) => getRoomCategory(r.code, r.name) === 'SPECIALTY').length },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as RoomCategory)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap border ${
                  selectedCategory === cat.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span>{cat.label}</span>
                <span className="ml-1 text-[10px] opacity-75 font-mono">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Activity Color Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> การสอนบรรยาย/แล็บ
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> สอบประเมิน OSCE
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> รอบซ้อมทักษะนิสิต
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> อบรม/กิจกรรม
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: DAILY TIMELINE GRID (THE MASTER GANTT VIEW)             */}
      {/* ============================================================== */}
      {viewMode === 'TIMELINE' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/60">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ตารางการใช้ห้องประจำวัน: {formatThaiDisplayDate(selectedDate)}
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                {dailyActivities.length} กิจกรรม
              </span>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              ช่วงเวลา 08:00 – 18:00 น. (คลิกที่กิจกรรมเพื่อดูรายละเอียด หรือคลิกช่องว่างเพื่อจอง)
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[950px] divide-y divide-slate-100 dark:divide-slate-800">
              {/* Hours Ruler Header */}
              <div className="grid grid-cols-12 bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 py-2.5">
                <div className="col-span-2 pl-4 text-left font-black text-slate-800 dark:text-slate-200">
                  ห้องปฏิบัติการ ({filteredRooms.length})
                </div>
                {Array.from({ length: TOTAL_HOURS }).map((_, idx) => {
                  const h = TIMELINE_START_HOUR + idx;
                  return (
                    <div key={h} className="text-center font-mono border-l border-slate-200/60 dark:border-slate-700/60">
                      {String(h).padStart(2, '0')}:00
                    </div>
                  );
                })}
              </div>

              {/* Rows for Each Room */}
              {filteredRooms.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  ไม่พบห้องปฏิบัติการในหมวดหมู่นี้
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const roomActs = dailyActivities.filter((act) => act.roomId === room.id);

                  return (
                    <div
                      key={room.id}
                      className="grid grid-cols-12 items-center min-h-[72px] hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition relative group"
                    >
                      {/* Room Info Cell */}
                      <div className="col-span-2 pl-4 pr-2 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded">
                            {room.code}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate" title={room.name}>
                          {room.name}
                        </h4>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          {room.location && <span>{room.location}</span>}
                          <span>•</span>
                          <span>{room.capacity || 10} ที่นั่ง</span>
                        </div>
                      </div>

                      {/* Timeline Slots Canvas (10 columns spanning across 08:00 - 18:00) */}
                      <div className="col-span-10 h-full relative border-l border-slate-200 dark:border-slate-800">
                        {/* Background Grid Lines (10 hour segments) */}
                        <div className="absolute inset-0 grid grid-cols-10 pointer-events-none divide-x divide-slate-100 dark:divide-slate-800/60">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="h-full"></div>
                          ))}
                        </div>

                        {/* Interactive Click-to-book on Empty Background */}
                        <div
                          onClick={() => {
                            if (onOpenBookingModal) {
                              onOpenBookingModal({ roomId: room.id, date: selectedDate });
                            } else {
                              window.location.href = `/rooms?action=book&roomId=${room.id}&date=${selectedDate}`;
                            }
                          }}
                          className="absolute inset-0 z-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-teal-500/5"
                          title={`คลิกเพื่อจอง ${room.name} ในวันนี้`}
                        >
                          {roomActs.length === 0 && (
                            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-full shadow-sm border border-teal-200 dark:border-teal-800">
                              ✨ ห้องว่างตลอดทั้งวัน (+ คลิกเพื่อจอง)
                            </span>
                          )}
                        </div>

                        {/* Render Activity Event Blocks */}
                        <div className="absolute inset-y-1.5 inset-x-1 z-10 pointer-events-none">
                          {roomActs.map((act) => {
                            const { left, width } = calculateTimelinePosition(act.startTime, act.endTime);
                            const style = getActivityStyle(act.activityType, act.status);

                            return (
                              <div
                                key={act.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActivityModal(act);
                                }}
                                style={{ left, width }}
                                className={`absolute inset-y-0 p-2 rounded-xl border shadow-sm transition cursor-pointer pointer-events-auto flex flex-col justify-center overflow-hidden hover:scale-[1.01] hover:z-20 ${style.bg}`}
                                title={`${act.title} (${act.startTime} - ${act.endTime} น.)`}
                              >
                                <div className="flex items-center justify-between gap-1 text-[11px] font-bold truncate">
                                  <span className="truncate flex items-center gap-1">
                                    <span>{style.icon}</span>
                                    <span>{act.title}</span>
                                  </span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/25 flex-shrink-0">
                                    {act.startTime}-{act.endTime}
                                  </span>
                                </div>

                                <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center gap-1.5">
                                  {act.userOrAdvisorName && <span>{act.userOrAdvisorName}</span>}
                                  {act.attendeesCount && <span>• {act.attendeesCount} คน</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: MONTHLY MASTER CALENDAR GRID                            */}
      {/* ============================================================== */}
      {viewMode === 'MONTH' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-4 p-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-center text-xs font-black text-slate-700 dark:text-slate-300 py-2.5">
              <div className="text-rose-500">อา.</div>
              <div>จ.</div>
              <div>อ.</div>
              <div>พ.</div>
              <div>พฤ.</div>
              <div>ศ.</div>
              <div className="text-teal-600">ส.</div>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {calendarCells.map((cell) => {
                const dayActivities = filteredActivities.filter((act) => act.dateStr === cell.dateStr);
                const isSelected = selectedDate === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`min-h-[105px] p-2 transition cursor-pointer flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40'
                        : isSelected
                        ? 'bg-teal-50/80 dark:bg-teal-950/40 ring-2 ring-teal-500 z-10'
                        : cell.isToday
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/40'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-lg w-6 h-6 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-teal-600 text-white font-black shadow-sm'
                            : isSelected
                            ? 'bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100 font-black'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {dayActivities.length > 0 && (
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.2 rounded-full">
                          {dayActivities.length} กิจกรรม
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 my-1">
                      {dayActivities.slice(0, 2).map((act) => {
                        const style = getActivityStyle(act.activityType, act.status);
                        return (
                          <div
                            key={act.id}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${style.bg}`}
                          >
                            {act.roomCode}: {act.title}
                          </div>
                        );
                      })}
                      {dayActivities.length > 2 && (
                        <div className="text-[9px] font-bold text-slate-500 pl-1">
                          +{dayActivities.length - 2} กิจกรรมเพิ่มเติม
                        </div>
                      )}
                    </div>

                    <div className="h-1">
                      {isSelected && <div className="w-full h-1 bg-teal-500 rounded-full"></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Day Detail Panel */}
          <div className="bg-slate-50/80 dark:bg-slate-850/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>กิจกรรมวันที่: {formatThaiDisplayDate(selectedDate)}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  พบ {dailyActivities.length} กิจกรรมในวันนี้
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('TIMELINE')}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>เปิดดูไทม์ไลน์วันนี้นี้ ➔</span>
              </button>
            </div>

            {dailyActivities.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                ไม่มีกิจกรรมการใช้ห้องในวันนี้ ทุกห้องเปิดว่างพร้อมรับการจอง
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {dailyActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => setActiveActivityModal(act)}
                    className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-teal-500 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                        {act.roomCode} ({act.roomName})
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {act.startTime} - {act.endTime} น.
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {act.title}
                    </h5>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{act.userOrAdvisorName}</span>
                      <span>{act.attendeesCount} คน</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: AGENDA / LIST VIEW                                     */}
      {/* ============================================================== */}
      {viewMode === 'LIST' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-4 p-5">
          {/* Search Box */}
          <div className="flex items-center gap-2 max-w-md bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="ค้นหากิจกรรม, รหัสห้อง, อาจารย์ หรือรายวิชา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs w-full focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">วันที่</th>
                  <th className="p-3.5">เวลา</th>
                  <th className="p-3.5">ห้องปฏิบัติการ</th>
                  <th className="p-3.5">ชื่องาน / กิจกรรม</th>
                  <th className="p-3.5">ผู้ขอ / อาจารย์</th>
                  <th className="p-3.5 text-center">จำนวนนิสิต</th>
                  <th className="p-3.5 text-center">สถานะ</th>
                  <th className="p-3.5 text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      ไม่พบรายการกิจกรรมตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition">
                      <td className="p-3.5 font-bold">{formatThaiDisplayDate(act.dateStr)}</td>
                      <td className="p-3.5 font-mono text-teal-600 dark:text-teal-400 font-bold whitespace-nowrap">
                        {act.startTime} - {act.endTime} น.
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {act.roomCode}
                        </span>
                        <span className="ml-1.5 text-slate-500">{act.roomName}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {act.title}
                      </td>
                      <td className="p-3.5">{act.userOrAdvisorName || '-'}</td>
                      <td className="p-3.5 text-center font-bold">{act.attendeesCount || 1} คน</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            act.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {act.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveActivityModal(act)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[11px] hover:bg-teal-100 transition"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ACTIVITY DETAIL POPUP MODAL                                 */}
      {/* ============================================================== */}
      {activeActivityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded">
                  {activeActivityModal.roomCode} • {activeActivityModal.roomName}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-2">
                  {activeActivityModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveActivityModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[11px]">วันที่ใช้งาน:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatThaiDisplayDate(activeActivityModal.dateStr)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ช่วงเวลา:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                    {activeActivityModal.startTime} - {activeActivityModal.endTime} น.
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-slate-700 dark:text-slate-300">
                {activeActivityModal.userOrAdvisorName && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>ผู้ขอ / อาจารย์: <strong>{activeActivityModal.userOrAdvisorName}</strong></span>
                  </div>
                )}

                {activeActivityModal.purpose && (
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>วัตถุประสงค์: {activeActivityModal.purpose}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>จำนวนผู้เข้าร่วม: <strong>{activeActivityModal.attendeesCount || 1} คน</strong></span>
                </div>

                {activeActivityModal.equipmentNeeded && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-[11px]">
                    <strong>อุปกรณ์ที่ขอใช้งาน:</strong> {activeActivityModal.equipmentNeeded}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveActivityModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
