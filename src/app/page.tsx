'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Boxes,
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  Coins,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  QrCode
} from 'lucide-react';

import StudentDashboard from '@/components/dashboard/StudentDashboard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function DashboardPage() {
  const { currentUser, isOfficer, isApprover } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        try {
          sessionStorage.setItem('cached_dashboard_stats', JSON.stringify(json));
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'USER') {
      try {
        const cached = sessionStorage.getItem('cached_dashboard_stats');
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  // If currentUser is USER (Student / general student borrower), show student view
  if (currentUser?.role === 'USER') {
    return <StudentDashboard />;
  }

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลภาพรวมห้องปฏิบัติการ..."
        submessage="กำลังซิงค์สถิติครุภัณฑ์ สต็อกยา และคำขอจาก Supabase"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ห้องปฏิบัติการทักษะและสถานการณ์จำลองทางการพยาบาล
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            สวัสดี, {currentUser?.name || 'ผู้ใช้งาน'}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            {currentUser?.department || 'คณะพยาบาลศาสตร์'} | ภาคเรียนที่ 1 / ปีการศึกษา 2569
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/borrow"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/10 transition shadow"
          >
            <RefreshCw className="w-4 h-4 text-teal-300" />
            <span>ขอยืมครุภัณฑ์</span>
          </Link>
          <Link
            href="/requisitions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold transition shadow-lg shadow-teal-500/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ขอเบิกวัสดุรายวิชา</span>
          </Link>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>ขอเข้าฝึกปฏิบัติ (Self-Practice)</span>
          </Link>
          {isOfficer && (
            <Link
              href="/stock-in"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
            >
              <Boxes className="w-4 h-4" />
              <span>รับเข้าสต็อก/Lot</span>
            </Link>
          )}
        </div>
      </div>

      {/* Self-Practice Highlight Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              การขอเข้าฝึกปฏิบัติการด้วยตนเองของนิสิต (Self-Practice Skill Lab)
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Real-time
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เปิดให้จองล่วงหน้า พร้อมระบบสแกน QR Code ตรวจสอบชั่วโมงการฝึกปฏิบัติจริง
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>กำลังฝึกอยู่ในแล็บ: <strong className="text-sm font-black">{data?.activePracticeCount || 0}</strong> คน</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>ชั่วโมงฝึกสะสมรวม: <strong className="text-sm font-black">{data?.totalPracticeHours || '0.0'}</strong> ชม.</span>
          </div>

          <Link
            href="/practice"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline"
          >
            ไปที่ตารางฝึกปฏิบัติ <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Equipment */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ครุภัณฑ์ทั้งหมด</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 dark:text-white">{data?.totalAssets || 0} ชิ้น</div>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/60">
                พร้อมใช้ {data?.availableAssets || 0}
              </span>
              <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800/60">
                ยืมอยู่ {data?.borrowedAssets || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Consumables & Low Stock */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">วัสดุสิ้นเปลือง</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 dark:text-white">{data?.totalConsumableItems || 0} รายการ</div>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
              {data?.lowStockItems?.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3" /> ใกล้หมด {data.lowStockItems.length} รายการ
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/60">
                  ระดับสต็อกเพียงพอ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">คำขอรออนุมัติ</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 dark:text-white">
              {(data?.pendingBorrows || 0) + (data?.pendingRequisitions || 0)} รายการ
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>ยืมครุภัณฑ์: {data?.pendingBorrows || 0}</span>
              <span>•</span>
              <span>เบิกวัสดุ: {data?.pendingRequisitions || 0}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Cost Dispensed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ต้นทุนวัสดุที่ใช้จริง</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ฿{(data?.totalSystemExpense || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">รวมยอดจ่ายจริงทุกรายวิชา</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Course Costs Breakdown + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Course Costs Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  ต้นทุนการใช้วัสดุแยกตามรายวิชา (Course Expense Summary)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  คำนวณจากราคาต้นทุนจริงของวัสดุสิ้นเปลืองที่เบิกจ่ายในแต่ละรายวิชา
                </p>
              </div>
              <Link
                href="/courses"
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 hover:underline"
              >
                ดูรายละเอียดทุกวิชา <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4 mt-4">
              {data?.courseCosts?.map((course: any) => {
                const percent = Math.min(course.percentBudget, 100);
                return (
                  <div
                    key={course.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800/80 hover:bg-teal-50/30 dark:hover:bg-slate-800 transition group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                            {course.code}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-800 dark:group-hover:text-teal-300 transition">
                            {course.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          ผู้สอน: {course.instructorName} | เบิกแล้ว {course.requisitionCount} ครั้ง
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          ฿{course.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          จากงบ ฿{course.allocatedBudget.toLocaleString('th-TH')} บาท ({course.percentBudget}%)
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          percent > 85 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Material Outflows */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              การเคลื่อนไหวสต็อกล่าสุด (Recent Stock Transactions)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.recentTransactions?.map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        tx.type === 'IN'
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {tx.type === 'IN' ? '+รับ' : '-เบิก'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx.item?.name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {tx.note || tx.referenceNumber} | โดย {tx.createdBy?.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.item?.unit}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ฿{Math.abs(tx.totalCost).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Alerts & Actions */}
        <div className="space-y-6">
          {/* Low Stock Warning Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                แจ้งเตือนของใกล้หมด ({data?.lowStockItems?.length || 0})
              </h4>
              <Link href="/inventory" className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline">
                ดูทั้งหมด
              </Link>
            </div>

            {data?.lowStockItems?.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-75" />
                สต็อกวัสดุทุกรายการอยู่ในเกณฑ์ปกติ
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.lowStockItems?.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        รหัส: {item.code} | จุดสั่งซื้อซ้ำ: {item.minStockAlert} {item.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-rose-500 text-white font-bold text-xs rounded-lg shadow-sm">
                        เหลือ {item.currentStock} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring Soon Lots Warning Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                เวชภัณฑ์ใกล้หมดอายุ ({data?.expiringLots?.length || 0})
              </h4>
            </div>

            {data?.expiringLots?.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                ไม่มีเวชภัณฑ์หมดอายุภายใน 90 วัน
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.expiringLots?.slice(0, 4).map((lot: any) => (
                  <div
                    key={lot.id}
                    className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{lot.item?.name}</div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        Lot: {lot.lotNumber} | หมดอายุ:{' '}
                        {new Date(lot.expiryDate).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      {lot.quantityRemaining} {lot.item?.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Navigation Cards */}
          <div className="bg-gradient-to-br from-slate-900 to-teal-950 p-5 rounded-2xl text-white shadow-lg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
              ศูนย์งานห้องปฏิบัติการ
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              รองรับการยืม-คืนอุปกรณ์จำลองเสมือนจริง การตัดสต็อกอัตโนมัติ และสรุปต้นทุนสำหรับทำรายงานประจำภาคการศึกษา
            </p>
            <div className="pt-2">
              <Link
                href="/approvals"
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>ตรวจสอบคำขอที่รออนุมัติ</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
