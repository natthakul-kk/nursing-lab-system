'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Archive,
  Plus,
  Search,
  DoorClosed,
  Edit,
  Trash2,
  QrCode,
  Printer,
  ExternalLink,
  PackagePlus,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import CabinetQrPrintModal from './CabinetQrPrintModal';
import CabinetFormModal from './CabinetFormModal';
import AssignItemsModal from './AssignItemsModal';

interface StorageManagementTabProps {
  onRefreshInventory?: () => void;
}

export default function StorageManagementTab({ onRefreshInventory }: StorageManagementTabProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'BY_ROOM' | 'ALL_CABINETS'>('BY_ROOM');

  // Cabinet Form Modal
  const [showCabinetModal, setShowCabinetModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [cabinetForm, setCabinetForm] = useState({
    code: '',
    name: '',
    type: 'CABINET',
    roomId: '',
    floor: 'ชั้น 3',
    building: 'อาคารวิทยบริการ',
    description: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Assign Items Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetLocation, setAssignTargetLocation] = useState<any | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  // Print QR Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDefaultId, setPrintDefaultId] = useState<string | undefined>(undefined);

  // Expanded Room Accordions
  const [expandedRoomIds, setExpandedRoomIds] = useState<Record<string, boolean>>({});

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/storage/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error('Failed to fetch storage locations:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        if (data.length > 0) {
          setExpandedRoomIds({ [data[0].id]: true });
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setAvailableItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchLocations(), fetchRooms(), fetchInventoryItems()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  const typeLabels: Record<string, string> = {
    CABINET: 'ตู้เก็บอุปกรณ์',
    SHELF: 'ชั้นวางของ',
    DRAWER: 'ลิ้นชัก',
    CART: 'รถเข็นหัตถการ',
    ROOM: 'ห้องเก็บของย่อย',
  };

  const handleOpenAddCabinet = (prefillRoomId?: string) => {
    setEditingLocation(null);
    setCabinetForm({
      code: '',
      name: '',
      type: 'CABINET',
      roomId: prefillRoomId || (rooms[0]?.id || ''),
      floor: 'ชั้น 3',
      building: 'อาคารวิทยบริการ',
      description: '',
    });
    setShowCabinetModal(true);
  };

  const handleOpenEditCabinet = (loc: any) => {
    setEditingLocation(loc);
    setCabinetForm({
      code: loc.code,
      name: loc.name,
      type: loc.type,
      roomId: loc.roomId || '',
      floor: loc.floor || 'ชั้น 3',
      building: loc.building || 'อาคารวิทยบริการ',
      description: loc.description || '',
    });
    setShowCabinetModal(true);
  };

  const handleSaveCabinet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabinetForm.code.trim() || !cabinetForm.name.trim()) {
      alert('กรุณากรอกรหัสและชื่อตู้/จุดจัดเก็บ');
      return;
    }

    setFormSubmitting(true);
    try {
      const isEdit = !!editingLocation;
      const url = isEdit ? `/api/storage/locations/${editingLocation.id}` : '/api/storage/locations';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cabinetForm),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCabinetModal(false);
        fetchLocations();
        if (onRefreshInventory) onRefreshInventory();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลตู้');
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCabinet = async (loc: any) => {
    if (
      !confirm(
        `คุณต้องการลบ "${loc.name} (${loc.code})" หรือไม่?\n\n(พัสดุที่อยู่ในตู้นี้จะถูกปลดเป็นสถานะไม่ระบุตู้)`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/storage/locations/${loc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchLocations();
        if (onRefreshInventory) onRefreshInventory();
      } else {
        alert(data.error || 'ไม่สามารถลบจุดจัดเก็บได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleOpenAssign = async (loc: any) => {
    try {
      const res = await fetch(`/api/storage/locations/${loc.id}`);
      if (res.ok) {
        const fullLoc = await res.json();
        setAssignTargetLocation(fullLoc);
      } else {
        setAssignTargetLocation(loc);
      }
    } catch {
      setAssignTargetLocation(loc);
    }
    setShowAssignModal(true);
  };

  const handlePrintCabinet = (locId: string) => {
    setPrintDefaultId(locId);
    setShowPrintModal(true);
  };

  // Filtered cabinets
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.roomName && loc.roomName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [locations, searchQuery]);

  // Group locations by room for BY_ROOM view
  const groupedByRoom = useMemo(() => {
    const map: Record<string, { room: any; locations: any[] }> = {};

    rooms.forEach((r) => {
      map[r.id] = { room: r, locations: [] };
    });

    filteredLocations.forEach((loc) => {
      const rId = loc.roomId || 'UNASSIGNED';
      if (!map[rId]) {
        map[rId] = {
          room: { id: 'UNASSIGNED', code: 'OTHER', name: 'จุดจัดเก็บส่วนกลาง / นอกห้องแล็บ' },
          locations: [],
        };
      }
      map[rId].locations.push(loc);
    });

    return Object.values(map);
  }, [rooms, filteredLocations]);

  const printableList = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.id,
      code: loc.code,
      name: loc.name,
      type: loc.type,
      floor: loc.floor,
      building: loc.building,
      roomName: loc.roomName || loc.room?.name,
      itemCount: loc._count?.items || 0,
      assetCount: loc._count?.assets || 0,
      qrCodeToken: loc.qrCodeToken,
      isRoom: false,
    }));
  }, [locations]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* View Mode Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full md:w-auto border border-transparent dark:border-slate-700">
          <button
            onClick={() => setViewMode('BY_ROOM')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'BY_ROOM'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DoorClosed className="w-3.5 h-3.5" />
            <span>จำแนกตามห้องแล็บ ({rooms.length})</span>
          </button>
          <button
            onClick={() => setViewMode('ALL_CABINETS')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'ALL_CABINETS'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>ตู้และจุดจัดเก็บทั้งหมด ({locations.length})</span>
          </button>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
          <button
            onClick={() => {
              setPrintDefaultId(undefined);
              setShowPrintModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm cursor-pointer"
            title="พิมพ์สติกเกอร์ QR Code สำหรับติดตู้และชั้น"
          >
            <Printer className="w-4 h-4 text-teal-600" />
            <span>พิมพ์สติกเกอร์ QR Code</span>
          </button>

          <button
            onClick={() => handleOpenAddCabinet()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มตู้ / จุดจัดเก็บใหม่</span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหารหัสตู้, ชื่อตู้, ห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Mode 1: View Grouped by Room */}
      {viewMode === 'BY_ROOM' && (
        <div className="space-y-4">
          {groupedByRoom.map(({ room, locations: roomCabinets }) => {
            const isExpanded = expandedRoomIds[room.id] ?? true;

            return (
              <div
                key={room.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors"
              >
                {/* Room Accordion Header */}
                <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() =>
                      setExpandedRoomIds((prev) => ({
                        ...prev,
                        [room.id]: !isExpanded,
                      }))
                    }
                  >
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                      <DoorClosed className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800">
                          {room.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{room.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {room.location || 'อาคารวิทยบริการ ชั้น 3'} • มีจุดจัดเก็บ {roomCabinets.length} ตู้/ชั้น
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {room.code !== 'OTHER' && (
                      <Link
                        href={`/storage/room/${room.code}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-bold transition shadow-xs cursor-pointer"
                        title="เปิดหน้าสแกนหน้าห้อง (Public Room Scanner)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>หน้าสแกนห้อง</span>
                      </Link>
                    )}

                    <button
                      onClick={() => handleOpenAddCabinet(room.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-600" />
                      <span>เพิ่มตู้ในห้องนี้</span>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedRoomIds((prev) => ({
                          ...prev,
                          [room.id]: !isExpanded,
                        }))
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-6">
                    {roomCabinets.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        ยังไม่มีตู้หรือชั้นจัดเก็บในห้องนี้ คลิก &quot;เพิ่มตู้ในห้องนี้&quot; เพื่อสร้างจุดจัดเก็บใหม่
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roomCabinets.map((loc) => (
                          <div
                            key={loc.id}
                            className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-teal-500/50 hover:shadow-sm transition p-4 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800">
                                  {loc.code}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {typeLabels[loc.type] || loc.type}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                {loc.name}
                              </h4>

                              {loc.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {loc.description}
                                </p>
                              )}

                              <div className="flex items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Package className="w-3.5 h-3.5 text-teal-600" />
                                  <b className="font-bold text-slate-900 dark:text-white">{loc._count?.items || 0}</b> พัสดุ
                                </span>
                                {(loc._count?.assets || 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                                    <b className="font-bold text-slate-900 dark:text-white">{loc._count?.assets}</b> ครุภัณฑ์
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenAssign(loc)}
                                  className="px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="จัดการและย้ายพัสดุเข้าตู้นี้"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                  <span>จัดของ ({loc._count?.items || 0})</span>
                                </button>
                                <button
                                  onClick={() => handlePrintCabinet(loc.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="พิมพ์ป้าย QR Code"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <Link
                                  href={`/storage/${loc.code}`}
                                  target="_blank"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="เปิดหน้าสแกนสาธารณะ"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditCabinet(loc)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="แก้ไขข้อมูลตู้"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCabinet(loc)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title="ลบจุดจัดเก็บนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mode 2: View All Cabinets Flat Table */}
      {viewMode === 'ALL_CABINETS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">รหัส / ชื่อตู้</th>
                  <th className="py-3.5 px-4">ประเภท</th>
                  <th className="py-3.5 px-4">ห้องปฏิบัติการ / ตำแหน่ง</th>
                  <th className="py-3.5 px-4 text-center">พัสดุในตู้</th>
                  <th className="py-3.5 px-4 text-center">ครุภัณฑ์ในตู้</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      ไม่พบจุดจัดเก็บที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{loc.name}</div>
                        <div className="font-mono text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
                          {loc.code}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {typeLabels[loc.type] || loc.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {loc.room?.name || loc.roomName || 'จุดจัดเก็บส่วนกลาง'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {loc.floor} • {loc.building}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {loc._count?.items || 0} รายการ
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {loc._count?.assets || 0} ชิ้น
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAssign(loc)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>จัดของ</span>
                          </button>
                          <button
                            onClick={() => handlePrintCabinet(loc.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="พิมพ์ป้าย QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/storage/${loc.code}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="เปิดหน้าสแกนสาธารณะ"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEditCabinet(loc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCabinet(loc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Cabinet */}
      <CabinetFormModal
        isOpen={showCabinetModal}
        onClose={() => setShowCabinetModal(false)}
        isEdit={!!editingLocation}
        cabinetForm={cabinetForm}
        setCabinetForm={setCabinetForm}
        onSubmit={handleSaveCabinet}
        submitting={formSubmitting}
        rooms={rooms}
      />

      {/* Modal: Assign Items */}
      <AssignItemsModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        location={assignTargetLocation}
        availableItems={availableItems}
        onRefresh={() => {
          fetchLocations();
          if (assignTargetLocation) {
            fetch(`/api/storage/locations/${assignTargetLocation.id}`)
              .then((r) => r.json())
              .then(setAssignTargetLocation);
          }
          if (onRefreshInventory) onRefreshInventory();
        }}
      />

      {/* Modal: Print QR Code Sticker */}
      <CabinetQrPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        storageList={printableList}
        defaultSelectedId={printDefaultId}
      />
    </div>
  );
}
