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

// Helper to format purpose combined with note (e.g., "อื่นๆ (จัดห้อง)" or "การเรียนการสอน (อ.จิฬาวัจน์)")
const formatPurposeWithNote = (purpose?: string | null, note?: string | null) => {
  const p = (purpose || '').trim() || 'เปิดเพื่อรักษาอุปกรณ์';
  const n = (note || '').trim();
  if (!n) return p;
  if (p === 'อื่นๆ') return `อื่นๆ (${n})`;
  return `${p} (${n})`;
};

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

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLayout, setPrintLayout] = useState<'bundle' | 'summary' | 'chunks' | 'single'>('bundle');
  const [printSingleRoomId, setPrintSingleRoomId] = useState<string>('');

  // Holiday Modal State (Double-click Date cell)
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState<{
    dateStr: string;
    day: number;
    dayOfWeek: string;
    currentHolidayName: string;
  } | null>(null);
  const [holidayFormName, setHolidayFormName] = useState('');
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);

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
    const holidaysMap = data?.holidaysMap || {};
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth - 1, day);
      const dayOfWeek = THAI_DAY_NAMES[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holidayName = holidaysMap[dateStr] || '';
      const isCustomHoliday = Boolean(holidayName);
      const isHoliday = isWeekend || isCustomHoliday;
      arr.push({
        day,
        dayOfWeek,
        isWeekend,
        isCustomHoliday,
        isHoliday,
        holidayName,
        dateStr,
        dateObj: d,
      });
    }
    return arr;
  }, [currentYear, currentMonth, daysInMonth, data?.holidaysMap]);

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

  // Open Holiday Modal (Double click Date cell)
  const handleOpenHolidayModal = (dayInfo: any) => {
    if (!isOfficer && !isAdmin) return; // Only Officer or Admin
    const currentName = data?.holidaysMap?.[dayInfo.dateStr] || '';
    setSelectedHolidayDate({
      dateStr: dayInfo.dateStr,
      day: dayInfo.day,
      dayOfWeek: dayInfo.dayOfWeek,
      currentHolidayName: currentName,
    });
    setHolidayFormName(currentName);
    setShowHolidayModal(true);
  };

  // Save Holiday
  const handleSaveHoliday = async () => {
    if (!selectedHolidayDate || !holidayFormName.trim()) return;
    setIsSubmittingHoliday(true);
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateStr: selectedHolidayDate.dateStr,
          name: holidayFormName.trim(),
          createdById: currentUser?.id,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setShowHolidayModal(false);
        fetchLogs(true);
      } else {
        alert(resData.error || 'เกิดข้อผิดพลาดในการบันทึกวันหยุด');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  // Delete / Cancel Holiday
  const handleDeleteHoliday = async () => {
    if (!selectedHolidayDate) return;
    if (!confirm(`คุณต้องการยกเลิกวันหยุดพิเศษของวันที่ ${selectedHolidayDate.dateStr} ใช่หรือไม่?`)) return;
    setIsSubmittingHoliday(true);
    try {
      const res = await fetch(`/api/holidays?dateStr=${selectedHolidayDate.dateStr}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (resData.success) {
        setShowHolidayModal(false);
        fetchLogs(true);
      } else {
        alert(resData.error || 'เกิดข้อผิดพลาดในการยกเลิกวันหยุด');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการยกเลิก: ' + err.message);
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

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

  // Helper to chunk rooms into batches (e.g. 4 rooms per A4 Landscape sheet)
  const chunkRoomsArray = (rooms: any[], chunkSize: number = 4) => {
    const chunks: any[][] = [];
    for (let i = 0; i < rooms.length; i += chunkSize) {
      chunks.push(rooms.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Export to Excel with Multi-Sheet Print Ready Layout
  const handleExportExcel = () => {
    if (!isOfficer) {
      alert('เฉพาะเจ้าหน้าที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ส่งออกรายงาน');
      return;
    }

    const monthName = THAI_MONTHS[currentMonth - 1];
    const yearBE = currentYear + 543;
    const wb = XLSX.utils.book_new();

    // -------------------------------------------------------------
    // SHEET 1: สรุปภาพรวม A4 (1 หน้าจบ - Executive Summary)
    // -------------------------------------------------------------
    const summaryRows: any[][] = [
      [`ตารางสรุปชั่วโมงการเปิด-ปิดเครื่องปรับอากาศ ประจำเดือน${monthName} ปี พ.ศ. ${yearBE} (ค.ศ. ${currentYear})`],
      ['คณะพยาบาลศาสตร์ • รายงานสรุปชั่วโมงการใช้งานรายห้องสำหรับพิมพ์ A4 แนวนอน (1 หน้าจบ)'],
    ];

    const summaryColHeaders: any[] = ['วันที่', 'วัน'];
    activeRooms.forEach((r: any) => {
      summaryColHeaders.push(r.name);
    });
    summaryColHeaders.push('รวมทั้งวัน (ชม.)');
    summaryRows.push(summaryColHeaders);

    const summaryStartDataRow = 4;

    daysArray.forEach((d) => {
      const row: any[] = [`${d.day} ${d.dateObj.toLocaleString('en-US', { month: 'short' })} ${currentYear}`, d.dayOfWeek];
      let dayTotal = 0;

      activeRooms.forEach((r: any) => {
        const log = data?.logsMap?.[d.dateStr]?.[r.id];
        if (log && Number(log.usageHours) > 0) {
          const hours = Number(log.usageHours);
          dayTotal += hours;
          row.push(hours);
        } else {
          row.push('-');
        }
      });

      row.push(dayTotal > 0 ? dayTotal : 0.0);
      summaryRows.push(row);
    });

    const summaryEndDataRow = summaryRows.length;

    // Summary Row 1: รวมชั่วโมงทั้งเดือน
    const sumTotalRowIndex = summaryRows.length;
    const sumTotalRow: any[] = ['รวมชั่วโมงทั้งเดือน', ''];
    activeRooms.forEach((r: any, idx: number) => {
      const colLetter = XLSX.utils.encode_col(2 + idx);
      const roomTotal = roomSummaries[r.id]?.totalHours || 0;
      sumTotalRow.push({
        t: 'n',
        v: roomTotal,
        f: `SUM(${colLetter}${summaryStartDataRow}:${colLetter}${summaryEndDataRow})`,
      });
    });
    const sumLastColLetter = XLSX.utils.encode_col(2 + activeRooms.length);
    sumTotalRow.push({
      t: 'n',
      v: grandTotalHours,
      f: `SUM(${sumLastColLetter}${summaryStartDataRow}:${sumLastColLetter}${summaryEndDataRow})`,
    });
    summaryRows.push(sumTotalRow);

    // Summary Row 2: เฉลี่ยต่อวันใช้งาน
    const sumAvgRowIndex = summaryRows.length;
    const sumAvgRow: any[] = ['เฉลี่ยต่อวันใช้งาน', ''];
    activeRooms.forEach((r: any) => {
      const s = roomSummaries[r.id];
      const avg = s?.activeDays > 0 ? Math.round((s.totalHours / s.activeDays) * 10) / 10 : 0;
      sumAvgRow.push(avg);
    });
    let totalDaysWithAc = 0;
    daysArray.forEach((d) => {
      const hasAny = activeRooms.some((r: any) => {
        const log = data?.logsMap?.[d.dateStr]?.[r.id];
        return log && Number(log.usageHours) > 0;
      });
      if (hasAny) totalDaysWithAc++;
    });
    const sumGrandAvg = totalDaysWithAc > 0 ? Math.round((grandTotalHours / totalDaysWithAc) * 10) / 10 : 0;
    sumAvgRow.push(sumGrandAvg);
    summaryRows.push(sumAvgRow);

    // Summary Row 3: จำนวนวันที่เปิดใช้งาน
    const sumDaysRowIndex = summaryRows.length;
    const sumDaysRow: any[] = ['จำนวนวันที่เปิดใช้งาน', ''];
    activeRooms.forEach((r: any) => {
      const s = roomSummaries[r.id];
      sumDaysRow.push(`${s?.activeDays || 0} วัน`);
    });
    sumDaysRow.push(`${totalDaysWithAc} วัน`);
    summaryRows.push(sumDaysRow);

    const sumTotalCols = 2 + activeRooms.length + 1;
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: sumTotalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: sumTotalCols - 1 } },
      { s: { r: sumTotalRowIndex, c: 0 }, e: { r: sumTotalRowIndex, c: 1 } },
      { s: { r: sumAvgRowIndex, c: 0 }, e: { r: sumAvgRowIndex, c: 1 } },
      { s: { r: sumDaysRowIndex, c: 0 }, e: { r: sumDaysRowIndex, c: 1 } },
    ];
    const sumCols: any[] = [{ wch: 14 }, { wch: 6 }];
    activeRooms.forEach(() => sumCols.push({ wch: 14 }));
    sumCols.push({ wch: 16 });
    wsSummary['!cols'] = sumCols;
    wsSummary['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 1, scale: 100 };
    wsSummary['!margins'] = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวม_A4');

    // -------------------------------------------------------------
    // Helper to generate a detailed worksheet for a given list of rooms
    // -------------------------------------------------------------
    const createDetailedSheet = (rooms: any[], titleSuffix: string) => {
      const rows: any[][] = [
        [`ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ ประจำเดือน${monthName} ปี พ.ศ. ${yearBE} (ค.ศ. ${currentYear}) ${titleSuffix}`],
      ];

      const roomHeaderRow: any[] = ['', ''];
      rooms.forEach((r: any) => {
        roomHeaderRow.push(r.name, '', '', '', '');
      });
      roomHeaderRow.push('รวมทั้งวัน (ชม.)');
      rows.push(roomHeaderRow);

      const colHeaderRow: any[] = ['วันที่', 'วัน'];
      rooms.forEach(() => {
        colHeaderRow.push('เวลาเปิด', 'เวลาปิด', 'ชม.ใช้งาน', 'อุณหภูมิ', 'หมายเหตุ');
      });
      colHeaderRow.push('รวมทั้งวัน (ชม.)');
      rows.push(colHeaderRow);

      const startDataRow = 4;

      daysArray.forEach((d) => {
        const dateText = `${d.day} ${d.dateObj.toLocaleString('th-TH', { month: 'short' })} ${yearBE}${d.holidayName ? ` (${d.holidayName})` : ''}`;
        const dayText = `${d.dayOfWeek}${d.isWeekend || d.isCustomHoliday ? ' (วันหยุด)' : ''}`;
        const row: any[] = [dateText, dayText];
        let dayTotal = 0;

        rooms.forEach((r: any) => {
          const log = data?.logsMap?.[d.dateStr]?.[r.id];
          if (log && Number(log.usageHours) > 0) {
            const hours = Number(log.usageHours);
            dayTotal += hours;
            row.push(
              log.openTime || '-',
              log.closeTime || '-',
              hours,
              log.temperature ? `${log.temperature}°C` : '22°C',
              formatPurposeWithNote(log.purpose, log.note) || log.recordedName || 'เปิดเพื่อรักษาอุปกรณ์'
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
      const totalRowIndex = rows.length;
      const totalRow: any[] = ['รวมชั่วโมงทั้งเดือน', ''];
      let chunkGrandTotal = 0;
      rooms.forEach((r: any, idx: number) => {
        const hoursColIndex = 2 + idx * 5 + 2;
        const colLetter = XLSX.utils.encode_col(hoursColIndex);
        const roomTotal = roomSummaries[r.id]?.totalHours || 0;
        chunkGrandTotal += roomTotal;
        totalRow.push(
          '',
          '',
          { t: 'n', v: roomTotal, f: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` },
          '',
          ''
        );
      });
      const lastColIndex = 2 + rooms.length * 5;
      const lastColLetter = XLSX.utils.encode_col(lastColIndex);
      totalRow.push({
        t: 'n',
        v: Math.round(chunkGrandTotal * 10) / 10,
        f: `SUM(${lastColLetter}${startDataRow}:${lastColLetter}${endDataRow})`,
      });
      rows.push(totalRow);

      // Row 2: เฉลี่ยต่อวันใช้งาน
      const avgRowIndex = rows.length;
      const avgRow: any[] = ['เฉลี่ยต่อวันใช้งาน', ''];
      rooms.forEach((r: any) => {
        const summary = roomSummaries[r.id];
        const avgH = summary?.activeDays > 0 ? Math.round((summary.totalHours / summary.activeDays) * 10) / 10 : 0;
        avgRow.push('', '', avgH, `${summary?.avgTemp || 22}°C`, '');
      });
      let chunkDaysWithAc = 0;
      daysArray.forEach((d) => {
        const hasAny = rooms.some((r: any) => {
          const log = data?.logsMap?.[d.dateStr]?.[r.id];
          return log && Number(log.usageHours) > 0;
        });
        if (hasAny) chunkDaysWithAc++;
      });
      const chunkGrandAvg = chunkDaysWithAc > 0 ? Math.round((chunkGrandTotal / chunkDaysWithAc) * 10) / 10 : 0;
      avgRow.push(chunkGrandAvg);
      rows.push(avgRow);

      // Row 3: จำนวนวันที่เปิดใช้งาน
      const activeDaysRowIndex = rows.length;
      const activeDaysRow: any[] = ['จำนวนวันที่เปิดใช้งาน', ''];
      rooms.forEach((r: any) => {
        const summary = roomSummaries[r.id];
        activeDaysRow.push('', '', `${summary?.activeDays || 0} วัน`, '', '');
      });
      activeDaysRow.push(`${chunkDaysWithAc} วัน`);
      rows.push(activeDaysRow);

      const totalCols = 2 + rooms.length * 5 + 1;
      const ws = XLSX.utils.aoa_to_sheet(rows);

      const merges: any[] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      ];
      rooms.forEach((_: any, idx: number) => {
        const cStart = 2 + idx * 5;
        merges.push({ s: { r: 1, c: cStart }, e: { r: 1, c: cStart + 4 } });
      });
      merges.push(
        { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 1 } },
        { s: { r: avgRowIndex, c: 0 }, e: { r: avgRowIndex, c: 1 } },
        { s: { r: activeDaysRowIndex, c: 0 }, e: { r: activeDaysRowIndex, c: 1 } }
      );
      ws['!merges'] = merges;

      const cols: any[] = [{ wch: 15 }, { wch: 7 }];
      rooms.forEach(() => {
        cols.push({ wch: 7 }, { wch: 7 }, { wch: 6 }, { wch: 7 }, { wch: 36 });
      });
      cols.push({ wch: 14 });
      ws['!cols'] = cols;
      ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 0 };
      ws['!margins'] = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

      return ws;
    };

    // -------------------------------------------------------------
    // SHEET 2..N: ชีตย่อยจัดหน้า A4 แบ่งชุดละ 3 ห้อง
    // -------------------------------------------------------------
    if (activeRooms.length > 3) {
      const chunks = chunkRoomsArray(activeRooms, 3);
      chunks.forEach((chunkRooms, idx) => {
        const chunkWs = createDetailedSheet(chunkRooms, `- หน้าที่ ${idx + 1} จาก ${chunks.length}`);
        XLSX.utils.book_append_sheet(wb, chunkWs, `หน้าที่${idx + 1}(ห้อง${idx * 3 + 1}-${idx * 3 + chunkRooms.length})`);
      });
    } else {
      const detailedWs = createDetailedSheet(activeRooms, '');
      XLSX.utils.book_append_sheet(wb, detailedWs, 'บันทึกละเอียด');
    }

    // -------------------------------------------------------------
    // SHEET MASTER: รวมทุกห้อง (Master Data)
    // -------------------------------------------------------------
    const masterWs = createDetailedSheet(activeRooms, '(รวมทุกห้อง)');
    XLSX.utils.book_append_sheet(wb, masterWs, 'รวมทุกห้อง_MasterData');

    XLSX.writeFile(wb, `ตารางบันทึกการเปิดปิดเครื่องปรับอากาศ_${monthName}_${yearBE}.xlsx`);
  };

  // Web Print Handler (Generates clean printable HTML and triggers browser print dialog)
  const handlePrintWeb = (layout: 'bundle' | 'summary' | 'chunks' | 'single') => {
    const monthName = THAI_MONTHS[currentMonth - 1];
    const yearBE = currentYear + 543;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์เอกสาร');
      return;
    }

    const css = `
      @page {
        size: ${layout === 'single' ? 'A4 portrait' : 'A4 landscape'};
        margin: ${layout === 'single' ? '6mm 8mm' : '3mm 5mm'};
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 7pt;
        color: #0f172a;
      }
      .page-container {
        width: 100%;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        padding: 0;
        margin: 0;
      }
      .page-container:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .header-box {
        text-align: center;
        margin-bottom: 2px;
      }
      .header-title {
        font-size: 11pt;
        font-weight: bold;
        color: #0f172a;
        line-height: 1.15;
      }
      .header-subtitle {
        font-size: 7.2pt;
        color: #475569;
        margin-top: 1px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
        height: 14.5px;
      }
      th, td {
        border: 1px solid #475569;
        padding: 0.5px 2px;
        text-align: center;
        vertical-align: middle;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      th {
        background-color: #f1f5f9;
        font-weight: bold;
        color: #0f172a;
        font-size: 7pt;
        padding: 1px 1px;
      }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .bg-summary {
        background-color: #f8fafc;
        font-weight: bold;
      }
      .signature-wrap {
        display: flex;
        justify-content: flex-end;
        margin-top: 3px;
        font-size: 7.2pt;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .signature-block {
        text-align: center;
        width: 235px;
        line-height: 1.2;
      }
      .weekend-row,
      tr.weekend-row,
      tr.weekend-row td {
        background-color: #e2e8f0 !important;
      }
      tr.weekend-row td.font-bold {
        background-color: #cbd5e1 !important;
      }
      .legend-box {
        margin-top: 3px;
        border: 1px solid #94a3b8;
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 6.5pt;
        background-color: #f8fafc;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    `;

    // 1. Render Summary Page (Room codes, total hours, dynamic legend, signature)
    const renderSummaryPage = (pageNumber = 1, totalPages = 1) => {
      const pageInfo = totalPages > 1 ? ` — (หน้าที่ ${pageNumber} จาก ${totalPages} หน้า: สรุปภาพรวม)` : '';
      return `
        <div class="page-container">
          <div class="header-box">
            <div class="header-title">ตารางสรุปชั่วโมงการเปิด-ปิดเครื่องปรับอากาศ</div>
            <div class="header-subtitle">
              คณะพยาบาลศาสตร์ • ประจำเดือน${monthName} ปี พ.ศ. ${yearBE} (ค.ศ. ${currentYear})${pageInfo}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 55px;">วันที่</th>
                <th style="width: 28px;">วัน</th>
                ${activeRooms.map((r: any) => `<th>${r.code || r.name}</th>`).join('')}
                <th style="width: 58px; background-color: #e2e8f0;">รวม (ชม.)</th>
              </tr>
            </thead>
            <tbody>
              ${daysArray.map((d: any) => {
                let dayTotal = 0;
                const roomCols = activeRooms.map((r: any) => {
                  const log = data?.logsMap?.[d.dateStr]?.[r.id];
                  if (log && Number(log.usageHours) > 0) {
                    const hrs = Number(log.usageHours);
                    dayTotal += hrs;
                    return `<td class="font-bold">${hrs}</td>`;
                  }
                  return `<td style="color: #94a3b8;">-</td>`;
                }).join('');

                const isRowHoliday = d.isWeekend || d.isCustomHoliday;

                return `
                  <tr class="${isRowHoliday ? 'weekend-row' : ''}">
                    <td style="white-space: nowrap;">${d.day} ${d.dateObj.toLocaleString('th-TH', { month: 'short' })}</td>
                    <td style="${isRowHoliday ? 'color: #b91c1c; font-weight: bold;' : ''}">${d.dayOfWeek}</td>
                    ${roomCols}
                    <td class="font-bold" style="background-color: #f1f5f9;">${dayTotal > 0 ? dayTotal : '-'}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="bg-summary" style="border-top: 2px solid #0f172a;">
                <td colspan="2" class="text-left font-bold" style="padding-left: 6px;">รวมชั่วโมงทั้งเดือน</td>
                ${activeRooms.map((r: any) => `<td>${roomSummaries[r.id]?.totalHours || 0}</td>`).join('')}
                <td style="background-color: #e2e8f0; font-size: 8.5pt;">${grandTotalHours}</td>
              </tr>
              <tr class="bg-summary">
                <td colspan="2" class="text-left font-bold" style="padding-left: 6px;">เฉลี่ยต่อวันใช้งาน</td>
                ${activeRooms.map((r: any) => {
                  const s = roomSummaries[r.id];
                  const avg = s?.activeDays > 0 ? Math.round((s.totalHours / s.activeDays) * 10) / 10 : 0;
                  return `<td>${avg}</td>`;
                }).join('')}
                <td style="background-color: #e2e8f0;">${grandTotalHours > 0 ? (Math.round((grandTotalHours / daysInMonth) * 10) / 10) : 0}</td>
              </tr>
              <tr class="bg-summary">
                <td colspan="2" class="text-left font-bold" style="padding-left: 6px;">จำนวนวันที่เปิดใช้งาน</td>
                ${activeRooms.map((r: any) => `<td>${roomSummaries[r.id]?.activeDays || 0} วัน</td>`).join('')}
                <td style="background-color: #e2e8f0;">-</td>
              </tr>
            </tbody>
          </table>

          <div class="legend-box">
            <div style="font-weight: bold; margin-bottom: 2px; color: #1e293b;">หมายเหตุรหัสห้องปฏิบัติการ (Room Code Legend):</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1px 8px; line-height: 1.15;">
              ${activeRooms.map((r: any) => {
                const isLong = (r.name || '').length > 35;
                const fullText = `<b>${r.code}</b>: ${r.name}${r.location ? ` (${r.location})` : ''}`;
                if (isLong) {
                  return `<div style="grid-column: 1 / -1; font-weight: 500;">${fullText}</div>`;
                }
                return `<div>${fullText}</div>`;
              }).join('')}
            </div>
          </div>

          <div class="signature-wrap">
            <div class="signature-block">
              <div>(ลงชื่อ) ................................................................ ผู้รายงาน</div>
              <div style="margin-top: 3px;">( ................................................................ )</div>
              <div style="margin-top: 1px;">ตำแหน่ง เจ้าหน้าที่ประจำห้องปฏิบัติการ</div>
              <div style="margin-top: 1px;">วันที่ ........ / .................... / ............</div>
            </div>
          </div>
        </div>
      `;
    };

    // 2. Render Detailed Chunk Page (3 rooms per page, 2-line header, no right total, with °C and signatures)
    const renderChunkPage = (
      chunkRooms: any[],
      chunkIdx: number,
      totalChunksCount: number,
      pageOffset = 0,
      totalPages = totalChunksCount
    ) => {
      const isLastChunk = chunkIdx === totalChunksCount - 1;
      const pageNum = chunkIdx + 1 + pageOffset;
      return `
        <div class="page-container">
          <div class="header-box">
            <div class="header-title">ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ</div>
            <div class="header-subtitle">
              คณะพยาบาลศาสตร์ • ประจำเดือน${monthName} ปี พ.ศ. ${yearBE} (ค.ศ. ${currentYear}) — (หน้าที่ ${pageNum} จาก ${totalPages} หน้า)
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 50px;">วันที่</th>
                <th rowspan="2" style="width: 20px;">วัน</th>
                ${chunkRooms.map((r: any) => `
                  <th colspan="5" style="font-size: 7.2pt; line-height: 1.15; padding: 2px 2px; white-space: normal; height: 26px;">
                    <b>${r.name}</b> ${r.code ? `<span style="font-size: 6.5pt; color: #475569;">(${r.code})</span>` : ''}
                  </th>
                `).join('')}
              </tr>
              <tr>
                ${chunkRooms.map(() => `
                  <th style="width: 28px;">เปิด</th>
                  <th style="width: 28px;">ปิด</th>
                  <th style="width: 22px;">ชม.</th>
                  <th style="width: 28px;">อุณหภูมิ</th>
                  <th style="width: 225px;">หมายเหตุ</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${daysArray.map((d: any) => {
                const isRowHoliday = d.isWeekend || d.isCustomHoliday;
                const roomCells = chunkRooms.map((r: any) => {
                  const log = data?.logsMap?.[d.dateStr]?.[r.id];
                  if (log && Number(log.usageHours) > 0) {
                    const hrs = Number(log.usageHours);
                    return `
                      <td>${log.openTime || '-'}</td>
                      <td>${log.closeTime || '-'}</td>
                      <td class="font-bold">${hrs}</td>
                      <td>${log.temperature ? `${log.temperature}°C` : '22°C'}</td>
                      <td class="text-left" style="font-size: 6.2pt; padding: 0.5px 3px; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${formatPurposeWithNote(log.purpose, log.note)}">
                        ${formatPurposeWithNote(log.purpose, log.note)}
                      </td>
                    `;
                  }
                  return `<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>`;
                }).join('');

                return `
                  <tr class="${isRowHoliday ? 'weekend-row' : ''}">
                    <td style="white-space: nowrap; font-size: 6.8pt;">
                      ${d.day} ${d.dateObj.toLocaleString('th-TH', { month: 'short' })} ${yearBE}
                    </td>
                    <td style="${isRowHoliday ? 'color: #b91c1c; font-weight: bold;' : ''}">${d.dayOfWeek}</td>
                    ${roomCells}
                  </tr>
                `;
              }).join('')}
              ${isLastChunk ? `
                <tr class="bg-summary" style="border-top: 2px solid #0f172a;">
                  <td colspan="2" class="text-left font-bold" style="padding-left: 4px;">รวมชั่วโมงทั้งเดือน</td>
                  ${chunkRooms.map((r: any) => `
                    <td></td><td></td>
                    <td class="font-bold">${roomSummaries[r.id]?.totalHours || 0}</td>
                    <td></td><td></td>
                  `).join('')}
                </tr>
                <tr class="bg-summary">
                  <td colspan="2" class="text-left font-bold" style="padding-left: 4px;">เฉลี่ยต่อวันใช้งาน</td>
                  ${chunkRooms.map((r: any) => {
                    const s = roomSummaries[r.id];
                    const avg = s?.activeDays > 0 ? Math.round((s.totalHours / s.activeDays) * 10) / 10 : 0;
                    return `<td></td><td></td><td>${avg}</td><td>${s?.avgTemp || 22}°C</td><td></td>`;
                  }).join('')}
                </tr>
                <tr class="bg-summary">
                  <td colspan="2" class="text-left font-bold" style="padding-left: 4px;">จำนวนวันที่เปิดใช้งาน</td>
                  ${chunkRooms.map((r: any) => `
                    <td></td><td></td>
                    <td>${roomSummaries[r.id]?.activeDays || 0} วัน</td>
                    <td></td><td></td>
                  `).join('')}
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="signature-wrap">
            <div class="signature-block">
              <div>(ลงชื่อ) ................................................................ ผู้รายงาน</div>
              <div style="margin-top: 3px;">( ................................................................ )</div>
              <div style="margin-top: 1px;">ตำแหน่ง เจ้าหน้าที่ประจำห้องปฏิบัติการ</div>
              <div style="margin-top: 1px;">วันที่ ........ / .................... / ............</div>
            </div>
          </div>
        </div>
      `;
    };

    let bodyContent = '';

    if (layout === 'bundle') {
      const chunks = chunkRoomsArray(activeRooms, 3);
      const totalPages = 1 + chunks.length;
      const summaryPart = renderSummaryPage(1, totalPages);
      const chunksPart = chunks.map((chunkRooms, idx) =>
        renderChunkPage(chunkRooms, idx, chunks.length, 1, totalPages)
      ).join('');
      bodyContent = summaryPart + chunksPart;
    } else if (layout === 'summary') {
      bodyContent = renderSummaryPage(1, 1);
    } else if (layout === 'chunks') {
      const chunks = chunkRoomsArray(activeRooms, 3);
      bodyContent = chunks.map((chunkRooms, idx) =>
        renderChunkPage(chunkRooms, idx, chunks.length, 0, chunks.length)
      ).join('');
    } else if (layout === 'single') {
      const targetRoom = data?.rooms?.find((r: any) => r.id === (printSingleRoomId || activeRooms[0]?.id)) || activeRooms[0];
      const roomSummary = targetRoom ? roomSummaries[targetRoom.id] : null;

      bodyContent = `
        <div class="page-container">
          <div class="header-box">
            <div class="header-title">ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศประจำห้อง</div>
            <div class="header-subtitle font-bold" style="font-size: 10.5pt; color: #0284c7; margin-top: 2px;">
              ${targetRoom?.name || 'ห้องปฏิบัติการ'} (${targetRoom?.code || '-'})
            </div>
            <div class="header-subtitle">
              คณะพยาบาลศาสตร์ • ประจำเดือน${monthName} ปี พ.ศ. ${yearBE} (ค.ศ. ${currentYear})
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 60px;">วันที่</th>
                <th style="width: 32px;">วัน</th>
                <th style="width: 55px;">เวลาเปิด</th>
                <th style="width: 55px;">เวลาปิด</th>
                <th style="width: 48px;">ชม.ใช้งาน</th>
                <th style="width: 48px;">อุณหภูมิ</th>
                <th>วัตถุประสงค์ / หมายเหตุ</th>
                <th style="width: 80px;">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody>
              ${daysArray.map((d: any) => {
                const log = targetRoom ? data?.logsMap?.[d.dateStr]?.[targetRoom.id] : null;
                const hasLog = log && Number(log.usageHours) > 0;
                const isRowHoliday = d.isWeekend || d.isCustomHoliday;

                return `
                  <tr class="${isRowHoliday ? 'weekend-row' : ''}">
                    <td style="white-space: nowrap;">${d.day} ${d.dateObj.toLocaleString('th-TH', { month: 'short' })} ${yearBE}</td>
                    <td style="${isRowHoliday ? 'color: #b91c1c; font-weight: bold;' : ''}">${d.dayOfWeek}</td>
                    <td>${hasLog ? log.openTime || '-' : '-'}</td>
                    <td>${hasLog ? log.closeTime || '-' : '-'}</td>
                    <td class="font-bold">${hasLog ? log.usageHours : '-'}</td>
                    <td>${hasLog ? `${log.temperature || 22}°C` : '-'}</td>
                    <td class="text-left" style="padding-left: 6px; font-size: 6.8pt;">
                      ${hasLog ? formatPurposeWithNote(log.purpose, log.note) : '-'}
                    </td>
                    <td>${hasLog ? log.recordedName || 'เจ้าหน้าที่' : ''}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="bg-summary" style="border-top: 2px solid #0f172a;">
                <td colspan="4" class="text-left font-bold" style="padding-left: 6px;">รวมชั่วโมงทั้งเดือน</td>
                <td class="font-bold" style="font-size: 9pt; background-color: #e2e8f0;">${roomSummary?.totalHours || 0}</td>
                <td colspan="3"></td>
              </tr>
              <tr class="bg-summary">
                <td colspan="4" class="text-left font-bold" style="padding-left: 6px;">เฉลี่ยต่อวันใช้งาน</td>
                <td class="font-bold">${roomSummary?.activeDays ? Math.round((roomSummary.totalHours / roomSummary.activeDays) * 10) / 10 : 0}</td>
                <td>${roomSummary?.avgTemp || 22}°C</td>
                <td colspan="2"></td>
              </tr>
              <tr class="bg-summary">
                <td colspan="4" class="text-left font-bold" style="padding-left: 6px;">จำนวนวันที่เปิดใช้งาน</td>
                <td class="font-bold">${roomSummary?.activeDays || 0} วัน</td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>

          <div class="signature-wrap" style="margin-top: 12px;">
            <div class="signature-block">
              <div>(ลงชื่อ) ................................................................ ผู้รายงาน</div>
              <div style="margin-top: 3px;">( ................................................................ )</div>
              <div style="margin-top: 1px;">ตำแหน่ง เจ้าหน้าที่ประจำห้องปฏิบัติการ</div>
              <div style="margin-top: 1px;">วันที่ ........ / .................... / ............</div>
            </div>
          </div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>พิมพ์ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ - ${monthName} ${yearBE}</title>
          <style>${css}</style>
        </head>
        <body>
          ${bodyContent}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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

          {/* Print Report (A4) */}
          <button
            type="button"
            onClick={() => {
              if (selectedRoomIds.length > 0) {
                setPrintSingleRoomId(selectedRoomIds[0]);
              } else if (data?.rooms?.length > 0) {
                setPrintSingleRoomId(data.rooms[0].id);
              }
              setShowPrintModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            title="พิมพ์เอกสารตารางบันทึกแอร์ (จัดรูปแบบ A4 สวยงาม)"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน (A4)</span>
          </button>

          {/* Export Excel (Only Officer and Admin) */}
          {isOfficer && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
              title="ดาวน์โหลดไฟล์ Excel พร้อมชีตจัดหน้า A4 สำหรับพิมพ์"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">ส่งออก</span> Excel (พร้อมพิมพ์ A4)
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
              💡 ดับเบิ้ลคลิกช่องวันที่เพื่อตั้งวันหยุดพิเศษ • คลิกช่องห้องเพื่อบันทึกเวลาแอร์
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
                    <th className="p-2 border border-slate-600 min-w-[140px]">หมายเหตุ</th>
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
                      d.isCustomHoliday
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-l-amber-500'
                        : d.isWeekend
                        ? 'bg-slate-200/75 dark:bg-slate-800/80 border-l-4 border-l-slate-400 dark:border-l-slate-600'
                        : 'hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
                    }`}
                  >
                    {/* Day Col */}
                    <td
                      onDoubleClick={() => handleOpenHolidayModal(d)}
                      title={isOfficer ? "ดับเบิ้ลคลิกเพื่อกำหนด/แก้ไขวันหยุดพิเศษ" : undefined}
                      className={`p-2 text-center font-mono font-medium border-r border-slate-200 dark:border-slate-800 transition select-none ${
                        isOfficer ? 'cursor-pointer hover:bg-teal-100/40 dark:hover:bg-teal-900/30' : ''
                      } ${
                        d.isCustomHoliday
                          ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-950 dark:text-amber-200 font-semibold'
                          : d.isWeekend
                          ? 'bg-slate-300/60 dark:bg-slate-700/60 text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="whitespace-nowrap">
                          {d.day} {d.dateObj.toLocaleString('th-TH', { month: 'short' })} {currentYear + 543}
                        </span>
                        {d.isCustomHoliday && (
                          <span
                            className="text-[10px] bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-sans font-bold truncate max-w-[130px]"
                            title={d.holidayName}
                          >
                            {d.holidayName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Day of Week */}
                    <td
                      onDoubleClick={() => handleOpenHolidayModal(d)}
                      title={isOfficer ? "ดับเบิ้ลคลิกเพื่อกำหนด/แก้ไขวันหยุดพิเศษ" : undefined}
                      className={`p-2 text-center font-bold border-r border-slate-200 dark:border-slate-800 select-none ${
                        isOfficer ? 'cursor-pointer hover:bg-teal-100/40 dark:hover:bg-teal-900/30' : ''
                      } ${
                        d.isWeekend || d.isCustomHoliday
                          ? 'text-rose-600 dark:text-rose-400 font-black'
                          : 'text-slate-600 dark:text-slate-400'
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
                                <span
                                  className="truncate max-w-[145px] font-medium text-slate-700 dark:text-slate-300"
                                  title={formatPurposeWithNote(log.purpose, log.note)}
                                >
                                  {formatPurposeWithNote(log.purpose, log.note)}
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

      {/* Print Options Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    พิมพ์รายงานการเปิด-ปิดแอร์ (A4)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ประจำเดือน{monthName} {yearBE} • จัดรูปแบบสำหรับเครื่องพิมพ์/PDF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Layout Options */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                เลือกรูปแบบการจัดหน้ากระดาษ:
              </label>

              {/* Option 1: Bundle Print (1 summary + 4 detailed sheets = 5 pages) */}
              <div
                onClick={() => setPrintLayout('bundle')}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  printLayout === 'bundle'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  printLayout === 'bundle' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {printLayout === 'bundle' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      พิมพ์ทั้งชุด (1 หน้าสรุป + ตารางละเอียดทุกห้อง รวม 5 แผ่น)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      แนะนำ • ครบชุด
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    พิมพ์ครบทั้งชุดต่อเนื่องในครั้งเดียว: หน้า 1 สรุปภาพรวมทุกห้อง + หน้า 2-5 ตารางบันทึกละเอียดชุดละ 3 ห้อง พร้อมลายมือชื่อผู้รายงานทุกหน้า
                  </p>
                </div>
              </div>

              {/* Option 2: Executive Summary */}
              <div
                onClick={() => setPrintLayout('summary')}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  printLayout === 'summary'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  printLayout === 'summary' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {printLayout === 'summary' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      ตารางสรุปภาพรวมรายวันทุกห้อง (หน้า 1 แผ่นเดียว)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ภาพรวม
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    ใช้รหัสห้องในตาราง พร้อมกล่องหมายเหตุชื่อเต็มด้านล่าง สรุปชั่วโมงรายวันครบทุกห้อง ลงพอดีใน A4 แนวนอน 1 แผ่น
                  </p>
                </div>
              </div>

              {/* Option 3: Detailed Multi-Page (3 rooms per page) */}
              <div
                onClick={() => setPrintLayout('chunks')}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  printLayout === 'chunks'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  printLayout === 'chunks' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {printLayout === 'chunks' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      ตารางละเอียดแบบฟอร์มราชการ (ชุดละ 3 ห้อง รวม 4 แผ่น)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      มาตรฐานงานราชการ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    แสดงเวลาเปิด-ปิด อุณหภูมิ (°C) และหมายเหตุครบถ้วน โดยวันที่ 1-สิ้นเดือนอยู่ในหน้าเดียวกัน ลายเซ็นผู้รายงานอยู่ทุกหน้า
                  </p>
                </div>
              </div>

              {/* Option 3: Single Room Sheet */}
              <div
                onClick={() => setPrintLayout('single')}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  printLayout === 'single'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  printLayout === 'single' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {printLayout === 'single' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      แบบฟอร์มประจำห้องเดี่ยว (Single Room Sheet)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      สำหรับติดแฟ้มห้อง
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    พิมพ์บันทึกเฉพาะ 1 ห้อง (A4 แนวตั้ง) พร้อมช่องลายมือชื่อผู้ปฏิบัติงาน เหมาะสำหรับใส่แฟ้มหรือติดบอร์ดหน้าห้อง
                  </p>

                  {printLayout === 'single' && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        เลือกห้องที่ต้องการพิมพ์:
                      </label>
                      <select
                        value={printSingleRoomId || (data?.rooms?.[0]?.id || '')}
                        onChange={(e) => setPrintSingleRoomId(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-indigo-500"
                      >
                        {data?.rooms?.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tip Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <b>คำแนะนำการพิมพ์:</b> ระบบจะเปิดหน้าต่างพิมพ์ให้อัตโนมัติ สามารถเลือกบันทึกเป็น <b>PDF</b> หรือส่งออกไปยังเครื่องพิมพ์ได้ทันที
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPrintModal(false);
                  handlePrintWeb(printLayout);
                }}
                className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>เปิดหน้าต่างพิมพ์ (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal (Double-click Date Cell) */}
      {showHolidayModal && selectedHolidayDate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    กำหนดวันหยุดพิเศษ
                  </h3>
                  <p className="text-xs text-slate-500">
                    วันที่ {selectedHolidayDate.day} {THAI_MONTHS[currentMonth - 1]} {currentYear + 543} ({selectedHolidayDate.dayOfWeek})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold">
                {selectedHolidayDate.currentHolidayName ? (
                  <span>สถานะปัจจุบัน: เป็นวันหยุดพิเศษ "{selectedHolidayDate.currentHolidayName}"</span>
                ) : (
                  <span>กำหนดให้วันนี้เป็นวันหยุดพิเศษ (ไม่ใช่เสาร์-อาทิตย์)</span>
                )}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                เมื่อตั้งเป็นวันหยุด แถวของวันนี้จะแสดงเป็นสีเทาทั้งบนหน้าเว็บ, ตอนสั่งพิมพ์เอกสาร A4 และในไฟล์ Excel
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ชื่อวันหยุด / รายละเอียด <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={holidayFormName}
                onChange={(e) => setHolidayFormName(e.target.value)}
                placeholder="เช่น วันแม่แห่งชาติ, วันหยุดชดเชย, วันหยุดพิเศษคณะ"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
              {selectedHolidayDate.currentHolidayName ? (
                <button
                  type="button"
                  disabled={isSubmittingHoliday}
                  onClick={handleDeleteHoliday}
                  className="py-2.5 px-3.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer border border-rose-200 dark:border-rose-900 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ยกเลิกวันหยุด</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ปิด
                </button>
              )}

              <button
                type="button"
                disabled={isSubmittingHoliday || !holidayFormName.trim()}
                onClick={handleSaveHoliday}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{selectedHolidayDate.currentHolidayName ? 'บันทึกการแก้ไข' : 'บันทึกวันหยุด'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
