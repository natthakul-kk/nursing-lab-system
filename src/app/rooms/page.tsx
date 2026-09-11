'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building,
  Building2,
  CalendarDays,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Users,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Sparkles,
  Phone,
  BookOpen,
  GraduationCap,
  Package,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Check,
  Edit3,
  ShieldCheck,
  DoorOpen,
  DoorClosed,
  Info
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function RoomsPage() {
  const { currentUser, isOfficer, isAdmin, isTeacher, isApprover } = useAuth();
  const canManageRooms = isOfficer || isAdmin;
  const canApprove = isApprover || isAdmin || isOfficer || isTeacher;

  // Tabs
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'REQUESTS'>('TIMETABLE');

  // Main Data States
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  // Calendar States
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Modal: Booking Form
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [bookingForm, setBookingForm] = useState<{
    roomId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    title: string;
    purpose: string;
    attendeesCount: number | string;
    courseId: string;
    advisorName: string;
    contactPhone: string;
    equipmentNeeded: string;
    note: string;
  }>({
    roomId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    title: '',
    purpose: '',
    attendeesCount: '',
    courseId: '',
    advisorName: '',
    contactPhone: '',
    equipmentNeeded: '',
    note: '',
  });

  // Modal: Add / Edit Room
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<any>(null);
  const [roomForm, setRoomForm] = useState<{
    code: string;
    name: string;
    location: string;
    capacity: number | string;
    description: string;
    closeReason: string;
  }>({
    code: '',
    name: '',
    location: '',
    capacity: '',
    description: '',
    closeReason: '',
  });

  // Modal: Toggle Room Status with Reason
  const [roomToToggle, setRoomToToggle] = useState<any>(null);
  const [roomToggleReason, setRoomToggleReason] = useState('');

  // Month navigation helpers
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

  // Fetch Data
  const fetchData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const [roomsRes, bookingsRes, coursesRes, usersRes] = await Promise.all([
        fetch('/api/rooms?includeInactive=true'),
        fetch(`/api/room-bookings?year=${year}&month=${month}`),
        fetch('/api/courses?compact=true'),
        fetch('/api/users?role=INSTRUCTOR'),
      ]);

      if (roomsRes.ok) {
        const rList = await roomsRes.json();
        setRooms(rList);
      }

      if (bookingsRes.ok) {
        setBookings(await bookingsRes.json());
      }

      if (coursesRes.ok) {
        setCourses(await coursesRes.json());
      }

      if (usersRes.ok) {
        const uList = await usersRes.json();
        setTeachers(Array.isArray(uList) ? uList : []);
      }
    } catch (err) {
      console.error('Error fetching room data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  // Set user info to form when available
  useEffect(() => {
    if (currentUser && !bookingForm.contactPhone && currentUser.phone) {
      setBookingForm((prev) => ({ ...prev, contactPhone: currentUser.phone || '' }));
    }
  }, [currentUser]);

  // Actions: Submit Booking Request
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.roomId) {
      alert('กรุณาเลือกห้องปฏิบัติการที่ต้องการขอใช้');
      return;
    }
    if (!bookingForm.bookingDate) {
      alert('กรุณาระบุวันที่ต้องการใช้งานห้อง');
      return;
    }
    if (!bookingForm.startTime || !bookingForm.endTime) {
      alert('กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      alert('เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด');
      return;
    }
    if (!bookingForm.title?.trim()) {
      alert('กรุณากรอกหัวข้อ / ชื่องานที่ขอใช้งานห้อง');
      return;
    }
    if (!bookingForm.purpose) {
      alert('กรุณาเลือกวัตถุประสงค์การใช้งานห้อง');
      return;
    }
    if (!bookingForm.attendeesCount || Number(bookingForm.attendeesCount) <= 0) {
      alert('กรุณากรอกจำนวนผู้เข้าใช้งาน (คน) ให้ถูกต้อง');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/room-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingForm,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`ยื่นคำขอจองห้องสำเร็จ! เลขที่คำขอ: ${data.bookingNumber}`);
        setShowBookingModal(false);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยื่นคำขอจองห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Approve Booking
  const handleApprove = async (bookingId: string) => {
    if (!confirm('ยืนยันการอนุมัติคำขอใช้ห้องนี้?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('อนุมัติคำขอจองห้องเรียบร้อยแล้ว');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Reject Booking
  const handleReject = async (bookingId: string) => {
    const reason = prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ:');
    if (reason === null) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId: currentUser?.id,
          reason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('บันทึกไม่อนุมัติคำขอเรียบร้อยแล้ว');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Cancel Booking (by Requester)
  const handleCancel = async (bookingId: string) => {
    if (!confirm('คุณต้องการยกเลิกคำขอจองห้องนี้ใช่หรือไม่?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' }),
      });

      if (res.ok) {
        alert('ยกเลิกคำขอจองห้องเรียบร้อยแล้ว');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการยกเลิก');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Save Room (Create or Edit)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.code || !roomForm.name) {
      alert('กรุณากรอกรหัสและชื่อห้อง');
      return;
    }

    setSubmitting(true);
    try {
      const url = roomToEdit ? `/api/rooms/${roomToEdit.id}` : '/api/rooms';
      const method = roomToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });

      if (res.ok) {
        alert(roomToEdit ? 'แก้ไขห้องสำเร็จ!' : 'เพิ่มห้องปฏิบัติการใหม่สำเร็จ!');
        setShowRoomModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Toggle Room Status (Open / Close)
  const handleConfirmToggleRoom = async () => {
    if (!roomToToggle) return;
    const newStatus = !roomToToggle.isActive;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomToToggle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newStatus,
          closeReason: newStatus ? null : (roomToggleReason || 'ปิดให้บริการชั่วคราว'),
        }),
      });

      if (res.ok) {
        setRoomToToggle(null);
        setRoomToggleReason('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหรือปิดการใช้งานห้อง "${roomName}"?`)) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
      const data = await res.json();
      alert(data.message || 'ดำเนินการเรียบร้อย');
      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบห้อง');
    }
  };

  // Helpers: Date formatting
  const thaiMonthDisplay = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  // Calendar cells generation (42 cells)
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

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(currentYear, currentMonthIdx - 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, isToday: dateStr === todayDateStr });
  }

  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: dayNum, isCurrentMonth: true, isToday: dateStr === todayDateStr });
  }

  const remainingCells = 42 - calendarCells.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const d = new Date(currentYear, currentMonthIdx + 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, isToday: false });
  }

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (selectedRoomId !== 'ALL' && b.roomId !== selectedRoomId) return false;
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = b.bookingNumber?.toLowerCase().includes(q);
      const matchTitle = b.title?.toLowerCase().includes(q);
      const matchPurpose = b.purpose?.toLowerCase().includes(q);
      const matchUser = b.user?.name?.toLowerCase().includes(q) || b.user?.studentId?.toLowerCase().includes(q);
      const matchRoom = b.room?.name?.toLowerCase().includes(q) || b.room?.code?.toLowerCase().includes(q);
      if (!matchNumber && !matchTitle && !matchPurpose && !matchUser && !matchRoom) return false;
    }
    return true;
  });

  // Selected date bookings
  const selectedDateBookings = filteredBookings.filter((b) => {
    return new Date(b.bookingDate).toISOString().slice(0, 10) === selectedDate;
  });

  // KPI calculations
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;
  const activeRoomsCount = rooms.filter((r) => r.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>ระบบจองห้องปฏิบัติการสำหรับใช้งาน (Room Reservation)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ตารางและการยื่นคำขอจองห้องปฏิบัติการ
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              ขอใช้ห้องปฏิบัติการสำหรับการเรียนการสอน การสอบประเมิน การฝึกกลุ่ม และกิจกรรมต่างๆ พร้อมระบบตรวจสอบช่วงเวลาไม่ให้ชนกัน
            </p>
          </div>

          {/* Quick Action Button & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setBookingForm({
                  roomId: '',
                  bookingDate: selectedDate || '',
                  startTime: '',
                  endTime: '',
                  title: '',
                  purpose: '',
                  attendeesCount: '',
                  courseId: '',
                  advisorName: '',
                  contactPhone: currentUser?.phone || '',
                  equipmentNeeded: '',
                  note: '',
                });
                setIsEditingAdvisor(false);
                setShowBookingModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-teal-500/30 transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>+ ยื่นคำขอจองห้องใช้งาน</span>
            </button>

            {canManageRooms && (
              <button
                onClick={() => {
                  setRoomToEdit(null);
                  setRoomForm({
                    code: `LAB-SIM-0${rooms.length + 1}`,
                    name: '',
                    location: '',
                    capacity: 10,
                    description: '',
                    closeReason: '',
                  });
                  setShowRoomModal(true);
                }}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer flex items-center gap-1.5"
              >
                <Building className="w-4 h-4 text-teal-300" />
                <span>+ เพิ่มห้องใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">ห้องที่เปิดให้จอง</span>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {activeRoomsCount} <span className="text-xs font-normal text-slate-300">/ {rooms.length} ห้อง</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">คำขอรออนุมัติ</span>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              {pendingCount} <span className="text-xs font-normal text-slate-300">รายการ</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">อนุมัติแล้วในเดือนนี้</span>
            <div className="text-xl font-black text-teal-300 mt-0.5">
              {approvedCount} <span className="text-xs font-normal text-slate-300">รอบใช้งาน</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">การจองทั้งหมด</span>
            <div className="text-xl font-black text-indigo-300 mt-0.5">
              {bookings.length} <span className="text-xs font-normal text-slate-300">รายการ</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button
            onClick={() => setActiveTab('TIMETABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'TIMETABLE'
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>ตารางการใช้ห้อง (Timetable & Calendar)</span>
          </button>

          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'REQUESTS'
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>รายการคำขอ & การอนุมัติ ({bookings.length})</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 font-black rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="ml-auto p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TIMETABLE & CALENDAR VIEW */}
      {activeTab === 'TIMETABLE' && (
        <div className="space-y-6">
          {/* SECTION 1: ROOM STATUS & AVAILABILITY BAR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    สถานะการเปิด/ปิดห้องปฏิบัติการ ({rooms.length} ห้อง)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เจ้าหน้าที่สามารถเปิดหรือปิดรับการจองห้องได้ทันที หากมีการซ่อมบำรุงหรือปิดทำความสะอาด
                </p>
              </div>

              {/* Room Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">กรองห้อง:</span>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="ALL">ทุกห้องปฏิบัติการ ({rooms.length})</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const isOpen = room.isActive !== false;
                return (
                  <div
                    key={room.id}
                    className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 ${
                      isOpen
                        ? 'bg-slate-50/50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-teal-300'
                        : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-90'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          {room.code}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isOpen ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>เปิดให้จอง</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              <span>ปิดให้บริการ</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                        {room.name}
                      </h4>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        {room.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {room.location}
                          </span>
                        )}
                        <span>•</span>
                        <span>ความจุ {room.capacity} คน</span>
                      </div>

                      {!isOpen && room.closeReason && (
                        <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                          <span>เหตุผล: {room.closeReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Staff/Admin Open/Close Controls */}
                    {canManageRooms && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setRoomToToggle(room);
                            setRoomToggleReason(room.closeReason || '');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            isOpen
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300'
                          }`}
                        >
                          {isOpen ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>ปิดรับจอง</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>เปิดรับจอง</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setRoomToEdit(room);
                              setRoomForm({
                                code: room.code,
                                name: room.name,
                                location: room.location || '',
                                capacity: room.capacity || 10,
                                description: room.description || '',
                                closeReason: room.closeReason || '',
                              });
                              setShowRoomModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="แก้ไขข้อมูลห้อง"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id, room.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="ลบหรือปิดห้อง"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: CALENDAR & TIMETABLE CONTROLS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Month Navigator */}
              <div className="flex items-center gap-3">
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

                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  วันนี้
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setViewMode('CALENDAR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'CALENDAR'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>📅 ปฏิทินรายเดือน</span>
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'LIST'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>📋 ตารางรายการ</span>
                </button>
              </div>
            </div>

            {/* VIEW 2.1: MONTHLY CALENDAR GRID */}
            {viewMode === 'CALENDAR' && (
              <div className="space-y-6 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-center text-xs font-black text-slate-700 dark:text-slate-300 py-2.5">
                    <div className="text-rose-500">อา.</div>
                    <div>จ.</div>
                    <div>อ.</div>
                    <div>พ.</div>
                    <div>พฤ.</div>
                    <div>ศ.</div>
                    <div className="text-teal-600">ส.</div>
                  </div>

                  {/* 42 Date Cells */}
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                    {calendarCells.map((cell) => {
                      const dayBookings = filteredBookings.filter((b) => {
                        return new Date(b.bookingDate).toISOString().slice(0, 10) === cell.dateStr;
                      });
                      const approved = dayBookings.filter((b) => b.status === 'APPROVED');
                      const pending = dayBookings.filter((b) => b.status === 'PENDING');
                      const isSelected = selectedDate === cell.dateStr;

                      return (
                        <div
                          key={cell.dateStr}
                          onClick={() => setSelectedDate(cell.dateStr)}
                          className={`min-h-[95px] p-2 transition cursor-pointer flex flex-col justify-between ${
                            !cell.isCurrentMonth
                              ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40'
                              : isSelected
                              ? 'bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500 z-10'
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
                                  ? 'bg-teal-100 text-teal-900 font-black'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>

                            {dayBookings.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400">
                                {dayBookings.length} คิว
                              </span>
                            )}
                          </div>

                          {/* Day Badges */}
                          <div className="space-y-1 my-1">
                            {approved.length > 0 && (
                              <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 truncate">
                                🟢 อนุมัติ {approved.length} รายการ
                              </div>
                            )}
                            {pending.length > 0 && (
                              <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 truncate">
                                ⏳ รออนุมัติ {pending.length} รายการ
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

                {/* Day Detail Panel */}
                <div className="bg-slate-50/70 dark:bg-slate-850/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>คิวการจองห้องประจำวัน: {formatDate(selectedDate)}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        พบ {selectedDateBookings.length} รายการที่ขอใช้ห้องในวันนี้
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setBookingForm({
                          roomId: '',
                          bookingDate: selectedDate || '',
                          startTime: '',
                          endTime: '',
                          title: '',
                          purpose: '',
                          attendeesCount: '',
                          courseId: '',
                          advisorName: '',
                          contactPhone: currentUser?.phone || '',
                          equipmentNeeded: '',
                          note: '',
                        });
                        setIsEditingAdvisor(false);
                        setShowBookingModal(true);
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>จองห้องวันนี้</span>
                    </button>
                  </div>

                  {selectedDateBookings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ไม่มีการจองห้องในวันนี้ ทุกห้องเปิดว่างพร้อมรับการจอง
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedDateBookings.map((b) => (
                        <div
                          key={b.id}
                          className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm space-y-2 border-l-4 ${
                            b.status === 'APPROVED'
                              ? 'border-l-emerald-500 border-slate-200'
                              : b.status === 'PENDING'
                              ? 'border-l-amber-500 border-slate-200'
                              : 'border-l-rose-500 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                {b.room?.name} ({b.room?.code})
                              </span>
                              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                                {b.title}
                              </h5>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status === 'APPROVED' && 'อนุมัติแล้ว'}
                              {b.status === 'PENDING' && 'รออนุมัติ'}
                              {b.status === 'REJECTED' && 'ไม่อนุมัติ'}
                              {b.status === 'CANCELLED' && 'ยกเลิกแล้ว'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-bold text-teal-700">
                              <Clock className="w-3.5 h-3.5" />
                              {b.startTime} - {b.endTime} น.
                            </span>
                            <span>•</span>
                            <span>วัตถุประสงค์: {b.purpose}</span>
                            <span>•</span>
                            <span>ผู้ขอ: {b.user?.name} ({b.attendeesCount} คน)</span>
                          </div>

                          {/* Quick Approval Buttons for Pending */}
                          {b.status === 'PENDING' && canApprove && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReject(b.id)}
                                className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                onClick={() => handleApprove(b.id)}
                                className="px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition"
                              >
                                อนุมัติคำขอ
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2.2: LIST VIEW */}
            {viewMode === 'LIST' && (
              <div className="space-y-3 pt-2">
                {filteredBookings.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    ไม่พบรายการจองห้องที่ตรงกับเงื่อนไข
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {b.bookingNumber}
                            </span>
                            <span className="font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                              {b.room?.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status === 'APPROVED' && 'อนุมัติแล้ว'}
                              {b.status === 'PENDING' && 'รออนุมัติ'}
                              {b.status === 'REJECTED' && 'ไม่อนุมัติ'}
                              {b.status === 'CANCELLED' && 'ยกเลิกแล้ว'}
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {b.title}
                          </h5>

                          <div className="flex flex-wrap items-center gap-3 text-slate-500">
                            <span>วันที่: <strong>{formatDate(b.bookingDate)}</strong></span>
                            <span>เวลา: <strong>{b.startTime} - {b.endTime} น.</strong></span>
                            <span>ผู้ขอ: <strong>{b.user?.name}</strong></span>
                            {b.contactPhone && <span>โทร: {b.contactPhone}</span>}
                          </div>
                        </div>

                        {b.status === 'PENDING' && canApprove && (
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                              onClick={() => handleReject(b.id)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              onClick={() => handleApprove(b.id)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-sm"
                            >
                              อนุมัติ
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REQUESTS & APPROVALS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          {/* Status Filter Tabs & Search */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: `ทั้งหมด (${bookings.length})` },
                { key: 'PENDING', label: `รออนุมัติ (${bookings.filter((b) => b.status === 'PENDING').length})` },
                { key: 'APPROVED', label: `อนุมัติแล้ว (${bookings.filter((b) => b.status === 'APPROVED').length})` },
                { key: 'REJECTED', label: 'ไม่อนุมัติ' },
                { key: 'CANCELLED', label: 'ยกเลิก' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="ค้นหาชื่อห้อง / หัวข้องาน / ผู้ขอ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-500/20"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Bookings Card List */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-sm">
              ไม่พบรายการคำขอจองห้องที่ตรงกับเงื่อนไข
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const isPending = b.status === 'PENDING';
                const isApproved = b.status === 'APPROVED';
                const isRejected = b.status === 'REJECTED';
                const isCancelled = b.status === 'CANCELLED';
                const isMyBooking = currentUser?.id === b.userId;

                return (
                  <div
                    key={b.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 border-l-4 ${
                      isApproved
                        ? 'border-l-emerald-500'
                        : isPending
                        ? 'border-l-amber-500'
                        : 'border-l-rose-500'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                          {b.bookingNumber}
                        </span>
                        <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded border border-teal-100 dark:border-teal-800">
                          {b.room?.name} ({b.room?.code})
                        </span>

                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" /> รออนุมัติ
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> อนุมัติแล้ว
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-600" /> ไม่อนุมัติ
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                            ยกเลิกแล้ว
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{b.user?.name}</span>
                        {b.user?.studentId && (
                          <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                            {b.user.studentId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-1.5">
                        <div>
                          <span className="text-slate-400 font-bold">ชื่องาน/การใช้งาน: </span>
                          <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{b.title}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{b.purpose}</span>
                        </div>

                        {b.course && (
                          <div className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-bold">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>รายวิชา: [{b.course.code}] {b.course.name}</span>
                          </div>
                        )}

                        {b.advisorName && (
                          <div className="flex items-center gap-1 text-indigo-700 font-semibold">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>อาจารย์ผู้รับผิดชอบ/ที่ปรึกษา: {b.advisorName}</span>
                          </div>
                        )}

                        {b.equipmentNeeded && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium flex items-start gap-1.5">
                            <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>อุปกรณ์ที่ขอให้จัดเตรียม: <strong>{b.equipmentNeeded}</strong></span>
                          </div>
                        )}

                        {isRejected && b.rejectionReason && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-medium">
                            เหตุผลที่ไม่อนุมัติ: <strong>{b.rejectionReason}</strong>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Calendar className="w-4 h-4 text-teal-600" />
                          <span>วันที่: {formatDate(b.bookingDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-teal-700">
                          <Clock className="w-4 h-4 text-teal-600" />
                          <span>เวลา: {b.startTime} - {b.endTime} น.</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>จำนวนผู้ใช้: {b.attendeesCount} คน</span>
                        </div>
                        {b.contactPhone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>โทร: {b.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        {b.approver && (
                          <span className="text-[11px] text-slate-400">
                            ผู้อนุมัติ: {b.approver.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && isMyBooking && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                          >
                            ยกเลิกคำขอ
                          </button>
                        )}

                        {isPending && canApprove && (
                          <>
                            <button
                              disabled={submitting}
                              onClick={() => handleReject(b.id)}
                              className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              disabled={submitting}
                              onClick={() => handleApprove(b.id)}
                              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติคำขอ</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: SUBMIT ROOM BOOKING */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded uppercase">
                  แบบฟอร์มขอใช้ห้อง
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  ยื่นคำขอจองห้องปฏิบัติการสำหรับใช้งาน
                </h3>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Select Room */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ห้องปฏิบัติการที่ต้องการขอใช้ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={bookingForm.roomId}
                  onChange={(e) => setBookingForm({ ...bookingForm, roomId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">-- กรุณาเลือกห้องปฏิบัติการ --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id} disabled={!r.isActive}>
                      {r.name} ({r.code}) {r.location ? `- ${r.location}` : ''} {!r.isActive ? '(ปิดปรับปรุง)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Quick Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่ต้องการใช้งาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.bookingDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ช่วงเวลา <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '12:00' })}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
                    >
                      เช้า (08:30-12)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, startTime: '13:00', endTime: '16:30' })}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
                    >
                      บ่าย (13-16:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '16:30' })}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
                    >
                      เต็มวัน
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <input
                      type="time"
                      required
                      value={bookingForm.startTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="time"
                      required
                      value={bookingForm.endTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อ / ชื่องานที่ขอใช้งานห้อง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การเรียนการสอนวิชา NUR201, ซ้อม OSCE กลุ่ม 2, ติวทบทวนวิชาพยาบาลเด็ก"
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วัตถุประสงค์การใช้งาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- กรุณาเลือกวัตถุประสงค์การใช้งาน --</option>
                    <option value="การเรียนการสอน">การเรียนการสอนภาคปฏิบัติ</option>
                    <option value="สอบประเมินทักษะ / OSCE">สอบประเมินทักษะ / OSCE</option>
                    <option value="ติว / ทบทวนบทเรียนกลุ่ม">ติว / ทบทวนบทเรียนกลุ่ม</option>
                    <option value="อบรมเชิงปฏิบัติการ / Workshop">อบรมเชิงปฏิบัติการ / Workshop</option>
                    <option value="กิจกรรมชมรม / คณะ">กิจกรรมชมรม / คณะ</option>
                    <option value="ประชุมสัมมนา">ประชุมสัมมนา</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนผู้เข้าใช้งาน (คน) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    required
                    placeholder="กรุณากรอกจำนวนผู้เข้าใช้งาน (คน)"
                    value={bookingForm.attendeesCount}
                    onChange={(e) => setBookingForm({ ...bookingForm, attendeesCount: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Course & Advisor with Auto-fill & Edit Dropdown */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      รายวิชาที่เกี่ยวข้อง (ถ้ามี)
                    </label>
                    <select
                      value={bookingForm.courseId}
                      onChange={(e) => {
                        const cId = e.target.value;
                        const selectedC = courses.find((c) => c.id === cId);
                        setBookingForm((prev) => ({
                          ...prev,
                          courseId: cId,
                          advisorName: selectedC?.instructorName || (cId ? prev.advisorName : ''),
                        }));
                        if (selectedC?.instructorName) {
                          setIsEditingAdvisor(false);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="">-- ไม่ระบุรายวิชา (ฝึกอิสระ/กิจกรรม) --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.name} ({c.instructorName || 'อาจารย์ผู้รับผิดชอบ'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        อาจารย์ผู้รับผิดชอบ / ที่ปรึกษา
                      </label>
                      {bookingForm.courseId && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                          className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditingAdvisor ? 'ซ่อนตัวเลือก' : 'แก้ไขอาจารย์'}</span>
                        </button>
                      )}
                    </div>

                    {bookingForm.courseId && !isEditingAdvisor ? (
                      <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span className="font-bold text-teal-900 dark:text-teal-200">
                            {bookingForm.advisorName || 'อาจารย์ประจำรายวิชา'}
                          </span>
                          <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded-md font-bold">
                            ขึ้นให้อัตโนมัติ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingAdvisor(true)}
                          className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                        >
                          แก้ไขอาจารย์
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={bookingForm.advisorName}
                          onChange={(e) => setBookingForm((prev) => ({ ...prev, advisorName: e.target.value }))}
                          className="w-full bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                        >
                          <option value="">-- กรุณาเลือกอาจารย์ผู้รับผิดชอบจากรายชื่อ --</option>
                          {bookingForm.advisorName && !teachers.some((t) => t.name === bookingForm.advisorName) && (
                            <option value={bookingForm.advisorName}>
                              {bookingForm.advisorName} (อาจารย์ประจำวิชา)
                            </option>
                          )}
                          {teachers.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.department || 'คณะพยาบาลศาสตร์'})
                            </option>
                          ))}
                        </select>
                        {bookingForm.courseId && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const c = courses.find((x) => x.id === bookingForm.courseId);
                                setBookingForm((prev) => ({ ...prev, advisorName: c?.instructorName || '' }));
                                setIsEditingAdvisor(false);
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                            >
                              ↺ กลับไปใช้อาจารย์ประจำวิชา ({courses.find((x) => x.id === bookingForm.courseId)?.instructorName})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone & Equipment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    placeholder="08x-xxx-xxxx"
                    value={bookingForm.contactPhone}
                    onChange={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    อุปกรณ์ที่ต้องการให้จัดเตรียม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น โปรเจกเตอร์, หุ่น CPR, แขนเจาะเลือด"
                    value={bookingForm.equipmentNeeded}
                    onChange={(e) => setBookingForm({ ...bookingForm, equipmentNeeded: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {submitting ? 'กำลังบันทึก...' : 'ยื่นคำขอจองห้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ROOM */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-teal-600" />
                {roomToEdit ? 'แก้ไขข้อมูลห้องปฏิบัติการ' : 'เพิ่มห้องปฏิบัติการใหม่'}
              </h3>
              <button
                onClick={() => setShowRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสห้อง (Code) *
                </label>
                <input
                  type="text"
                  required
                  value={roomForm.code}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อห้องปฏิบัติการ *
                </label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานที่ตั้ง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อาคาร 3 ชั้น 2"
                    value={roomForm.location}
                    onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ความจุ (คน) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำอธิบาย / อุปกรณ์ประจำห้อง
                </label>
                <textarea
                  rows={2}
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition flex items-center gap-1"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลห้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOGGLE ROOM STATUS WITH REASON */}
      {roomToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {roomToToggle.isActive ? <Lock className="w-5 h-5 text-rose-600" /> : <Unlock className="w-5 h-5 text-emerald-600" />}
                <span>{roomToToggle.isActive ? 'ปิดรับการจองห้องชั่วคราว' : 'เปิดรับการจองห้อง'}</span>
              </h3>
              <button
                onClick={() => setRoomToToggle(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              ห้อง: <strong className="text-slate-900 dark:text-slate-100">{roomToToggle.name} ({roomToToggle.code})</strong>
            </p>

            {roomToToggle.isActive ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ระบุเหตุผลที่ปิดห้อง (จะแสดงให้ผู้ใช้งานรับทราบ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปิดปรับปรุงระบบปรับอากาศ, ปิดซ่อมบำรุงประจำเดือน"
                  value={roomToggleReason}
                  onChange={(e) => setRoomToggleReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                เมื่อเปิดใช้งาน ห้องนี้จะกลับมาเปิดรับการจองใช้งานในระบบทันที
              </p>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRoomToToggle(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmToggleRoom}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow transition flex items-center gap-1 ${
                  roomToToggle.isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {submitting ? 'กำลังบันทึก...' : (roomToToggle.isActive ? 'ยืนยันปิดห้อง' : 'ยืนยันเปิดห้อง')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
