'use client';

import React, { useState, useEffect } from 'react';
import BoxStickerModal from '@/components/qrcode/BoxStickerModal';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowDownToLine,
  Boxes,
  PlusCircle,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
  Edit3
} from 'lucide-react';

export default function StockInPage() {
  const { currentUser, isOfficer } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CONSUMABLE' | 'EQUIPMENT'>('CONSUMABLE');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCustomCode, setIsCustomCode] = useState(false);

  // Form State
  const [form, setForm] = useState({
    itemId: '',
    lotNumber: '',
    brand: '',
    packSize: '' as any,
    packageUnit: '',
    quantity: '' as any,
    unitCost: '' as any,
    expiryDate: '',
    supplier: '',
    assetCode: '',
    govAssetCode: '',
    sequenceNumber: 1,
    serialNumber: '',
    location: '',
    cost: 0,
    receivedDate: '',
    imageUrl: '',
    note: '',
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [newlyStockedBoxesData, setNewlyStockedBoxesData] = useState<{ item: any; lot: any; boxes: any[] } | null>(null);

  const fetchItemsAndHistory = async () => {
    try {
      const [itemsRes, dashRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/dashboard'),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
        // Keep form.itemId empty by default so user selects explicitly
      }
      if (dashRes.ok) {
        const dash = await dashRes.json();
        setRecentTransactions(dash.recentTransactions?.filter((tx: any) => tx.type === 'IN') || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsAndHistory();
  }, []);

  const calculateSuggestedCode = (it: any) => {
    const nextSeq = (it.assets?.length || 0) + 1;
    const currentYearThai = new Date().getFullYear() + 543;
    // Extract prefix from item code (e.g. EQ-AED-001 -> AED, EQ-KD-001 -> KD)
    const prefix = it.code.replace('EQ-', '').replace(/-\d+$/, '') || 'EQ';
    const suggestedAssetCode = `${prefix}-${currentYearThai}-${String(nextSeq).padStart(3, '0')}`;
    return { nextSeq, suggestedAssetCode };
  };

  const resetToAutoCode = (targetItem?: any) => {
    const it = targetItem || items.find((i) => i.id === form.itemId);
    if (it) {
      const { nextSeq, suggestedAssetCode } = calculateSuggestedCode(it);
      setForm((prev) => ({
        ...prev,
        sequenceNumber: nextSeq,
        assetCode: suggestedAssetCode,
      }));
      setIsCustomCode(false);
    }
  };

  const handleItemSelect = (selectedId: string) => {
    const it = items.find((i) => i.id === selectedId);
    if (!it) {
      setForm((prev) => ({ ...prev, itemId: selectedId }));
      return;
    }

    if (activeTab === 'EQUIPMENT') {
      const { nextSeq, suggestedAssetCode } = calculateSuggestedCode(it);

      setForm((prev) => ({
        ...prev,
        itemId: selectedId,
        sequenceNumber: nextSeq,
        // If user is not in custom mode, always update to the newly calculated code!
        assetCode: isCustomCode ? prev.assetCode : suggestedAssetCode,
        location: it.location || prev.location || '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        itemId: selectedId,
        brand: prev.brand || it.brand || '',
        packSize: prev.packSize || it.conversionRatio || 1,
        packageUnit: prev.packageUnit || it.unit || 'ห่อ',
      }));
    }
  };

  const handleTabChange = (tab: 'CONSUMABLE' | 'EQUIPMENT') => {
    setActiveTab(tab);
    setSelectedCategory('');
    setForm((prev) => ({ ...prev, itemId: '' }));
    const available = items.filter((i) => i.type === tab);
    if (available.length > 0) {
      handleItemSelect(available[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemId) {
      alert('กรุณาเลือกรายการ');
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/stock/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          type: activeTab,
          userId: currentUser?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMessage('บันทึกการรับเข้าเรียบร้อยแล้ว');
        if (activeTab === 'CONSUMABLE' && data.boxes && data.boxes.length > 0) {
          const curItem = items.find((i) => i.id === form.itemId);
          setNewlyStockedBoxesData({
            item: curItem || { name: 'เวชภัณฑ์', code: 'CON', unit: 'กล่อง' },
            lot: data.lot,
            boxes: data.boxes,
          });
        }
        setForm({
          itemId: form.itemId,
          lotNumber: '',
          brand: '',
          packSize: selectedItem?.conversionRatio || 1,
          packageUnit: selectedItem?.unit || 'ห่อ',
          quantity: '' as any,
          unitCost: '' as any,
          expiryDate: '',
          supplier: '',
          assetCode: '',
          govAssetCode: '',
          sequenceNumber: 1,
          serialNumber: '',
          location: '',
          cost: 0,
          receivedDate: '',
          imageUrl: '',
          note: '',
        });
        setIsCustomCode(false);
        fetchItemsAndHistory();
        setTimeout(() => setSuccessMessage(null), 8000);
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = items.find((i) => i.id === form.itemId);
  const eligibleItems = items.filter((i) => i.type === activeTab);

  if (!isOfficer) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
        <h3 className="font-bold text-base">เฉพาะเจ้าหน้าที่ห้องปฏิบัติการพยาบาล</h3>
        <p className="text-xs mt-1">
          กรุณาสลับบทบาทเป็น "เจ้าหน้าที่แล็บ" หรือ "ผู้ดูแลระบบ" จากแถบด้านบนเพื่อบันทึกการรับเข้าพัสดุ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ArrowDownToLine className="w-6 h-6 text-teal-600" />
          ระบบรับเข้าพัสดุและลงทะเบียนครุภัณฑ์ (Stock In)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          บันทึกรับเวชภัณฑ์สิ้นเปลืองเข้าคลัง กำหนดเลข Lot วันหมดอายุ ราคาต้นทุน หรือลงทะเบียนรหัส Asset ครุภัณฑ์ชิ้นใหม่
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button
              onClick={() => handleTabChange('CONSUMABLE')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'CONSUMABLE'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              1. รับเข้าเวชภัณฑ์สิ้นเปลือง (บันทึก Lot & ต้นทุน)
            </button>
            <button
              onClick={() => handleTabChange('EQUIPMENT')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'EQUIPMENT'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              2. ลงทะเบียนครุภัณฑ์คงทน (บันทึกรหัส Asset)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                เลือกรายการพัสดุ / ครุภัณฑ์ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* 1. Category Filter Dropdown */}
                <div className="sm:col-span-5">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const catVal = e.target.value;
                      setSelectedCategory(catVal);
                      if (catVal && form.itemId) {
                        const it = items.find((x) => x.id === form.itemId);
                        if (it && (it.category?.id !== catVal && it.category?.name !== catVal && it.categoryId !== catVal)) {
                          setForm((prev) => ({ ...prev, itemId: '' }));
                        }
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">-- ทุกหมวดหมู่ (กรองตามหมวด) --</option>
                    {(() => {
                      const catMap = new Map<string, string>();
                      eligibleItems.forEach((it: any) => {
                        if (it.category?.name) {
                          catMap.set(it.category.id || it.category.name, it.category.name);
                        }
                      });
                      return Array.from(catMap.entries()).map(([id, name]) => (
                        <option key={id} value={id}>
                          📁 {name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* 2. Item Dropdown */}
                <div className="sm:col-span-7">
                  <select
                    value={form.itemId}
                    required
                    onChange={(e) => {
                      const val = e.target.value;
                      handleItemSelect(val);
                      const it = items.find((x) => x.id === val);
                      if (it?.category?.id) {
                        setSelectedCategory(it.category.id);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {(() => {
                      const filtered = selectedCategory
                        ? eligibleItems.filter((i) => (i.category?.id === selectedCategory || i.category?.name === selectedCategory || i.categoryId === selectedCategory))
                        : eligibleItems;
                      return (
                        <>
                          <option value="">-- กรุณาเลือกรายการ ({filtered.length} รายการ) --</option>
                          {filtered.map((item) => (
                            <option key={item.id} value={item.id}>
                              [{item.code}] {item.name} (คงเหลือ: {item.currentStock} {item.unit})
                            </option>
                          ))}
                        </>
                      );
                    })()}
                  </select>
                </div>
              </div>
            </div>

            {activeTab === 'CONSUMABLE' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      หมายเลข Lot (Lot Number) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น LOT-256909-01"
                      value={form.lotNumber}
                      onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      วันที่รับเข้า (Received Date)
                    </label>
                    <input
                      type="date"
                      value={form.receivedDate}
                      onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      วันหมดอายุ (Expiry Date)
                    </label>
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Brand, Package Unit, and Pack Size per Lot */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                      ข้อมูลยี่ห้อและขนาดบรรจุของล็อตนี้ (Multi-Packaging & Brand)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 font-bold">
                      รองรับขนาด 50 / 100 ชิ้นตามยี่ห้อ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        ยี่ห้อ / ผู้ผลิต (Brand ของล็อตนี้)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น Thai Gauze, Lintech, 3M"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        หน่วยบรรจุหลัก (Package Unit)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ห่อ, กล่อง, แพ็ค"
                        value={form.packageUnit || selectedItem?.unit || ''}
                        onChange={(e) => setForm({ ...form, packageUnit: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          ขนาดบรรจุต่อ{form.packageUnit || selectedItem?.unit || 'หน่วย'} *
                        </label>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                          (เช่น 50 หรือ 100)
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={form.packSize || ''}
                          placeholder={String(selectedItem?.conversionRatio || 1)}
                          onChange={(e) => setForm({ ...form, packSize: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                          {selectedItem?.usageUnit || 'ชิ้น'}/{form.packageUnit || selectedItem?.unit || 'ห่อ'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      จำนวนรับเข้า ({selectedItem?.unit || 'หน่วย'}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={form.quantity}
                      placeholder="กรอกจำนวนที่รับเข้า..."
                      onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ราคาต้นทุนต่อหน่วย (บาท / {selectedItem?.unit || 'หน่วย'}) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        required
                        value={form.unitCost}
                        placeholder="0.00"
                        onChange={(e) => setForm({ ...form, unitCost: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-7 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">฿</span>
                    </div>
                  </div>
                </div>

                {/* Total Computed Value & Dual-Unit Breakdown */}
                {(() => {
                  const qty = Number(form.quantity) || 0;
                  const cost = Number(form.unitCost) || 0;
                  const packSize = Number(form.packSize) > 0 ? Number(form.packSize) : (Number(selectedItem?.conversionRatio) || 1);
                  const totalPieces = qty * packSize;
                  const totalValue = qty * cost;
                  const costPerPiece = totalPieces > 0 ? (totalValue / totalPieces) : 0;
                  const pkgUnit = form.packageUnit || selectedItem?.unit || 'หน่วย';
                  const pieceUnit = selectedItem?.usageUnit || 'ชิ้น';

                  return (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <span>📦 สรุปจำนวนชิ้นย่อยและมูลค่ารับเข้า:</span>
                        </span>
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                          {qty > 0 && cost > 0 ? (
                            '฿' + totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' บาท'
                          ) : (
                            <span className="text-xs font-normal text-slate-400 italic">รอระบุจำนวนและราคา...</span>
                          )}
                        </span>
                      </div>

                      {qty > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-100 dark:border-emerald-800/50 text-[11px]">
                          <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">จำนวนชิ้นย่อยรวม (Base Units)</span>
                            <span className="font-extrabold text-teal-800 dark:text-teal-300 text-xs">
                              {qty.toLocaleString()} {pkgUnit} × {packSize} = {totalPieces.toLocaleString()} {pieceUnit}
                            </span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ต้นทุนเฉลี่ยต่อชิ้นย่อย</span>
                            <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-xs">
                              {costPerPiece > 0 ? `฿${costPerPiece.toFixed(2)} บาท / ${pieceUnit}` : '-'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    บริษัทคู่ค้า / แหล่งงบประมาณ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น บริษัท สหเวชกิจการ จำกัด, งบประมาณแผ่นดิน 2569"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* 1. Codes: Lab Code & Gov Asset Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        รหัสประจำชิ้นในแล็บ (Lab Asset Code) *
                      </label>
                      {isCustomCode ? (
                        <button
                          type="button"
                          onClick={() => resetToAutoCode()}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800 transition cursor-pointer"
                          title="คืนค่ากลับเป็นรหัสอัตโนมัติตามลำดับสต็อก"
                        >
                          <RefreshCw className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>คืนค่ารหัสอัตโนมัติ</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsCustomCode(true)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                          title="คลิกเพื่อปลดล็อคและกำหนดรหัสเอง"
                        >
                          <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>กำหนดรหัสเอง</span>
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        readOnly={!isCustomCode}
                        placeholder="เช่น AED-2569-001, KD-01 (ชามรูปไต), TRY-02"
                        value={form.assetCode}
                        onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold transition ${
                          !isCustomCode
                            ? 'bg-teal-50/70 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200 cursor-not-allowed pr-14'
                            : 'bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-500 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 pr-14'
                        }`}
                      />
                      <div className="absolute right-2.5 top-2 pointer-events-none">
                        {!isCustomCode ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/60 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" /> Auto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                            <Unlock className="w-2.5 h-2.5" /> กำหนดเอง
                          </span>
                        )}
                      </div>
                    </div>

                    {!isCustomCode ? (
                      <p className="text-[10px] text-teal-700 dark:text-teal-400 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                        <span>ระบบสร้างรหัสอัตโนมัติให้อย่างถูกต้องตามลำดับสต็อก (ป้องกันข้อผิดพลาด)</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>กำลังกำหนดรหัสเอง กรุณาตรวจสอบไม่ให้ซ้ำกับอุปกรณ์ชิ้นอื่น</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      เลขครุภัณฑ์ทางราชการ (Gov Asset Code) <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 7440-001-0001/2569 (ปล่อยว่างได้สำหรับวัสดุคงทน)"
                      value={form.govAssetCode}
                      onChange={(e) => setForm({ ...form, govAssetCode: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      * หากเป็นวัสดุคงทน (เช่น ถาด, ชามรูปไต) ที่ไม่มีเลขครุภัณฑ์ราชการ สามารถเว้นว่างไว้ได้
                    </p>
                  </div>
                </div>

                {/* 2. Sequence & Serial Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ลำดับของครุภัณฑ์ (เช่น เครื่องที่ 1, ชุดที่ 2, ตัวที่ 3) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.sequenceNumber}
                      onChange={(e) => setForm({ ...form, sequenceNumber: Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-teal-800 dark:text-teal-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Serial Number (จากผู้ผลิต ถ้ามี)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น SN-ZOLL-8801"
                      value={form.serialNumber}
                      onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* 3. Location & Received Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      สถานที่จัดเก็บเฉพาะชิ้น (เก็บไว้ที่ไหน) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ตู้ฉุกเฉิน เสา C ห้อง Simulation Lab 1"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      วันที่รับเข้า (Received Date)
                    </label>
                    <input
                      type="date"
                      value={form.receivedDate}
                      onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* 4. Cost */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ราคาจัดซื้อ / มูลค่าต่อเครื่อง (บาท)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="เช่น 65000"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-7 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">฿</span>
                  </div>
                </div>

                {/* 5. Image URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ลิงก์รูปภาพครุภัณฑ์ (รองรับ Google Drive Share Link)
                  </label>
                  <input
                    type="url"
                    placeholder="แปะลิงก์รูปภาพ เช่น https://drive.google.com/file/d/... หรือ URL รูปภาพ"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    * สามารถคัดลอกลิงก์แชร์จาก Google Drive มาวางได้ทันที ระบบจะแปลงและแสดงรูปภาพให้อัตโนมัติ
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                หมายเหตุการรับเข้า
              </label>
              <textarea
                rows={2}
                placeholder="เลขที่ใบส่งของ หรือรายละเอียดการตรวจรับ"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกรับเข้าสต็อก...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันบันทึกรับเข้าสต็อก</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Column (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              ประวัติรับเข้าล่าสุด (Recent Stock-ins)
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id} className="py-2.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{tx.item?.name}</div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      +{tx.quantity} {tx.item?.unit}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ฿{tx.totalCost.toFixed(2)} บาท
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString('th-TH')} | {tx.note}
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  ยังไม่มีประวัติการรับเข้า
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 space-y-2">
            <h5 className="font-bold">หลักการ FIFO ในการเบิกจ่าย</h5>
            <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">
              เมื่อมีการขอเบิกวัสดุสิ้นเปลืองสำหรับรายวิชา ระบบจะเลือกตัดสต็อกและคำนวณต้นทุนจาก <strong>Lot ที่มีวันหมดอายุเร็วที่สุดก่อนโดยอัตโนมัติ (First-In, First-Out)</strong> เพื่อให้การคิดต้นทุนรายวิชาแม่นยำตรงกับของที่ใช้จริง
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Box-Level Stickers Print */}
      {newlyStockedBoxesData && (
        <BoxStickerModal
          item={newlyStockedBoxesData.item}
          lot={newlyStockedBoxesData.lot}
          boxes={newlyStockedBoxesData.boxes}
          onClose={() => setNewlyStockedBoxesData(null)}
        />
      )}
    </div>
  );
}
