'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatImageUrl } from '@/lib/image-helper';
import {
  Box,
  Tag,
  MapPin,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BriefcaseMedical,
  Share2,
  LogIn,
  ArrowRight,
  ShieldCheck,
  User,
  Info,
  ChevronLeft,
  Sparkles,
  PackageCheck
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PublicConsumablePage() {
  const params = useParams();
  const rawCode = params?.code ? String(params.code) : '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!rawCode) return;

    async function fetchConsumable() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/consumables/public/${encodeURIComponent(rawCode)}`);
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        } else {
          const err = await res.json();
          setError(err.error || 'ไม่พบข้อมูลเวชภัณฑ์นี้');
        }
      } catch (err: any) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setLoading(false);
      }
    }

    fetchConsumable();
  }, [rawCode]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner message="กำลังค้นหาข้อมูลวัสดุสิ้นเปลือง..." submessage="กรุณารอสักครู่" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ไม่พบข้อมูลวัสดุสิ้นเปลือง</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'รหัส QR Code หรือหมายเลขเวชภัณฑ์นี้ไม่ถูกต้อง หรืออาจถูกยกเลิกแล้ว'}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลักของระบบ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { type, item } = data;
  const photoUrl = formatImageUrl(item?.imageUrl);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/90">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <BriefcaseMedical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900 leading-tight">
                คณะพยาบาลศาสตร์
              </h1>
              <p className="text-[10px] font-bold text-teal-700 tracking-wider">
                ระบบข้อมูลเวชภัณฑ์และคลังพัสดุ
              </p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="คัดลอกลิงก์ข้อมูลนี้"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copied ? 'คัดลอกแล้ว!' : 'แชร์'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Scanned Badge Banner */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          {/* Badge: BOX, PACK, or LOT */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {type === 'BOX' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                  <Box className="w-3.5 h-3.5" />
                  <span>สแกนจากกล่องเวชภัณฑ์ (Stock Box)</span>
                </span>
              )}
              {type === 'PACK' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ซองเวชภัณฑ์ปลอดเชื้อ (Sterile Repack)</span>
                </span>
              )}
              {type === 'LOT' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>ล็อตคงคลัง (Stock Lot)</span>
                </span>
              )}
              {type === 'ITEM' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
                  <Tag className="w-3.5 h-3.5" />
                  <span>รายการวัสดุสิ้นเปลือง</span>
                </span>
              )}
            </div>

            {item.categoryName && (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                {item.categoryName}
              </span>
            )}
          </div>

          {/* Title & Item Name */}
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-snug">
              {item.name}
            </h2>
            <div className="font-mono text-xs text-slate-500 font-bold mt-0.5">
              รหัสพัสดุ: {item.code}
            </div>
          </div>

          {/* Picture if available */}
          {photoUrl && (
            <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              <img
                src={photoUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* SPECIFIC DETAILS: BOX */}
          {type === 'BOX' && (
            <div className="space-y-3">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  data.status === 'DEPLETED'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : data.status === 'IN_USE'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${
                    data.status === 'DEPLETED'
                      ? 'bg-rose-600'
                      : data.status === 'IN_USE'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  <Box className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-black text-sm">
                    {data.status === 'DEPLETED'
                      ? '🔴 กล่องนี้ถูกเบิก/ใช้หมดแล้ว (Depleted)'
                      : data.status === 'IN_USE'
                      ? '🟡 กล่องนี้กำลังเปิดใช้งาน (In-Use)'
                      : '🟢 พร้อมใช้งานในสต็อก (In Stock)'}
                  </div>
                  <div className="text-xs font-semibold opacity-80">
                    กล่องที่ {data.boxNumberInLot}/{data.lot.quantityInitial} ในล็อตนี้ (กล่องที่ {data.boxNumberInYear} ประจำปี {data.year})
                  </div>
                </div>
              </div>

              {/* Box Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">รหัสประจำกล่อง</span>
                  <span className="font-mono font-black text-slate-800 text-xs">{data.boxCode}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">เลขอ้างอิง Lot</span>
                  <span className="font-mono font-bold text-teal-800 text-xs">{data.lot.lotNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">วันที่ซื้อ / รับเข้า</span>
                  <span className="font-bold text-slate-800">
                    {data.lot.receivedDate ? new Date(data.lot.receivedDate).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">วันหมดอายุ (EXP)</span>
                  <span className="font-bold text-rose-600">
                    {data.lot.expiryDate ? new Date(data.lot.expiryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                  </span>
                </div>
              </div>

              {/* Location */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2 text-xs text-slate-700">
                <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>
                  <strong>สถานที่จัดเก็บ:</strong> {item.location || 'ห้องปฏิบัติการพยาบาล'}
                </span>
              </div>
            </div>
          )}

          {/* SPECIFIC DETAILS: STERILE PACK */}
          {type === 'PACK' && (
            <div className="space-y-3">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  data.status === 'AVAILABLE'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${
                    data.status === 'AVAILABLE' ? 'bg-emerald-600' : 'bg-slate-500'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-black text-sm">
                    {data.status === 'AVAILABLE'
                      ? '🟢 ปลอดเชื้อ พร้อมใช้งาน (Sterile Available)'
                      : '⚪ ซองนี้ถูกเบิกใช้งานแล้ว'}
                  </div>
                  <div className="text-xs font-semibold opacity-80">
                    ซองที่ {data.packNumber}/{data.repackRecord.totalPacksProduced} (บรรจุ {data.unitsCount} {item.usageUnit || 'ชิ้น'})
                  </div>
                </div>
              </div>

              {/* Pack Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">รหัสซองย่อย</span>
                  <span className="font-mono font-black text-teal-900 text-xs">{data.packCode}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">รหัส Sub-lot</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{data.repackRecord.subLotNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">วันที่แพ็ค/อบฆ่าเชื้อ</span>
                  <span className="font-bold text-slate-800">
                    {data.repackRecord.packedDate ? new Date(data.repackRecord.packedDate).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">วันหมดอายุความปลอดเชื้อ</span>
                  <span className="font-bold text-rose-600">
                    {data.repackRecord.sterileExpiryDate ? new Date(data.repackRecord.sterileExpiryDate).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
              </div>

              {/* Sterilization Method & Operator */}
              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span><strong>วิธีฆ่าเชื้อ:</strong> {data.repackRecord.sterilizeMethod || 'Autoclave ไอน้ำแรงดันสูง'}</span>
                </div>
                {data.repackRecord.operatorName && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span><strong>ผู้จัดเตรียม/อบ:</strong> {data.repackRecord.operatorName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span><strong>สถานที่จัดเก็บ:</strong> {item.location || 'ตู้เก็บของปลอดเชื้อ ห้องแล็บพยาบาล'}</span>
                </div>
              </div>
            </div>
          )}

          {/* SPECIFIC DETAILS: LOT */}
          {type === 'LOT' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-black text-sm">
                    เลข Lot: {data.lot.lotNumber}
                  </div>
                  <div className="text-xs font-semibold text-teal-800">
                    คงเหลือในสต็อก: {data.lot.quantityRemaining} {item.unit}
                    {data.lot.openPackRemainder > 0 && ` (+เศษเปิด ${data.lot.openPackRemainder} ${item.usageUnit || 'ชิ้น'})`}
                  </div>
                </div>
              </div>

              {data.lot.nextBox && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <span className="text-lg">👉</span>
                  <div>
                    <strong>กล่องถัดไปที่ระบบแนะนำให้หยิบ:</strong> กล่องที่ {data.lot.nextBox.boxNumberInLot} ({data.lot.nextBox.boxCode})
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">วันที่รับเข้า</span>
                  <span className="font-bold text-slate-800">
                    {data.lot.receivedDate ? new Date(data.lot.receivedDate).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block">วันหมดอายุ</span>
                  <span className="font-bold text-rose-600">
                    {data.lot.expiryDate ? new Date(data.lot.expiryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2 text-xs text-slate-700">
                <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span><strong>สถานที่จัดเก็บ:</strong> {item.location || 'ห้องปฏิบัติการพยาบาล'}</span>
              </div>
            </div>
          )}

          {/* SPECIFIC DETAILS: ITEM */}
          {type === 'ITEM' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-between">
                <div>
                  <span className="text-xs text-teal-700 font-bold block">ยอดคงเหลือรวมทั้งหมดในคลัง:</span>
                  <span className="text-lg font-black text-teal-900">{data.item.totalStock} {data.item.unit}</span>
                  {data.item.totalOpenRemainders > 0 && (
                    <span className="ml-2 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      + เศษเปิด {data.item.totalOpenRemainders} {data.item.usageUnit || 'ชิ้น'}
                    </span>
                  )}
                </div>
                <div className="text-right text-slate-500">
                  <div>มีทั้งหมด {data.item.lotsCount} ล็อต</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span><strong>สถานที่จัดเก็บหลัก:</strong> {item.location || 'ห้องปฏิบัติการพยาบาล'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href="/login"
            className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบเพื่อทำเรื่องขอเบิกพัสดุนี้</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>กลับสู่หน้าหลักห้องแล็บพยาบาล</span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-400 py-3">
          คณะพยาบาลศาสตร์ • ระบบบริหารจัดการห้องปฏิบัติการและครุภัณฑ์อัจฉริยะ
        </div>
      </main>
    </div>
  );
}
