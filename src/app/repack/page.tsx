'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  PackageCheck,
  Plus,
  Search,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scissors,
  Flame,
  Tag,
  X,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Boxes,
  QrCode,
  Info
} from 'lucide-react';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function RepackPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const isStaff = isOfficer || isAdmin;

  const [records, setRecords] = useState<any[]>([]);
  const [consumableItems, setConsumableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Repack Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    sourceItemId: '',
    sourceLotId: '',
    sourceQtyUsed: 1,
    subLotNumber: '',
    unitsPerPack: 10,
    totalPacksProduced: 10,
    packedDate: new Date().toISOString().split('T')[0],
    sterileExpiryDate: '',
    sterilizeMethod: 'Autoclave ไอน้ำแรงดันสูง (121°C)',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Print Label Modal
  const [selectedRecordForLabel, setSelectedRecordForLabel] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repack');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setConsumableItems(data.consumableItems || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selected Source Item & Lot object
  const selectedSourceItem = consumableItems.find((i) => i.id === form.sourceItemId);
  const selectedSourceLot = selectedSourceItem?.stockLots?.find((l: any) => l.id === form.sourceLotId);

  // When source item changes, select first lot and suggest sublot
  const handleSourceItemChange = (itemId: string) => {
    const item = consumableItems.find((i) => i.id === itemId);
    const firstLot = item?.stockLots?.[0];
    const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const suggestedSubLot = 'SL-' + (item?.code || 'MED') + '-' + todayStr + '-01';

    // Default sterile expiry: 3 months from now
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const defaultSterileExpiry = threeMonths.toISOString().split('T')[0];

    setForm((prev) => ({
      ...prev,
      sourceItemId: itemId,
      sourceLotId: firstLot?.id || '',
      sourceQtyUsed: 1,
      unitsPerPack: item?.conversionRatio ? Math.round(item.conversionRatio / 10) || 10 : 10,
      totalPacksProduced: item?.conversionRatio ? Math.round(item.conversionRatio / 10) || 10 : 10,
      subLotNumber: suggestedSubLot,
      sterileExpiryDate: defaultSterileExpiry,
    }));
  };

  // Auto calculate total packs produced
  const handleCalcPacks = (qtyUsed: number, unitsPerPack: number) => {
    if (!selectedSourceItem) return;
    const ratio = selectedSourceItem.conversionRatio || 100;
    const totalUnits = qtyUsed * ratio;
    const produced = unitsPerPack > 0 ? Math.floor(totalUnits / unitsPerPack) : 1;
    setForm((prev) => ({
      ...prev,
      sourceQtyUsed: qtyUsed,
      unitsPerPack,
      totalPacksProduced: produced > 0 ? produced : 1,
    }));
  };

  const handleSubmitRepack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !form.sourceItemId || !form.sourceLotId) {
      alert('กรุณาเลือกรายการเวชภัณฑ์และล็อตที่นำมาแบ่งแพ็ค');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/repack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          operatorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('บันทึกการแบ่งบรรจุย่อยสำเร็จ! ล็อตย่อย: ' + data.record?.subLotNumber);
        setShowModal(false)
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const term = searchQuery.toLowerCase();
    return (
      r.recordNumber.toLowerCase().includes(term) ||
      r.subLotNumber.toLowerCase().includes(term) ||
      r.sourceItem?.name.toLowerCase().includes(term) ||
      r.sourceLot?.lotNumber.toLowerCase().includes(term) ||
      r.operator?.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-teal-600" />
            งานแบ่งบรรจุเวชภัณฑ์ & สเตอร์ไรด์ (Repacking & Sterilization)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            จัดการเบิกเวชภัณฑ์ห่อใหญ่มาแบ่งเป็นซองย่อย กำหนด Sub-lot อบฆ่าเชื้อ และพิมพ์สติกเกอร์ฉลากซอง
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isStaff && (
            <button
              onClick={() => {
                if (consumableItems.length > 0) {
                  handleSourceItemChange(consumableItems[0].id);
                }
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              <span>บันทึกการแบ่งบรรจุใหม่ (+ Repack)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>บันทึกการแบ่งบรรจุทั้งหมด</span>
            <PackageCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {records.length}{' '}
            <span className="text-xs font-normal text-slate-500">รอบ</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>ซองย่อยที่ผลิตได้รวม</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {records.reduce((sum, r) => sum + (r.totalPacksProduced || 0), 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">ซองย่อย</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>เวชภัณฑ์ที่พร้อมนำมาแพ็ค</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-700 mt-1">
            {consumableItems.length}{' '}
            <span className="text-xs font-normal text-slate-500">รายการ</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>มาตรฐานการสเตอร์ไรด์</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            Autoclave 121°C / ETO
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">ปราศจากเชื้อตามมาตรฐาน CSSD</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4 print:hidden">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่บันทึก, รหัส Sub-lot, ชื่อเวชภัณฑ์, ล็อตเดิม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Repack History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-slate-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">รหัสบันทึก / วันที่แพ็ค</th>
                <th className="py-3 px-4">เวชภัณฑ์ต้นทาง</th>
                <th className="py-3 px-4">ล็อตโรงงานเดิม (Source Lot)</th>
                <th className="py-3 px-4">รหัส Sub-lot ใหม่ของแล็บ</th>
                <th className="py-3 px-4 text-center">ขนาดบรรจุ</th>
                <th className="py-3 px-4 text-center">จำนวนที่ได้</th>
                <th className="py-3 px-4">วันหมดอายุสเตอร์ไรด์</th>
                <th className="py-3 px-4">ผู้บันทึก / วิธีการ</th>
                <th className="py-3 px-4 text-right print:hidden">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableLoadingRow colSpan={9} message="กำลังโหลดประวัติการแบ่งบรรจุเวชภัณฑ์..." />
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>ยังไม่มีประวัติการแบ่งบรรจุเวชภัณฑ์ในระบบ</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold font-mono text-slate-900 text-xs">{r.recordNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(r.packedDate).toLocaleDateString('th-TH')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{r.sourceItem?.name}</div>
                      <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-semibold">
                        {r.sourceItem?.code}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {r.sourceLot?.lotNumber}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        เบิกใช้: {r.sourceQtyUsed} {r.sourceItem?.unit}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {r.subLotNumber}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                      {r.unitsPerPack} {r.sourceItem?.usageUnit || 'ชิ้น'}/ซอง
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-slate-900 text-sm">
                        {r.totalPacksProduced}
                      </span>{' '}
                      <span className="text-slate-400 text-xs">ซอง</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {r.sterileExpiryDate ? (
                        <div className="font-semibold text-emerald-700 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>{new Date(r.sterileExpiryDate).toLocaleDateString('th-TH')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">ตามวันหมดอายุเดิม</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-800 font-medium">{r.operator?.name}</div>
                      <div className="text-[10px] text-slate-400">{r.sterilizeMethod}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right print:hidden">
                      <button
                        onClick={() => setSelectedRecordForLabel(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 font-bold transition text-[11px] cursor-pointer"
                        title="พิมพ์สติกเกอร์ฉลากซองสเตอร์ไรด์"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์ฉลาก</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NEW REPACK FORM */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    บันทึกการแบ่งบรรจุเวชภัณฑ์ย่อย (Sub-packaging & Sterilization)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เบิกจากห่อใหญ่/ถุงใหญ่ ตัดสต็อกเดิม และสร้าง Sub-lot ปราศจากเชื้อใหม่
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRepack} className="space-y-4 flex-1">
              {/* Step 1: Select Source Item & Lot */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  เลือกเวชภัณฑ์ต้นทางและล็อตโรงงานเดิม
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รายการเวชภัณฑ์ *
                    </label>
                    <select
                      value={form.sourceItemId}
                      onChange={(e) => handleSourceItemChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">-- เลือกเวชภัณฑ์ที่มีในสต็อก --</option>
                      {consumableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.code}) - หน่วย: {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลือกล็อตเดิมของโรงงาน *
                    </label>
                    <select
                      value={form.sourceLotId}
                      onChange={(e) => setForm({ ...form, sourceLotId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      required
                      disabled={!selectedSourceItem}
                    >
                      {selectedSourceItem?.stockLots?.length ? (
                        selectedSourceItem.stockLots.map((lot: any) => (
                          <option key={lot.id} value={lot.id}>
                            Lot: {lot.lotNumber} (คงเหลือ: {lot.quantityRemaining} {selectedSourceItem.unit})
                          </option>
                        ))
                      ) : (
                        <option value="">ไม่มีสต็อกคงเหลือในล็อต</option>
                      )}
                    </select>
                  </div>
                </div>

                {selectedSourceItem && (
                  <div className="text-[11px] text-teal-800 bg-teal-50 p-2.5 rounded-xl border border-teal-100 flex items-center justify-between">
                    <span>
                      อัตราแปลงหน่วยที่ตั้งไว้: <b>1 {selectedSourceItem.unit} = {selectedSourceItem.conversionRatio || 100} {selectedSourceItem.usageUnit || 'ชิ้น/กรัม'}</b>
                    </span>
                    <span className="text-slate-500">
                      คงเหลือในล็อตนี้: <b>{selectedSourceLot?.quantityRemaining || 0} {selectedSourceItem.unit}</b>
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Packaging Spec & Calculation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  กำหนดจำนวนที่เบิกและขนาดซองย่อย
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      จำนวนที่เบิกมาแพ็ค ({selectedSourceItem?.unit || 'หน่วยใหญ่'}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedSourceLot?.quantityRemaining || 9999}
                      value={form.sourceQtyUsed}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        handleCalcPacks(val, form.unitsPerPack);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ขนาดต่อ 1 ซองย่อย ({selectedSourceItem?.usageUnit || 'ชิ้น/กรัม'}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.unitsPerPack}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        handleCalcPacks(form.sourceQtyUsed, val);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      จำนวนซองย่อยที่ได้ทั้งหมด (ซอง) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.totalPacksProduced}
                      onChange={(e) =>
                        setForm({ ...form, totalPacksProduced: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-black text-center text-emerald-900"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Sub-lot, Sterilization & Expiry */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                  กำหนดรหัส Sub-lot และการสเตอร์ไรด์
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัส Sub-lot ของแล็บ *
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น SL-GAUZE-260905-01"
                      value={form.subLotNumber}
                      onChange={(e) => setForm({ ...form, subLotNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วิธีการทำให้ปราศจากเชื้อ
                    </label>
                    <select
                      value={form.sterilizeMethod}
                      onChange={(e) => setForm({ ...form, sterilizeMethod: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="Autoclave ไอน้ำแรงดันสูง (121°C)">Autoclave ไอน้ำแรงดันสูง (121°C)</option>
                      <option value="ก๊าซเอทิลีนออกไซด์ (ETO Gas)">ก๊าซเอทิลีนออกไซด์ (ETO Gas)</option>
                      <option value="พลาสมาไฮโดรเจนเปอร์ออกไซด์ (Plasma)">พลาสมาไฮโดรเจนเปอร์ออกไซด์ (Plasma)</option>
                      <option value="บรรจุซองสะอาดพร้อมใช้ (Clean Pack / ไม่ต้องอบ)">บรรจุซองสะอาดพร้อมใช้ (Clean Pack / ไม่ต้องอบ)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วันที่แบ่งบรรจุ / วันที่อบ *
                    </label>
                    <input
                      type="date"
                      value={form.packedDate}
                      onChange={(e) => setForm({ ...form, packedDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วันหมดอายุความปราศจากเชื้อ (Sterile Expiry)
                    </label>
                    <input
                      type="date"
                      value={form.sterileExpiryDate}
                      onChange={(e) => setForm({ ...form, sterileExpiryDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'กำลังบันทึก...' : 'ยืนยันการแบ่งบรรจุ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT SUB-LOT STERILE LABELS */}
      {/* ========================================================================= */}
      {selectedRecordForLabel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  ฉลากติดซองเวชภัณฑ์ปราศจากเชื้อ (Sterile Label)
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecordForLabel(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Sticker Preview Box */}
            <div className="border-2 border-dashed border-teal-500/40 bg-teal-50/30 p-5 rounded-2xl space-y-2 text-slate-900">
              <div className="border-b border-slate-300 pb-2 text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  คณะพยาบาลศาสตร์ - หน่วยจ่ายกลางและแล็บฝึกปฏิบัติการ
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {selectedRecordForLabel.sourceItem?.name}
                </div>
                <div className="text-xs font-bold text-teal-800">
                  บรรจุซองละ {selectedRecordForLabel.unitsPerPack} {selectedRecordForLabel.sourceItem?.usageUnit || 'ชิ้น'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-1.5 font-medium">
                <div>
                  <span className="text-slate-500 text-[10px] block">รหัส Sub-lot:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRecordForLabel.subLotNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">อ้างอิง Lot เดิม:</span>
                  <span className="font-mono text-slate-700">{selectedRecordForLabel.sourceLot?.lotNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">วันที่แพ็ค/อบ:</span>
                  <span>{new Date(selectedRecordForLabel.packedDate).toLocaleDateString('th-TH')}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">วันหมดอายุสเตอร์ไรด์:</span>
                  <span className="font-bold text-rose-600">
                    {selectedRecordForLabel.sterileExpiryDate
                      ? new Date(selectedRecordForLabel.sterileExpiryDate).toLocaleDateString('th-TH')
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                <span>วิธี: {selectedRecordForLabel.sterilizeMethod}</span>
                <span>ผู้เตรียม: {selectedRecordForLabel.operator?.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 print:hidden">
              <button
                onClick={() => setSelectedRecordForLabel(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                ปิด
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์สติกเกอร์ฉลากซอง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}