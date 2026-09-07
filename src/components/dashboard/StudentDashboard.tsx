'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  PlusCircle,
  Package,
  Layers,
  ArrowRight,
  Info,
  Check,
  GraduationCap,
  Sparkles,
  QrCode
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [borrowRequests, setBorrowRequests] = useState<any[]>([]);
  const [practiceStats, setPracticeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
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

  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Instant session cache for 0ms render
    try {
      const cached = sessionStorage.getItem(`cached_borrows_${currentUser.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setBorrowRequests(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // 2. Fetch fresh in background
    async function fetchMyData() {
      try {
        const [borrowRes, practiceRes] = await Promise.all([
          fetch(`/api/borrow?userId=${currentUser?.id}`),
          fetch(`/api/practice/stats?userId=${currentUser?.id}`),
        ]);

        if (borrowRes.ok) {
          const data = await borrowRes.json();
          setBorrowRequests(data);
          if (currentUser?.id) {
            sessionStorage.setItem(`cached_borrows_${currentUser.id}`, JSON.stringify(data));
          }
        }
        if (practiceRes.ok) {
          const pData = await practiceRes.json();
          setPracticeStats(pData);
        }
      } catch (err) {
        console.error('Failed to fetch student records', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyData();
  }, [currentUser]);

  // Calculate return date status
  const getReturnStatus = (expectedReturnDateStr: string, status: string) => {
    if (status === 'RETURNED' || status === 'RETURNED_COMPLETE') {
      return { label: 'คืนสมบูรณ์เรียบร้อยแล้ว', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', days: 0, state: 'returned' };
    }
    if (status === 'RETURNED_WITH_ISSUE') {
      return { label: 'คืนแล้ว (พบรายการชำรุด)', color: 'bg-rose-100 text-rose-800 border-rose-200', days: 0, state: 'returned_with_issue' };
    }
    if (status === 'REJECTED') {
      return { label: 'ไม่อนุมัติคำขอ', color: 'bg-slate-100 text-slate-600 border-slate-200', days: 0, state: 'rejected' };
    }
    if (status === 'PENDING') {
      return { label: 'รอเจ้าหน้าที่/อาจารย์อนุมัติ', color: 'bg-amber-100 text-amber-800 border-amber-200', days: 0, state: 'pending' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const returnDate = new Date(expectedReturnDateStr);
    returnDate.setHours(0, 0, 0, 0);

    const diffTime = returnDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `เกินกำหนดคืน ${Math.abs(diffDays)} วัน! กรุณานำส่งคืนห้องแล็บ`,
        color: 'bg-rose-500 text-white animate-pulse shadow-rose-500/20',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        days: diffDays,
        state: 'overdue'
      };
    } else if (diffDays === 0) {
      return {
        label: 'ครบกำหนดส่งคืน "วันนี้" (ภายใน 16:30 น.)',
        color: 'bg-amber-500 text-white font-bold',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        days: 0,
        state: 'due_today'
      };
    } else if (diffDays <= 3) {
      return {
        label: `เหลือเวลาอีก ${diffDays} วัน จะถึงกำหนดส่งคืน`,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        days: diffDays,
        state: 'due_soon'
      };
    } else {
      return {
        label: `กำหนดคืนในอีก ${diffDays} วัน`,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        days: diffDays,
        state: 'normal'
      };
    }
  };

  const activeBorrows = (borrowRequests || []).filter(b => b.status === 'APPROVED' || b.status === 'BORROWED');
  const pendingBorrows = (borrowRequests || []).filter(b => b.status === 'PENDING');
  const returnedBorrows = (borrowRequests || []).filter(
    b => b.status === 'RETURNED' || b.status === 'RETURNED_COMPLETE' || b.status === 'RETURNED_WITH_ISSUE'
  );

  const overdueBorrows = activeBorrows.filter(b => {
    if (!b?.expectedReturnDate) return false;
    const s = getReturnStatus(b.expectedReturnDate, b.status);
    return s.state === 'overdue';
  });

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลของท่าน..."
        submessage="กำลังดึงข้อมูลรายการยืมและแจ้งเตือนกำหนดวันส่งคืนจาก Supabase"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Welcome Header */}
      <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            แดชบอร์ดนิสิต & ผู้ใช้งาน | คณะพยาบาลศาสตร์
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            สวัสดี, {currentUser?.name || 'นิสิตพยาบาล'}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            {currentUser?.studentId ? `รหัสนิสิต: ${currentUser.studentId} | ` : ''}
            {currentUser?.department || 'สาขาวิชาพยาบาลศาสตร์'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/borrow"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-800 hover:bg-slate-100 text-xs font-bold transition shadow-lg"
          >
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>ยื่นขอยืมอุปกรณ์ฝึกซ้อม</span>
          </Link>
          <Link
            href="/requisitions"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/10 transition shadow"
          >
            <Layers className="w-4 h-4 text-teal-300" />
            <span>ขอเบิกวัสดุฝึกปฏิบัติ</span>
          </Link>
        </div>
      </div>

      {/* OVERDUE ALERT BANNER */}
      {overdueBorrows.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-md shadow-rose-100">
          <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-rose-900">
              แจ้งเตือนด่วน: มีอุปกรณ์ {overdueBorrows.length} รายการที่เกินกำหนดส่งคืนแล้ว!
            </h3>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              กรุณานำอุปกรณ์มาส่งคืนและตรวจสภาพที่เคาน์เตอร์ห้องปฏิบัติการทางการพยาบาลโดยเร็ว เพื่อเปิดโอกาสให้เพื่อนร่วมชั้นได้ใช้งานต่อ
            </p>
          </div>
        </div>
      )}

      {/* Quick Summary Cards for Student */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Currently Holding */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">กำลังยืมอยู่ขณะนี้</span>
            <div className="text-2xl font-black text-slate-800 mt-1.5">
              {activeBorrows.length} <span className="text-xs font-normal text-slate-500">คำขอ</span>
            </div>
            <p className="text-[11px] text-teal-600 font-medium mt-1">
              {overdueBorrows.length > 0 ? `(เกินกำหนด ${overdueBorrows.length} รายการ)` : 'ยังไม่มีรายการเกินกำหนด'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">คำขอที่รออนุมัติ</span>
            <div className="text-2xl font-black text-slate-800 mt-1.5">
              {pendingBorrows.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">รอเจ้าหน้าที่ตรวจสอบคำขอ</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Returned Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ประวัติการคืนแล้ว</span>
            <div className="text-2xl font-black text-slate-800 mt-1.5">
              {returnedBorrows.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">ส่งคืนตรวจสภาพสมบูรณ์</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Self-Practice Lab Hours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชั่วโมงฝึกด้วยตนเอง</span>
            <div className="text-2xl font-black text-indigo-700 mt-1.5">
              {practiceStats?.userStats?.totalHours || '0.0'} <span className="text-xs font-normal text-slate-500">ชม.</span>
            </div>
            <Link
              href="/practice"
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold mt-1 flex items-center gap-0.5 hover:underline"
            >
              จองรอบเข้าฝึก <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Section: My Borrowed Items & Return Due Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-teal-600" />
              รายการอุปกรณ์ที่ฉันกำลังยืม & แจ้งเตือนวันคืน
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงเฉพาะรายการยืมของท่าน พร้อมสถานะและกำหนดเวลาส่งคืนห้องปฏิบัติการ
            </p>
          </div>

          <Link
            href="/borrow"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
          >
            ดูประวัติทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            กำลังโหลดรายการยืมของท่าน...
          </div>
        ) : borrowRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">ยังไม่มีรายการยืมอุปกรณ์ในขณะนี้</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              หากต้องการยืมเครื่อง AED, หุ่นฝึกหัตถการ หรืออุปกรณ์ทางการพยาบาล สามารถกดปุ่มขอยืมด้านบนได้ทันที
            </p>
            <div className="pt-2">
              <Link
                href="/borrow"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition"
              >
                <PlusCircle className="w-4 h-4" />
                ขอยืมอุปกรณ์ใหม่
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {borrowRequests.map((req) => {
              const returnInfo = getReturnStatus(req.expectedReturnDate, req.status);
              const isOverdue = returnInfo.state === 'overdue';
              const isDueToday = returnInfo.state === 'due_today';

              return (
                <div
                  key={req.id}
                  className={`p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isOverdue
                      ? 'bg-rose-50/40 hover:bg-rose-50/70'
                      : isDueToday
                      ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {req.requestNumber}
                      </span>
                      {req.course && (
                        <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          วิชา {req.course.code} - {req.course.name}
                        </span>
                      )}
                      {req.instructorAcknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>อาจารย์รับทราบแล้ว ({req.advisorName || req.course?.instructorName || 'อาจารย์'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                          <span>รออาจารย์รับทราบ ({req.advisorName || req.course?.instructorName || 'อาจารย์ประจำวิชา'})</span>
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          req.status === 'APPROVED' || req.status === 'BORROWED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : req.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : req.status === 'RETURNED' || req.status === 'RETURNED_COMPLETE'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : req.status === 'RETURNED_WITH_ISSUE'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {req.status === 'APPROVED' && 'อนุมัติแล้ว (รอรับของ)'}
                        {req.status === 'BORROWED' && 'กำลังยืมใช้งาน'}
                        {req.status === 'PENDING' && 'รอพิจารณาอนุมัติ'}
                        {(req.status === 'RETURNED' || req.status === 'RETURNED_COMPLETE') && 'ส่งคืนสมบูรณ์'}
                        {req.status === 'RETURNED_WITH_ISSUE' && 'คืนแล้ว (พบของชำรุด)'}
                        {req.status === 'REJECTED' && 'ปฏิเสธคำขอ'}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5">
                      {req.items?.map((itemRow: any) => (
                        <div key={itemRow.id} className="text-sm font-bold text-slate-900 flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                            <span>{itemRow.item?.name}</span>
                            <span className="text-xs text-slate-500 font-normal">
                              จำนวน {itemRow.quantity} {itemRow.item?.unit || 'เครื่อง'}
                            </span>
                            {itemRow.asset && (
                              <span className="text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                รหัส: {itemRow.asset.assetCode} (เครื่องที่ {itemRow.asset.sequenceNumber || 1})
                              </span>
                            )}
                          </div>

                          {/* Individual return condition badge */}
                          {itemRow.isReturned && (
                            itemRow.returnCondition === 'DAMAGED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                ชำรุด / เสียหาย
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                คืนสมบูรณ์
                              </span>
                            )
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Return note if damaged items */}
                    {req.returnNote && (
                      <div className="text-xs text-rose-700 font-medium bg-rose-50/60 p-2 rounded-lg border border-rose-100 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <span>หมายเหตุตรวจรับคืน: {req.returnNote}</span>
                      </div>
                    )}

                    {/* Purpose note */}
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">วัตถุประสงค์:</span> {req.purpose}
                    </div>
                  </div>

                  {/* Right Box: Return Date & Countdown Alert */}
                  <div className="flex flex-col md:items-end gap-2 text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>ยืม: {formatDate(req.borrowDate)}</span>
                      <span>→</span>
                      <span className="font-bold text-slate-900">
                        คืน: {formatDate(req.expectedReturnDate)}
                      </span>
                    </div>

                    {/* Visual Status Banner */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                        returnInfo.badgeBg || returnInfo.color
                      }`}
                    >
                      {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                      {isDueToday && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      {!isOverdue && !isDueToday && <Info className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{returnInfo.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful Student Instructions Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4 text-xs text-slate-600">
        <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800 text-xs">ข้อปฏิบัติในการยืม-คืนอุปกรณ์จำลองทางการพยาบาล</h4>
          <p className="leading-relaxed">
            1. เมื่อได้รับการอนุมัติคำขอแล้ว ให้นำบัตรนิสิตมาติดต่อรับอุปกรณ์ที่ห้องเตรียมอุปกรณ์ปฏิบัติการ (Prep Room) <br />
            2. ตรวจสอบความสะอาดและอุปกรณ์ประกอบก่อนนำออกจากห้องปฏิบัติการทุกครั้ง <br />
            3. ส่งคืนอุปกรณ์ภายในเวลา 16.30 น. ของวันที่ระบุ หากมีความจำเป็นต้องใช้ต่อ กรุณาแจ้งเจ้าหน้าที่เพื่อขอต่ออายุ
          </p>
        </div>
      </div>
    </div>
  );
}
