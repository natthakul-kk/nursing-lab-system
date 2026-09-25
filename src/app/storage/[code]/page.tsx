'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Wrench,
  ArrowLeft,
  MapPin,
  Building,
  RefreshCw,
  ExternalLink,
  QrCode,
  Tag,
  Share2,
  Calendar,
  Sparkles,
  LogIn,
  User,
  ClipboardList,
  LayoutGrid,
  List,
  Eye,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import ThemeToggle from '@/components/common/ThemeToggle';
import { formatImageUrl } from '@/lib/image-helper';

export default function CabinetStoragePage() {
  const params = useParams();
  const router = useRouter();
  const codeParam = (params?.code as string) || '';
  const { currentUser } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CONSUMABLE' | 'EQUIPMENT' | 'ALERT'>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARD'>('TABLE');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    type: 'CONSUMABLE' | 'EQUIPMENT';
    item: any;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cabinet_view_mode');
      if (saved === 'CARD' || saved === 'TABLE') {
        setViewMode(saved);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleViewModeChange = (mode: 'TABLE' | 'CARD') => {
    setViewMode(mode);
    try {
      localStorage.setItem('cabinet_view_mode', mode);
    } catch (e) {}
  };

  const fetchCabinetData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/storage/public/${encodeURIComponent(codeParam)}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'ไม่พบข้อมูลตู้หรือจุดจัดเก็บ');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (codeParam) {
      fetchCabinetData();
    }
  }, [codeParam]);

  const typeLabels: Record<string, string> = {
    CABINET: 'ตู้เก็บอุปกรณ์',
    SHELF: 'ชั้นวางของ',
    DRAWER: 'ลิ้นชัก',
    CART: 'รถเข็นหัตถการ',
    ROOM: 'ห้องเก็บของย่อย',
  };

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item: any) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === 'CONSUMABLE') return item.type === 'CONSUMABLE';
      if (selectedFilter === 'EQUIPMENT') return item.type === 'EQUIPMENT';
      if (selectedFilter === 'ALERT') return item.stockStatus === 'LOW_STOCK' || item.stockStatus === 'OUT_OF_STOCK';

      return true;
    });
  }, [data?.items, searchQuery, selectedFilter]);

  const filteredAssets = useMemo(() => {
    if (!data?.assets) return [];
    if (selectedFilter === 'CONSUMABLE') return [];
    return data.assets.filter((asset: any) => {
      const matchesSearch =
        asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [data?.assets, searchQuery, selectedFilter]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data?.storage?.name || 'ตู้จัดเก็บ'} (${data?.storage?.code})`,
          text: `รายการสิ่งของในตู้ ${data?.storage?.name} ห้อง ${data?.room?.name || data?.storage?.roomName}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('คัดลอกลิงก์เรียบร้อยแล้ว');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">กำลังเชื่อมต่อฐานข้อมูลตู้จัดเก็บ...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 text-center shadow-xl border border-slate-200/80 dark:border-slate-800">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">ไม่พบข้อมูลจุดจัดเก็บ</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{error || 'รหัส QR Code อาจไม่ถูกต้องหรือจุดจัดเก็บนี้ถูกยกเลิกแล้ว'}</p>
          <button
            onClick={() => router.push('/inventory')}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-md shadow-teal-600/20"
          >
            ไปยังหน้าทะเบียนพัสดุหลัก
          </button>
        </div>
      </div>
    );
  }

  const { storage, room, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-4 py-5 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          {room && (
            <Link
              href={`/storage/room/${room.code || room.qrCodeToken}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-200 hover:text-white transition bg-teal-900/50 px-3 py-1.5 rounded-lg border border-teal-600/40 backdrop-blur-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ดูตู้ทั้งหมดในห้อง: {room.name} ({room.code})</span>
            </Link>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-md border border-white/30 backdrop-blur-md">
                  {storage.code}
                </span>
                <span className="text-[11px] font-semibold bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-md border border-teal-400/30">
                  {typeLabels[storage.type] || storage.type}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-white flex items-center gap-2">
                <Archive className="w-6 h-6 text-teal-300 inline-block shrink-0" />
                <span>{storage.name}</span>
              </h1>
              <p className="text-xs text-teal-100/80 flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>
                  {storage.building} • {storage.floor} • {room ? room.name : storage.roomName || 'ห้องปฏิบัติการ'}
                </span>
              </p>
              {storage.description && (
                <p className="text-[11px] text-teal-200/90 mt-1.5 bg-black/10 px-2.5 py-1 rounded-lg inline-block">
                  💡 {storage.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <ThemeToggle />
              <button
                onClick={() => fetchCabinetData(true)}
                disabled={refreshing}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10 disabled:opacity-60"
                title="รีเฟรชยอดสต็อกล่าสุด"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10"
                title="แชร์ลิงก์ตู้นี้"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-4">
        {/* Guest Mode or Logged In Auth Banner */}
        {!currentUser ? (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-teal-500/10 dark:from-amber-950/30 dark:to-teal-950/30 border border-amber-300/50 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">โหมดเข้าชมทั่วไป (ไม่ต้องเข้าสู่ระบบ)</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">สาธารณะ</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  ท่านสามารถดูรายการสิ่งของและยอดคงเหลือในตู้นี้ได้ทันที • หากต้องการทำเรื่องขอยืมหรือขอเบิกพัสดุ กรุณาเข้าสู่ระบบ
                </p>
              </div>
            </div>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/storage/${codeParam}`)}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบเพื่อขอยืม / ขอเบิก</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    เข้าสู่ระบบแล้ว: {currentUser.name || currentUser.email}
                  </span>
                  <span className="text-[10px] font-semibold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    {currentUser.role === 'USER' ? 'นิสิต / ผู้ใช้งาน' : currentUser.role === 'TEACHER' ? 'อาจารย์' : currentUser.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  เลือกทำรายการเบิกหรือยืมพัสดุจากตู้นี้ได้โดยตรง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/borrow`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>ทำเรื่องขอยืม</span>
              </Link>
              <Link
                href={`/requisitions`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>ขอเบิกเวชภัณฑ์</span>
              </Link>
              {(currentUser.role === 'ADMIN' || currentUser.role === 'OFFICER') && (
                <Link
                  href="/inventory"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <span>จัดการตู้</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Real-time KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white leading-none">{stats.totalItems}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">รายการวัสดุ</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.inStockCount}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">พร้อมใช้ปกติ</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-amber-600 dark:text-amber-400 leading-none">
                {stats.lowStockCount + stats.outOfStockCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ใกล้หมด / หมด</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-none">{stats.totalAssets}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ชิ้นครุภัณฑ์</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อวัสดุ, รหัสพัสดุ, หรือครุภัณฑ์ในตู้นี้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${
                selectedFilter === 'ALL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({data.items.length + data.assets.length})
            </button>
            <button
              onClick={() => setSelectedFilter('CONSUMABLE')}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${
                selectedFilter === 'CONSUMABLE'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              วัสดุสิ้นเปลือง ({data.items.filter((i: any) => i.type === 'CONSUMABLE').length})
            </button>
            <button
              onClick={() => setSelectedFilter('EQUIPMENT')}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${
                selectedFilter === 'EQUIPMENT'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ครุภัณฑ์ ({data.assets.length + data.items.filter((i: any) => i.type === 'EQUIPMENT').length})
            </button>
            <button
              onClick={() => setSelectedFilter('ALERT')}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${
                selectedFilter === 'ALERT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              ⚠️ ต้องเติมสต็อก ({stats.lowStockCount + stats.outOfStockCount})
            </button>
          </div>
        </div>

        {/* Item List Header & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              รายการสิ่งของในตู้นี้ ({filteredItems.length + filteredAssets.length} รายการ)
            </span>
            <span className="text-[10px] text-slate-400">• อัปเดตแบบเรียลไทม์</span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => handleViewModeChange('TABLE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>แบบรายการ</span>
            </button>
            <button
              onClick={() => handleViewModeChange('CARD')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'CARD'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>แบบการ์ด</span>
            </button>
          </div>
        </div>

        {/* Items Grid / Table */}
        {filteredItems.length === 0 && filteredAssets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">ไม่พบสิ่งของที่ตรงกับคำค้นหาในตู้นี้</p>
          </div>
        ) : viewMode === 'TABLE' ? (
          /* VIEW 2: Compact Table View (Checklist style for fast counting) */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  <tr>
                    <th className="py-3 px-4">รหัส / รายการพัสดุ</th>
                    <th className="py-3 px-3">หมวดหมู่</th>
                    <th className="py-3 px-3 text-center">คงเหลือในตู้</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Items */}
                  {filteredItems.map((item: any) => {
                    const isInStock = item.stockStatus === 'IN_STOCK';
                    const isLowStock = item.stockStatus === 'LOW_STOCK';
                    const isOutOfStock = item.stockStatus === 'OUT_OF_STOCK';
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedDetail({ type: 'CONSUMABLE', item })}
                        className="hover:bg-teal-50/50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-300 group-hover:underline">{item.code}</div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{item.name}</div>
                          {item.lots && item.lots.length > 0 && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                              Lot: {item.lots[0].lotNumber} {item.lots[0].expiryDate ? `| EXP: ${item.lots[0].expiryDate}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {item.categoryName}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-base font-black ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                            {item.totalQuantity}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1">{item.unit || 'ชิ้น'}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isInStock && (
                            <span className="inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              พร้อมใช้
                            </span>
                          )}
                          {isLowStock && (
                            <span className="inline-block text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                              ใกล้หมด
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="inline-block text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                              ของหมด
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDetail({ type: 'CONSUMABLE', item })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="ดูรายละเอียดข้อมูลพัสดุและล็อต"
                            >
                              <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span className="hidden sm:inline">ดูข้อมูล</span>
                            </button>
                            {currentUser ? (
                              <Link
                                href={item.type === 'CONSUMABLE' ? `/requisitions?itemId=${item.id}` : `/borrow?itemId=${item.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200/80 dark:border-teal-800"
                              >
                                <span>{item.type === 'CONSUMABLE' ? 'ขอเบิก' : 'ขอยืม'}</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/login?redirect=${encodeURIComponent(item.type === 'CONSUMABLE' ? `/requisitions?itemId=${item.id}` : `/borrow?itemId=${item.id}`)}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>{item.type === 'CONSUMABLE' ? 'เข้าสู่ระบบเพื่อเบิก' : 'เข้าสู่ระบบเพื่อยืม'}</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Assets */}
                  {filteredAssets.map((asset: any) => {
                    const isAvailable = asset.status === 'AVAILABLE';
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => setSelectedDetail({ type: 'EQUIPMENT', item: asset })}
                        className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 group-hover:underline">{asset.assetCode}</div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{asset.itemName}</div>
                          {asset.serialNumber && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">S/N: {asset.serialNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {asset.categoryName}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-base font-black text-indigo-600 dark:text-indigo-400">1</span>
                          <span className="text-[11px] text-slate-400 ml-1">เครื่อง</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isAvailable ? (
                            <span className="inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              พร้อมยืม
                            </span>
                          ) : (
                            <span className="inline-block text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                              {asset.status === 'BORROWED' ? 'กำลังถูกยืม' : asset.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDetail({ type: 'EQUIPMENT', item: asset })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="ดูรายละเอียดครุภัณฑ์"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="hidden sm:inline">ดูข้อมูล</span>
                            </button>
                            {currentUser ? (
                              <Link
                                href={`/borrow?assetCode=${asset.assetCode}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800"
                              >
                                <span>ขอยืม</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/login?redirect=${encodeURIComponent(`/borrow?assetCode=${asset.assetCode}`)}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>เข้าสู่ระบบเพื่อยืม</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VIEW 1: Modern Card View (Clean, High Contrast, Readable) */
          <div className="space-y-3">
            {/* Consumable & Equipment Items */}
            {filteredItems.map((item: any) => {
              const isInStock = item.stockStatus === 'IN_STOCK';
              const isLowStock = item.stockStatus === 'LOW_STOCK';
              const isOutOfStock = item.stockStatus === 'OUT_OF_STOCK';
              const photoUrl = formatImageUrl(item.imageUrl);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDetail({ type: 'CONSUMABLE', item })}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 hover:border-teal-500/60 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Item Image or Placeholder */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700 overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800 group-hover:underline">
                          {item.code}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                          {item.categoryName}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {item.name}
                      </h3>

                      {/* Active Lots Details */}
                      {item.lots && item.lots.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {item.lots.map((lot: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <Calendar className="w-3 h-3 text-teal-500" />
                              <span>Lot: {lot.lotNumber}</span>
                              {lot.expiryDate && (
                                <span className="text-slate-400">EXP: {lot.expiryDate}</span>
                              )}
                              <span className="font-bold text-teal-600 dark:text-teal-400">({lot.remainingQuantity})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stock Quantity & Status Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 font-medium">คงเหลือในตู้</div>
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">
                        {item.totalQuantity}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.unit || 'ชิ้น'}</span>
                      </div>
                      <div className="mt-1">
                        {isInStock && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            พร้อมใช้งาน
                          </span>
                        )}
                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            ใกล้หมดสต็อก
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            ของหมดตู้
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Buttons */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedDetail({ type: 'CONSUMABLE', item })}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="ดูรายละเอียดข้อมูลพัสดุ"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>ดูข้อมูล</span>
                      </button>
                      {currentUser ? (
                        <Link
                          href={item.type === 'CONSUMABLE' ? `/requisitions?itemId=${item.id}` : `/borrow?itemId=${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-800 dark:text-teal-200 text-xs font-bold transition border border-teal-200/80 dark:border-teal-800 cursor-pointer shadow-xs"
                        >
                          <span>{item.type === 'CONSUMABLE' ? 'ขอเบิก' : 'ขอยืม'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/login?redirect=${encodeURIComponent(item.type === 'CONSUMABLE' ? `/requisitions?itemId=${item.id}` : `/borrow?itemId=${item.id}`)}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-medium transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="เข้าสู่ระบบเพื่อทำรายการ"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>เข้าสู่ระบบ</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Individual Assets */}
            {filteredAssets.map((asset: any) => {
              const isAvailable = asset.status === 'AVAILABLE';
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedDetail({ type: 'EQUIPMENT', item: asset })}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 hover:border-indigo-500/60 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                      {asset.imageUrl ? (
                        <img src={formatImageUrl(asset.imageUrl)} alt={asset.itemName} className="w-full h-full object-cover" />
                      ) : (
                        <Wrench className="w-6 h-6" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 group-hover:underline">
                          {asset.assetCode}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                          {asset.categoryName}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {asset.itemName}
                      </h3>
                      {asset.serialNumber && (
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">S/N: {asset.serialNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 font-medium">สถานะในตู้</div>
                      <div className="mt-1">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            พร้อมใช้งานในตู้
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            {asset.status === 'BORROWED' ? 'กำลังถูกยืม' : asset.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedDetail({ type: 'EQUIPMENT', item: asset })}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="ดูรายละเอียดข้อมูลครุภัณฑ์"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>ดูข้อมูล</span>
                      </button>
                      {currentUser ? (
                        <Link
                          href={`/borrow?assetCode=${asset.assetCode}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition border border-indigo-200/80 dark:border-indigo-800 cursor-pointer shadow-xs"
                        >
                          <span>ขอยืมเครื่องนี้</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/login?redirect=${encodeURIComponent(`/borrow?assetCode=${asset.assetCode}`)}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-medium transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="เข้าสู่ระบบเพื่อขอยืม"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>เข้าสู่ระบบ</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Item / Asset Detail */}
        {selectedDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedDetail.type === 'CONSUMABLE'
                      ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  }`}>
                    {selectedDetail.type === 'CONSUMABLE' ? 'วัสดุสิ้นเปลือง' : 'ครุภัณฑ์'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedDetail.type === 'CONSUMABLE' ? selectedDetail.item.code : selectedDetail.item.assetCode}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo & Title */}
              <div className="space-y-3">
                {selectedDetail.item.imageUrl ? (
                  <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 relative">
                    <img
                      src={formatImageUrl(selectedDetail.item.imageUrl)}
                      alt={selectedDetail.item.name || selectedDetail.item.itemName}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                ) : null}

                <div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    หมวดหมู่: {selectedDetail.item.categoryName}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {selectedDetail.item.name || selectedDetail.item.itemName}
                  </h3>
                </div>
              </div>

              {/* Content Details */}
              {selectedDetail.type === 'CONSUMABLE' ? (
                <div className="space-y-4">
                  {/* Stock Stats in this cabinet */}
                  <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-teal-800 dark:text-teal-300 font-medium">คงเหลือพร้อมใช้ในตู้นี้</div>
                      <div className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">
                        {selectedDetail.item.totalQuantity}{' '}
                        <span className="text-sm font-semibold text-teal-900/70 dark:text-teal-400">
                          {selectedDetail.item.unit || 'หน่วย'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedDetail.item.stockStatus === 'IN_STOCK' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> พร้อมใช้
                        </span>
                      )}
                      {selectedDetail.item.stockStatus === 'LOW_STOCK' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-1 rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> ใกล้หมดสต็อก
                        </span>
                      )}
                      {selectedDetail.item.stockStatus === 'OUT_OF_STOCK' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> ของหมด
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-unit Conversion (if any) */}
                  {selectedDetail.item.usageUnit && selectedDetail.item.conversionRatio && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">อัตราแปลงหน่วยย่อย:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        1 {selectedDetail.item.unit} = {selectedDetail.item.conversionRatio} {selectedDetail.item.usageUnit}
                      </span>
                    </div>
                  )}

                  {/* Brand / Model */}
                  {(selectedDetail.item.brand || selectedDetail.item.model) && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedDetail.item.brand && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">ยี่ห้อ (Brand)</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetail.item.brand}</span>
                        </div>
                      )}
                      {selectedDetail.item.model && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">รุ่น (Model)</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetail.item.model}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lots in this cabinet */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-teal-600" />
                        ทุกล็อตที่อยู่ในตู้นี้ ({selectedDetail.item.lots?.length || 0} ล็อต)
                      </span>
                    </div>
                    {selectedDetail.item.lots && selectedDetail.item.lots.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedDetail.item.lots.map((lot: any, idx: number) => {
                          const isExpired = lot.expiryDate && new Date(lot.expiryDate) < new Date();
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                                isExpired
                                  ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700'
                              }`}
                            >
                              <div>
                                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  <span>Lot: {lot.lotNumber}</span>
                                  {isExpired && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                                      หมดอายุแล้ว
                                    </span>
                                  )}
                                </div>
                                {lot.expiryDate && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>วันหมดอายุ (EXP): {lot.expiryDate}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-teal-700 dark:text-teal-300">
                                  {lot.remainingQuantity}
                                </span>
                                <span className="text-[11px] text-slate-500 ml-1">{selectedDetail.item.unit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                        ไม่มีรายการล็อตที่มียอดคงเหลือ
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedDetail.item.description && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-400 text-[10px] block font-bold mb-1">สเปก / ข้อควรระวัง</span>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {selectedDetail.item.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* EQUIPMENT DETAILS */
                <div className="space-y-4">
                  {/* Status Box */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">รหัสเครื่องประจำห้องแล็บ</div>
                      <div className="font-mono text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {selectedDetail.item.assetCode}
                      </div>
                    </div>
                    <div>
                      {selectedDetail.item.status === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> พร้อมใช้งาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-1 rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {selectedDetail.item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Serial Number & Attributes */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedDetail.item.serialNumber && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2">
                        <span className="text-slate-400 block text-[10px]">หมายเลขเครื่อง (Serial Number / S/N)</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedDetail.item.serialNumber}</span>
                      </div>
                    )}
                    {selectedDetail.item.brand && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">ยี่ห้อ (Brand)</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetail.item.brand}</span>
                      </div>
                    )}
                    {selectedDetail.item.model && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">รุ่น (Model)</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetail.item.model}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedDetail.item.description && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-400 text-[10px] block font-bold mb-1">สเปก / ข้อควรระวัง</span>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {selectedDetail.item.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  href={
                    selectedDetail.type === 'CONSUMABLE'
                      ? `/consumable/${selectedDetail.item.code}`
                      : `/asset/${selectedDetail.item.assetCode}`
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition inline-flex items-center gap-1.5"
                >
                  <span>เปิดหน้าเต็ม</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                {selectedDetail.type === 'CONSUMABLE' ? (
                  currentUser ? (
                    <Link
                      href={`/requisitions?itemId=${selectedDetail.item.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-600/20 transition inline-flex items-center gap-1.5"
                    >
                      <span>ขอเบิกวัสดุนี้</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </Link>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/requisitions?itemId=${selectedDetail.item.id}`)}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 transition inline-flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>เข้าสู่ระบบเพื่อขอเบิก</span>
                    </Link>
                  )
                ) : (
                  currentUser ? (
                    <Link
                      href={`/borrow?assetCode=${selectedDetail.item.assetCode}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition inline-flex items-center gap-1.5"
                    >
                      <span>ขอยืมเครื่องนี้</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </Link>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/borrow?assetCode=${selectedDetail.item.assetCode}`)}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 transition inline-flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>เข้าสู่ระบบเพื่อขอยืม</span>
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Helper Card */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-2xl p-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            ระบบสแกนตรวจสอบพัสดุและครุภัณฑ์ประจำตู้แบบเรียลไทม์
          </p>
          <p className="text-[11px]">
            ข้อมูลเชื่อมตรงกับฐานข้อมูลคลังพัสดุกลาง คณะพยาบาลศาสตร์ • หากพบพัสดุไม่ตรงตู้กรุณาติดต่อเจ้าหน้าที่ห้องปฏิบัติการ
          </p>
        </div>
      </div>
    </div>
  );
}
