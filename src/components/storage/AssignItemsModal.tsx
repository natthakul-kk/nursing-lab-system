'use client';

import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  Search,
  X,
  Package,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

interface AssignItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
  availableItems: any[];
  onRefresh: () => void;
}

export default function AssignItemsModal({
  isOpen,
  onClose,
  location,
  availableItems,
  onRefresh,
}: AssignItemsModalProps) {
  const [activeTab, setActiveTab] = useState<'CONSUMABLE' | 'EQUIPMENT'>('CONSUMABLE');
  const [consumableSearch, setConsumableSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Extract currently assigned items and assets in this cabinet
  const currentItems = useMemo(() => {
    return (location?.items || []).filter((i: any) => i.type !== 'EQUIPMENT');
  }, [location?.items]);

  const currentAssets = useMemo(() => {
    return location?.assets || [];
  }, [location?.assets]);

  // Extract all individual equipment assets from availableItems
  const allEquipmentAssets = useMemo(() => {
    const list: any[] = [];
    (availableItems || []).forEach((item) => {
      if (item.type === 'EQUIPMENT' && Array.isArray(item.assets)) {
        item.assets.forEach((asset: any) => {
          list.push({
            id: asset.id,
            assetCode: asset.assetCode,
            sequenceNumber: asset.sequenceNumber,
            serialNumber: asset.serialNumber,
            status: asset.status,
            condition: asset.condition,
            brand: asset.brand || item.brand,
            model: asset.model || item.model,
            location: asset.location || 'ยังไม่ระบุตู้',
            storageLocationId: asset.storageLocationId,
            itemId: item.id,
            itemName: item.name,
            itemCode: item.code,
            categoryName: item.category?.name || 'ครุภัณฑ์',
          });
        });
      }
    });
    return list;
  }, [availableItems]);

  // Filter selectable consumable items
  const selectableItems = useMemo(() => {
    return (availableItems || []).filter((item) => {
      if (item.type === 'EQUIPMENT') return false; // Handled in equipment assets tab
      const notInCabinet = !currentItems.some((i: any) => i.id === item.id);
      const query = consumableSearch.toLowerCase();
      const matches =
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query);
      return notInCabinet && matches;
    });
  }, [availableItems, currentItems, consumableSearch]);

  // Filter selectable equipment assets (individual machines)
  const selectableAssets = useMemo(() => {
    return allEquipmentAssets.filter((asset) => {
      const notInCabinet = !currentAssets.some((a: any) => a.id === asset.id);
      const query = assetSearch.toLowerCase();
      const matches =
        asset.assetCode.toLowerCase().includes(query) ||
        asset.itemName.toLowerCase().includes(query) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(query)) ||
        (asset.categoryName && asset.categoryName.toLowerCase().includes(query));
      return notInCabinet && matches;
    });
  }, [allEquipmentAssets, currentAssets, assetSearch]);

  if (!isOpen || !location) return null;

  // Execute assigning consumable items
  const handleExecuteAssignItems = async () => {
    if (selectedItemIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/storage/locations/${location.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItemIds,
          action: 'ASSIGN',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'จัดเก็บพัสดุเข้าตู้เรียบร้อยแล้ว');
        setSelectedItemIds([]);
        onRefresh();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      alert(err.message || 'เชื่อมต่อล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  // Execute unassigning a consumable item
  const handleUnassignItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/storage/locations/${location.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [itemId],
          action: 'UNASSIGN',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('Error unassigning item:', err);
    }
  };

  // Execute assigning equipment assets (individual units)
  const handleExecuteAssignAssets = async () => {
    if (selectedAssetIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/storage/locations/${location.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: selectedAssetIds,
          action: 'ASSIGN',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'จัดเก็บครุภัณฑ์เข้าตู้เรียบร้อยแล้ว');
        setSelectedAssetIds([]);
        onRefresh();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      alert(err.message || 'เชื่อมต่อล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  // Execute unassigning an equipment asset
  const handleUnassignAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/storage/locations/${location.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: [assetId],
          action: 'UNASSIGN',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('Error unassigning asset:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black bg-teal-600 text-white px-2 py-0.5 rounded">
                {location.code}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {location.name}
              </h3>
              {location.room && (
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
                  {location.room.name || location.roomName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              จัดพัสดุและครุภัณฑ์ประจำตู้ หรือย้ายสิ่งของข้ามตู้ (ข้อมูลจะอัปเดตตำแหน่งและหน้าสแกน QR Code แบบเรียลไทม์)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CONSUMABLE')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'CONSUMABLE'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/40'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>📦 วัสดุสิ้นเปลือง / พัสดุ</span>
            <span
              className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
                activeTab === 'CONSUMABLE'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {currentItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EQUIPMENT')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'EQUIPMENT'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>🔬 ครุภัณฑ์รายชิ้น (เครื่อง/อุปกรณ์)</span>
            <span
              className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
                activeTab === 'EQUIPMENT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {currentAssets.length}
            </span>
          </button>
        </div>

        {/* Tab 1 Content: Consumable Items */}
        {activeTab === 'CONSUMABLE' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Currently Assigned Consumables */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-teal-600" />
                  <span>พัสดุในตู้นี้ ({currentItems.length} รายการ)</span>
                </span>
                <span className="text-[11px] text-slate-400">คลิก &quot;นำออก&quot; เพื่อปลดออกจากตู้</span>
              </h4>
              {currentItems.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center text-xs text-slate-400">
                  ตู้นี้ยังไม่มีพัสดุสิ้นเปลืองจัดเก็บอยู่
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {currentItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.code} • คงเหลือ {item.totalQuantity} {item.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnassignItem(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 text-[10px] font-bold hover:bg-rose-100 transition cursor-pointer shrink-0"
                      >
                        นำออก
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Select Additional Consumables */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4 text-teal-600" />
                  <span>เลือกพัสดุสิ้นเปลืองเพิ่มเติมเพื่อจัดเก็บเข้าตู้นี้</span>
                </h4>
                <span className="text-[11px] text-teal-600 font-bold">
                  เลือกแล้ว {selectedItemIds.length} รายการ
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสพัสดุในระบบ..."
                  value={consumableSearch}
                  onChange={(e) => setConsumableSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {selectableItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    ไม่พบรายการพัสดุสิ้นเปลืองที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  selectableItems.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isSelected) setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
                          else setSelectedItemIds([...selectedItemIds, item.id]);
                        }}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-teal-50/80 dark:bg-teal-950/60'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {item.code} • คงเหลือ {item.totalQuantity} {item.unit}
                              {item.location && (
                                <span className="ml-2 text-slate-400 font-sans">
                                  (📍 ปัจจุบันอยู่ที่: {item.location})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {item.category?.name || 'ทั่วไป'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Equipment Assets (Individual Units) */}
        {activeTab === 'EQUIPMENT' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Currently Assigned Assets in this Cabinet */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  <span>ครุภัณฑ์ในตู้นี้ ({currentAssets.length} ชิ้น)</span>
                </span>
                <span className="text-[11px] text-slate-400">คลิก &quot;นำออก&quot; เพื่อปลดเครื่องออกจากตู้</span>
              </h4>

              {currentAssets.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center text-xs text-slate-400">
                  ตู้นี้ยังไม่มีครุภัณฑ์จัดเก็บอยู่
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {currentAssets.map((asset: any) => {
                    const isAvailable = asset.status === 'AVAILABLE';
                    return (
                      <div
                        key={asset.id}
                        className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                              {asset.assetCode}
                            </span>
                            {asset.sequenceNumber && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                เครื่องที่ {asset.sequenceNumber}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-xs truncate text-slate-900 dark:text-white mt-1">
                            {asset.item?.name || asset.itemName || 'ครุภัณฑ์'}
                          </div>
                          {asset.serialNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              S/N: {asset.serialNumber}
                            </div>
                          )}
                          <div className="mt-1">
                            {isAvailable ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> พร้อมใช้
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-amber-500" /> {asset.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnassignAsset(asset.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 text-[10px] font-bold hover:bg-rose-100 transition cursor-pointer shrink-0"
                        >
                          นำออก
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Select Additional Equipment Assets */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>เลือกครุภัณฑ์รายเครื่องเพื่อจัดเก็บเข้าตู้นี้</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    สามารถแยกเก็บแต่ละเครื่อง (เช่น เครื่องที่ 1, เครื่องที่ 2) คนละตู้หรือคนละชั้นได้อย่างอิสระ
                  </p>
                </div>
                <span className="text-[11px] text-indigo-600 font-bold">
                  เลือกแล้ว {selectedAssetIds.length} ชิ้น
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสครุภัณฑ์ (เช่น EQ-AED-001/01), ชื่อเครื่อง, หรือ S/N..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {selectableAssets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    ไม่พบรายการครุภัณฑ์ที่ตรงกับคำค้นหา หรือครุภัณฑ์ทั้งหมดได้ถูกจัดเก็บเข้าตู้นี้แล้ว
                  </div>
                ) : (
                  selectableAssets.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          if (isSelected) setSelectedAssetIds(selectedAssetIds.filter((id) => id !== asset.id));
                          else setSelectedAssetIds([...selectedAssetIds, asset.id]);
                        }}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/60'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                {asset.assetCode}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {asset.itemName}
                              </span>
                              {asset.sequenceNumber && (
                                <span className="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  เครื่องที่ {asset.sequenceNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                              {asset.serialNumber && <span>S/N: {asset.serialNumber}</span>}
                              {asset.brand && <span>ยี่ห้อ: {asset.brand}</span>}
                              <span className="text-slate-400 font-sans">
                                (📍 ปัจจุบัน: {asset.location})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {asset.categoryName}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {asset.status === 'AVAILABLE' ? 'พร้อมใช้งาน' : asset.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>เมื่อกดบันทึก ข้อมูลตำแหน่งจะถูกอัปเดตไปยังหน้าสแกน QR Code ทันที</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              ปิด
            </button>

            {activeTab === 'CONSUMABLE' ? (
              <button
                type="button"
                onClick={handleExecuteAssignItems}
                disabled={selectedItemIds.length === 0 || loading}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span>{loading ? 'กำลังจัดเก็บ...' : `บันทึกจัดเก็บพัสดุเข้าตู้ (${selectedItemIds.length})`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteAssignAssets}
                disabled={selectedAssetIds.length === 0 || loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span>{loading ? 'กำลังจัดเก็บ...' : `บันทึกจัดเก็บครุภัณฑ์เข้าตู้ (${selectedAssetIds.length})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
