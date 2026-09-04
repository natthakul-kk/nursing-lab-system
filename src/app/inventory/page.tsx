'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AssetQrModal from '@/components/qrcode/AssetQrModal';
import { formatImageUrl } from '@/lib/image-helper';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  PackagePlus,
  Wrench,
  Eye,
  QrCode,
  DollarSign,
  Image as ImageIcon
} from 'lucide-react';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function InventoryPage() {
  const { isOfficer } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [selectedAssetForQr, setSelectedAssetForQr] = useState<{ asset: any; itemName: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    type: 'EQUIPMENT',
    categoryId: '',
    unit: 'เครื่อง',
    minStockAlert: 5,
    location: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !newItem.categoryId) {
          setNewItem((prev) => ({ ...prev, categoryId: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code || !newItem.name || !newItem.categoryId) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({
          code: '',
          name: '',
          type: 'EQUIPMENT',
          categoryId: categories[0]?.id || '',
          unit: 'เครื่อง',
          minStockAlert: 5,
          location: '',
          description: '',
        });
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการเพิ่มรายการ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesType =
      filterType === 'ALL' || item.type === filterType;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-teal-600" />
            ทะเบียนพัสดุและครุภัณฑ์ห้องปฏิบัติการพยาบาล
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            รายการครุภัณฑ์คงทนและเวชภัณฑ์สิ้นเปลือง พร้อมระบบติดตามสถานะรายชิ้นและ Lot วันหมดอายุ
          </p>
        </div>

        {isOfficer && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มรายการใหม่</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            onClick={() => setFilterType('EQUIPMENT')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === 'EQUIPMENT'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ครุภัณฑ์คงทน ({items.filter((i) => i.type === 'EQUIPMENT').length})
          </button>
          <button
            onClick={() => setFilterType('CONSUMABLE')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === 'CONSUMABLE'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            วัสดุสิ้นเปลือง ({items.filter((i) => i.type === 'CONSUMABLE').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, หมวดหมู่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">รหัส / ชื่อพัสดุ</th>
                <th className="py-3.5 px-4">ประเภท / หมวดหมู่</th>
                <th className="py-3.5 px-4">สถานที่จัดเก็บ</th>
                <th className="py-3.5 px-4 text-center">คงเหลือ / สถานะ</th>
                <th className="py-3.5 px-4 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableLoadingRow colSpan={5} message="กำลังโหลดรายการวัสดุ ครุภัณฑ์ และสต็อกยา..." />
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    ไม่พบรายการพัสดุที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const isEquipment = item.type === 'EQUIPMENT';

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                            {item.description && (
                              <span className="text-slate-400 text-[11px] truncate max-w-xs">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-1">
                            {isEquipment ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                ครุภัณฑ์คงทน
                              </span>
                            ) : (
                              <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                                วัสดุสิ้นเปลือง
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {item.category?.name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{item.location || 'ไม่ได้ระบุ'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isEquipment ? (
                            <div>
                              <span className="font-black text-slate-900 text-sm">
                                {item.currentStock}
                              </span>{' '}
                              <span className="text-slate-500 text-xs">/ {item.totalQuantity} {item.unit}</span>
                              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                พร้อมใช้ {item.currentStock} {item.unit}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-center gap-1.5">
                                <span
                                  className={`font-black text-sm ${
                                    item.isLowStock ? 'text-rose-600' : 'text-slate-900'
                                  }`}
                                >
                                  {item.currentStock}
                                </span>
                                <span className="text-slate-500 text-xs">{item.unit}</span>
                              </div>
                              {item.isLowStock && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10px]">
                                  <AlertTriangle className="w-2.5 h-2.5" /> ต่ำกว่าเกณฑ์ ({item.minStockAlert})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 font-bold transition text-[11px]"
                          >
                            <span>{isEquipment ? 'ดูรหัสชิ้น/Asset' : 'ดูล็อต/วันหมดอายุ'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-table for Pieces (Assets) or Lots */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={5} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner space-y-3">
                              {isEquipment ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                                      รายการชิ้นครุภัณฑ์รายบุคคล (Individual Asset Codes)
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {item.assets?.map((asset: any) => {
                                      const photoUrl = formatImageUrl(asset.imageUrl || item.imageUrl);
                                      return (
                                        <div
                                          key={asset.id}
                                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition space-y-2.5 shadow-sm"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                                                เครื่อง/ชิ้นที่ {asset.sequenceNumber || 1}
                                              </span>
                                              <span className="font-mono font-black text-slate-900 text-xs tracking-wider">
                                                {asset.assetCode}
                                              </span>
                                            </div>

                                            <div>
                                              {asset.status === 'AVAILABLE' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                  พร้อมใช้
                                                </span>
                                              )}
                                              {asset.status === 'BORROWED' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                  ถูกยืมอยู่
                                                </span>
                                              )}
                                              {asset.status === 'MAINTENANCE' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                                  ซ่อมบำรุง
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-3 text-xs">
                                            {photoUrl ? (
                                              <img
                                                src={photoUrl}
                                                alt={item.name}
                                                className="w-14 h-14 rounded-lg object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                                                onError={(e) => {
                                                  (e.target as HTMLElement).style.display = 'none';
                                                }}
                                              />
                                            ) : null}

                                            <div className="space-y-1 text-[11px] text-slate-600 flex-1">
                                              <div className="flex items-center gap-1.5 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                                                <span className="truncate">
                                                  {asset.location || item.location || 'ห้องปฏิบัติการพยาบาล'}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-3 text-slate-500">
                                                {asset.receivedDate && (
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(asset.receivedDate).toLocaleDateString('th-TH')}
                                                  </span>
                                                )}
                                                {asset.cost && asset.cost > 0 ? (
                                                  <span className="font-bold text-emerald-700 flex items-center gap-0.5">
                                                    <DollarSign className="w-3 h-3" />
                                                    ฿{Number(asset.cost).toLocaleString('th-TH')}
                                                  </span>
                                                ) : null}
                                              </div>

                                              {asset.serialNumber && (
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  SN: {asset.serialNumber}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                            <div className="text-[10px] text-slate-400">
                                              {asset.note || 'สภาพปกติ'}
                                            </div>
                                            <button
                                              onClick={() =>
                                                setSelectedAssetForQr({
                                                  asset,
                                                  itemName: item.name,
                                                })
                                              }
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition border border-teal-200 cursor-pointer"
                                            >
                                              <QrCode className="w-3.5 h-3.5" />
                                              <span>พิมพ์ป้าย QR Code</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {(!item.assets || item.assets.length === 0) && (
                                      <p className="text-xs text-slate-400 col-span-2">
                                        ยังไม่มีการลงทะเบียนรหัส Asset สำหรับรายการนี้
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                      ล็อตคงคลังและวันหมดอายุ (Stock Lots & Expiry Dates)
                                    </h4>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                                        <tr>
                                          <th className="py-2">เลข Lot</th>
                                          <th className="py-2">จำนวนคงเหลือ</th>
                                          <th className="py-2">ราคาต้นทุน/หน่วย</th>
                                          <th className="py-2">วันหมดอายุ</th>
                                          <th className="py-2">ผู้จัดจำหน่าย</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium">
                                        {item.stockLots?.map((lot: any) => (
                                          <tr key={lot.id}>
                                            <td className="py-2 font-mono font-bold text-teal-800">
                                              {lot.lotNumber}
                                            </td>
                                            <td className="py-2">
                                              <span className="font-bold text-slate-900">
                                                {lot.quantityRemaining}
                                              </span>{' '}
                                              {item.unit}
                                            </td>
                                            <td className="py-2 text-slate-700">
                                              ฿{lot.unitCost.toFixed(2)}
                                            </td>
                                            <td className="py-2">
                                              {lot.expiryDate ? (
                                                <span className="text-slate-800">
                                                  {new Date(lot.expiryDate).toLocaleDateString('th-TH')}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">ไม่ระบุ</span>
                                              )}
                                            </td>
                                            <td className="py-2 text-slate-500">
                                              {lot.supplier || '-'}
                                            </td>
                                          </tr>
                                        ))}
                                        {(!item.stockLots || item.stockLots.length === 0) && (
                                          <tr>
                                            <td colSpan={5} className="py-3 text-center text-slate-400">
                                              ไม่มีล็อตคงคลังที่มียอดเหลือ
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-teal-600" />
                เพิ่มพัสดุ / ครุภัณฑ์ใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทพัสดุ
                  </label>
                  <select
                    value={newItem.type}
                    onChange={(e) =>
                      setNewItem({ ...newItem, type: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="EQUIPMENT">ครุภัณฑ์คงทน (Equipment)</option>
                    <option value="CONSUMABLE">วัสดุสิ้นเปลือง (Consumable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสพัสดุ (Item Code)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น EQ-MNK-003, CON-IV-005"
                    value={newItem.code}
                    onChange={(e) =>
                      setNewItem({ ...newItem, code: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่ออุปกรณ์ / เวชภัณฑ์
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น หุ่นฝึกใส่สายสวนปัสสาวะ, เข็มฉีดยา เบอร์ 24"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={newItem.categoryId}
                    onChange={(e) =>
                      setNewItem({ ...newItem, categoryId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยนับ
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตัว, เครื่อง, กล่อง, ขวด, ชิ้น"
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จุดแจ้งเตือนใกล้หมด (Min Alert)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.minStockAlert}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minStockAlert: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สถานที่จัดเก็บ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตู้ A ชั้น 2, ตู้เย็นเวชภัณฑ์"
                    value={newItem.location}
                    onChange={(e) =>
                      setNewItem({ ...newItem, location: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="สเปกอุปกรณ์ ขนาด หรือข้อควรระวัง"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code and Sticker Print */}
      {selectedAssetForQr && (
        <AssetQrModal
          asset={selectedAssetForQr.asset}
          itemName={selectedAssetForQr.itemName}
          onClose={() => setSelectedAssetForQr(null)}
        />
      )}
    </div>
  );
}
