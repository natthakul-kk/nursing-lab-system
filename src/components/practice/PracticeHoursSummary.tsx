'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Clock,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Sparkles,
  Search,
  Download,
  Filter,
  Users,
  Eye,
  Award,
  BookOpen,
  MapPin,
  Building2,
  FileSpreadsheet,
  History,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Printer,
  ChevronDown,
  Layers,
  ArrowUpDown,
  QrCode
} from 'lucide-react';
import { formatUserName } from '@/lib/user-utils';

interface PracticeHoursSummaryProps {
  bookings: any[];
  currentUser: any;
  isOfficer: boolean;
  isApprover: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  canManageSlots: boolean;
  rooms?: any[];
  onOpenQrCode?: (booking: any) => void;
}

export default function PracticeHoursSummary({
  bookings = [],
  currentUser,
  isOfficer,
  isApprover,
  isTeacher,
  isAdmin,
  canManageSlots,
  rooms = [],
  onOpenQrCode,
}: PracticeHoursSummaryProps) {
  const isStudent = currentUser?.role === 'USER' && !isTeacher && !isOfficer && !isAdmin;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [hourFilter, setHourFilter] = useState<'ALL' | 'GE10' | '5TO10' | 'LT5'>('ALL');
  const [sortBy, setSortBy] = useState<'HOURS_DESC' | 'HOURS_ASC' | 'ID_ASC' | 'NAME_ASC' | 'DATE_DESC'>('HOURS_DESC');
  const [selectedStudentModal, setSelectedStudentModal] = useState<any | null>(null);

  // Student Personal Bookings
  const studentBookings = useMemo(() => {
    if (isStudent) {
      return bookings.filter(b => b.userId === currentUser?.id || !b.userId);
    }
    return [];
  }, [bookings, currentUser, isStudent]);

  // Student KPI Calculations
  const studentStats = useMemo(() => {
    const completed = studentBookings.filter(b => b.status === 'COMPLETED');
    const checkedIn = studentBookings.filter(b => b.status === 'CHECKED_IN');
    const totalMinutes = completed.reduce((sum, b) => sum + (Number(b.actualMinutes) || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const uniqueSkills = Array.from(new Set(completed.map(b => b.skillTopic).filter(Boolean)));
    const uniqueRooms = Array.from(new Set(completed.map(b => b.slot?.room?.name || b.slot?.room?.code).filter(Boolean)));

    return {
      completedCount: completed.length,
      activeCount: checkedIn.length,
      totalMinutes,
      totalHours,
      uniqueSkillsCount: uniqueSkills.length,
      uniqueRoomsCount: uniqueRooms.length,
      skills: uniqueSkills,
    };
  }, [studentBookings]);

  // Aggregated Cohort Data for Teachers / Staff
  const cohortData = useMemo(() => {
    const studentMap: Record<string, {
      userId: string;
      studentId: string;
      name: string;
      department: string;
      avatar?: string;
      completedCount: number;
      totalMinutes: number;
      skillsCount: Record<string, number>;
      lastDate: string;
      records: any[];
    }> = {};

    bookings.forEach(b => {
      const u = b.user || {};
      const uid = b.userId || u.id || u.studentId || 'UNKNOWN';
      const studentId = u.studentId || '-';
      const name = formatUserName(u) || u.name || 'ไม่ระบุชื่อ';
      const dept = u.department || 'พยาบาลศาสตร์';

      if (!studentMap[uid]) {
        studentMap[uid] = {
          userId: uid,
          studentId,
          name,
          department: dept,
          avatar: u.avatar,
          completedCount: 0,
          totalMinutes: 0,
          skillsCount: {},
          lastDate: '',
          records: [],
        };
      }

      studentMap[uid].records.push(b);

      if (b.status === 'COMPLETED') {
        studentMap[uid].completedCount += 1;
        studentMap[uid].totalMinutes += Number(b.actualMinutes) || 0;
        if (b.skillTopic) {
          studentMap[uid].skillsCount[b.skillTopic] = (studentMap[uid].skillsCount[b.skillTopic] || 0) + 1;
        }
      }

      const bookingDate = b.slot?.date || b.createdAt;
      if (bookingDate && (!studentMap[uid].lastDate || bookingDate > studentMap[uid].lastDate)) {
        studentMap[uid].lastDate = bookingDate;
      }
    });

    const list = Object.values(studentMap).map(s => {
      const totalHours = (s.totalMinutes / 60).toFixed(1);
      const topSkills = Object.entries(s.skillsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skill]) => skill);

      return {
        ...s,
        totalHours: parseFloat(totalHours),
        totalHoursFormatted: totalHours,
        topSkills,
      };
    });

    return list;
  }, [bookings]);

  // Filtered & Sorted Cohort List
  const filteredCohort = useMemo(() => {
    let result = cohortData.filter(s => {
      const matchSearch =
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = selectedDept === 'ALL' || s.department === selectedDept;

      let matchHours = true;
      if (hourFilter === 'GE10') matchHours = s.totalHours >= 10;
      else if (hourFilter === '5TO10') matchHours = s.totalHours >= 5 && s.totalHours < 10;
      else if (hourFilter === 'LT5') matchHours = s.totalHours < 5;

      return matchSearch && matchDept && matchHours;
    });

    result.sort((a, b) => {
      if (sortBy === 'HOURS_DESC') return b.totalHours - a.totalHours;
      if (sortBy === 'HOURS_ASC') return a.totalHours - b.totalHours;
      if (sortBy === 'ID_ASC') return a.studentId.localeCompare(b.studentId);
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortBy === 'DATE_DESC') return (b.lastDate || '').localeCompare(a.lastDate || '');
      return 0;
    });

    return result;
  }, [cohortData, searchTerm, selectedDept, hourFilter, sortBy]);

  // Overall Cohort Metrics
  const cohortMetrics = useMemo(() => {
    const totalStudents = cohortData.length;
    const totalMins = cohortData.reduce((acc, s) => acc + s.totalMinutes, 0);
    const totalSessions = cohortData.reduce((acc, s) => acc + s.completedCount, 0);
    const totalHours = (totalMins / 60).toFixed(1);
    const avgHoursPerStudent = totalStudents > 0 ? (totalMins / totalStudents / 60).toFixed(1) : '0.0';

    return {
      totalStudents,
      totalHours,
      totalSessions,
      avgHoursPerStudent,
    };
  }, [cohortData]);

  // Export to Excel handler
  const handleExportExcel = () => {
    try {
      // 1. Summary Sheet
      const summaryRows = filteredCohort.map((s, index) => ({
        ลำดับ: index + 1,
        รหัสนิสิต: s.studentId,
        'ชื่อ-นามสกุล': s.name,
        สาขาวิชา: s.department,
        'จำนวนครั้งที่ฝึก (ครั้ง)': s.completedCount,
        'ชั่วโมงสะสม (ชม.)': s.totalHoursFormatted,
        'นาทีสะสม (นาที)': s.totalMinutes,
        หัตถการหลักที่ฝึก: s.topSkills.join(', ') || '-',
        วันที่เข้าฝึกล่าสุด: s.lastDate ? new Date(s.lastDate).toLocaleDateString('th-TH') : '-',
      }));

      // 2. Itemized Raw Sessions Sheet
      const rawRows: any[] = [];
      filteredCohort.forEach(s => {
        s.records.forEach(r => {
          rawRows.push({
            รหัสนิสิต: s.studentId,
            'ชื่อ-นามสกุล': s.name,
            วันที่ฝึก: r.slot?.date ? new Date(r.slot.date).toLocaleDateString('th-TH') : '-',
            ช่วงเวลา: r.slot ? `${r.slot.startTime} - ${r.slot.endTime}` : '-',
            ห้องปฏิบัติการ: r.slot?.room?.name || r.slot?.room?.code || '-',
            หัตถการ: r.skillTopic || '-',
            อาจารย์ที่ปรึกษา: r.advisorName || '-',
            เวลาเช็คอิน: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
            เวลาเช็คเอาท์: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
            'เวลาฝึกจริง (นาที)': r.actualMinutes || 0,
            สถานะ: r.status,
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsRaw = XLSX.utils.json_to_sheet(rawRows);

      XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปชั่วโมงนิสิต');
      XLSX.utils.book_append_sheet(wb, wsRaw, 'บันทึกเวลาฝึกรายครั้ง');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `รายงานสรุปชั่วโมงฝึกปฏิบัติการพยาบาล_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. STUDENT VIEW: PERSONAL LOGBOOK & HOURS SUMMARY        */}
      {/* ======================================================== */}
      {isStudent ? (
        <div className="space-y-6">
          {/* Top KPI Cards for Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Accumulated Hours */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">ชั่วโมงฝึกสะสมทั้งหมด</span>
                <Clock className="w-5 h-5 text-teal-200" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black">{studentStats.totalHours}</span>
                <span className="text-sm font-semibold text-teal-100">ชั่วโมง</span>
              </div>
              <p className="mt-1 text-[11px] text-teal-100/90 font-medium">
                ({studentStats.totalMinutes.toLocaleString()} นาที จากรอบที่บันทึกสำเร็จ)
              </p>
            </div>

            {/* KPI 2: Completed Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">รอบที่เข้าฝึกสำเร็จ</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentStats.completedCount}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ครั้ง</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                เช็คอินและเช็คเอาท์ครบถ้วน
              </p>
            </div>

            {/* KPI 3: Unique Skills Practiced */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ทักษะหัตถการที่ฝึก</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentStats.uniqueSkillsCount}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ทักษะ</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                พัฒนาสมรรถนะวิชาชีพพยาบาล
              </p>
            </div>

            {/* KPI 4: Lab Rooms Used */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ห้องแล็บที่เข้าใช้งาน</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentStats.uniqueRoomsCount}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ห้อง</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                ห้องปฏิบัติการทักษะพยาบาล
              </p>
            </div>
          </div>

          {/* Student Skills Badges */}
          {studentStats.skills.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                หัตถการที่ผ่านการฝึกฝนแล้ว ({studentStats.skills.length} รายการ)
              </h4>
              <div className="flex flex-wrap gap-2">
                {studentStats.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student Attendance Log History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  สมุดบันทึกประวัติการเข้าฝึกปฏิบัติการ (Logbook)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ประวัติการจอง เวลาเช็คอิน-เช็คเอาท์ และจำนวนชั่วโมงฝึกสะสมของนิสิต
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบบันทึกสะสมชั่วโมง</span>
              </button>
            </div>

            {studentBookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">ยังไม่มีประวัติการเข้าฝึกปฏิบัติการ</p>
                <p className="text-xs text-slate-400">เมื่อนิสิตทำการจองรอบฝึกและเช็คอิน-เช็คเอาท์ผ่าน QR Code ประวัติจะปรากฏที่นี่</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                      <th className="py-3.5 px-4">วันที่ฝึก</th>
                      <th className="py-3.5 px-4">ห้องปฏิบัติการ</th>
                      <th className="py-3.5 px-4">หัตถการ / วัตถุประสงค์</th>
                      <th className="py-3.5 px-4 text-center">เวลาเช็คอิน</th>
                      <th className="py-3.5 px-4 text-center">เวลาเช็คเอาท์</th>
                      <th className="py-3.5 px-4 text-center">เวลาฝึกจริง</th>
                      <th className="py-3.5 px-4">อาจารย์ที่ปรึกษา</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {studentBookings.map((b) => {
                      const dateStr = b.slot?.date ? new Date(b.slot.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                      const inTimeStr = b.checkInTime ? new Date(b.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                      const outTimeStr = b.checkOutTime ? new Date(b.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                      const durationHours = b.actualMinutes ? (b.actualMinutes / 60).toFixed(1) : '-';

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{dateStr}</div>
                            <div className="text-[11px] text-slate-400">{b.slot?.startTime} - {b.slot?.endTime}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-teal-700 dark:text-teal-400">
                              {b.slot?.room?.name || b.slot?.room?.code || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{b.skillTopic || '-'}</div>
                            {b.objectives && (
                              <div className="text-[11px] text-slate-400 line-clamp-1">{b.objectives}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {inTimeStr}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {outTimeStr}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {b.actualMinutes ? (
                              <span className="inline-flex items-center gap-1 font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800/60">
                                <span>{durationHours} ชม.</span>
                                <span className="text-[10px] text-teal-600/80 dark:text-teal-400 font-normal">({b.actualMinutes} น.)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {b.advisorName || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {b.status === 'COMPLETED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ฝึกสำเร็จ</span>
                              </span>
                            ) : b.status === 'CHECKED_IN' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 inline-flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>กำลังฝึก</span>
                                </span>
                                {onOpenQrCode && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenQrCode(b)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-sm transition cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>เปิด QR</span>
                                  </button>
                                )}
                              </div>
                            ) : b.status === 'APPROVED' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                  อนุมัติแล้ว
                                </span>
                                {onOpenQrCode && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenQrCode(b)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-sm transition cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>เปิด QR</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {b.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. TEACHER / OFFICER VIEW: COHORT OVERVIEW & DRILLDOWN   */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Cohort Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total Active Students */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">นิสิตที่เข้าฝึกทั้งหมด</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{cohortMetrics.totalStudents}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">คน</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                มีประวัติยื่นขอเข้าฝึกในระบบ
              </p>
            </div>

            {/* Metric 2: Total Cohort Hours */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">ชั่วโมงฝึกสะสมรวมทั้งคณะ</span>
                <Clock className="w-5 h-5 text-teal-200" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black">{cohortMetrics.totalHours}</span>
                <span className="text-sm font-semibold text-teal-100">ชั่วโมง</span>
              </div>
              <p className="mt-1 text-[11px] text-teal-100/90 font-medium">
                บันทึกเวลาจริงจากระบบ QR Check-in
              </p>
            </div>

            {/* Metric 3: Total Completed Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">จำนวนรอบฝึกที่สำเร็จ</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{cohortMetrics.totalSessions}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ครั้ง</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                เช็คเอาท์และคำนวณเวลาเสร็จสมบูรณ์
              </p>
            </div>

            {/* Metric 4: Average Hours Per Student */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ชั่วโมงฝึกเฉลี่ย / คน</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{cohortMetrics.avgHoursPerStudent}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ชม./คน</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                ค่าเฉลี่ยนิสิตที่เข้าฝึกปฏิบัติการ
              </p>
            </div>
          </div>

          {/* Search, Filter & Export Action Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อนิสิต หรือ รหัสนิสิต..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Filters & Export Button */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Hours Range Filter */}
                <select
                  value={hourFilter}
                  onChange={(e) => setHourFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">ชั่วโมงฝึก: ทั้งหมด</option>
                  <option value="GE10">สะสม ≥ 10 ชั่วโมง</option>
                  <option value="5TO10">สะสม 5 - 9.9 ชั่วโมง</option>
                  <option value="LT5">สะสม &lt; 5 ชั่วโมง</option>
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="HOURS_DESC">เรียงตาม: ชั่วโมงฝึกมากสุด</option>
                  <option value="HOURS_ASC">เรียงตาม: ชั่วโมงฝึกน้อยสุด</option>
                  <option value="ID_ASC">เรียงตาม: รหัสนิสิต</option>
                  <option value="NAME_ASC">เรียงตาม: ชื่อ ก-ฮ</option>
                  <option value="DATE_DESC">เรียงตาม: เข้าฝึกล่าสุด</option>
                </select>

                {/* Export Excel Button */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Aggregated Student Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  ตารางสรุปชั่วโมงฝึกสะสมรายบุคคล ({filteredCohort.length} คน)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  คลิกที่แถวหรือปุ่ม "ดูประวัติ" เพื่อดูรายละเอียดรอบฝึกทั้งหมดของนิสิตแต่ละคน
                </p>
              </div>
            </div>

            {filteredCohort.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">ไม่พบนิสิตตามเงื่อนไขที่ค้นหา</p>
                <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหาหรือตัวกรองช่วงชั่วโมง</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                      <th className="py-3.5 px-4 text-center w-12">#</th>
                      <th className="py-3.5 px-4">รหัสนิสิต</th>
                      <th className="py-3.5 px-4">ชื่อ-นามสกุล</th>
                      <th className="py-3.5 px-4">สาขาวิชา</th>
                      <th className="py-3.5 px-4 text-center">ฝึกสำเร็จ (ครั้ง)</th>
                      <th className="py-3.5 px-4 text-center">ชั่วโมงสะสม</th>
                      <th className="py-3.5 px-4">หัตถการหลักที่ฝึก</th>
                      <th className="py-3.5 px-4 text-center">เข้าฝึกล่าสุด</th>
                      <th className="py-3.5 px-4 text-center">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {filteredCohort.map((student, idx) => {
                      const lastDateStr = student.lastDate
                        ? new Date(student.lastDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '-';

                      return (
                        <tr
                          key={student.userId}
                          onClick={() => setSelectedStudentModal(student)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        >
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-teal-800 dark:text-teal-300">
                            {student.studentId}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{student.name}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {student.department}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                            {student.completedCount}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/60">
                              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span>{student.totalHoursFormatted} ชม.</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {student.topSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {student.topSkills.map((sk, skIdx) => (
                                  <span
                                    key={skIdx}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {lastDateStr}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentModal(student)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold transition cursor-pointer border border-teal-200/80 dark:border-teal-800/60"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูประวัติ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. STUDENT DETAIL MODAL (Itemized Drilldown)              */}
      {/* ======================================================== */}
      {selectedStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-lg">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedStudentModal.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>รหัสนิสิต: <strong className="font-mono text-teal-700 dark:text-teal-400">{selectedStudentModal.studentId}</strong></span>
                    <span>•</span>
                    <span>สาขาวิชา: {selectedStudentModal.department}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Quick Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">ชั่วโมงสะสมรวม</span>
                <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">
                  {selectedStudentModal.totalHoursFormatted} ชม.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">ฝึกสำเร็จ</span>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedStudentModal.completedCount} ครั้ง
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">รายการคำขอทั้งหมด</span>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedStudentModal.records.length} รายการ
                </p>
              </div>
            </div>

            {/* Itemized Session Table in Modal */}
            <div className="flex-1 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 rounded-2xl p-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black sticky top-0">
                    <th className="py-2.5 px-3">วันที่</th>
                    <th className="py-2.5 px-3">ห้องแล็บ</th>
                    <th className="py-2.5 px-3">หัตถการ</th>
                    <th className="py-2.5 px-3 text-center">เวลาเข้า-ออก</th>
                    <th className="py-2.5 px-3 text-center">เวลาจริง</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {selectedStudentModal.records.map((r: any) => {
                    const dateStr = r.slot?.date ? new Date(r.slot.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }) : '-';
                    const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                    const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          {dateStr}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-teal-700 dark:text-teal-400">
                          {r.slot?.room?.name || r.slot?.room?.code || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold">{r.skillTopic || '-'}</span>
                          {r.advisorName && <div className="text-[10px] text-slate-400">อาจารย์: {r.advisorName}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {inTime} - {outTime}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">
                          {r.actualMinutes ? `${(r.actualMinutes / 60).toFixed(1)} ชม.` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300'
                              : r.status === 'CHECKED_IN'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
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
