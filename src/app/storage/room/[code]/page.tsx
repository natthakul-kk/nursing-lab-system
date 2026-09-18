'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DoorClosed,
  Archive,
  Search,
  MapPin,
  Users,
  Package,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Share2,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function RoomStoragePage() {
  const params = useParams();
  const router = useRouter();
  const codeParam = (params?.code as string) || '';

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'CABINETS' | 'ITEM_FINDER'>('CABINETS');
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoomData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/storage/rooms/${encodeURIComponent(codeParam)}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'ไม่พบข้อมูลห้องปฏิบัติการ');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (codeParam) {
      fetchRoomData();
    }
  }, [codeParam]);

  const typeLabels: Record<string, string> = {
    CABINET: 'ตู้เก็บอุปกรณ์',
    SHELF: 'ชั้นวางของ',
    DRAWER: 'ลิ้นชัก',
    CART: 'รถเข็นหัตถการ',
    ROOM: 'ห้องเก็บของย่อย',
  };

  // Cross-cabinet search results
  const searchResults = useMemo(() => {
    if (!data?.allItems || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return data.allItems.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
        item.cabinetName.toLowerCase().includes(q) ||
        item.cabinetCode.toLowerCase().includes(q)
      );
    });
  }, [data?.allItems, searchQuery]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ผังตู้และพัสดุในห้อง ${data?.room?.name} (${data?.room?.code})`,
          text: `สแกนดูตู้และพัสดุทั้งหมดในห้อง ${data?.room?.name}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('คัดลอกลิงก์ห้องเรียบร้อยแล้ว');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">กำลังเชื่อมต่อข้อมูลห้องปฏิบัติการ...</p>
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">ไม่พบข้อมูลห้องปฏิบัติการ</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{error || 'รหัส QR Code อาจไม่ถูกต้อง'}</p>
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

  const { room, cabinets, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-950 text-white px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-md border border-white/30 backdrop-blur-md">
                  {room.code}
                </span>
                <span className="text-[11px] font-semibold bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  เปิดใช้งานตามปกติ
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-white flex items-center gap-2">
                <DoorClosed className="w-7 h-7 text-teal-300 inline-block shrink-0" />
                <span>{room.name}</span>
              </h1>
              <p className="text-xs text-teal-100/80 flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>{room.location || 'อาคารวิทยบริการ ชั้น 3'}</span>
                {room.capacity && (
                  <>
                    <span>•</span>
                    <Users className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span>รองรับ {room.capacity} คน</span>
                  </>
                )}
              </p>
              {room.description && (
                <p className="text-[11px] text-teal-200/90 mt-1.5 bg-black/20 px-2.5 py-1 rounded-lg inline-block">
                  {room.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <button
                onClick={() => fetchRoomData(true)}
                disabled={refreshing}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10 disabled:opacity-60"
                title="รีเฟรชยอดสต็อกล่าสุด"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10"
                title="แชร์ข้อมูลห้อง"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-4">
        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white leading-none">{stats.totalCabinets}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ตู้ / จุดจัดเก็บในห้อง</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-none">{stats.totalItems}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">รายการวัสดุรวม</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.inStockCount}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">พร้อมใช้</div>
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
        </div>

        {/* Room Item Finder (Prominent Search Feature) */}
        <div className="bg-gradient-to-br from-teal-50 to-indigo-50/50 dark:from-slate-900 dark:to-teal-950/30 p-4 rounded-3xl border border-teal-200/70 dark:border-teal-900/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  ค้นหาพัสดุข้ามตู้ในห้องนี้ (Room Item Finder)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  พิมพ์ชื่อของ เพื่อดูทันทีว่าเก็บอยู่ในตู้ไหน ชั้นใด และเหลือกี่ชิ้น
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-teal-600 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="พิมพ์ชื่อพัสดุ เช่น Syringe, เข็ม, สำลี, NSS, หุ่น CPR..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim() && activeTab !== 'ITEM_FINDER') {
                  setActiveTab('ITEM_FINDER');
                }
              }}
              className="w-full bg-white dark:bg-slate-800 border-2 border-teal-300 dark:border-teal-700 text-slate-900 dark:text-slate-100 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600 transition shadow-inner"
            />
          </div>

          {/* Quick Search Suggestions */}
          {!searchQuery && (
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1 text-slate-500 dark:text-slate-400">
              <span>ค้นหายอดนิยม:</span>
              {['เข็มฉีดยา', 'สำลี', 'ผ้าก๊อซ', 'NSS', 'หุ่น'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchQuery(tag);
                    setActiveTab('ITEM_FINDER');
                  }}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-700 dark:text-teal-300 font-medium border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs: Cabinets Overview vs All Items Finder */}
        <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('CABINETS')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'CABINETS'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>ตู้และจุดจัดเก็บในห้อง ({cabinets.length} ตู้)</span>
          </button>
          <button
            onClick={() => setActiveTab('ITEM_FINDER')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ITEM_FINDER'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>
              {searchQuery.trim()
                ? `ผลการค้นหา (${searchResults.length})`
                : `พัสดุทั้งหมดในห้อง (${data.allItems.length})`}
            </span>
          </button>
        </div>

        {/* Tab 1: Cabinets Grid */}
        {activeTab === 'CABINETS' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {cabinets.map((cabinet: any) => (
                <div
                  key={cabinet.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-teal-500/50 hover:shadow-md transition p-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-200/70 dark:border-teal-800">
                        {cabinet.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {typeLabels[cabinet.type] || cabinet.type}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {cabinet.name}
                    </h3>

                    {cabinet.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {cabinet.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-teal-600" />
                        <b>{cabinet.itemCount}</b> รายการ
                      </span>
                      {cabinet.assetCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                          <b>{cabinet.assetCount}</b> ชิ้นครุภัณฑ์
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {cabinet.floor} • {cabinet.building}
                    </span>
                    <Link
                      href={`/storage/${cabinet.code}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <span>ดูของในตู้นี้</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Item Finder Results */}
        {activeTab === 'ITEM_FINDER' && (
          <div className="space-y-3">
            {searchQuery.trim() && searchResults.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  ไม่พบพัสดุ &quot;{searchQuery}&quot; ในห้องนี้
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ลองค้นหาด้วยคำอื่น หรือติดต่อเจ้าหน้าที่ประจำห้องปฏิบัติการ
                </p>
              </div>
            ) : (
              (searchQuery.trim() ? searchResults : data.allItems).map((item: any) => {
                const isInStock = item.stockStatus === 'IN_STOCK';
                const isLowStock = item.stockStatus === 'LOW_STOCK';
                const isOutOfStock = item.stockStatus === 'OUT_OF_STOCK';

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 hover:border-teal-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-1.5 py-0.5 rounded border border-teal-200/60 dark:border-teal-800">
                          {item.code}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.categoryName}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h3>

                      {/* Cabinet Location Callout */}
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-1 rounded-xl border border-teal-200 dark:border-teal-800">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>เก็บใน:</span>
                        <span className="font-mono font-bold">{item.cabinetCode}</span>
                        <span>- {item.cabinetName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {item.totalQuantity}{' '}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.unit || 'ชิ้น'}</span>
                        </div>
                        <div>
                          {isInStock && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              พร้อมใช้งาน
                            </span>
                          )}
                          {isLowStock && (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              ใกล้หมดสต็อก
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              ของหมดตู้
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/storage/${item.cabinetCode}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <span>ไปที่ตู้นี้</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Quick Actions Footer */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="w-4 h-4 text-teal-600" />
              ต้องการใช้ห้องนี้เพื่อการเรียนการสอนหรือสอบประเมิน?
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              สามารถยื่นขอจองห้องออนไลน์ผ่านระบบตารางการใช้ห้องปฏิบัติการ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/practice"
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-sm cursor-pointer shrink-0"
            >
              จองห้องปฏิบัติการนี้
            </Link>
            <Link
              href="/requisition"
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold transition shadow-sm cursor-pointer shrink-0"
            >
              ขอเบิกพัสดุ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
