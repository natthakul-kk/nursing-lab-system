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
  DollarSign,
  Package,
  Layers,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function ReportsPage() {
  const { currentUser, isOfficer, isApprover, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'CONSUMABLES' | 'EQUIPMENT'>('CONSUMABLES');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any | null>(null);

  // Filters for Consumables
  const [consumableFilter, setConsumableFilter] = useState<'ALL' | 'LOW_STOCK' | 'EXPIRING'>('ALL');
  const [consumableSearch, setConsumableSearch] = useState('');

  // Filters for Equipment
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<string>('ALL');
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อระบบรายงานได้');
    } finally {
      setLoading(false);
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
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            รายงานสรุปพัสดุและสถานะครุภัณฑ์ห้องปฏิบัติการพยาบาล
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            รายงานวิเคราะห์ยอดคงเหลือ ตรวจสอบวันหมดอายุ สถานะครุภัณฑ์รายชิ้น และส่งออกข้อมูลเป็น Excel (.xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchReports}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
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
      <div className="flex border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab('CONSUMABLES')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'CONSUMABLES'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>รายงานวัสดุสิ้นเปลืองคงคลัง (Consumables Stock)</span>
        </button>

        <button
          onClick={() => setActiveTab('EQUIPMENT')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'EQUIPMENT'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>รายงานสถานะครุภัณฑ์และวัสดุคงทน (Equipment Assets)</span>
        </button>
      </div>

      {/* TAB 1: CONSUMABLES */}
      {activeTab === 'CONSUMABLES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 print:grid-cols-5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                <span>รายการพัสดุ</span>
                <Boxes className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {reportData?.consumables?.totalItems || 0}{' '}
                <span className="text-xs font-normal text-slate-500">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                <span>ยอดสต็อกรวมทั้งหมด</span>
                <Layers className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-xl font-black text-teal-700 mt-1">
                {reportData?.consumables?.totalStock?.toLocaleString() || 0}{' '}
                <span className="text-xs font-normal text-slate-500">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                <span>มูลค่าสต็อกรวม</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1">
                ฿{reportData?.consumables?.totalValuation?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-rose-600 flex items-center justify-between">
                <span>ต่ำกว่าเกณฑ์แจ้งเตือน</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 mt-1">
                {reportData?.consumables?.lowStockCount || 0}{' '}
                <span className="text-xs font-normal text-rose-500">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-amber-600 flex items-center justify-between">
                <span>ล็อตใกล้หมดอายุ (&lt;90 วัน)</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {reportData?.consumables?.expiringSoonCount || 0}{' '}
                <span className="text-xs font-normal text-amber-500">ล็อต</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5 print:hidden">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setConsumableFilter('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  consumableFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({reportData?.consumables?.rows?.length || 0})
              </button>
              <button
                onClick={() => setConsumableFilter('LOW_STOCK')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  consumableFilter === 'LOW_STOCK'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-500 hover:text-rose-600'
                }`}
              >
                ต่ำกว่าเกณฑ์ ({reportData?.consumables?.lowStockCount || 0})
              </button>
              <button
                onClick={() => setConsumableFilter('EXPIRING')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  consumableFilter === 'EXPIRING'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-slate-500 hover:text-amber-600'
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
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider print:bg-slate-100">
                  <tr>
                    <th className="py-3 px-4">รหัส / รายการวัสดุสิ้นเปลือง</th>
                    <th className="py-3 px-4">หมวดหมู่ / สถานที่เก็บ</th>
                    <th className="py-3 px-4 text-center">ยอดคงเหลือ</th>
                    <th className="py-3 px-4 text-center">เกณฑ์เตือน</th>
                    <th className="py-3 px-4 text-right">มูลค่ารวม</th>
                    <th className="py-3 px-4">รายละเอียดล็อต & วันหมดอายุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <TableLoadingRow colSpan={6} message="กำลังรวบรวมและวิเคราะห์ข้อมูลสต็อกวัสดุ..." />
                  ) : filteredConsumables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        ไม่พบรายการวัสดุที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredConsumables.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                          <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-semibold">
                            {item.code}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium text-xs">{item.category}</div>
                          <div className="text-[11px] text-slate-400">{item.location}</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black text-sm ${
                              item.isLowStock ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {item.currentStock.toLocaleString()}
                          </span>{' '}
                          <span className="text-slate-400 text-xs">{item.unit}</span>
                          {item.isLowStock && (
                            <div className="text-[10px] text-rose-600 font-bold">สต็อกต่ำกว่าเกณฑ์</div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {item.minStockAlert} {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          ฿{item.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4">
                          {item.lots && item.lots.length > 0 ? (
                            <div className="space-y-1">
                              {item.lots.map((lot: any) => (
                                <div
                                  key={lot.id}
                                  className="flex items-center gap-2 text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-100"
                                >
                                  <span className="font-mono font-bold text-slate-700">{lot.lotNumber}</span>
                                  <span className="text-slate-400">|</span>
                                  <span>เหลือ {lot.quantityRemaining} {item.unit}</span>
                                  <span className="text-slate-400">|</span>
                                  {lot.expiryDate ? (
                                    <span
                                      className={`font-semibold ${
                                        lot.isExpired
                                          ? 'text-rose-600 font-bold'
                                          : lot.isExpiringSoon
                                          ? 'text-amber-600 font-bold'
                                          : 'text-slate-600'
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
                            <span className="text-slate-400 text-[11px] italic">ไม่มีล็อตคงเหลือในสต็อก</span>
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                <span>ครุภัณฑ์ทั้งหมด</span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {reportData?.equipment?.totalAssets || 0}{' '}
                <span className="text-xs font-normal text-slate-500">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                <span>มูลค่ารวมประเมิน</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1">
                ฿{reportData?.equipment?.totalValuation?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-emerald-600 flex items-center justify-between">
                <span>พร้อมใช้งาน</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {reportData?.equipment?.availableCount || 0}{' '}
                <span className="text-xs font-normal text-emerald-500">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-blue-600 flex items-center justify-between">
                <span>กำลังถูกยืมอยู่</span>
                <RefreshCw className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-blue-600 mt-1">
                {reportData?.equipment?.borrowedCount || 0}{' '}
                <span className="text-xs font-normal text-blue-500">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-amber-600 flex items-center justify-between">
                <span>ส่งซ่อมบำรุง</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {reportData?.equipment?.maintenanceCount || 0}{' '}
                <span className="text-xs font-normal text-amber-500">ชิ้น</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:border-slate-300">
              <div className="text-[11px] font-semibold text-rose-600 flex items-center justify-between">
                <span>จำหน่ายออก/ตัดจำหน่าย</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 mt-1">
                {reportData?.equipment?.retiredCount || 0}{' '}
                <span className="text-xs font-normal text-rose-500">ชิ้น</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5 print:hidden">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setEquipmentStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({reportData?.equipment?.rows?.length || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('AVAILABLE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'AVAILABLE'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                พร้อมใช้ ({reportData?.equipment?.availableCount || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('BORROWED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'BORROWED'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-blue-700'
                }`}
              >
                ถูกยืม ({reportData?.equipment?.borrowedCount || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('MAINTENANCE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'MAINTENANCE'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                ซ่อมบำรุง ({reportData?.equipment?.maintenanceCount || 0})
              </button>
              <button
                onClick={() => setEquipmentStatusFilter('RETIRED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  equipmentStatusFilter === 'RETIRED'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-500 hover:text-rose-700'
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
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider print:bg-slate-100">
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
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <TableLoadingRow colSpan={7} message="กำลังรวบรวมสถานะครุภัณฑ์คงทน..." />
                  ) : filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((asset: any) => {
                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> พร้อมใช้
                        </span>
                      );

                      if (asset.status === 'BORROWED') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            <RefreshCw className="w-3 h-3" /> กำลังถูกยืม
                          </span>
                        );
                      } else if (asset.status === 'MAINTENANCE') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Wrench className="w-3 h-3" /> ส่งซ่อมบำรุง
                          </span>
                        );
                      } else if (asset.status === 'RETIRED') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            จำหน่ายออก
                          </span>
                        );
                      }

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {asset.assetCode || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {asset.govAssetCode || '-'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">{asset.itemName}</div>
                            <div className="text-[11px] text-slate-400">{asset.category}</div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {asset.location}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {statusBadge}
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-slate-800">
                            {asset.cost ? ('฿' + Number(asset.cost).toLocaleString()) : '-'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {asset.maintenanceCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                                เคยซ่อม {asset.maintenanceCount} ครั้ง
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">ไม่เคยซ่อม</span>
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
    </div>
  );
}