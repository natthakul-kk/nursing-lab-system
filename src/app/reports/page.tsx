'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  Printer,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  Search,
  Filter,
  Coins,
  Package,
  Layers,
  RefreshCw,
  Database,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function ReportsPage() {
  const { currentUser, isOfficer, isApprover, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'CONSUMABLES' | 'EQUIPMENT' | 'COST_ANALYTICS'>('CONSUMABLES');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filters for Consumables
  const [consumableFilter, setConsumableFilter] = useState<'ALL' | 'LOW_STOCK' | 'EXPIRING'>('ALL');
  const [consumableSearch, setConsumableSearch] = useState('');

  // Filters for Equipment
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<string>('ALL');
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const fetchReports = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อระบบรายงานได้');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered Consumables
  const filteredConsumables = React.useMemo(() => {
    if (!reportData?.consumables?.rows) return [];
    return reportData.consumables.rows.filter((row: any) => {
      const matchesSearch =
        row.name.toLowerCase().includes(consumableSearch.toLowerCase()) ||
        row.code.toLowerCase().includes(consumableSearch.toLowerCase()) ||
        row.category.toLowerCase().includes(consumableSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (consumableFilter === 'LOW_STOCK') {
        return row.isLowStock;
      }
      if (consumableFilter === 'EXPIRING') {
        return row.lots && row.lots.some((l: any) => l.isExpiringSoon || l.isExpired);
      }
      return true;
    });
  }, [reportData, consumableSearch, consumableFilter]);

  // Filtered Equipment
  const filteredEquipment = React.useMemo(() => {
    if (!reportData?.equipment?.rows) return [];
    return reportData.equipment.rows.filter((row: any) => {
      const matchesSearch =
        row.itemName.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        row.itemCode.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        (row.assetCode && row.assetCode.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        (row.govAssetCode && row.govAssetCode.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        row.category.toLowerCase().includes(equipmentSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (equipmentStatusFilter !== 'ALL') {
        return row.status === equipmentStatusFilter;
      }
      return true;
    });
  }, [reportData, equipmentSearch, equipmentStatusFilter]);

  // Export Consumables to Excel
  const handleExportConsumables = () => {
    if (!filteredConsumables.length) return;

    const exportRows: any[] = [];
    filteredConsumables.forEach((row: any) => {
      if (row.lots && row.lots.length > 0) {
        row.lots.forEach((lot: any) => {
          exportRows.push({
            'รหัสพัสดุ': row.code,
            'ชื่อวัสดุสิ้นเปลือง': row.name,
            'หมวดหมู่': row.category,
            'หน่วยนับ': row.unit,
            'สถานที่จัดเก็บ': row.location,
            'ยอดคงเหลือรวม': row.currentStock,
            'เกณฑ์แจ้งเตือนขั้นต่ำ': row.minStockAlert,
            'สถานะสต็อก': row.isLowStock ? 'ต่ำกว่าเกณฑ์' : 'ปกติ',
            'หมายเลขล็อต (Lot)': lot.lotNumber,
            'ยอดคงเหลือในล็อต': lot.quantityRemaining,
            'ราคาต่อหน่วย (บาท)': lot.unitCost,
            'มูลค่าในล็อต (บาท)': lot.quantityRemaining * lot.unitCost,
            'วันหมดอายุ': lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ',
            'สถานะวันหมดอายุ': lot.isExpired ? 'หมดอายุแล้ว' : lot.isExpiringSoon ? 'ใกล้หมดอายุ (<90 วัน)' : 'ปกติ',
          });
        });
      } else {
        exportRows.push({
          'รหัสพัสดุ': row.code,
          'ชื่อวัสดุสิ้นเปลือง': row.name,
          'หมวดหมู่': row.category,
          'หน่วยนับ': row.unit,
          'สถานที่จัดเก็บ': row.location,
          'ยอดคงเหลือรวม': row.currentStock,
          'เกณฑ์แจ้งเตือนขั้นต่ำ': row.minStockAlert,
          'สถานะสต็อก': row.isLowStock ? 'ต่ำกว่าเกณฑ์' : 'ปกติ',
          'หมายเลขล็อต (Lot)': '-',
          'ยอดคงเหลือในล็อต': 0,
          'ราคาต่อหน่วย (บาท)': 0,
          'มูลค่าในล็อต (บาท)': 0,
          'วันหมดอายุ': '-',
          'สถานะวันหมดอายุ': 'ไม่มีสต็อก',
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายงานวัสดุสิ้นเปลืองคงคลัง');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, 'รายงานวัสดุคงเหลือ_' + dateStr + '.xlsx');
  };

  // Export Equipment to Excel
  const handleExportEquipment = () => {
    if (!filteredEquipment.length) return;

    const exportRows = filteredEquipment.map((row: any) => {
      let statusTh = 'พร้อมใช้งาน';
      if (row.status === 'BORROWED') statusTh = 'กำลังถูกยืม';
      else if (row.status === 'MAINTENANCE') statusTh = 'ส่งซ่อมบำรุง';
      else if (row.status === 'RETIRED') statusTh = 'จำหน่ายออก/แทงจำหน่าย';

      return {
        'รหัสแล็บ (ชิ้น)': row.assetCode || '-',
        'เลขครุภัณฑ์ราชการ': row.govAssetCode || '-',
        'ชื่อครุภัณฑ์/อุปกรณ์': row.itemName,
        'รหัสรุ่น/พัสดุ': row.itemCode,
        'หมวดหมู่': row.category,
        'สถานที่จัดเก็บ': row.location,
        'สถานะปัจจุบัน': statusTh,
        'สภาพอุปกรณ์': row.condition || 'ปกติ',
        'มูลค่าต่อชิ้น (บาท)': row.cost || 0,
        'จำนวนครั้งที่ส่งซ่อม': row.maintenanceCount || 0,
        'วันที่รับเข้า': row.receivedDate ? new Date(row.receivedDate).toLocaleDateString('th-TH') : '-',
        'วันที่ส่งซ่อมล่าสุด': row.lastMaintenanceDate ? new Date(row.lastMaintenanceDate).toLocaleDateString('th-TH') : '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายงานสถานะครุภัณฑ์');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, 'รายงานสถานะครุภัณฑ์_' + dateStr + '.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            รายงานสรุปพัสดุและสถานะครุภัณฑ์ห้องปฏิบัติการพยาบาล
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            รายงานวิเคราะห์ยอดคงเหลือ ตรวจสอบวันหมดอายุ สถานะครุภัณฑ์รายชิ้น และส่งออกข้อมูลเป็น Excel (.xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {lastUpdated && (
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              อัปเดตล่าสุด: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => fetchReports(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-60"
            title="รีเฟรชข้อมูลรายงานทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>

          <a
            href="/api/backup"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            title="สำรองข้อมูลฐานข้อมูลทั้งระบบเป็นไฟล์ JSON snapshot แบบคลิกเดียว"
          >
            <Database className="w-4 h-4 text-indigo-200" />
            <span>สำรองฐานข้อมูล (Backup)</span>
          </a>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>พิมพ์รายงาน (Print / PDF)</span>
          </button>

          {activeTab === 'CONSUMABLES' ? (
            <button
              onClick={handleExportConsumables}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel วัสดุสิ้นเปลือง</span>
            </button>
          ) : (
            <button
              onClick={handleExportEquipment}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel ครุภัณฑ์คงทน</span>
            </button>
          )}
        </div>
      </div>

      {/* Print Title (Only visible when printing) */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <h1 className="text-lg font-bold text-slate-900">
          คณะพยาบาลศาสตร์ - รายงานสรุปพัสดุและสถานะครุภัณฑ์ห้องปฏิบัติการ
        </h1>
        <div className="text-xs text-slate-600 flex justify-between mt-1">
          <span>
            ประเภท: {activeTab === 'CONSUMABLES' ? 'รายงานวัสดุสิ้นเปลืองคงคลัง' : 'รายงานสถานะครุภัณฑ์และวัสดุคงทน'}
          </span>
          <span>วันที่พิมพ์รายงาน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 print:hidden">
        <button
          onClick={() => setActiveTab('CONSUMABLES')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'CONSUMABLES'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>รายงานวัสดุสิ้นเปลืองคงคลัง (Consumables Stock)</span>
        </button>

        <button
          onClick={() => setActiveTab('EQUIPMENT')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'EQUIPMENT'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>รายงานสถานะครุภัณฑ์และวัสดุคงทน (Equipment Assets)</span>
        </button>

        <button
          onClick={() => setActiveTab('COST_ANALYTICS')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'COST_ANALYTICS'
              ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>วิเคราะห์ต้นทุนต่อหัวและหัตถการ (Cost Analytics)</span>
        </button>
      </div>

      {/* TAB 1: CONSUMABLES */}
      {activeTab === 'CONSUMABLES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 print:grid-cols-5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>รายการพัสดุ</span>
                <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {reportData?.consumables?.totalItems || 0}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>ยอดสต็อกรวมทั้งหมด</span>
                <Layers className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-xl font-black text-teal-700 dark:text-teal-400 mt-1">
                {reportData?.consumables?.totalStock?.toLocaleString() || 0}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>มูลค่าสต็อกรวม</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                ฿{reportData?.consumables?.totalValuation?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} บาท
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                <span>ต่ำกว่าเกณฑ์แจ้งเตือน</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {reportData?.consumables?.lowStockCount || 0}{' '}
                <span className="text-xs font-normal text-rose-500 dark:text-rose-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>ล็อตใกล้หมดอายุ (&lt;90 วัน)</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {reportData?.consumables?.expiringSoonCount || 0}{' '}
                <span className="text-xs font-normal text-amber-500 dark:text-amber-400">ล็อต</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5 print:hidden">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setConsumableFilter('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  consumableFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                ทั้งหมด ({reportData?.consumables?.rows?.length || 0})
              </button>
              <button
                onClick={() => setConsumableFilter('LOW_STOCK')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  consumableFilter === 'LOW_STOCK'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                ต่ำกว่าเกณฑ์ ({reportData?.consumables?.lowStockCount || 0})
              </button>
              <button
                onClick={() => setConsumableFilter('EXPIRING')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  consumableFilter === 'EXPIRING'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                ใกล้หมดอายุ ({reportData?.consumables?.expiringSoonCount || 0})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อวัสดุ, รหัสพัสดุ, หมวดหมู่..."
                value={consumableSearch}
                onChange={(e) => setConsumableSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden print:border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider print:bg-slate-100">
                  <tr>
                    <th className="py-3 px-4">รหัส / รายการวัสดุสิ้นเปลือง</th>
                    <th className="py-3 px-4">หมวดหมู่ / สถานที่เก็บ</th>
                    <th className="py-3 px-4 text-center">ยอดคงเหลือ</th>
                    <th className="py-3 px-4 text-center">เกณฑ์เตือน</th>
                    <th className="py-3 px-4 text-right">มูลค่ารวม</th>
                    <th className="py-3 px-4">รายละเอียดล็อต & วันหมดอายุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <TableLoadingRow colSpan={6} message="กำลังรวบรวมและวิเคราะห์ข้อมูลสต็อกวัสดุ..." />
                  ) : filteredConsumables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        ไม่พบรายการวัสดุที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredConsumables.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{item.name}</div>
                          <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-1.5 py-0.5 rounded font-semibold">
                            {item.code}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-800 dark:text-slate-200 font-medium text-xs">{item.category}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{item.location}</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black text-sm ${
                              item.isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.currentStock.toLocaleString()}
                          </span>{' '}
                          <span className="text-slate-400 dark:text-slate-500 text-xs">{item.unit}</span>
                          {item.isLowStock && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">สต็อกต่ำกว่าเกณฑ์</div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-slate-500 dark:text-slate-400">
                          {item.minStockAlert} {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                          ฿{item.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </td>

                        <td className="py-3 px-4">
                          {item.lots && item.lots.length > 0 ? (
                            <div className="space-y-1">
                              {item.lots.map((lot: any) => (
                                <div
                                  key={lot.id}
                                  className="flex items-center gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/80"
                                >
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lot.lotNumber}</span>
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-600 dark:text-slate-300">เหลือ {lot.quantityRemaining} {item.unit}</span>
                                  <span className="text-slate-400">|</span>
                                  {lot.expiryDate ? (
                                    <span
                                      className={`font-semibold ${
                                        lot.isExpired
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : lot.isExpiringSoon
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-slate-500 dark:text-slate-400'
                                      }`}
                                    >
                                      หมดอายุ: {new Date(lot.expiryDate).toLocaleDateString('th-TH')}
                                      {lot.isExpired && ' (หมดอายุแล้ว)'}
                                      {lot.isExpiringSoon && !lot.isExpired && ' (ใกล้หมดอายุ)'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">ไม่ระบุวันหมดอายุ</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EQUIPMENT */}
      {activeTab === 'EQUIPMENT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 print:grid-cols-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>ครุภัณฑ์ทั้งหมด</span>
                <Package className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {reportData?.equipment?.totalAssets || 0}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>มูลค่ารวมประเมิน</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                ฿{reportData?.equipment?.totalValuation?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} บาท
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>พร้อมใช้งาน</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {reportData?.equipment?.availableCount || 0}{' '}
                <span className="text-xs font-normal text-emerald-500 dark:text-emerald-400">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>กำลังถูกยืมอยู่</span>
                <RefreshCw className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {reportData?.equipment?.borrowedCount || 0}{' '}
                <span className="text-xs font-normal text-blue-500 dark:text-blue-400">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>ส่งซ่อมบำรุง</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {reportData?.equipment?.maintenanceCount || 0}{' '}
                <span className="text-xs font-normal text-amber-500 dark:text-amber-400">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                <span>จำหน่ายออก/ตัดจำหน่าย</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {reportData?.equipment?.retiredCount || 0}{' '}
                <span className="text-xs font-normal text-rose-500 dark:text-rose-400">ชิ้น</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5 print:hidden">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setEquipmentStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                ทั้งหมด ({reportData?.equipment?.rows?.length || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('AVAILABLE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'AVAILABLE'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400'
                }`}
              >
                พร้อมใช้ ({reportData?.equipment?.availableCount || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('BORROWED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'BORROWED'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400'
                }`}
              >
                ถูกยืม ({reportData?.equipment?.borrowedCount || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('MAINTENANCE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'MAINTENANCE'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400'
                }`}
              >
                ซ่อมบำรุง ({reportData?.equipment?.maintenanceCount || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('RETIRED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'RETIRED'
                    ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400'
                }`}
              >
                จำหน่ายออก ({reportData?.equipment?.retiredCount || 0})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัสแล็บ, เลขครุภัณฑ์, ชื่ออุปกรณ์..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden print:border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider print:bg-slate-100">
                  <tr>
                    <th className="py-3 px-4">รหัสประจำชิ้น (Lab Code)</th>
                    <th className="py-3 px-4">เลขครุภัณฑ์ราชการ</th>
                    <th className="py-3 px-4">ชื่ออุปกรณ์ / หมวดหมู่</th>
                    <th className="py-3 px-4">สถานที่จัดเก็บ</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-right">ราคาต่อชิ้น</th>
                    <th className="py-3 px-4 text-center">ประวัติการซ่อม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <TableLoadingRow colSpan={7} message="กำลังรวบรวมสถานะครุภัณฑ์คงทน..." />
                  ) : filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((asset: any) => {
                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" /> พร้อมใช้
                        </span>
                      );

                      if (asset.status === 'BORROWED') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                            <RefreshCw className="w-3 h-3" /> กำลังถูกยืม
                          </span>
                        );
                      } else if (asset.status === 'MAINTENANCE') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                            <Wrench className="w-3 h-3" /> ส่งซ่อมบำรุง
                          </span>
                        );
                      } else if (asset.status === 'RETIRED') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                            จำหน่ายออก
                          </span>
                        );
                      }

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded">
                              {asset.assetCode || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {asset.govAssetCode || '-'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{asset.itemName}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">{asset.category}</div>
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {asset.location}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {statusBadge}
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                            {asset.cost ? ('฿' + Number(asset.cost).toLocaleString() + ' บาท') : '-'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {asset.maintenanceCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[10px] font-bold">
                                เคยซ่อม {asset.maintenanceCount} ครั้ง
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[11px]">ไม่เคยซ่อม</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COST ANALYTICS (ต้นทุนต่อหัวนักศึกษาและหัตถการ) */}
      {activeTab === 'COST_ANALYTICS' && (
        <div className="space-y-6">
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">งบประมาณจัดสรรรวม</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
                ฿{(reportData?.costAnalytics?.totalAllocatedBudget || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">บาท</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">งบประมาณประจำปีการศึกษา</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">มูลค่าวัสดุใช้จริงรวม</span>
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-teal-700 dark:text-teal-400 mt-2">
                ฿{(reportData?.costAnalytics?.totalConsumableSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">บาท</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">เบิกจ่ายเวชภัณฑ์ + ชุดฝึกปฏิบัติการ</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">จำนวนรายวิชาฝึกแล็บ</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <GraduationCap className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {reportData?.costAnalytics?.courses?.length || 0} <span className="text-xs font-normal text-slate-500">วิชา</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">รายวิชาที่จัดการเรียนการสอนในแล็บ</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ชุดฝึกทักษะมาตรฐาน</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <Boxes className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-2">
                {reportData?.costAnalytics?.kits?.length || 0} <span className="text-xs font-normal text-slate-500">ชุด</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Practice Kits สำหรับฝึก OSCE / ทักษะ</div>
            </div>
          </div>

          {/* Section 1: Course Cost-per-Student Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>การคำนวณต้นทุนต่อหัวนักศึกษาจำแนกตามรายวิชา (Cost per Student by Course)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  วิเคราะห์ต้นทุนการเบิกจ่ายจริงเฉลี่ยต่อนักศึกษา และสัดส่วนการใช้งบประมาณรายวิชา
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">รหัสวิชา</th>
                    <th className="py-3 px-4">ชื่อรายวิชา</th>
                    <th className="py-3 px-4">อาจารย์ผู้ประสาน</th>
                    <th className="py-3 px-4 text-center">นักศึกษาที่ฝึก</th>
                    <th className="py-3 px-4 text-center">รอบเข้าฝึก</th>
                    <th className="py-3 px-4 text-right">งบที่ได้รับ</th>
                    <th className="py-3 px-4 text-right">ต้นทุนใช้จริง</th>
                    <th className="py-3 px-4 text-right font-black text-indigo-700 dark:text-indigo-400">ต้นทุนต่อหัว (บาท/คน)</th>
                    <th className="py-3 px-4 text-center">สัดส่วนงบประมาณ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {(!reportData?.costAnalytics?.courses || reportData.costAnalytics.courses.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">ไม่พบข้อมูลรายวิชา</td>
                    </tr>
                  ) : (
                    reportData.costAnalytics.courses.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">{c.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{c.instructorName || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                            {c.studentCount} คน
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{c.totalBookings} รอบ</td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {c.allocatedBudget > 0 ? `฿${c.allocatedBudget.toLocaleString()} บาท` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          ฿{c.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </td>
                        <td className="py-3 px-4 text-right font-black text-indigo-700 dark:text-indigo-400 text-sm">
                          ฿{c.costPerStudent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  c.budgetUtilization > 100
                                    ? 'bg-rose-500'
                                    : c.budgetUtilization > 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, c.budgetUtilization)}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              {c.budgetUtilization.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Practice Kit Cost-per-Skill Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-teal-600" />
                  <span>การคำนวณต้นทุนต่อชุดฝึกหัตถการ (Cost per Practice Kit & Skill Analytics)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  แจกแจงรายการวัสดุสิ้นเปลืองในชุด และต้นทุนเฉลี่ยต่อการฝึก 1 รอบหัตถการ
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">รหัสชุด</th>
                    <th className="py-3 px-4">ชื่อชุดฝึกหัตถการ</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4">รายการวัสดุสิ้นเปลืองในชุด</th>
                    <th className="py-3 px-4 text-right font-black text-teal-700 dark:text-teal-400">ต้นทุนต่อชุด (บาท)</th>
                    <th className="py-3 px-4 text-center">ใช้งานแล้ว (รอบ)</th>
                    <th className="py-3 px-4 text-right">ยอดรวมมูลค่าที่ใช้ไป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {(!reportData?.costAnalytics?.kits || reportData.costAnalytics.kits.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ไม่พบชุดฝึกหัตถการ</td>
                    </tr>
                  ) : (
                    reportData.costAnalytics.kits.map((kit: any) => (
                      <tr key={kit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">{kit.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{kit.name}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{kit.category}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {kit.items?.map((it: any, idx: number) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                              >
                                {it.itemName} x{it.quantity} {it.unit} (~฿{it.subtotal.toFixed(0)})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-teal-700 dark:text-teal-400 text-sm">
                          ฿{kit.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px]">
                            {kit.usageCount} ครั้ง
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          ฿{kit.totalCostDispensed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}