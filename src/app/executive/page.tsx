'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Boxes,
  ShieldCheck,
  Building2,
  Wind,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Search,
  Filter,
  Eye,
  ChevronRight,
  RefreshCw,
  Coins,
  Package,
  Layers,
  GraduationCap,
  Calendar,
  X,
  MapPin,
  Tag,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName, getRoleLabel } from '@/lib/user-utils';

export default function ExecutiveDashboardPage() {
  const { currentUser, isExecutive, isAdmin } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Equipment Drill-down search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'DAMAGED'>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Pagination for equipment drill-down table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Month & Year Filter for Executive Analytics
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const THAI_MONTHS = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' },
  ];

  const years = [2024, 2025, 2026, 2027, 2028];

  const fetchStats = async (manual = false, m = selectedMonth, y = selectedYear) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/executive/stats?month=${m}&year=${y}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load executive stats', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(false, selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const kpis = data?.kpis;
  const equipmentList = data?.equipmentList || [];

  // Filtered equipment for drill-down table
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item: any) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.govAssetCode && item.govAssetCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.roomName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'AVAILABLE') return item.status === 'AVAILABLE';
      if (statusFilter === 'BORROWED') return item.status === 'BORROWED';
      if (statusFilter === 'MAINTENANCE') return item.status === 'MAINTENANCE';
      if (statusFilter === 'DAMAGED') return item.condition === 'DAMAGED';

      return true;
    });
  }, [equipmentList, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / (pageSize || 20)));

  const paginatedEquipment = useMemo(() => {
    if (pageSize >= 9999) return filteredEquipment;
    const start = (currentPage - 1) * pageSize;
    return filteredEquipment.slice(start, start + pageSize);
  }, [filteredEquipment, currentPage, pageSize]);

  const formatDateThai = (dateStr?: string | null) => {
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

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังเชื่อมต่อฐานข้อมูลภาพรวมเชิงกลยุทธ์..."
        submessage="รวบรวมดัชนีชี้วัดครุภัณฑ์ พื้นที่ห้องแล็บ และการใช้พลังงานสำหรับผู้บริหาร"
      />
    );
  }

  // Permission Guard
  if (!isExecutive && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          สงวนสิทธิ์เฉพาะผู้บริหารระดับสูง
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          หน้านี้เปิดให้เฉพาะคณบดี รองคณบดี และผู้บริหารคณะพยาบาลศาสตร์ เพื่อกำกับดูแลเชิงนโยบายและงบประมาณ
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md hover:bg-teal-500 transition"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Executive Cockpit Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-teal-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-blue-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Executive Cockpit 360° | คณะพยาบาลศาสตร์
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>แดชบอร์ดผู้บริหาร</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            ภาพรวมความพร้อมของครุภัณฑ์ ความคุ้มค่าการใช้พื้นที่ห้องปฏิบัติการ และประสิทธิภาพการใช้พลังงาน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Month & Year Filter Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/15">
            <Calendar className="w-4 h-4 text-cyan-300 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer [&>option]:text-slate-900"
            >
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-white/40">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer [&>option]:text-slate-900"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 text-right">
            <span className="text-[10px] text-slate-300 block">ผู้เข้าใช้งาน</span>
            <span className="text-xs font-bold text-white">
              {currentUser ? `${formatUserName(currentUser) || currentUser.name} (${getRoleLabel(currentUser.role)})` : 'กำลังโหลด...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 cursor-pointer disabled:opacity-50"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Core Strategic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Asset Valuation & Readiness */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">มูลค่าครุภัณฑ์รวม</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            ฿{((kpis?.totalValuation || 0) / 1000000).toFixed(2)}M
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">อัตราพร้อมใช้งาน</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {kpis?.readinessRate || 100}%
            </span>
          </div>
        </div>

        {/* KPI 2: Asset Health Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">สภาพความพร้อมครุภัณฑ์</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {kpis?.totalAssetsCount || 0} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 font-medium">พร้อมใช้ {kpis?.availableCount || 0}</span>
            <span className="text-amber-600 font-medium">ถูกยืม {kpis?.borrowedCount || 0}</span>
            <span className="text-rose-600 font-bold">ซ่อม {kpis?.maintenanceCount || 0}</span>
          </div>
        </div>

        {/* KPI 3: Energy & AC Monthly Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ชั่วโมงเปิดแอร์ ({THAI_MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear + 543})
            </span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-800 dark:text-cyan-300 mt-2">
            {kpis?.totalAcHoursMonth || 0} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">เพื่อรักษาอุปกรณ์</span>
            <span className="font-bold text-cyan-700 dark:text-cyan-400">
              {kpis?.maintenanceAcHours || 0} ชม.
            </span>
          </div>
        </div>

        {/* KPI 4: Student Practice Engagement (นิสิต) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชั่วโมงฝึกของนิสิต</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-2">
            {kpis?.totalPracticeHours || 0} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">ห้องแล็บเปิดใช้งาน</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400">
              {kpis?.totalRoomsCount || 0} ห้อง
            </span>
          </div>
        </div>
      </div>

      {/* AC Hours Breakdown by Room (Visual Chart) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Wind className="w-5 h-5 text-teal-600" />
              <span>
                สถิติชั่วโมงการเปิดเครื่องปรับอากาศแยกตามห้อง ({THAI_MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear + 543})
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงความคุ้มค่าของการใช้พลังงานและการรักษาสภาพแวดล้อมสำหรับอุปกรณ์ทางการแพทย์
            </p>
          </div>
          <Link
            href="/air-conditioning"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 hover:underline"
          >
            ดูตารางบันทึกประจำวัน <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {(() => {
          const roomAcBreakdown = (kpis?.roomAcBreakdown || []).filter((r: any) => Number(r.hours) > 0);
          if (roomAcBreakdown.length === 0) {
            return (
              <div className="p-8 text-center text-slate-400 text-xs">
                ยังไม่มีข้อมูลบันทึกการเปิดแอร์ในเดือน{THAI_MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear + 543} สามารถให้เจ้าหน้าที่เริ่มลงบันทึกในระบบบันทึกเวลาแอร์
              </div>
            );
          }

          const maxHours = Math.max(...roomAcBreakdown.map((b: any) => Number(b.hours) || 1), 1);

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {roomAcBreakdown.map((r: any, idx: number) => {
                const percentage = Math.round(((Number(r.hours) || 0) / maxHours) * 100);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {r.roomName}
                      </span>
                      <span className="font-mono text-sm font-black text-teal-700 dark:text-teal-300">
                        {Number(r.hours).toFixed(1)} ชม.
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Equipment Asset Drill-down Browser (View-Only / No Export / Safe Mode) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Header & Search Filter */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-teal-600" />
                <span>สำรวจรายละเอียดครุภัณฑ์เชิงลึก (Equipment Asset Browser)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่รายการใดก็ได้เพื่อเปิดดูข้อมูลประจำเครื่อง ประวัติ และสถานที่ติดตั้งโดยละเอียด
              </p>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>โหมดสำหรับผู้บริหาร: เรียกดูข้อมูลเชิงลึกได้ทุกชิ้น (Read-Only)</span>
            </div>
          </div>

          {/* Search Input & Status Filter Chips */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัสแล็บ, S/N, ห้อง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              {[
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'AVAILABLE', label: 'พร้อมใช้งาน' },
                { key: 'BORROWED', label: 'กำลังถูกยืม' },
                { key: 'MAINTENANCE', label: 'ส่งซ่อมบำรุง' },
                { key: 'DAMAGED', label: 'พบชำรุด' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drill-Down Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-12 text-center">ลำดับ</th>
                <th className="p-3">รหัสแล็บ</th>
                <th className="p-3">เลขครุภัณฑ์</th>
                <th className="p-3">ชื่อครุภัณฑ์</th>
                <th className="p-3">สถานที่ติดตั้ง / ห้อง</th>
                <th className="p-3 text-right">มูลค่า (บาท)</th>
                <th className="p-3 text-center">สภาพ</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center w-20">ดูข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    ไม่พบรายการครุภัณฑ์ตามเงื่อนไขที่ระบุ
                  </td>
                </tr>
              ) : (
                paginatedEquipment.map((item: any, idx: number) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      พร้อมใช้งาน
                    </span>
                  );
                  if (item.status === 'BORROWED') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        กำลังถูกยืม
                      </span>
                    );
                  } else if (item.status === 'MAINTENANCE') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        ส่งซ่อมบำรุง
                      </span>
                    );
                  }

                  let conditionBadge = (
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      ปกติ
                    </span>
                  );
                  if (item.condition === 'DAMAGED') {
                    conditionBadge = (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        ชำรุด
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedAsset(item)}
                      className="hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition cursor-pointer"
                    >
                      <td className="p-3 text-center text-slate-400 font-mono">{rowNumber}</td>
                      <td className="p-3 font-mono font-bold text-teal-800 dark:text-teal-300">
                        {item.assetCode}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.govAssetCode || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.itemName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                              <Boxes className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.itemName}
                            </div>
                            {item.sequenceNumber && (
                              <div className="text-[10px] text-slate-500">
                                เครื่องที่ {item.sequenceNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                        {item.roomName}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.cost ? `฿${item.cost.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-center">{conditionBadge}</td>
                      <td className="p-3 text-center">{statusBadge}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition"
                          title="ดูรายละเอียดเชิงลึก"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (Matching Inventory System) */}
        {filteredEquipment.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                แสดง {Math.min((currentPage - 1) * pageSize + 1, filteredEquipment.length)} - {Math.min(currentPage * pageSize, filteredEquipment.length)} จาก {filteredEquipment.length} รายการ
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span>แสดงต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={35}>35</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={9999}>ทั้งหมด ({filteredEquipment.length})</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ก่อนหน้า
                </button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-bold transition text-xs cursor-pointer ${
                            currentPage === p
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* EXECUTIVE DRILL-DOWN ASSET DETAIL MODAL              */}
      {/* ---------------------------------------------------- */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white border border-white/20">
                    {selectedAsset.assetCode}
                  </span>
                  <span className="text-[11px] font-semibold text-teal-200">
                    {selectedAsset.categoryName}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  {selectedAsset.itemName}
                </h3>
                <p className="text-[11px] text-teal-200/80">
                  เครื่องที่ {selectedAsset.sequenceNumber || 1} • เลขครุภัณฑ์: {selectedAsset.govAssetCode || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Asset Photo */}
              {selectedAsset.imageUrl ? (
                <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2">
                  <img
                    src={selectedAsset.imageUrl}
                    alt={selectedAsset.itemName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-full py-6 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                  <Boxes className="w-8 h-8 opacity-40" />
                  <span className="text-[11px]">ไม่มีรูปภาพประจำรายการครุภัณฑ์นี้</span>
                </div>
              )}

              {/* Status and Cost Highlights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold block">ราคาจัดซื้อ / มูลค่า</span>
                  <span className="text-lg font-mono font-black text-slate-900 dark:text-white mt-0.5 block">
                    ฿{(selectedAsset.cost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold block">สถานะปัจจุบัน</span>
                  <span className="text-sm font-bold text-teal-700 dark:text-teal-300 mt-1 block">
                    {selectedAsset.status === 'AVAILABLE'
                      ? '✓ พร้อมใช้งาน'
                      : selectedAsset.status === 'BORROWED'
                      ? '⏱ กำลังถูกยืม'
                      : '⚠️ ส่งซ่อมบำรุง'}
                  </span>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  ข้อมูลคุณลักษณะประจำเครื่อง
                </h4>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 mb-2">
                  <span className="text-slate-400 block text-[10px]">เลขครุภัณฑ์ (ทางราชการ):</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                    {selectedAsset.govAssetCode || '-'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block">ยี่ห้อ (Brand):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.brand}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">รุ่น (Model):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">หมายเลขเครื่อง (S/N):</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">วันที่รับเข้า:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateThai(selectedAsset.receivedDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">บริษัทผู้จำหน่าย:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.supplier}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">สิ้นสุดรับประกัน:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateThai(selectedAsset.warrantyExpiry)}</span>
                  </div>
                </div>
              </div>

              {/* Location & Custodian */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-100 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>สถานที่จัดเก็บและการครอบครอง</span>
                </h4>
                <div className="space-y-1 pt-1">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>ห้องประจำ:</strong> {selectedAsset.roomName}
                  </p>
                  <p className="text-slate-500">
                    <strong>หน่วยงานผู้ครอบครอง:</strong> ศูนย์ฝึกทักษะการพยาบาล คณะพยาบาลศาสตร์
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                ข้อมูลตรวจสอบความถูกต้องทางพัสดุราชการ
              </span>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
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
