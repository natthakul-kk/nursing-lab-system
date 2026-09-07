'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import QRCode from 'qrcode';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  User,
  GraduationCap,
  Sparkles,
  Camera,
  Layers,
  Search,
  Plus,
  Lock,
  Unlock,
  Settings,
  RefreshCw,
  Award,
  BookOpen,
  MapPin,
  Users,
  Check,
  Printer,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Calendar,
  BriefcaseMedical,
  ChevronLeft,
  LayoutGrid,
  CalendarRange
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PracticePage() {
  const { currentUser, isOfficer, isApprover, isAdmin } = useAuth();
  const isTeacher =
    currentUser?.role === 'APPROVER' ||
    currentUser?.email?.includes('teacher') ||
    currentUser?.name?.startsWith('อ.') ||
    currentUser?.name?.startsWith('ผศ.') ||
    currentUser?.name?.startsWith('รศ.');
  const canManageSlots = isOfficer || isAdmin || isTeacher;

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'BOOKINGS' | 'SCANNER' | 'SETTINGS'>('TIMETABLE');

  // Main Data States
  const [slots, setSlots] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ maxAdvanceDays: 7, minAdvanceHours: 12, rulesNotice: '' });
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [practiceKits, setPracticeKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter States & Calendar Mode
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL');

  // Create Slot / Event Modal State (Staff / Teacher)
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [createSlotForm, setCreateSlotForm] = useState({
    roomId: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '13:00',
    endTime: '16:00',
    maxCapacity: 6,
    isOpen: true,
    closeReason: '',
  });

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [slotForBooking, setSlotForBooking] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    skillTopic: '',
    objectives: '',
    advisorName: '',
    courseId: '',
    practiceKitId: '',
  });

  // Slot Management Modal State (Close/Open Slot)
  const [slotToToggle, setSlotToToggle] = useState<any>(null);
  const [closeReasonInput, setCloseReasonInput] = useState('');

  // QR Modal State
  const [activeBookingForQr, setActiveBookingForQr] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Scanner Station State
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [scannerStatus, setScannerStatus] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO' | null;
    title: string;
    message: string;
    booking?: any;
  }>({ type: null, title: '', message: '' });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5ScannerRef = useRef<any>(null);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    maxAdvanceDays: 7,
    minAdvanceHours: 12,
    rulesNotice: '',
  });

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

  // 1. Fetch All Initial Data
  const fetchData = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const [slotsRes, roomsRes, bookingsRes, configRes, statsRes, coursesRes, kitsRes] = await Promise.all([
        fetch(`/api/practice/slots?year=${year}&month=${month}`),
        fetch('/api/practice/rooms'),
        fetch(`/api/practice/bookings${currentUser?.role === 'USER' && !isTeacher ? `?userId=${currentUser.id}` : ''}`),
        fetch('/api/practice/config'),
        fetch(`/api/practice/stats${currentUser?.id ? `?userId=${currentUser.id}` : ''}`),
        fetch('/api/courses'),
        fetch('/api/kits'),
      ]);

      if (slotsRes.ok) setSlots(await slotsRes.json());
      if (roomsRes.ok) {
        const rList = await roomsRes.json();
        setRooms(rList);
        if (rList.length > 0 && !createSlotForm.roomId) {
          setCreateSlotForm((prev) => ({ ...prev, roomId: rList[0].id }));
        }
      }
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (configRes.ok) {
        const c = await configRes.json();
        setConfig(c);
        setSettingsForm({
          maxAdvanceDays: c.maxAdvanceDays || 7,
          minAdvanceHours: c.minAdvanceHours || 12,
          rulesNotice: c.rulesNotice || '',
        });
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (kitsRes.ok) setPracticeKits(await kitsRes.json());
    } catch (err) {
      console.error('Error fetching practice data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth, currentUser]);

  // Generate QR Code when QR modal opens
  useEffect(() => {
    if (!activeBookingForQr) return;
    async function makeQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        // Encode qrCodeToken
        const url = await QRCode.toDataURL(activeBookingForQr.qrCodeToken, {
          width: 360,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    }
    makeQr();
  }, [activeBookingForQr]);

  // Handle Camera Scanner for Station
  useEffect(() => {
    if (activeTab !== 'SCANNER' || !isCameraActive) {
      stopCameraScanner();
      return;
    }

    let isMounted = true;
    async function startCamera() {
      setCameraError(null);
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        const container = document.getElementById('practice-qr-reader');
        if (!container) return;

        const scanner = new Html5Qrcode('practice-qr-reader');
        html5ScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          (decodedText) => {
            handleProcessScannedCode(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        if (isMounted) {
          setCameraError(err?.message || 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCameraScanner();
    };
  }, [activeTab, isCameraActive]);

  const stopCameraScanner = async () => {
    if (html5ScannerRef.current) {
      try {
        await html5ScannerRef.current.stop();
        html5ScannerRef.current.clear();
      } catch (e) {}
      html5ScannerRef.current = null;
    }
  };

  // 1.5 Actions: Create Open Session (Staff / Teacher)
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSlotForm.roomId || !createSlotForm.date || !createSlotForm.startTime || !createSlotForm.endTime) {
      alert('กรุณากรอกข้อมูลห้อง, วันที่ และช่วงเวลาให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/practice/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: createSlotForm.roomId,
          date: createSlotForm.date,
          startTime: createSlotForm.startTime,
          endTime: createSlotForm.endTime,
          maxCapacity: Number(createSlotForm.maxCapacity) || 6,
          isOpen: createSlotForm.isOpen,
          closeReason: createSlotForm.closeReason || null,
        }),
      });

      if (res.ok) {
        alert('สร้างรอบเปิดห้องแล็บสำเร็จ!');
        setShowCreateSlotModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถสร้างรอบเวลาได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Actions: Book Slot
  const handleOpenBookingModal = (slot: any) => {
    setSlotForBooking(slot);
    setBookingForm({
      skillTopic: '',
      objectives: '',
      advisorName: courses.length > 0 ? courses[0].instructorName : '',
      courseId: courses.length > 0 ? courses[0].id : '',
      practiceKitId: '',
    });
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForBooking || !currentUser) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/practice/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          slotId: slotForBooking.id,
          skillTopic: bookingForm.skillTopic,
          objectives: bookingForm.objectives,
          advisorName: bookingForm.advisorName,
          courseId: bookingForm.courseId || null,
          practiceKitId: bookingForm.practiceKitId || null,
        }),
      });

      if (res.ok) {
        alert('ยื่นคำขอเข้าฝึกปฏิบัติด้วยตนเองสำเร็จ! รออาจารย์พิจารณาอนุมัติ');
        setShowBookingModal(false);
        fetchData();
        setActiveTab('BOOKINGS');
      } else {
        const err = await res.json();
        alert(err.error || 'ยื่นคำขอไม่สำเร็จ');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Actions: Toggle Slot Open/Closed
  const handleToggleSlot = async () => {
    if (!slotToToggle) return;
    setSubmitting(true);
    try {
      const newIsOpen = !slotToToggle.isOpen;
      const res = await fetch(`/api/practice/slots/${slotToToggle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOpen: newIsOpen,
          closeReason: newIsOpen ? null : closeReasonInput || 'ติดภารกิจการเรียนการสอนประจำ',
        }),
      });

      if (res.ok) {
        setSlotToToggle(null);
        setCloseReasonInput('');
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการปรับสถานะรอบเวลา');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Actions: Approve / Reject Booking
  const handleApproveBooking = async (bookingId: string) => {
    if (!confirm('ยืนยันอนุมัติให้นิสิตเข้าฝึกปฏิบัติการในรอบเวลานี้?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice/bookings/${bookingId}`, {
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

  const handleRejectBooking = async (bookingId: string) => {
    const reason = prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ:');
    if (reason === null) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId: currentUser?.id,
          reason,
        }),
      });
      if (res.ok) {
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

  // 5. Actions: QR Check-in / Check-out Processor
  const handleProcessScannedCode = async (rawCode: string) => {
    if (!rawCode) return;
    const cleanToken = rawCode.trim();

    try {
      // First fetch booking details
      const getRes = await fetch(`/api/practice/bookings/${encodeURIComponent(cleanToken)}`);
      if (!getRes.ok) {
        setScannerStatus({
          type: 'ERROR',
          title: 'ไม่พบข้อมูลคำขอในระบบ',
          message: `ไม่พบรหัส Token: ${cleanToken} ในฐานข้อมูล`,
        });
        return;
      }

      const booking = await getRes.json();

      // Determine action: If not checked in, check in; if checked in, check out
      const action = booking.status === 'CHECKED_IN' ? 'CHECK_OUT' : 'CHECK_IN';

      const updateRes = await fetch(`/api/practice/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await updateRes.json();

      if (updateRes.ok) {
        if (action === 'CHECK_IN') {
          setScannerStatus({
            type: 'SUCCESS',
            title: 'เช็คอินเข้าห้องแล็บสำเร็จ!',
            message: `นิสิต: ${booking.user?.name} (${booking.user?.studentId || '-'}) เช็คอินเข้า ${booking.slot?.room?.name} เวลา ${new Date().toLocaleTimeString('th-TH')}`,
            booking: result.booking,
          });
        } else {
          setScannerStatus({
            type: 'SUCCESS',
            title: 'เช็คเอาท์เสร็จสิ้น!',
            message: `นิสิต: ${booking.user?.name} เสร็จสิ้นการฝึกหัตถการ "${booking.skillTopic}" รวมเวลาฝึกจริง: ${result.booking?.actualMinutes || 0} นาที`,
            booking: result.booking,
          });
        }
        fetchData();
        setManualCodeInput('');
      } else {
        setScannerStatus({
          type: 'ERROR',
          title: 'ไม่สามารถทำรายการได้',
          message: result.error || 'เกิดข้อผิดพลาดในการบันทึกเวลา',
          booking,
        });
      }
    } catch (err: any) {
      setScannerStatus({
        type: 'ERROR',
        title: 'Network Error',
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
      });
    }
  };

  // 6. Actions: Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/practice/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });

      if (res.ok) {
        alert('บันทึกการตั้งค่านโยบายการจองห้องแล็บเรียบร้อยแล้ว');
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: Filter slots by room
  const filteredSlots = slots.filter((s) => {
    if (selectedRoomId === 'ALL') return true;
    return s.roomId === selectedRoomId;
  });

  // Helper: Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter === 'ALL') return true;
    return b.status === bookingStatusFilter;
  });

  // Monthly Calendar Grid Generator
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Calendar cells: 42 cells (6 rows x 7 cols)
  const calendarCells = [];
  // 1. Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(year, month - 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: false,
    });
  }
  // 2. Current month days
  const todayDateStr = new Date().toISOString().slice(0, 10);
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
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
    const d = new Date(year, month + 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Group slots by dateStr for fast lookup in calendar
  const slotsByDate: Record<string, any[]> = {};
  filteredSlots.forEach((slot) => {
    const dStr = new Date(slot.date).toISOString().slice(0, 10);
    if (!slotsByDate[dStr]) slotsByDate[dStr] = [];
    slotsByDate[dStr].push(slot);
  });

  // Slots for the currently selected date (detail sidebar / list)
  const selectedDateSlots = filteredSlots.filter((slot) => {
    return new Date(slot.date).toISOString().slice(0, 10) === selectedDate;
  });

  // Thai Month Display string, e.g. "กันยายน 2569"
  const thaiMonthDisplay = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ระบบบริหารการฝึกทักษะด้วยตนเอง (Self-Practice Skill Lab)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ตารางขอเข้าฝึกปฏิบัติการด้วยตนเองของนิสิต
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              เปิดให้จองล่วงหน้าได้สูงสุด {config?.maxAdvanceDays || 7} วัน พร้อมระบบสแกน QR Code เช็คอิน-เช็คเอาท์
              เพื่อบันทึกและประเมินชั่วโมงการฝึกปฏิบัติการจริงอัตโนมัติ
            </p>
          </div>

          {/* KPI Mini-Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl">
              <div className="text-[11px] font-medium text-slate-300">กำลังฝึกอยู่ในแล็บ</div>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                {stats?.activeNow || 0} <span className="text-xs font-normal text-slate-300">คน</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl">
              <div className="text-[11px] font-medium text-slate-300">ชั่วโมงฝึกสะสมรวม</div>
              <div className="text-2xl font-black text-teal-300 mt-0.5">
                {stats?.totalPracticeHours || '0.0'} <span className="text-xs font-normal text-slate-300">ชม.</span>
              </div>
            </div>

            {stats?.pendingApprovals > 0 && (
              <div className="bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-4 py-3 rounded-2xl">
                <div className="text-[11px] font-bold text-amber-300">รออาจารย์อนุมัติ</div>
                <div className="text-2xl font-black text-amber-300 mt-0.5 flex items-center gap-1">
                  <Clock className="w-5 h-5 text-amber-400" />
                  {stats.pendingApprovals} <span className="text-xs font-normal text-amber-200">รายการ</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveTab('TIMETABLE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'TIMETABLE'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>ตารางรอบเวลา & จองเข้าฝึก (Timetable)</span>
          </button>

          <button
            onClick={() => setActiveTab('BOOKINGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'BOOKINGS'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>รายการคำขอ & การอนุมัติ ({bookings.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('SCANNER');
              setIsCameraActive(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'SCANNER'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>จุดสแกน QR เช็คอิน-เช็คเอาท์</span>
          </button>

          {canManageSlots && (
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>ตั้งค่าระบบจอง</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: TIMETABLE & CALENDAR VIEW */}
      {activeTab === 'TIMETABLE' && (
        <div className="space-y-6">
          {/* Calendar Controls & Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Month Navigator & View Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={handlePrevMonth}
                    title="เดือนก่อนหน้า"
                    className="p-2 hover:bg-white rounded-xl text-slate-700 hover:text-teal-700 transition cursor-pointer shadow-none hover:shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="px-4 py-1 text-center min-w-[160px]">
                    <span className="text-sm font-black text-slate-900 capitalize block">
                      {thaiMonthDisplay}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      (พ.ศ. {currentMonth.getFullYear() + 543})
                    </span>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    title="เดือนถัดไป"
                    className="p-2 hover:bg-white rounded-xl text-slate-700 hover:text-teal-700 transition cursor-pointer shadow-none hover:shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  วันนี้
                </button>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setViewMode('CALENDAR')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'CALENDAR'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>รูปปฏิทิน</span>
                  </button>
                  <button
                    onClick={() => setViewMode('LIST')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'LIST'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>รายการการ์ด</span>
                  </button>
                </div>
              </div>

              {/* Right: Room Filter & Create Open Session Button */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Room Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">ห้องแล็บ:</span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="ALL">ทุกห้องปฏิบัติการ ({rooms.length} ห้อง)</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Officer/Teacher: Create Open Session Button */}
                {canManageSlots && (
                  <button
                    onClick={() => {
                      setCreateSlotForm({
                        roomId: rooms.length > 0 ? rooms[0].id : '',
                        date: selectedDate || new Date().toISOString().slice(0, 10),
                        startTime: '13:00',
                        endTime: '16:00',
                        maxCapacity: 6,
                        isOpen: true,
                        closeReason: '',
                      });
                      setShowCreateSlotModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ สร้างรอบเปิดแล็บ (Event)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-700">สัญลักษณ์สถานะ:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ว่าง (เปิดรับจอง)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> เต็มแล้ว
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> ปิดรอบ/งดบริการ
                </span>
              </div>
              <div className="text-slate-400">
                คลิกที่วันบนปฏิทินเพื่อดูรายละเอียดรอบเวลา หรือยื่นจอง
              </div>
            </div>
          </div>

          {/* VIEW 1: MONTHLY INTERACTIVE CALENDAR GRID */}
          {viewMode === 'CALENDAR' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* 7 Days of the Week Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-black text-slate-700 py-3">
                  <div className="text-rose-600">อาทิตย์</div>
                  <div>จันทร์</div>
                  <div>อังคาร</div>
                  <div>พุธ</div>
                  <div>พฤหัสบดี</div>
                  <div>ศุกร์</div>
                  <div className="text-indigo-600">เสาร์</div>
                </div>

                {/* 42 Calendar Cells (6 rows x 7 cols) */}
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                  {calendarCells.map((cell, idx) => {
                    const cellSlots = slotsByDate[cell.dateStr] || [];
                    const isSelected = selectedDate === cell.dateStr;
                    const hasOpen = cellSlots.some((s) => s.isOpen && !s.isFull);
                    const isAllFull = cellSlots.length > 0 && cellSlots.every((s) => s.isOpen && s.isFull);
                    const isAllClosed = cellSlots.length > 0 && cellSlots.every((s) => !s.isOpen);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(cell.dateStr)}
                        className={`min-h-[105px] sm:min-h-[125px] p-2 flex flex-col justify-between transition cursor-pointer relative group ${
                          !cell.isCurrentMonth
                            ? 'bg-slate-50/40 text-slate-300'
                            : isSelected
                            ? 'bg-teal-50/50 ring-2 ring-inset ring-teal-500'
                            : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition ${
                              cell.isToday
                                ? 'bg-teal-600 text-white shadow-sm'
                                : isSelected
                                ? 'bg-teal-100 text-teal-900'
                                : cell.isCurrentMonth
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          {/* Quick count indicator or Add icon for staff */}
                          {canManageSlots && cell.isCurrentMonth && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreateSlotForm({
                                  roomId: rooms.length > 0 ? rooms[0].id : '',
                                  date: cell.dateStr,
                                  startTime: '13:00',
                                  endTime: '16:00',
                                  maxCapacity: 6,
                                  isOpen: true,
                                  closeReason: '',
                                });
                                setShowCreateSlotModal(true);
                              }}
                              title={`สร้างรอบเปิดแล็บวันที่ ${cell.dateStr}`}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-teal-100 hover:bg-teal-200 text-teal-700 flex items-center justify-center text-xs transition"
                            >
                              +
                            </button>
                          )}
                        </div>

                        {/* Event Chips List inside Day Cell */}
                        <div className="flex-1 space-y-1 overflow-y-auto max-h-[75px] scrollbar-none">
                          {cellSlots.slice(0, 3).map((slot) => {
                            const isOpen = slot.isOpen;
                            const isFull = slot.isFull;

                            return (
                              <div
                                key={slot.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(cell.dateStr);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center justify-between border transition ${
                                  !isOpen
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-70'
                                    : isFull
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title={`${slot.room?.name || 'Lab'} (${slot.startTime}-${slot.endTime}) ${
                                  !isOpen ? 'ปิดรอบ' : isFull ? 'เต็ม' : `ว่าง ${slot.availableSeats}/${slot.maxCapacity}`
                                }`}
                              >
                                <span className="truncate">
                                  {slot.startTime}-{slot.endTime} {slot.room?.code?.replace('LAB-', '') || ''}
                                </span>
                                <span className="text-[9px] font-mono ml-1 flex-shrink-0">
                                  {isOpen ? `${slot.availableSeats}ที่` : 'ปิด'}
                                </span>
                              </div>
                            );
                          })}

                          {cellSlots.length > 3 && (
                            <div className="text-[9px] font-bold text-teal-700 text-center pt-0.5">
                              +{cellSlots.length - 3} รอบเพิ่มเติม
                            </div>
                          )}
                        </div>

                        {/* Cell footer indicator if slots exist */}
                        {cellSlots.length === 0 && cell.isCurrentMonth && (
                          <div className="text-[10px] text-slate-300 text-center py-1 opacity-0 group-hover:opacity-100 transition">
                            ไม่มีรอบ
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Details Panel */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CalendarRange className="w-5 h-5 text-teal-600" />
                      <span>
                        รอบเวลาเปิดให้บริการในวันที่{' '}
                        {new Date(selectedDate).toLocaleDateString('th-TH', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      พบทั้งหมด {selectedDateSlots.length} รอบเวลาในวันที่เลือก
                    </p>
                  </div>

                  {/* Add Slot on this date for Staff */}
                  {canManageSlots && (
                    <button
                      onClick={() => {
                        setCreateSlotForm({
                          roomId: rooms.length > 0 ? rooms[0].id : '',
                          date: selectedDate,
                          startTime: '13:00',
                          endTime: '16:00',
                          maxCapacity: 6,
                          isOpen: true,
                          closeReason: '',
                        });
                        setShowCreateSlotModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-600" />
                      <span>+ เพิ่มรอบเวลาในวันนี้</span>
                    </button>
                  )}
                </div>

                {/* Slots Grid for Selected Date */}
                {selectedDateSlots.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">ไม่มีรอบเวลาเปิดให้บริการในวันที่เลือก</p>
                    <p className="text-xs">
                      {canManageSlots
                        ? 'กดปุ่ม "+ เพิ่มรอบเวลาในวันนี้" เพื่อเปิดรอบให้นิสิตยื่นจอง'
                        : 'กรุณาเลือกวันอื่นบนปฏิทิน หรือติดต่ออาจารย์/เจ้าหน้าที่เพื่อเปิดรอบเวลา'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedDateSlots.map((slot) => {
                      const isOpen = slot.isOpen;
                      const isFull = slot.isFull;

                      return (
                        <div
                          key={slot.id}
                          className={`rounded-2xl border p-4 shadow-sm transition flex flex-col justify-between space-y-3 ${
                            !isOpen
                              ? 'bg-slate-50 border-slate-200 opacity-80'
                              : isFull
                              ? 'bg-white border-amber-200'
                              : 'bg-white border-slate-200/90 hover:shadow-md hover:border-teal-300'
                          }`}
                        >
                          <div>
                            {/* Room Header */}
                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                  {slot.room?.code}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                                  {slot.room?.name}
                                </h4>
                                {slot.room?.location && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {slot.room.location}
                                  </span>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div>
                                {!isOpen ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    <Lock className="w-3 h-3 text-rose-600" /> ปิดรอบ
                                  </span>
                                ) : isFull ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Users className="w-3 h-3 text-amber-600" /> เต็มแล้ว
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Unlock className="w-3 h-3 text-emerald-600" /> ว่าง {slot.availableSeats} ที่
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Time & Capacity Info */}
                            <div className="mt-2.5 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-slate-700 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4 text-teal-600" />
                                  {slot.startTime} - {slot.endTime} น.
                                </span>
                                <span className="text-slate-500 font-normal text-[11px]">
                                  ความจุ: <strong>{slot.bookedCount}</strong> / {slot.maxCapacity} คน
                                </span>
                              </div>

                              {!isOpen && slot.closeReason && (
                                <div className="bg-rose-50 border border-rose-100 p-2 rounded-xl text-rose-700 text-[11px] flex items-start gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                                  <span>เหตุผลที่ปิด: {slot.closeReason}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                            {isOpen && !isFull && (
                              <button
                                onClick={() => handleOpenBookingModal(slot)}
                                className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>ขอยื่นจองรอบนี้</span>
                              </button>
                            )}

                            {canManageSlots && (
                              <button
                                onClick={() => {
                                  setSlotToToggle(slot);
                                  setCloseReasonInput(slot.closeReason || '');
                                }}
                                className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  isOpen
                                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                }`}
                              >
                                {isOpen ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                                    <span>อาจารย์/จนท. ปิดรอบนี้</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>เปิดรอบนี้ให้จองได้</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: CARD / LIST VIEW */}
          {viewMode === 'LIST' && (
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-sm">
                  <LoadingSpinner
                    message="กำลังโหลดตารางช่วงเวลา..."
                    submessage="กำลังดึงข้อมูลความจุและสถานะการเปิดรับจองจาก Supabase"
                  />
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-sm space-y-2">
                  <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">ไม่มีช่วงเวลาเปิดให้บริการในเดือนนี้</p>
                  <p>กรุณาเปลี่ยนเดือน หรือให้เจ้าหน้าที่สร้างรอบเวลาเปิดให้บริการ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSlots.map((slot) => {
                    const isOpen = slot.isOpen;
                    const isFull = slot.isFull;

                    return (
                      <div
                        key={slot.id}
                        className={`rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between space-y-4 ${
                          !isOpen
                            ? 'bg-slate-50/80 border-slate-200 opacity-80'
                            : isFull
                            ? 'bg-white border-amber-200'
                            : 'bg-white border-slate-200/90 hover:shadow-md hover:border-teal-300'
                        }`}
                      >
                        <div>
                          {/* Top Header: Date & Room & Status */}
                          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                  {slot.room?.code}
                                </span>
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  {new Date(slot.date).toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: '2-digit',
                                  })}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                                {slot.room?.name}
                              </h4>
                              {slot.room?.location && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {slot.room.location}
                                </span>
                              )}
                            </div>

                            {/* Status Badge */}
                            <div>
                              {!isOpen ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <Lock className="w-3 h-3 text-rose-600" /> ปิดรอบ
                                </span>
                              ) : isFull ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Users className="w-3 h-3 text-amber-600" /> เต็มแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Unlock className="w-3 h-3 text-emerald-600" /> ว่าง {slot.availableSeats} ที่
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time & Capacity Info */}
                          <div className="mt-3 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-slate-700 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-teal-600" />
                                {slot.startTime} - {slot.endTime} น.
                              </span>
                              <span className="text-slate-500 font-normal text-[11px]">
                                ความจุ: <strong>{slot.bookedCount}</strong> / {slot.maxCapacity} คน
                              </span>
                            </div>

                            {!isOpen && slot.closeReason && (
                              <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-rose-700 text-[11px] flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                                <span>เหตุผลที่ปิด: {slot.closeReason}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                          {isOpen && !isFull && (
                            <button
                              onClick={() => handleOpenBookingModal(slot)}
                              className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>ขอยื่นจองรอบเวลานี้</span>
                            </button>
                          )}

                          {canManageSlots && (
                            <button
                              onClick={() => {
                                setSlotToToggle(slot);
                                setCloseReasonInput(slot.closeReason || '');
                              }}
                              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                isOpen
                                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                            >
                              {isOpen ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                                  <span>อาจารย์/จนท. ปิดรอบนี้</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>เปิดรอบนี้ให้จองได้</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOKINGS & APPROVALS */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-5">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {['ALL', 'PENDING', 'APPROVED', 'CHECKED_IN', 'COMPLETED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setBookingStatusFilter(st)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  bookingStatusFilter === st
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' && 'ทั้งหมด'}
                {st === 'PENDING' && 'รออาจารย์อนุมัติ'}
                {st === 'APPROVED' && 'อนุมัติแล้ว (รอเข้าฝึก)'}
                {st === 'CHECKED_IN' && 'กำลังฝึกปฏิบัติ'}
                {st === 'COMPLETED' && 'ฝึกเสร็จสิ้น'}
                {st === 'REJECTED' && 'ไม่อนุมัติ'}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-sm">
              ไม่พบคำขอเข้าฝึกปฏิบัติในหมวดหมู่นี้
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const isPending = b.status === 'PENDING';
                const isApproved = b.status === 'APPROVED';
                const isCheckedIn = b.status === 'CHECKED_IN';
                const isCompleted = b.status === 'COMPLETED';
                const isRejected = b.status === 'REJECTED';

                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 border-l-4 ${
                      isPending
                        ? 'border-l-amber-500'
                        : isApproved
                        ? 'border-l-teal-500'
                        : isCheckedIn
                        ? 'border-l-indigo-600'
                        : isCompleted
                        ? 'border-l-emerald-600'
                        : 'border-l-rose-500'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded">
                          {b.bookingNumber}
                        </span>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          {b.slot?.room?.name}
                        </span>
                        {/* Status Label */}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" /> รออาจารย์อนุมัติ
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-teal-600" /> อนุมัติแล้ว (พร้อมสแกนเข้า)
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full animate-pulse">
                            <Sparkles className="w-3 h-3 text-indigo-600" /> กำลังฝึกปฏิบัติการอยู่
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600" /> เสร็จสิ้น ({b.actualMinutes || 0} นาที)
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-600" /> ไม่อนุมัติ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{b.user?.name}</span>
                          {b.user?.studentId && (
                            <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1 rounded">
                              {b.user.studentId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-1.5">
                        <div>
                          <span className="text-slate-400 font-bold">หัตถการที่ฝึก: </span>
                          <span className="text-slate-900 font-black text-sm">{b.skillTopic}</span>
                        </div>
                        {b.objectives && (
                          <div>
                            <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                            <span className="text-slate-700 font-medium">{b.objectives}</span>
                          </div>
                        )}
                        {b.advisorName && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            <span>อาจารย์ผู้สอน: {b.advisorName}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>วันที่: {new Date(b.slot?.date).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>เวลา: {b.slot?.startTime} - {b.slot?.endTime} น.</span>
                        </div>
                        {b.checkInTime && (
                          <div className="text-[11px] text-indigo-700 font-medium pt-1 border-t border-slate-200">
                            เช็คอิน: {new Date(b.checkInTime).toLocaleTimeString('th-TH')}
                            {b.checkOutTime && ` • ออก: ${new Date(b.checkOutTime).toLocaleTimeString('th-TH')}`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div>
                        {isRejected && b.rejectionReason && (
                          <span className="text-xs text-rose-700 font-medium">
                            เหตุผล: {b.rejectionReason}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* QR Code Button for Student or Officer */}
                        {(isApproved || isCheckedIn) && (
                          <button
                            onClick={() => setActiveBookingForQr(b)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>เปิดบัตร QR Code เข้าห้องแล็บ</span>
                          </button>
                        )}

                        {/* Approval Buttons for Instructor / Staff */}
                        {isPending && canManageSlots && (
                          <>
                            <button
                              disabled={submitting}
                              onClick={() => handleRejectBooking(b.id)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              disabled={submitting}
                              onClick={() => handleApproveBooking(b.id)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" /> อนุมัติคำขอ
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

      {/* TAB 3: SCANNER STATION */}
      {activeTab === 'SCANNER' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                จุดสแกน QR Code เช็คอิน & เช็คเอาท์ (Lab Check-in Station)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                นำบัตร QR Code ประจำคำขอมาจ่อที่กล้อง หรือกรอกรหัส Token เพื่อบันทึกเวลาเข้า-ออกห้องปฏิบัติการจริง
              </p>
            </div>

            {/* Camera Viewfinder */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-square max-w-sm mx-auto shadow-inner flex items-center justify-center">
              <div id="practice-qr-reader" className="w-full h-full"></div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-rose-300 text-xs text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                  <p className="font-bold">{cameraError}</p>
                  <p className="text-[11px] text-slate-400">ท่านสามารถใช้ช่องกรอกรหัส Token ด้านล่างแทนได้</p>
                </div>
              )}
            </div>

            {/* Manual Code Input Option */}
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-600 mb-2">หรือกรอกรหัสคำขอ / Token ด้วยตนเอง</div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScannedCode(manualCodeInput);
                }}
                className="flex items-center gap-2 max-w-md mx-auto"
              >
                <input
                  type="text"
                  placeholder="เช่น SPK-E58C4F... หรือ SPB-2569..."
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  บันทึก
                </button>
              </form>
            </div>

            {/* Scanner Feedback Card */}
            {scannerStatus.type && (
              <div
                className={`p-4 rounded-2xl border text-left text-xs transition animate-fade-in ${
                  scannerStatus.type === 'SUCCESS'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {scannerStatus.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold text-sm">{scannerStatus.title}</h5>
                    <p className="mt-1 leading-relaxed">{scannerStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS (Staff/Admin) */}
      {activeTab === 'SETTINGS' && canManageSlots && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-600" />
              กำหนดนโยบายและเงื่อนไขการขอเข้าฝึกปฏิบัติการ
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ปรับปรุงจำนวนวันเปิดให้จองล่วงหน้า และกฎเกณฑ์ในการใช้ห้องปฏิบัติการพยาบาล
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                อนุญาตให้จองล่วงหน้าได้สูงสุด (วัน) *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={settingsForm.maxAdvanceDays}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, maxAdvanceDays: Number(e.target.value) })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                ค่าปัจจุบัน: จองล่วงหน้าได้ไม่เกิน {settingsForm.maxAdvanceDays} วันนับจากวันนี้
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ต้องจองก่อนเวลาเริ่มอย่างน้อย (ชั่วโมง)
              </label>
              <input
                type="number"
                min="0"
                max="72"
                value={settingsForm.minAdvanceHours}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, minAdvanceHours: Number(e.target.value) })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อตกลงและระเบียบการใช้ห้องแล็บ (แสดงให้นิสิตรับทราบก่อนจอง)
              </label>
              <textarea
                rows={4}
                value={settingsForm.rulesNotice}
                onChange={(e) => setSettingsForm({ ...settingsForm, rulesNotice: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE OPEN PRACTICE SESSION / EVENT (Staff / Teacher) */}
      {showCreateSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                  สำหรับอาจารย์ / เจ้าหน้าที่ห้องแล็บ
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-teal-600" />
                  สร้างรอบเปิดห้องแล็บ (Open Session / Event)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  กำหนดห้องปฏิบัติการ วันที่ เวลา และความจุ เพื่อเปิดให้นิสิตยื่นขอเข้าฝึกปฏิบัติด้วยตนเอง
                </p>
              </div>
              <button
                onClick={() => setShowCreateSlotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              {/* Room Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ห้องปฏิบัติการที่เปิดให้บริการ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createSlotForm.roomId}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, roomId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) {r.location ? `• ${r.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่เปิดรอบ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={createSlotForm.date}
                    onChange={(e) => setCreateSlotForm({ ...createSlotForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ความจุผู้เข้าฝึกสูงสุด (คน) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={createSlotForm.maxCapacity}
                    onChange={(e) => setCreateSlotForm({ ...createSlotForm, maxCapacity: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Time Slots & Quick Preset Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    ช่วงเวลาเปิดให้บริการ <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCreateSlotForm({ ...createSlotForm, startTime: '09:00', endTime: '12:00' })}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      เช้า (09-12)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateSlotForm({ ...createSlotForm, startTime: '13:00', endTime: '16:00' })}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      บ่าย (13-16)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateSlotForm({ ...createSlotForm, startTime: '16:30', endTime: '19:30' })}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      เย็น (16:30-19:30)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">เวลาเริ่ม:</span>
                    <input
                      type="time"
                      required
                      value={createSlotForm.startTime}
                      onChange={(e) => setCreateSlotForm({ ...createSlotForm, startTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">เวลาสิ้นสุด:</span>
                    <input
                      type="time"
                      required
                      value={createSlotForm.endTime}
                      onChange={(e) => setCreateSlotForm({ ...createSlotForm, endTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="slotIsOpen"
                  checked={createSlotForm.isOpen}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, isOpen: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="slotIsOpen" className="text-xs font-bold text-slate-700 cursor-pointer">
                  เปิดให้รับการจองได้ทันที (หากไม่เลือก นิสิตจะเห็นเป็นรอบที่ยังปิดอยู่)
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSlotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกและสร้างรอบเปิดแล็บ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOOKING FORM */}
      {showBookingModal && slotForBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  ยื่นคำขอเข้าฝึกปฏิบัติการด้วยตนเอง
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {slotForBooking.room?.name} • {new Date(slotForBooking.date).toLocaleDateString('th-TH')} (เวลา {slotForBooking.startTime} - {slotForBooking.endTime} น.)
                </p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หัตถการทางการพยาบาลที่ต้องการฝึกปฏิบัติ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การฉีดยา IM/SC, การใส่สายสวนปัสสาวะ, การทำแผล Dressing"
                  value={bookingForm.skillTopic}
                  onChange={(e) => setBookingForm({ ...bookingForm, skillTopic: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายวิชาที่เกี่ยวข้อง
                </label>
                <select
                  value={bookingForm.courseId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const c = courses.find((x) => x.id === cid);
                    setBookingForm({
                      ...bookingForm,
                      courseId: cid,
                      advisorName: c?.instructorName || bookingForm.advisorName,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- ไม่ระบุรายวิชา (ฝึกทักษะทั่วไป) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} (อ.ผู้สอน: {c.instructorName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อาจารย์ผู้สอนหรืออาจารย์ที่ปรึกษาที่ให้คำรับรอง *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น อ. สมหญิง ใจดี"
                  value={bookingForm.advisorName}
                  onChange={(e) => setBookingForm({ ...bookingForm, advisorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชุดอุปกรณ์ฝึกที่ต้องการเบิกใช้ร่วม (ถ้ามี)
                </label>
                <select
                  value={bookingForm.practiceKitId}
                  onChange={(e) => setBookingForm({ ...bookingForm, practiceKitId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- ไม่มี / ใช้อุปกรณ์ประจำห้องแล็บ --</option>
                  {practiceKits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.code}: {k.name} ({k.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์เพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น เตรียมสอบ OSCE, ทบทวนขั้นตอนก่อนขึ้นฝึกคลินิก"
                  value={bookingForm.objectives}
                  onChange={(e) => setBookingForm({ ...bookingForm, objectives: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                ></textarea>
              </div>

              {config?.rulesNotice && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-600" /> ข้อตกลงการเข้าใช้ห้องแล็บ:
                  </span>
                  <p className="whitespace-pre-line leading-relaxed">{config.rulesNotice}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ยืนยันยื่นคำขอจอง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE/OPEN SLOT REASON */}
      {slotToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {slotToToggle.isOpen ? (
                <>
                  <Lock className="w-5 h-5 text-rose-600" />
                  ปิดรอบเวลา (ระงับการจอง)
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5 text-emerald-600" />
                  เปิดรอบเวลาให้จองได้
                </>
              )}
            </h3>

            <p className="text-xs text-slate-600">
              {slotToToggle.room?.name} • วันที่ {new Date(slotToToggle.date).toLocaleDateString('th-TH')} ({slotToToggle.startTime} - {slotToToggle.endTime} น.)
            </p>

            {slotToToggle.isOpen && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เหตุผลที่ปิดรอบเวลา (จะแสดงให้นิสิตเห็น)
                </label>
                <input
                  type="text"
                  placeholder="เช่น คาบเรียนปฏิบัติการประจำ, ซ่อมบำรุงหุ่นจำลอง"
                  value={closeReasonInput}
                  onChange={(e) => setCloseReasonInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlotToToggle(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleSlot}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition cursor-pointer ${
                  slotToToggle.isOpen ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {slotToToggle.isOpen ? 'ยืนยันปิดรอบ' : 'ยืนยันเปิดรอบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE CARD FOR STUDENT */}
      {activeBookingForQr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setActiveBookingForQr(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>

            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                บัตรเข้าห้องปฏิบัติการพยาบาล
              </span>
              <h4 className="text-base font-black text-slate-900 mt-1">
                {activeBookingForQr.slot?.room?.name}
              </h4>
              <p className="text-xs text-slate-500">
                {new Date(activeBookingForQr.slot?.date).toLocaleDateString('th-TH')} ({activeBookingForQr.slot?.startTime} - {activeBookingForQr.slot?.endTime} น.)
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Booking QR Code"
                  className="w-56 h-56 mx-auto object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง QR Code...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="font-mono text-xs font-black text-slate-800 tracking-wider">
                {activeBookingForQr.qrCodeToken}
              </span>
              <p className="text-xs font-bold text-slate-700">
                {activeBookingForQr.user?.name}
                {activeBookingForQr.user?.studentId && ` (${activeBookingForQr.user.studentId})`}
              </p>
              <p className="text-[11px] text-teal-700 font-semibold">
                หัตถการ: {activeBookingForQr.skillTopic}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์บัตร QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
