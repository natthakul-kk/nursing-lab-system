'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wind,
  Calendar,
  Clock,
  Thermometer,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Plus,
  Edit3,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  Info,
  Sparkles,
  Zap,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function AirConditioningPage() {
  const { currentUser, isOfficer, isApprover, isExecutive, isAdmin } = useAuth();

  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit / Log Modal State
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    dateStr: string;
    dayNumber: number;
    room: any;
    existingLog: any | null;
  } | null>(null);

  // Quick Backdated Log Modal
  const [showBackdateModal, setShowBackdateModal] = useState(false);

  // Form input state for log modal
  const [formOpenTime, setFormOpenTime] = useState('10:00');
  const [formCloseTime, setFormCloseTime] = useState('14:00');
  const [formTemp, setFormTemp] = useState('22.0');
  const [formPurpose, setFormPurpose] = useState('เปิดเพื่อรักษาอุปกรณ์');
  const [formNote, setFormNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  const fetchLogs = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/ac-logs?month=${currentMonth}&year=${currentYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Default room selection: pick ห้องเก็บครุภัณฑ์ and SIM MAN
        if (selectedRoomIds.length === 0 && json.rooms?.length > 0) {
          // Prioritize: ห้องเก็บครุภัณฑ์ (LAB-EQ) and SIM MAN (LAB-SIM-MAN)
          const targetRooms = json.rooms.filter(
            (r: any) =>
              r.code === 'LAB-EQ' ||
              r.code === 'LAB-SIM-MAN' ||
              r.name.includes('เก็บครุภัณฑ์') ||
              r.name.includes('SIM MAN')
          );

          if (targetRooms.length > 0) {
            setSelectedRoomIds(targetRooms.map((r: any) => r.id));
          } else {
            setSelectedRoomIds(json.rooms.slice(0, 2).map((r: any) => r.id));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch AC logs', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentMonth, currentYear]);

  // Selected rooms for the matrix columns
  const activeRooms = useMemo(() => {
    if (!data?.rooms) return [];
    if (selectedRoomIds.length === 0) {
      const preferred = data.rooms.filter(
        (r: any) =>
          r.code === 'LAB-EQ' ||
          r.code === 'LAB-SIM-MAN' ||
          r.name.includes('เก็บครุภัณฑ์') ||
          r.name.includes('SIM MAN')
      );
      if (preferred.length > 0) return preferred;
      return data.rooms.slice(0, 2);
    }
    return data.rooms.filter((r: any) => selectedRoomIds.includes(r.id));
  }, [data?.rooms, selectedRoomIds]);

  // Generate days array for the month
  const daysInMonth = data?.daysInMonth || new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = useMemo(() => {
    const arr: any[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth - 1, day);
      const dayOfWeek = THAI_DAY_NAMES[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      arr.push({ day, dayOfWeek, isWeekend, dateStr, dateObj: d });
    }
    return arr;
  }, [currentYear, currentMonth, daysInMonth]);

  // Calculate Column Totals & Summaries
  const roomSummaries = useMemo(() => {
    const summaries: Record<string, { totalHours: number; activeDays: number; tempSum: number; avgTemp: number }> = {};
    if (!data?.logsMap) return summaries;

    activeRooms.forEach((r: any) => {
      let totalHours = 0;
      let activeDays = 0;
      let tempSum = 0;

      daysArray.forEach((d) => {
        const log = data.logsMap[d.dateStr]?.[r.id];
        if (log && Number(log.usageHours) > 0) {
          totalHours += Number(log.usageHours);
          activeDays += 1;
          tempSum += Number(log.temperature) || 22.0;
        }
      });

      summaries[r.id] = {
        totalHours: Math.round(totalHours * 10) / 10,
        activeDays,
        tempSum,
        avgTemp: activeDays > 0 ? Math.round((tempSum / activeDays) * 10) / 10 : 22.0,
      };
    });

    return summaries;
  }, [data?.logsMap, activeRooms, daysArray]);

  // Total hours across all active rooms
  const grandTotalHours = useMemo(() => {
    return Object.values(roomSummaries).reduce((acc, s) => acc + s.totalHours, 0);
  }, [roomSummaries]);

  // Open Log Modal for specific cell
  const handleOpenCellLog = (dayInfo: any, room: any) => {
    if (!isOfficer) return; // Only Officer and Admin can edit

    const existingLog = data?.logsMap?.[dayInfo.dateStr]?.[room.id] || null;
    setSelectedCell({
      dateStr: dayInfo.dateStr,
      dayNumber: dayInfo.day,
      room,
      existingLog,
    });

    if (existingLog) {
      setFormOpenTime(existingLog.openTime || '10:00');
      setFormCloseTime(existingLog.closeTime || '14:00');
      setFormTemp(String(existingLog.temperature || '22.0'));
      setFormPurpose(existingLog.purpose || 'เปิดเพื่อรักษาอุปกรณ์');
      setFormNote(existingLog.note || '');
    } else {
      setFormOpenTime('10:00');
      setFormCloseTime('14:00');
      setFormTemp('22.0');
      setFormPurpose('เปิดเพื่อรักษาอุปกรณ์');
      setFormNote('');
    }

    setShowLogModal(true);
  };

  // Submit Log Modal
  const handleSaveLog = async () => {
    if (!selectedCell || !isOfficer) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/ac-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          logs: [
            {
              roomId: selectedCell.room.id,
              dateStr: selectedCell.dateStr,
              openTime: formOpenTime,
              closeTime: formCloseTime,
              temperature: parseFloat(formTemp) || 22.0,
              purpose: formPurpose,
              note: formNote,
            },
          ],
        }),
      });

      if (res.ok) {
        setShowLogModal(false);
        fetchLogs(true);
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e: any) {
      alert(e.message || 'ไม่สามารถบันทึกได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-Click: Preset "เปิดรักษาอุปกรณ์ 10:00-14:00"
  const handleQuickPresetDeviceMaintenance = async (dayInfo: any, room: any) => {
    if (!isOfficer) return;
    try {
      const res = await fetch('/api/ac-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          logs: [
            {
              roomId: room.id,
              dateStr: dayInfo.dateStr,
              openTime: '10:00',
              closeTime: '14:00',
              temperature: 22.0,
              purpose: 'เปิดเพื่อรักษาอุปกรณ์',
              note: 'Preset 10:00-14:00 (4 ชม.)',
            },
          ],
        }),
      });

      if (res.ok) {
        fetchLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Log
  const handleDeleteLog = async () => {
    if (!selectedCell || !isOfficer) return;
    if (!confirm('ยืนยันลบข้อมูลการเปิด-ปิดแอร์ของวันนี้?')) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/ac-logs?roomId=${encodeURIComponent(selectedCell.room.id)}&dateStr=${encodeURIComponent(selectedCell.dateStr)}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        setShowLogModal(false);
        fetchLogs(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to Excel matching the exact PDF Government Table layout!
  const handleExportExcel = () => {
    if (!isOfficer) {
      alert('เฉพาะเจ้าหน้าที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ส่งออกรายงาน');
      return;
    }

    const monthName = THAI_MONTHS[currentMonth - 1];
    const yearBE = currentYear + 543;

    // Header Rows
    const rows: any[][] = [
      [`ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ ประจำเดือน${monthName} ปี พ.ศ. ${yearBE} (ค.ศ. ${currentYear})`],
    ];

    // Sub-header: Room Names spanning across their 5 columns
    const roomHeaderRow: any[] = ['', ''];
    activeRooms.forEach((r: any) => {
      roomHeaderRow.push(r.name);
      roomHeaderRow.push('');
      roomHeaderRow.push('');
      roomHeaderRow.push('');
      roomHeaderRow.push('');
    });
    roomHeaderRow.push('รวมทั้งวัน (ชม.)');
    rows.push(roomHeaderRow);

    // Column Headers
    const colHeaderRow: any[] = ['วันที่', 'วัน'];
    activeRooms.forEach(() => {
      colHeaderRow.push('เวลาเปิด', 'เวลาปิด', 'ชม.ใช้งาน', 'อุณหภูมิ', 'ผู้บันทึก/หมายเหตุ');
    });
    colHeaderRow.push('รวมทั้งวัน (ชม.)');
    rows.push(colHeaderRow);

    const startDataRow = 4; // 1-based index in Excel

    // Daily Data Rows
    daysArray.forEach((d) => {
      const row: any[] = [`${d.day} ${d.dateObj.toLocaleString('en-US', { month: 'short' })} ${currentYear}`, d.dayOfWeek];
      let dayTotal = 0;

      activeRooms.forEach((r: any) => {
        const log = data?.logsMap?.[d.dateStr]?.[r.id];
        if (log && Number(log.usageHours) > 0) {
          const hours = Number(log.usageHours);
          dayTotal += hours;
          row.push(
            log.openTime || '-',
            log.closeTime || '-',
            hours,
            log.temperature ? `${log.temperature}°C` : '22°C',
            log.purpose || log.recordedName || 'เปิดเพื่อรักษาอุปกรณ์'
          );
        } else {
          row.push('', '', '', '', '');
        }
      });

      row.push(dayTotal > 0 ? dayTotal : 0.0);
      rows.push(row);
    });

    const endDataRow = rows.length;

    // Summary Rows
    // 1. รวมชั่วโมงทั้งเดือน
    const totalRowIndex = rows.length;
    const totalRow: any[] = ['รวมชั่วโมงทั้งเดือน', ''];
    activeRooms.forEach((r: any, idx: number) => {
      const hoursColIndex = 2 + idx * 5 + 2;
      const colLetter = XLSX.utils.encode_col(hoursColIndex);
      const roomTotal = roomSummaries[r.id]?.totalHours || 0;
      totalRow.push(
        '',
        '',
        { t: 'n', v: roomTotal, f: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` },
        '',
        ''
      );
    });
    const lastColIndex = 2 + activeRooms.length * 5;
    const lastColLetter = XLSX.utils.encode_col(lastColIndex);
    totalRow.push({
      t: 'n',
      v: grandTotalHours,
      f: `SUM(${lastColLetter}${startDataRow}:${lastColLetter}${endDataRow})`,
    });
    rows.push(totalRow);

    // 2. เฉลี่ยต่อวันใช้งาน
    const avgRowIndex = rows.length;
    const avgRow: any[] = ['เฉลี่ยต่อวันใช้งาน', ''];
    activeRooms.forEach((r: any) => {
      const summary = roomSummaries[r.id];
      const avgH = summary?.activeDays > 0 ? Math.round((summary.totalHours / summary.activeDays) * 10) / 10 : 0;
      avgRow.push('', '', avgH, `${summary?.avgTemp || 22}°C`, '');
    });
    let totalDaysWithAc = 0;
    daysArray.forEach((d) => {
      const hasAnyAc = activeRooms.some((r: any) => {
        const log = data?.logsMap?.[d.dateStr]?.[r.id];
        return log && Number(log.usageHours) > 0;
      });
      if (hasAnyAc) totalDaysWithAc++;
    });
    const grandAvgHours = totalDaysWithAc > 0 ? Math.round((grandTotalHours / totalDaysWithAc) * 10) / 10 : 0;
    avgRow.push(grandAvgHours);
    rows.push(avgRow);

    // 3. จำนวนวันที่เปิดใช้งาน
    const activeDaysRowIndex = rows.length;
    const activeDaysRow: any[] = ['จำนวนวันที่เปิดใช้งาน', ''];
    activeRooms.forEach((r: any) => {
      const summary = roomSummaries[r.id];
      activeDaysRow.push('', '', `${summary?.activeDays || 0} วัน`, '', '');
    });
    activeDaysRow.push(`${totalDaysWithAc} วัน`);
    rows.push(activeDaysRow);

    // Merges
    const totalCols = 2 + activeRooms.length * 5 + 1;
    const merges: any[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Title
    ];

    // Merge room headers (5 cols per room)
    activeRooms.forEach((_: any, idx: number) => {
      const cStart = 2 + idx * 5;
      merges.push({ s: { r: 1, c: cStart }, e: { r: 1, c: cStart + 4 } });
    });

    // Merge labels across cols A and B for summary rows
    merges.push(
      { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 1 } },
      { s: { r: avgRowIndex, c: 0 }, e: { r: avgRowIndex, c: 1 } },
      { s: { r: activeDaysRowIndex, c: 0 }, e: { r: activeDaysRowIndex, c: 1 } }
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;

    // Column widths
    const cols: any[] = [{ wch: 14 }, { wch: 6 }];
    activeRooms.forEach(() => {
      cols.push({ wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 10 }, { wch: 24 });
    });
    cols.push({ wch: 16 });
    ws['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `บันทึกแอร์_${monthName}_${yearBE}`);
    XLSX.writeFile(wb, `ตารางบันทึกการเปิดปิดเครื่องปรับอากาศ_${monthName}_${yearBE}.xlsx`);
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ..."
        submessage="ดึงข้อมูลประวัติการทำงานและอุณหภูมิรายเดือนของแต่ละห้อง"
      />
    );
  }

  const monthName = THAI_MONTHS[currentMonth - 1];
  const yearBE = currentYear + 543;

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner Navigation */}
      <div className="bg-gradient-to-r from-teal-800 via-cyan-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-white transition hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>กลับหน้าหลัก</span>
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span>ระบบบริหารจัดการพลังงานและเครื่องปรับอากาศ</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            ประจำเดือน{monthName} ปี พ.ศ. {yearBE} (ค.ศ. {currentYear}) • คณะพยาบาลศาสตร์
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Month / Year Navigator */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-1">
            <button
              type="button"
              onClick={() => {
                if (currentMonth === 1) {
                  setCurrentMonth(12);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-white">
              {monthName} {yearBE}
            </span>

            <button
              type="button"
              onClick={() => {
                if (currentMonth === 12) {
                  setCurrentMonth(1);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Export Excel (Only Officer and Admin) */}
          {isOfficer && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
              title="ดาวน์โหลดไฟล์ Excel ตามแบบฟอร์มเอกสารราชการ"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">ส่งออก</span> Excel แบบฟอร์มราชการ
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 cursor-pointer disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Notice & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">รวมชั่วโมงเปิดทั้งเดือน</span>
            <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
              {grandTotalHours} <span className="text-xs font-normal text-slate-500">ชม.</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">รวมทุกห้องที่แสดงผล</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">สิทธิ์การใช้งานของท่าน</span>
            <div className="text-sm font-black text-slate-800 dark:text-white mt-1">
              {isOfficer ? 'เจ้าหน้าที่ / แอดมิน' : isExecutive ? 'ผู้บริหาร (View-Only)' : 'อาจารย์ (View-Only)'}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isOfficer ? 'บันทึก แก้ไข และส่งออก Excel ได้' : 'เปิดดูตารางและสถิติรายเดือนได้'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">ห้องปฏิบัติการ</span>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
              {activeRooms.length} <span className="text-xs font-normal text-slate-500">ห้องในตาราง</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">ปรับเลือกห้องได้ด้านล่าง</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Room Filter Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>เลือกห้องที่ต้องการแสดงผลในตาราง:</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedRoomIds(data?.rooms?.map((r: any) => r.id) || [])}
              className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-semibold"
            >
              เลือกทั้งหมด
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setSelectedRoomIds([])}
              className="text-[11px] text-slate-500 hover:underline"
            >
              คืนค่าเริ่มต้น
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {data?.rooms?.map((r: any) => {
            const isSelected = selectedRoomIds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    if (selectedRoomIds.length > 1) {
                      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== r.id));
                    }
                  } else {
                    setSelectedRoomIds([...selectedRoomIds, r.id]);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{r.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Matrix Table matching Government PDF */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Table Title Banner */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-teal-600" />
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ ประจำเดือน{monthName} ปี พ.ศ. {yearBE}
            </span>
          </div>
          {isOfficer && (
            <span className="text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 font-medium">
              💡 คลิกที่ช่องของวันนั้นเพื่อบันทึก/แก้ไขเวลาเปิด-ปิดแอร์ได้ทันที
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header Level 1: Room Names */}
            <thead>
              <tr className="bg-slate-800 text-white text-center font-bold">
                <th rowSpan={2} className="p-2.5 border border-slate-700 w-24">
                  วันที่
                </th>
                <th rowSpan={2} className="p-2.5 border border-slate-700 w-12">
                  วัน
                </th>
                {activeRooms.map((r: any) => (
                  <th key={r.id} colSpan={5} className="p-2.5 border border-slate-700 bg-teal-900 text-cyan-100">
                    {r.name}
                  </th>
                ))}
                <th rowSpan={2} className="p-2.5 border border-slate-700 bg-slate-900 text-white w-24">
                  รวมทั้งวัน (ชม.)
                </th>
              </tr>

              {/* Header Level 2: 5 Subcolumns per Room */}
              <tr className="bg-slate-700 text-slate-200 text-center font-semibold text-[11px]">
                {activeRooms.map((r: any) => (
                  <React.Fragment key={r.id}>
                    <th className="p-2 border border-slate-600 w-16">เวลาเปิด</th>
                    <th className="p-2 border border-slate-600 w-16">เวลาปิด</th>
                    <th className="p-2 border border-slate-600 w-16">ชม.ใช้งาน</th>
                    <th className="p-2 border border-slate-600 w-16">อุณหภูมิ</th>
                    <th className="p-2 border border-slate-600 min-w-[140px]">ผู้บันทึก/หมายเหตุ</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Daily Rows */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {daysArray.map((d) => {
                let dayTotalHours = 0;

                return (
                  <tr
                    key={d.dateStr}
                    className={`transition ${
                      d.isWeekend
                        ? 'bg-slate-50/70 dark:bg-slate-950/40'
                        : 'hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
                    }`}
                  >
                    {/* Day Col */}
                    <td className="p-2 text-center font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {d.day} {d.dateObj.toLocaleString('en-US', { month: 'short' })} {currentYear}
                    </td>

                    {/* Day of Week */}
                    <td
                      className={`p-2 text-center font-bold border-r border-slate-200 dark:border-slate-800 ${
                        d.isWeekend ? 'text-rose-500 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {d.dayOfWeek}
                    </td>

                    {/* Rooms 5-Cols */}
                    {activeRooms.map((r: any) => {
                      const log = data?.logsMap?.[d.dateStr]?.[r.id];
                      const hasLog = log && Number(log.usageHours) > 0;
                      if (hasLog) {
                        dayTotalHours += Number(log.usageHours);
                      }

                      return (
                        <React.Fragment key={r.id}>
                          {/* Open Time */}
                          <td
                            onClick={() => handleOpenCellLog(d, r)}
                            className={`p-2 text-center font-mono text-[11px] ${
                              isOfficer ? 'cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-900/40' : ''
                            } ${hasLog ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}
                          >
                            {hasLog ? log.openTime || '-' : '-'}
                          </td>

                          {/* Close Time */}
                          <td
                            onClick={() => handleOpenCellLog(d, r)}
                            className={`p-2 text-center font-mono text-[11px] ${
                              isOfficer ? 'cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-900/40' : ''
                            } ${hasLog ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}
                          >
                            {hasLog ? log.closeTime || '-' : '-'}
                          </td>

                          {/* Hours */}
                          <td
                            onClick={() => handleOpenCellLog(d, r)}
                            className={`p-2 text-center font-mono font-bold text-xs ${
                              isOfficer ? 'cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-900/40' : ''
                            } ${
                              hasLog
                                ? 'text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          >
                            {hasLog ? `${log.usageHours}` : ''}
                          </td>

                          {/* Temp */}
                          <td
                            onClick={() => handleOpenCellLog(d, r)}
                            className={`p-2 text-center font-mono text-[11px] ${
                              isOfficer ? 'cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-900/40' : ''
                            } ${hasLog ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-300'}`}
                          >
                            {hasLog && log.temperature ? `${log.temperature}°C` : ''}
                          </td>

                          {/* Purpose / Notes / Quick Action */}
                          <td
                            onClick={() => handleOpenCellLog(d, r)}
                            className={`p-2 text-xs border-r border-slate-200 dark:border-slate-800 ${
                              isOfficer ? 'cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-900/40' : ''
                            }`}
                          >
                            {hasLog ? (
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate max-w-[130px] font-medium text-slate-700 dark:text-slate-300">
                                  {log.purpose || 'เปิดเพื่อรักษาอุปกรณ์'}
                                </span>
                                {isOfficer && <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />}
                              </div>
                            ) : isOfficer ? (
                              <div className="opacity-0 hover:opacity-100 transition flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickPresetDeviceMaintenance(d, r);
                                  }}
                                  className="text-[10px] text-teal-600 hover:text-teal-700 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800"
                                  title="คลิกเดียว: เปิดรักษาอุปกรณ์ 10:00-14:00 (4 ชม.)"
                                >
                                  + รักษาอุปกรณ์ (10-14)
                                </button>
                              </div>
                            ) : (
                              ''
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Day Total Hours */}
                    <td className="p-2 text-center font-mono font-black text-xs bg-slate-100/70 dark:bg-slate-950/60 text-slate-900 dark:text-white">
                      {dayTotalHours > 0 ? (
                        <span className="text-teal-700 dark:text-teal-400 font-black">{dayTotalHours.toFixed(1)}</span>
                      ) : (
                        <span className="text-slate-400">0.0</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* ---------------------------------------------------- */}
              {/* SUMMARY FOOTER ROW 1: รวมชั่วโมงทั้งเดือน             */}
              {/* ---------------------------------------------------- */}
              <tr className="bg-teal-50 dark:bg-teal-950/60 border-t-2 border-teal-600 font-bold text-slate-900 dark:text-white">
                <td colSpan={2} className="p-3 text-center font-black">
                  รวมชั่วโมงทั้งเดือน
                </td>
                {activeRooms.map((r: any) => {
                  const summary = roomSummaries[r.id];
                  return (
                    <React.Fragment key={r.id}>
                      <td colSpan={2} className="p-2 text-center text-slate-500"></td>
                      <td className="p-2 text-center font-mono text-sm font-black text-teal-800 dark:text-teal-200">
                        {summary?.totalHours || 0}
                      </td>
                      <td colSpan={2} className="p-2 text-center text-slate-500"></td>
                    </React.Fragment>
                  );
                })}
                <td className="p-3 text-center font-mono text-base font-black text-teal-800 dark:text-teal-200 bg-teal-100/60 dark:bg-teal-900/60">
                  {grandTotalHours.toFixed(1)}
                </td>
              </tr>

              {/* ---------------------------------------------------- */}
              {/* SUMMARY FOOTER ROW 2: เฉลี่ยต่อวันใช้งาน               */}
              {/* ---------------------------------------------------- */}
              <tr className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                <td colSpan={2} className="p-2.5 text-center text-xs font-bold">
                  เฉลี่ยต่อวันใช้งาน
                </td>
                {activeRooms.map((r: any) => {
                  const summary = roomSummaries[r.id];
                  const avgHours =
                    summary?.activeDays > 0 ? (summary.totalHours / summary.activeDays).toFixed(1) : '0.0';
                  return (
                    <React.Fragment key={r.id}>
                      <td colSpan={2} className="p-2 text-center text-slate-400"></td>
                      <td className="p-2 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {avgHours}
                      </td>
                      <td className="p-2 text-center font-mono text-xs text-cyan-700 dark:text-cyan-300">
                        {summary?.avgTemp || 22.0}°C
                      </td>
                      <td className="p-2 text-center text-slate-400"></td>
                    </React.Fragment>
                  );
                })}
                <td className="p-2.5 text-center text-slate-400 font-mono text-xs">-</td>
              </tr>

              {/* ---------------------------------------------------- */}
              {/* SUMMARY FOOTER ROW 3: จำนวนวันที่เปิดใช้งาน            */}
              {/* ---------------------------------------------------- */}
              <tr className="bg-slate-100 dark:bg-slate-950 font-semibold text-slate-700 dark:text-slate-300">
                <td colSpan={2} className="p-2.5 text-center text-xs font-bold">
                  จำนวนวันที่เปิดใช้งาน
                </td>
                {activeRooms.map((r: any) => {
                  const summary = roomSummaries[r.id];
                  return (
                    <React.Fragment key={r.id}>
                      <td colSpan={2} className="p-2 text-center text-slate-400"></td>
                      <td className="p-2 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {summary?.activeDays || 0} วัน
                      </td>
                      <td colSpan={2} className="p-2 text-center text-slate-400"></td>
                    </React.Fragment>
                  );
                })}
                <td className="p-2.5 text-center text-slate-400 font-mono text-xs">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: EDIT / LOG AC TIME (Staff and Admin only)     */}
      {/* ---------------------------------------------------- */}
      {showLogModal && selectedCell && isOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] text-teal-200 font-bold uppercase tracking-wider">
                  บันทึกการเปิด-ปิดเครื่องปรับอากาศ
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {selectedCell.room.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  วันที่ {selectedCell.dayNumber} {monthName} {yearBE}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 space-y-4">
              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ปุ่มลัดเลือกเวลาด่วน (1-Click Presets):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpenTime('10:00');
                      setFormCloseTime('14:00');
                      setFormTemp('22.0');
                      setFormPurpose('เปิดเพื่อรักษาอุปกรณ์');
                    }}
                    className="p-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-200 text-xs font-bold text-left transition"
                  >
                    <div className="flex items-center gap-1 text-teal-600 dark:text-teal-300">
                      <Zap className="w-3.5 h-3.5" />
                      <span>เปิดรักษาอุปกรณ์</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      10:00 - 14:00 (4 ชม.) | 22°C
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormOpenTime('08:30');
                      setFormCloseTime('16:30');
                      setFormTemp('24.0');
                      setFormPurpose('การเรียนการสอนรายวิชา');
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold text-left transition"
                  >
                    <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>การเรียนการสอนเต็มวัน</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      08:30 - 16:30 (8 ชม.) | 24°C
                    </div>
                  </button>
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาเปิด (Open Time):
                  </label>
                  <input
                    type="time"
                    value={formOpenTime}
                    onChange={(e) => setFormOpenTime(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาปิด (Close Time):
                  </label>
                  <input
                    type="time"
                    value={formCloseTime}
                    onChange={(e) => setFormCloseTime(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Temperature & Purpose */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    อุณหภูมิ (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formTemp}
                    onChange={(e) => setFormTemp(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วัตถุประสงค์การใช้งาน:
                  </label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-teal-500"
                  >
                    <option value="เปิดเพื่อรักษาอุปกรณ์">เปิดเพื่อรักษาอุปกรณ์</option>
                    <option value="การเรียนการสอนรายวิชา">การเรียนการสอนรายวิชา</option>
                    <option value="ฝึกซ้อมทักษะทางการพยาบาล">ฝึกซ้อมทักษะทางการพยาบาล</option>
                    <option value="สอบประเมินผล OSCE">สอบประเมินผล OSCE</option>
                    <option value="ประชุม/อบรมสัมมนา">ประชุม/อบรมสัมมนา</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี):
                </label>
                <input
                  type="text"
                  placeholder="เช่น ผู้บันทึก หรือรายละเอียดห้อง"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              {selectedCell.existingLog ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteLog}
                  className="py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบรายการนี้</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveLog}
                  className="py-2 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกเวลา'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
