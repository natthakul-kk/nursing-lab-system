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
  CalendarRange,
  Edit,
  Edit3,
  Trash2,
  Package,
  Building,
  DoorClosed,
  Boxes,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PracticePage() {
  const { currentUser, isOfficer, isApprover, isAdmin, isTeacher } = useAuth();
  const canManageSlots = isOfficer || isAdmin || isTeacher;
  const canApprove = isOfficer || isAdmin || isTeacher || isApprover;

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'BOOKINGS' | 'SCANNER' | 'SETTINGS'>('TIMETABLE');

  // Main Data States
  const [slots, setSlots] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ maxAdvanceDays: 7, minAdvanceHours: 12, checkInEarlyMinutes: 30, checkOutEarlyMinutes: 15, rulesNotice: '' });
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [practiceKits, setPracticeKits] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

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
    availableSkills: '',
  });

  // Edit Slot / Event Modal State (Staff / Teacher)
  const [slotToEdit, setSlotToEdit] = useState<any>(null);
  const [editSlotForm, setEditSlotForm] = useState({
    roomId: '',
    date: '',
    startTime: '',
    endTime: '',
    maxCapacity: 6,
    isOpen: true,
    closeReason: '',
    availableSkills: '',
  });

  // Slot Detail Modal (Opened directly when clicking a slot pill on calendar)
  const [slotDetailModal, setSlotDetailModal] = useState<any>(null);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [slotForBooking, setSlotForBooking] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    skillTopic: '',
    isCustomSkill: false,
    customSkillText: '',
    objectives: '',
    advisorName: '',
    courseId: '',
    practiceKitId: '',
    additionalEquipment: '',
  });

  // Slot Management Modal State (Close/Open Slot)
  const [slotToToggle, setSlotToToggle] = useState<any>(null);
  const [closeReasonInput, setCloseReasonInput] = useState('');

  // QR Modal State
  const [activeBookingForQr, setActiveBookingForQr] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Scanner Station State
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [processingManualCode, setProcessingManualCode] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO' | null;
    title: string;
    message: string;
    booking?: any;
  }>({ type: null, title: '', message: '' });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5ScannerRef = useRef<any>(null);

  // Room Modal & Management States
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({
    code: '',
    name: '',
    location: '',
    capacity: 10,
    description: '',
  });
  const [savingRoom, setSavingRoom] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    maxAdvanceDays: 7,
    minAdvanceHours: 12,
    checkInEarlyMinutes: 30,
    checkOutEarlyMinutes: 15,
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
  const fetchData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const [slotsRes, roomsRes, bookingsRes, configRes, statsRes, coursesRes, kitsRes, usersRes] = await Promise.all([
        fetch(`/api/practice/slots?year=${year}&month=${month}`),
        fetch('/api/practice/rooms?includeInactive=true'),
        fetch(`/api/practice/bookings${currentUser?.role === 'USER' && !isTeacher ? `?userId=${currentUser.id}` : ''}`),
        fetch('/api/practice/config'),
        fetch(`/api/practice/stats${currentUser?.id ? `?userId=${currentUser.id}` : ''}`),
        fetch('/api/courses?compact=true'),
        fetch('/api/kits'),
        fetch('/api/users?role=APPROVER'),
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
          checkInEarlyMinutes: c.checkInEarlyMinutes !== undefined ? c.checkInEarlyMinutes : 30,
          checkOutEarlyMinutes: c.checkOutEarlyMinutes !== undefined ? c.checkOutEarlyMinutes : 15,
          rulesNotice: c.rulesNotice || '',
        });
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (kitsRes.ok) setPracticeKits(await kitsRes.json());
      if (usersRes.ok) {
        const uList = await usersRes.json();
        // Filter approvers/teachers
        const tList = Array.isArray(uList)
          ? uList.filter(
              (u: any) =>
                u.role === 'APPROVER' ||
                u.email?.includes('teacher') ||
                u.name?.startsWith('อ.') ||
                u.name?.startsWith('ผศ.') ||
                u.name?.startsWith('รศ.') ||
                u.name?.startsWith('ดร.')
            )
          : [];
        setTeachers(tList);
      }
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error fetching practice data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
          availableSkills: createSlotForm.availableSkills || null,
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

  // 1.6 Actions: Open Edit Slot Modal
  const handleOpenEditSlotModal = (slot: any) => {
    setSlotToEdit(slot);
    setEditSlotForm({
      roomId: slot.roomId,
      date: new Date(slot.date).toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxCapacity: slot.maxCapacity,
      isOpen: slot.isOpen,
      closeReason: slot.closeReason || '',
      availableSkills: slot.availableSkills || '',
    });
  };

  // 1.7 Actions: Update Slot
  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotToEdit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice/slots/${slotToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: editSlotForm.roomId,
          date: editSlotForm.date,
          startTime: editSlotForm.startTime,
          endTime: editSlotForm.endTime,
          maxCapacity: Number(editSlotForm.maxCapacity) || 6,
          isOpen: editSlotForm.isOpen,
          closeReason: editSlotForm.isOpen ? null : editSlotForm.closeReason || 'ปิดรอบโดยเจ้าหน้าที่',
          availableSkills: editSlotForm.availableSkills || null,
        }),
      });

      if (res.ok) {
        alert('แก้ไขข้อมูลรอบเวลาสำเร็จ!');
        setSlotToEdit(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการแก้ไขรอบเวลา');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // 1.8 Actions: Delete Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรอบเวลานี้ออกจากระบบ? หากมีนิสิตจองแล้วจะไม่สามารถลบได้')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice/slots/${slotId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('ลบรอบเวลาเรียบร้อยแล้ว');
        setSlotToEdit(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถลบรอบเวลานี้ได้');
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
    const slotSkills = slot.availableSkills
      ? slot.availableSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const defaultSkill = slotSkills.length > 0 ? slotSkills[0] : '';
    
    // Attempt to match practice kit
    const matchedKit = practiceKits.find((k: any) =>
      defaultSkill && (k.name.includes(defaultSkill) || defaultSkill.includes(k.name.slice(0, 5)))
    );

    setBookingForm({
      skillTopic: defaultSkill,
      isCustomSkill: slotSkills.length === 0,
      customSkillText: '',
      objectives: '',
      advisorName: '',
      courseId: '',
      practiceKitId: matchedKit ? matchedKit.id : '',
      additionalEquipment: '',
    });
    setIsEditingAdvisor(false);
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForBooking || !currentUser) return;
    setSubmitting(true);

    try {
      const finalSkill = bookingForm.isCustomSkill
        ? bookingForm.customSkillText.trim()
        : bookingForm.skillTopic;

      if (!finalSkill) {
        alert('กรุณาระบุหัตถการทางการพยาบาลที่ต้องการฝึกปฏิบัติ');
        setSubmitting(false);
        return;
      }

      if (currentUser?.role === 'USER' && !isTeacher && !bookingForm.advisorName?.trim()) {
        alert('⚠️ เนื่องจากท่านเป็นนิสิต กรุณาระบุหรือเลือกอาจารย์ผู้รับรอง/อาจารย์ประจำวิชา (ไม่อนุญาตให้เว้นว่าง)');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/practice/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          slotId: slotForBooking.id,
          skillTopic: finalSkill,
          objectives: bookingForm.objectives,
          advisorName: bookingForm.advisorName,
          courseId: bookingForm.courseId || null,
          practiceKitId: bookingForm.practiceKitId || null,
          additionalEquipment: bookingForm.additionalEquipment || null,
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
    setProcessingManualCode(true);

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
    } finally {
      setProcessingManualCode(false);
    }
  };

  // 5.5 Actions: Add/Edit Room
    // Toggle Room Active/Inactive (Open/Closed for booking)
  const handleToggleRoomStatus = async (room: any) => {
    const newStatus = !room.isActive;
    const actionText = newStatus ? 'เปิดให้จองห้อง' : 'ปิดงดรับจองห้องชั่วคราว';
    if (!confirm(`คุณต้องการ ${actionText} "${room.name}" ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/practice/rooms/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Auto generate standard slots for weekdays of current month
  const handleAutoGenerateStandardSlots = async () => {
    const activeRooms = rooms.filter((r) => r.isActive !== false);
    if (activeRooms.length === 0) {
      alert('ไม่มีห้องปฏิบัติการที่เปิดใช้งานอยู่ กรุณาเปิดใช้งานห้องปฏิบัติการก่อน');
      return;
    }

    const thaiMonth = currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    const confirmMsg = `ระบบจะสร้างรอบเวลามาตรฐาน (09:00 - 12:00 น. และ 13:00 - 16:00 น.) ให้กับ ${activeRooms.length} ห้องที่เปิดใช้งาน สำหรับวันจันทร์ - ศุกร์ ในเดือน ${thaiMonth}\n\nต้องการดำเนินการต่อหรือไม่?`;
    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const slotsToCreate: any[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const dayOfWeek = d.getDay();
        // Only Monday - Friday (1 - 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          for (const room of activeRooms) {
            const morningExists = slots.some(
              (s) =>
                s.roomId === room.id &&
                new Date(s.date).toISOString().slice(0, 10) === dateStr &&
                s.startTime === '09:00'
            );
            if (!morningExists) {
              slotsToCreate.push({
                roomId: room.id,
                date: dateStr,
                startTime: '09:00',
                endTime: '12:00',
                maxCapacity: room.capacity || 6,
                isOpen: true,
                closeReason: '',
                availableSkills: 'ฝึกทักษะการพยาบาลพื้นฐาน, ให้ยา, ทำแผล',
              });
            }

            const afternoonExists = slots.some(
              (s) =>
                s.roomId === room.id &&
                new Date(s.date).toISOString().slice(0, 10) === dateStr &&
                s.startTime === '13:00'
            );
            if (!afternoonExists) {
              slotsToCreate.push({
                roomId: room.id,
                date: dateStr,
                startTime: '13:00',
                endTime: '16:00',
                maxCapacity: room.capacity || 6,
                isOpen: true,
                closeReason: '',
                availableSkills: 'ฝึกทักษะหัตถการทางการพยาบาล, CPR, ใส่สายยาง',
              });
            }
          }
        }
      }

      if (slotsToCreate.length === 0) {
        alert('มีรอบเวลามาตรฐานในเดือนนี้ครบถ้วนแล้ว');
        return;
      }

      const res = await fetch('/api/practice/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsToCreate }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`สร้างรอบเวลามาตรฐานสำเร็จเรียบร้อยแล้ว จำนวน ${data.count || slotsToCreate.length} รอบ!`);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการสร้างรอบเวลา');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddRoomModal = () => {
    setRoomToEdit(null);
    setRoomForm({
      code: `LAB-SIM-0${rooms.length + 1}`,
      name: '',
      location: '',
      capacity: 10,
      description: '',
    });
    setShowAddRoomModal(true);
  };

  const handleOpenEditRoomModal = (room: any) => {
    setRoomToEdit(room);
    setRoomForm({
      code: room.code,
      name: room.name,
      location: room.location || '',
      capacity: room.capacity || 10,
      description: room.description || '',
    });
    setShowAddRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.code || !roomForm.name) {
      alert('กรุณากรอกรหัสและชื่อห้องปฏิบัติการ');
      return;
    }
    setSavingRoom(true);
    try {
      const url = roomToEdit ? `/api/practice/rooms/${roomToEdit.id}` : '/api/practice/rooms';
      const method = roomToEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });

      if (res.ok) {
        const saved = await res.json();
        alert(roomToEdit ? 'แก้ไขข้อมูลห้องสำเร็จ!' : 'เพิ่มห้องปฏิบัติการใหม่สำเร็จ!');
        setShowAddRoomModal(false);
        // If creating from slot modal, auto-select this new room
        if (!roomToEdit) {
          setCreateSlotForm((prev) => ({ ...prev, roomId: saved.id }));
        }
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหรือปิดการใช้งาน "${roomName}"?`)) return;
    try {
      const res = await fetch(`/api/practice/rooms/${roomId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      alert(data.message || 'ดำเนินการเรียบร้อย');
      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบห้อง');
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

          <div className="ml-auto flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden sm:inline text-[11px] text-teal-200 font-medium">
                อัปเดตล่าสุด: {lastUpdated}
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer disabled:opacity-60"
              title="รีเฟรชข้อมูลตารางและการจองทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-300 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: TIMETABLE & CALENDAR VIEW */}
      {activeTab === 'TIMETABLE' && (
        <div className="space-y-6">
          {/* ROOM MANAGEMENT & BOOKING AVAILABILITY SECTION */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    ห้องปฏิบัติการทักษะ & สถานะการเปิดรับจอง ({rooms.length} ห้อง)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ตรวจสอบสถานะห้อง และเลือกเปิด/ปิดรับการจองได้ตามความพร้อมของห้องปฏิบัติการ
                </p>
              </div>

              {canManageSlots && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAutoGenerateStandardSlots}
                    disabled={submitting}
                    className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="สร้างรอบเวลา 09:00-12:00 และ 13:00-16:00 อัตโนมัติสำหรับวันจันทร์-ศุกร์ ในเดือนที่เลือก"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>⚡ สร้างรอบเวลามาตรฐานอัตโนมัติ</span>
                  </button>

                  <button
                    onClick={handleOpenAddRoomModal}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มห้องปฏิบัติการใหม่</span>
                  </button>
                </div>
              )}
            </div>

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {rooms.map((room) => {
                const isOpen = room.isActive !== false;
                return (
                  <div
                    key={room.id}
                    className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 ${
                      isOpen
                        ? 'bg-slate-50/50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-teal-300'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-90'
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
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
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
                              <span>ปิดบริการชั่วคราว</span>
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
                        <span>ความจุ {room.capacity || 10} คน/รอบ</span>
                      </div>

                      {room.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                          {room.description}
                        </p>
                      )}
                    </div>

                    {/* Staff/Admin Toggle & Edit Controls */}
                    {canManageSlots && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleToggleRoomStatus(room)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            isOpen
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300'
                          }`}
                        >
                          {isOpen ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>ปิดรับจองห้องนี้</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>เปิดรับจองห้องนี้</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditRoomModal(room)}
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
          {/* Calendar Controls & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Month Navigator & View Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrevMonth}
                    title="เดือนก่อนหน้า"
                    className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer shadow-none hover:shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="px-4 py-1 text-center min-w-[160px]">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 capitalize block">
                      {thaiMonthDisplay}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      (พ.ศ. {currentMonth.getFullYear() + 543})
                    </span>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    title="เดือนถัดไป"
                    className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer shadow-none hover:shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  วันนี้
                </button>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    onClick={() => setViewMode('CALENDAR')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'CALENDAR'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>รูปปฏิทิน</span>
                  </button>
                  <button
                    onClick={() => setViewMode('LIST')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'LIST'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                        availableSkills: '',
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* 7 Days of the Week Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-center text-xs font-black text-slate-700 dark:text-slate-300 py-3">
                  <div className="text-rose-600 dark:text-rose-400">อาทิตย์</div>
                  <div>จันทร์</div>
                  <div>อังคาร</div>
                  <div>พุธ</div>
                  <div>พฤหัสบดี</div>
                  <div>ศุกร์</div>
                  <div className="text-indigo-600 dark:text-indigo-400">เสาร์</div>
                </div>

                {/* 42 Calendar Cells (6 rows x 7 cols) */}
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
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
                            ? 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600'
                            : isSelected
                            ? 'bg-teal-50/50 dark:bg-teal-950/40 ring-2 ring-inset ring-teal-500'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition ${
                              cell.isToday
                                ? 'bg-teal-600 text-white shadow-sm'
                                : isSelected
                                ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200'
                                : cell.isCurrentMonth
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 dark:text-slate-600'
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
                                  availableSkills: '',
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
                              <button
                                key={slot.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(cell.dateStr);
                                  setSlotDetailModal(slot);
                                }}
                                className={`w-full px-1.5 py-1 rounded-lg text-[10px] font-bold truncate flex items-center justify-between border transition cursor-pointer text-left shadow-xs hover:scale-[1.02] ${
                                  !isOpen
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-75 hover:bg-rose-100'
                                    : isFull
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm'
                                }`}
                                title={`คลิกเพื่อดูรายละเอียด/จอง/แก้ไข: ${slot.room?.name || 'Lab'} (${slot.startTime}-${slot.endTime}) ${
                                  !isOpen ? 'ปิดรอบ' : isFull ? 'เต็ม' : `ว่าง ${slot.availableSeats}/${slot.maxCapacity}`
                                }`}
                              >
                                <span className="truncate flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    !isOpen ? 'bg-rose-500' : isFull ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}></span>
                                  <span>{slot.startTime}-{slot.endTime}</span>
                                </span>
                                <span className="text-[9px] font-mono ml-1 flex-shrink-0">
                                  {isOpen ? `${slot.availableSeats}ที่` : 'ปิด'}
                                </span>
                              </button>
                            );
                          })}

                          {cellSlots.length > 3 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(cell.dateStr);
                              }}
                              className="w-full text-[9px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 py-0.5 rounded text-center transition cursor-pointer"
                            >
                              +{cellSlots.length - 3} รอบเพิ่มเติม
                            </button>
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CalendarRange className="w-5 h-5 text-teal-600 dark:text-teal-400" />
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                          availableSkills: '',
                        });
                        setShowCreateSlotModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800/60 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>+ เพิ่มรอบเวลาในวันนี้</span>
                    </button>
                  )}
                </div>

                {/* Slots Grid for Selected Date */}
                {selectedDateSlots.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 dark:text-slate-500 space-y-2">
                    <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">ไม่มีรอบเวลาเปิดให้บริการในวันที่เลือก</p>
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
                              ? 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-80'
                              : isFull
                              ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/50'
                              : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600'
                          }`}
                        >
                          <div>
                            {/* Room Header */}
                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded">
                                  {slot.room?.code}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
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
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEditSlotModal(slot)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-600" />
                                  <span>แก้ไขรอบ</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSlotToToggle(slot);
                                    setCloseReasonInput(slot.closeReason || '');
                                  }}
                                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                                    isOpen
                                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                  }`}
                                >
                                  {isOpen ? (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                                      <span>ปิดรับจอง</span>
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>เปิดรับจอง</span>
                                    </>
                                  )}
                                </button>
                              </div>
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
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-sm">
                  <LoadingSpinner
                    message="กำลังโหลดตารางช่วงเวลา..."
                    submessage="กำลังดึงข้อมูลความจุและสถานะการเปิดรับจองจาก Supabase"
                  />
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-xs shadow-sm space-y-2">
                  <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">ไม่มีช่วงเวลาเปิดให้บริการในเดือนนี้</p>
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditSlotModal(slot)}
                                className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-600" />
                                <span>แก้ไขรอบ</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSlotToToggle(slot);
                                  setCloseReasonInput(slot.closeReason || '');
                                }}
                                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                                  isOpen
                                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                }`}
                              >
                                {isOpen ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                                    <span>ปิดรับจอง</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>เปิดรับจอง</span>
                                  </>
                                )}
                              </button>
                            </div>
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
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {['ALL', 'PENDING', 'APPROVED', 'CHECKED_IN', 'COMPLETED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setBookingStatusFilter(st)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  bookingStatusFilter === st
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-xs shadow-sm">
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
                    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 ${
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                          {b.bookingNumber}
                        </span>
                        <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800/60 px-2 py-0.5 rounded">
                          {b.slot?.room?.name}
                        </span>
                        {/* Status Label */}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> รออาจารย์อนุมัติ
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" /> อนุมัติแล้ว (พร้อมสแกนเข้า)
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-0.5 rounded-full animate-pulse">
                            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> กำลังฝึกปฏิบัติการอยู่
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> เสร็จสิ้น ({b.actualMinutes || 0} นาที)
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
                            <span>อาจารย์ผู้ดูแล: {b.advisorName}</span>
                          </div>
                        )}
                        {b.practiceKit && (
                          <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1.5 rounded-xl mt-1">
                            <div className="flex items-center gap-1.5">
                              <Boxes className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                              <span>ชุดพัสดุหัตถการ: <strong className="font-bold">{b.practiceKit.name}</strong></span>
                            </div>
                            {canManageSlots && (
                              <a
                                href="/kits"
                                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-0.5"
                              >
                                จัดจ่ายชุดนี้ ➔
                              </a>
                            )}
                          </div>
                        )}
                        {b.additionalEquipment && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                            <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>อุปกรณ์ขอเพิ่ม: <strong>{b.additionalEquipment}</strong></span>
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
                        {isPending && canApprove && (
                          <>
                            <button
                              disabled={submitting}
                              onClick={() => handleRejectBooking(b.id)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              disabled={submitting}
                              onClick={() => handleApproveBooking(b.id)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                            >
                              {submitting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>กำลังดำเนินการ...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>อนุมัติคำขอ</span>
                                </>
                              )}
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                จุดสแกน QR Code เช็คอิน & เช็คเอาท์ (Lab Check-in Station)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
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
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">หรือกรอกรหัสคำขอ / Token ด้วยตนเอง</div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScannedCode(manualCodeInput);
                }}
                className="flex items-center gap-2 max-w-md mx-auto"
              >
                <input
                  type="text"
                  disabled={processingManualCode}
                  placeholder="เช่น SPK-E58C4F... หรือ SPB-2569..."
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={processingManualCode || !manualCodeInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5 min-w-[90px] justify-center"
                >
                  {processingManualCode ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึก</span>
                  )}
                </button>
              </form>
            </div>

            {/* Scanner Feedback Card */}
            {scannerStatus.type && (
              <div
                className={`p-4 rounded-2xl border text-left text-xs transition animate-fade-in ${
                  scannerStatus.type === 'SUCCESS'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {scannerStatus.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
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
        <div className="max-w-3xl mx-auto space-y-8">
          {/* SECTION 1: MANAGE PRACTICE ROOMS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  จัดการห้องปฏิบัติการพยาบาล (Skill Lab Rooms)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เพิ่ม แก้ไข หรือปิดใช้งานห้องปฏิบัติการที่เปิดให้นิสิตเข้าฝึกปฏิบัติการ
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddRoomModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มห้องปฏิบัติการใหม่</span>
              </button>
            </div>

            {/* Rooms List / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 space-y-3 hover:border-teal-200 dark:hover:border-teal-600 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded-md">
                          {r.code}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          ความจุ: {r.capacity} คน
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {r.name}
                      </h4>
                      {r.location && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{r.location}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRoomModal(r)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        title="แก้ไขข้อมูลห้อง"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(r.id, r.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        title="ลบหรือปิดใช้งานห้อง"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {r.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 line-clamp-2">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: BOOKING POLICY SETTINGS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อนุญาตให้สแกนเช็คอินล่วงหน้า (นาที) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  required
                  value={settingsForm.checkInEarlyMinutes}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, checkInEarlyMinutes: Number(e.target.value) })
                  }
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  เช่น 30 นาที (เริ่ม 13:00 น. จะสแกนเข้าได้ตั้งแต่ 12:30 น.)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อนุญาตให้สแกนเช็คเอาท์ล่วงหน้า (นาที) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  required
                  value={settingsForm.checkOutEarlyMinutes}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, checkOutEarlyMinutes: Number(e.target.value) })
                  }
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  เช่น 15 นาที (สิ้นสุด 16:00 น. จะสแกนออกได้ตั้งแต่ 15:45 น.)
                </span>
              </div>
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
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกการตั้งค่า...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกการตั้งค่า</span>
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE OPEN PRACTICE SESSION / EVENT (Staff / Teacher) */}
      {showCreateSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-100 dark:border-teal-800/60">
                  สำหรับอาจารย์ / เจ้าหน้าที่ห้องแล็บ
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  สร้างรอบเปิดห้องแล็บ (Open Session / Event)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  กำหนดห้องปฏิบัติการ วันที่ เวลา และความจุ เพื่อเปิดให้นิสิตยื่นขอเข้าฝึกปฏิบัติด้วยตนเอง
                </p>
              </div>
              <button
                onClick={() => setShowCreateSlotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              {/* Room Select with Quick Add Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ห้องปฏิบัติการที่เปิดให้บริการ <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAddRoomModal}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg border border-teal-200 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มห้องใหม่</span>
                  </button>
                </div>
                <select
                  required
                  value={createSlotForm.roomId}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, roomId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- กรุณาเลือกห้องปฏิบัติการ --</option>
                  {rooms.length === 0 && (
                    <option value="">-- ยังไม่มีห้องปฏิบัติการ กรุณากดปุ่มเพิ่มห้องใหม่ --</option>
                  )}
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

              {/* Recommended Skills Preset Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หัตถการที่เปิดให้ฝึกในรอบนี้ (คั่นด้วยเครื่องหมายจุลภาค ,)
                </label>
                <input
                  type="text"
                  placeholder="เช่น การฉีดยา IM/SC, การใส่สายสวนปัสสาวะ, การทำแผล Dressing"
                  value={createSlotForm.availableSkills}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, availableSkills: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 หากเว้นว่างไว้ นิสิตจะสามารถพิมพ์ระบุหัตถการที่ต้องการฝึกได้อย่างอิสระ
                </p>
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>บันทึกและสร้างรอบเปิดแล็บ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRACTICE SLOT / EVENT (Staff / Teacher) */}
      {slotToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-100 dark:border-teal-800/60">
                  แก้ไขข้อมูลรอบเวลา
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  แก้ไขรอบเปิดห้องแล็บ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ปรับเปลี่ยนห้อง วันที่ เวลาเปิดให้บริการ หรือจำนวนความจุผู้เข้าฝึก
                </p>
              </div>
              <button
                onClick={() => setSlotToEdit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSlot} className="space-y-4">
              {/* Room Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ห้องปฏิบัติการที่เปิดให้บริการ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editSlotForm.roomId}
                  onChange={(e) => setEditSlotForm({ ...editSlotForm, roomId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) {r.location ? `• ${r.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Max Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่เปิดรอบ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editSlotForm.date}
                    onChange={(e) => setEditSlotForm({ ...editSlotForm, date: e.target.value })}
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
                    value={editSlotForm.maxCapacity}
                    onChange={(e) => setEditSlotForm({ ...editSlotForm, maxCapacity: Number(e.target.value) })}
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
                      onClick={() => setEditSlotForm({ ...editSlotForm, startTime: '09:00', endTime: '12:00' })}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      เช้า (09-12)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSlotForm({ ...editSlotForm, startTime: '13:00', endTime: '16:00' })}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      บ่าย (13-16)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSlotForm({ ...editSlotForm, startTime: '16:30', endTime: '19:30' })}
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
                      value={editSlotForm.startTime}
                      onChange={(e) => setEditSlotForm({ ...editSlotForm, startTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">เวลาสิ้นสุด:</span>
                    <input
                      type="time"
                      required
                      value={editSlotForm.endTime}
                      onChange={(e) => setEditSlotForm({ ...editSlotForm, endTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Recommended Skills Preset Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หัตถการที่เปิดให้ฝึกในรอบนี้ (คั่นด้วยเครื่องหมายจุลภาค ,)
                </label>
                <input
                  type="text"
                  placeholder="เช่น การฉีดยา IM/SC, การใส่สายสวนปัสสาวะ, การทำแผล Dressing"
                  value={editSlotForm.availableSkills}
                  onChange={(e) => setEditSlotForm({ ...editSlotForm, availableSkills: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 หากเว้นว่างไว้ นิสิตจะสามารถพิมพ์ระบุหัตถการที่ต้องการฝึกได้อย่างอิสระ
                </p>
              </div>

              {/* Status toggle & Reason */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editSlotIsOpen"
                    checked={editSlotForm.isOpen}
                    onChange={(e) => setEditSlotForm({ ...editSlotForm, isOpen: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="editSlotIsOpen" className="text-xs font-bold text-slate-700 cursor-pointer">
                    เปิดให้รับการจองได้ (Active)
                  </label>
                </div>

                {!editSlotForm.isOpen && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      เหตุผลที่ปิดรอบเวลา (จะแสดงให้นิสิตเห็น)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น คาบเรียนปฏิบัติการประจำ, ซ่อมบำรุงหุ่น"
                      value={editSlotForm.closeReason}
                      onChange={(e) => setEditSlotForm({ ...editSlotForm, closeReason: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Actions & Delete Button */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDeleteSlot(slotToEdit.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>ลบรอบนี้</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSlotToEdit(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึกการแก้ไข...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>บันทึกการแก้ไข</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT SLOT DETAILS & ACTION (OPENED WHEN CLICKING A SLOT ON CALENDAR) */}
      {slotDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-800/60">
                  {slotDetailModal.room?.code}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  {slotDetailModal.room?.name}
                </h3>
                {slotDetailModal.room?.location && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {slotDetailModal.room.location}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSlotDetailModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Time, Date, and Status Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>
                    {new Date(slotDetailModal.date).toLocaleDateString('th-TH', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{slotDetailModal.startTime} - {slotDetailModal.endTime} น.</span>
                </div>
              </div>

              {/* Status and Capacity */}
              <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-500 block">สถานะรอบ:</span>
                  {!slotDetailModal.isOpen ? (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700 mt-0.5">
                      <Lock className="w-3.5 h-3.5 text-rose-600" /> ปิดรอบ (ระงับการจอง)
                    </span>
                  ) : slotDetailModal.isFull ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" /> เต็มแล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" /> เปิดรับจอง (ว่าง {slotDetailModal.availableSeats} ที่)
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">ความจุห้อง:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {slotDetailModal.bookedCount} / {slotDetailModal.maxCapacity} คน
                  </span>
                </div>
              </div>

              {!slotDetailModal.isOpen && slotDetailModal.closeReason && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">เหตุผลที่ปิดรอบ:</span>
                    <span>{slotDetailModal.closeReason}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {/* Student Booking Button */}
              {slotDetailModal.isOpen && !slotDetailModal.isFull && (
                <button
                  type="button"
                  onClick={() => {
                    const slot = slotDetailModal;
                    setSlotDetailModal(null);
                    handleOpenBookingModal(slot);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ขอยื่นจองรอบเวลานี้</span>
                </button>
              )}

              {/* Staff / Teacher Controls */}
              {canManageSlots && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const slot = slotDetailModal;
                      setSlotDetailModal(null);
                      handleOpenEditSlotModal(slot);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                    <span>แก้ไขรอบ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const slot = slotDetailModal;
                      setSlotDetailModal(null);
                      setSlotToToggle(slot);
                      setCloseReasonInput(slot.closeReason || '');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      slotDetailModal.isOpen
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {slotDetailModal.isOpen ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        <span>ปิดรับจอง</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เปิดรับจอง</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BOOKING FORM */}
      {showBookingModal && slotForBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  ยื่นคำขอเข้าฝึกปฏิบัติการด้วยตนเอง
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {slotForBooking.room?.name} • {new Date(slotForBooking.date).toLocaleDateString('th-TH')} (เวลา {slotForBooking.startTime} - {slotForBooking.endTime} น.)
                </p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* 1. Skill Selection: Pick from Slot's available skills OR Custom */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  หัตถการทางการพยาบาลที่ต้องการฝึกปฏิบัติ <span className="text-rose-500">*</span>
                </label>

                {(() => {
                  const slotSkills = slotForBooking.availableSkills
                    ? slotForBooking.availableSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : [];

                  return (
                    <div className="space-y-2">
                      {slotSkills.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-[11px] text-slate-500 block">
                            💡 หัตถการที่เจ้าหน้าที่เปิดให้บริการในรอบนี้ (คลิกเพื่อเลือก):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {slotSkills.map((sk: string) => {
                              const isSelected = !bookingForm.isCustomSkill && bookingForm.skillTopic === sk;
                              return (
                                <button
                                  type="button"
                                  key={sk}
                                  onClick={() => {
                                    // Auto-link to matching practice kit if found
                                    const matched = practiceKits.find((k: any) =>
                                      k.name.includes(sk) || sk.includes(k.name.slice(0, 5))
                                    );
                                    setBookingForm({
                                      ...bookingForm,
                                      skillTopic: sk,
                                      isCustomSkill: false,
                                      practiceKitId: matched ? matched.id : bookingForm.practiceKitId,
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  <span>{sk}</span>
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() =>
                                setBookingForm({
                                  ...bookingForm,
                                  isCustomSkill: true,
                                })
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                bookingForm.isCustomSkill
                                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                                  : 'bg-slate-100 text-indigo-700 hover:bg-indigo-50 border border-dashed border-indigo-300'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ ระบุหัตถการอื่นเพิ่มเติม</span>
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {(slotSkills.length === 0 || bookingForm.isCustomSkill) && (
                        <div className="space-y-1 animate-in fade-in duration-150">
                          <input
                            type="text"
                            required
                            placeholder="ระบุชื่อหัตถการที่ต้องการฝึก เช่น เจาะเลือด (Venipuncture), สวนล้างกระเพาะอาหาร"
                            value={bookingForm.customSkillText}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                customSkillText: e.target.value,
                                skillTopic: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          {slotSkills.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBookingForm({
                                  ...bookingForm,
                                  isCustomSkill: false,
                                  skillTopic: slotSkills[0] || '',
                                })
                              }
                              className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                            >
                              ← กลับไปเลือกหัตถการประจำรอบ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 2. Course & Advisor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        advisorName: c?.instructorName || '',
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">-- ฝึกอิสระ / นอกรายวิชา (OSCE) --</option>
                    <optgroup label="เลือกรายวิชาในหลักสูตร">
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {bookingForm.courseId ? 'อาจารย์ผู้รับทราบ / ที่ปรึกษา' : 'อาจารย์ที่ปรึกษาที่ให้คำรับรอง'} <span className="text-rose-500">*</span>
                    </label>
                    {bookingForm.courseId && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEditingAdvisor ? 'ซ่อนตัวเลือก' : 'แก้ไขอาจารย์'}</span>
                      </button>
                    )}
                  </div>

                  {bookingForm.courseId && !isEditingAdvisor ? (
                    <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-teal-900">{bookingForm.advisorName || 'อาจารย์ประจำวิชา'}</span>
                        <span className="text-[10px] bg-teal-200/70 text-teal-800 px-1.5 py-0.5 rounded-md font-bold">
                          ขึ้นให้อัตโนมัติ
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingAdvisor(true)}
                        className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        แก้ไขอาจารย์
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        required
                        value={bookingForm.advisorName}
                        onChange={(e) => setBookingForm({ ...bookingForm, advisorName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        <option value="">-- กรุณาเลือกอาจารย์ผู้รับรองจากรายชื่อ --</option>
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
                              setBookingForm({ ...bookingForm, advisorName: c?.instructorName || '' });
                              setIsEditingAdvisor(false);
                            }}
                            className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                          >
                            ↺ กลับไปใช้อาจารย์ประจำวิชา ({courses.find((x) => x.id === bookingForm.courseId)?.instructorName})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Practice Kit & Additional Equipment */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      ชุดฝึกสำเร็จรูปที่ต้องการเบิกใช้ร่วม (Practice Kit)
                    </label>
                    <span className="text-[10px] text-slate-500">จับคู่ตามหัตถการให้อัตโนมัติ</span>
                  </div>
                  <select
                    value={bookingForm.practiceKitId}
                    onChange={(e) => setBookingForm({ ...bookingForm, practiceKitId: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">-- ไม่มี / ใช้อุปกรณ์และหุ่นประจำห้องแล็บ --</option>
                    {practiceKits.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.code}: {k.name} ({k.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    อุปกรณ์ที่ต้องการขอเพิ่มเติม (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ขอแผ่นปิดแผล Hydrocolloid 1 แผ่น, เข็มผีเสื้อเบอร์ 24, ถุงมือเบอร์ S"
                    value={bookingForm.additionalEquipment}
                    onChange={(e) => setBookingForm({ ...bookingForm, additionalEquipment: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    เจ้าหน้าที่จะเตรียมอุปกรณ์เสริมนี้ไว้ให้พร้อมกับชุดฝึก
                  </span>
                </div>
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งคำขอจอง...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ยืนยันยื่นคำขอจอง</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE/OPEN SLOT REASON */}
      {slotToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {slotToToggle.isOpen ? (
                <>
                  <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  ปิดรอบเวลา (ระงับการจอง)
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  เปิดรอบเวลาให้จองได้
                </>
              )}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {slotToToggle.room?.name} • วันที่ {new Date(slotToToggle.date).toLocaleDateString('th-TH')} ({slotToToggle.startTime} - {slotToToggle.endTime} น.)
            </p>

            {slotToToggle.isOpen && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เหตุผลที่ปิดรอบเวลา (จะแสดงให้นิสิตเห็น)
                </label>
                <input
                  type="text"
                  placeholder="เช่น คาบเรียนปฏิบัติการประจำ, ซ่อมบำรุงหุ่นจำลอง"
                  value={closeReasonInput}
                  onChange={(e) => setCloseReasonInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlotToToggle(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleSlot}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                  slotToToggle.isOpen ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <span>{slotToToggle.isOpen ? 'ยืนยันปิดรอบ' : 'ยืนยันเปิดรอบ'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRACTICE ROOM */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  {roomToEdit ? 'แก้ไขห้องปฏิบัติการ' : 'เพิ่มห้องปฏิบัติการใหม่'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ระบุรหัส ชื่อห้อง และสถานที่ตั้ง เพื่อใช้เปิดรอบฝึกทักษะ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสห้อง *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น LAB-SIM-01"
                    value={roomForm.code}
                    onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ความจุมาตรฐาน (คน) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อห้องปฏิบัติการ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ห้องปฏิบัติการทักษะทางการพยาบาล 1 (Skill Lab 1)"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานที่ตั้ง / อาคาร / ชั้น
                </label>
                <input
                  type="text"
                  placeholder="เช่น อาคารเฉลิมพระเกียรติฯ ชั้น 3 ห้อง 302"
                  value={roomForm.location}
                  onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำอธิบายหรืออุปกรณ์ประจำห้อง (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น มีเตียงคนไข้ 6 เตียง, หุ่นฝึกฉีดยา, หุ่นฝึกสวนปัสสาวะ"
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingRoom}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingRoom ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{roomToEdit ? 'บันทึกการแก้ไข' : 'บันทึกห้องปฏิบัติการ'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE CARD FOR STUDENT */}
      {activeBookingForQr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 relative border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveBookingForQr(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-100 dark:border-teal-800/60">
                บัตรเข้าห้องปฏิบัติการพยาบาล
              </span>
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                {activeBookingForQr.slot?.room?.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(activeBookingForQr.slot?.date).toLocaleDateString('th-TH')} ({activeBookingForQr.slot?.startTime} - {activeBookingForQr.slot?.endTime} น.)
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 inline-block shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Booking QR Code"
                  className="w-56 h-56 mx-auto object-contain bg-white rounded-lg p-1"
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
