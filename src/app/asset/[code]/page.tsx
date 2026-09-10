'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatImageUrl } from '@/lib/image-helper';
import {
  Tag,
  MapPin,
  Calendar,
  Coins,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BriefcaseMedical,
  Stethoscope,
  Building2,
  Share2,
  LogIn,
  ArrowRight,
  ShieldCheck,
  User,
  Info,
  ChevronLeft
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PublicAssetPage() {
  const params = useParams();
  const rawCode = params?.code ? String(params.code) : '';
  const { currentUser } = useAuth();

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!rawCode) return;

    async function fetchAsset() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assets/public/${encodeURIComponent(rawCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.redirectUrl) {
            window.location.replace(data.redirectUrl);
            return;
          }
          setAsset(data);
        } else {
          const err = await res.json();
          setError(err.error || 'ไม่พบข้อมูลอุปกรณ์ชิ้นนี้');
        }
      } catch (err: any) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setLoading(false);
      }
    }

    fetchAsset();
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
        <LoadingSpinner message="กำลังค้นหาข้อมูลครุภัณฑ์..." submessage="กรุณารอสักครู่" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">ไม่พบข้อมูลครุภัณฑ์</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'รหัส QR Code หรือหมายเลขครุภัณฑ์นี้ไม่ถูกต้อง หรืออาจถูกลบออกจากระบบแล้ว'}
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

  const photoUrl = formatImageUrl(asset.imageUrl);
  const isAvailable = asset.status === 'AVAILABLE';
  const isBorrowed = asset.status === 'BORROWED';
  const isMaintenance = asset.status === 'MAINTENANCE';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 flex flex-col items-center justify-start font-sans">
      <div className="max-w-xl w-full space-y-4">
        {/* Top Public Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Link href="/" className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                ระบบข้อมูลครุภัณฑ์พยาบาล
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                คณะพยาบาลศาสตร์ / Nursing Lab
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="คัดลอกลิงก์หน้านี้"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {currentUser ? (
              <Link
                href="/inventory"
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1"
              >
                <span>เข้าสู่ระบบแล้ว</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </div>

        {copied && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs text-center font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
            คัดลอกลิงก์หน้าครุภัณฑ์เรียบร้อยแล้ว!
          </div>
        )}

        {/* Main Asset Detail Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {/* Photo Header */}
          <div className="relative bg-slate-100 dark:bg-slate-850 aspect-video sm:aspect-[2/1] overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={asset.item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-300 flex flex-col items-center gap-2">
                <BriefcaseMedical className="w-16 h-16" />
                <span className="text-xs">ไม่มีรูปภาพครุภัณฑ์</span>
              </div>
            )}

            {/* Floating Status Badge */}
            <div className="absolute top-4 right-4">
              {isAvailable && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" /> พร้อมใช้งาน
                </span>
              )}
              {isBorrowed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                  <Clock className="w-4 h-4" /> กำลังถูกยืมอยู่
                </span>
              )}
              {isMaintenance && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                  <Wrench className="w-4 h-4" /> กำลังส่งซ่อมบำรุง
                </span>
              )}
            </div>

            {/* Sequence Number */}
            <div className="absolute bottom-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-md">
                {asset.item?.unit || 'ชิ้น'}ที่ {asset.sequenceNumber || 1}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Title & Codes */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                  รหัสแล็บ: {asset.assetCode}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  {asset.item.category}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                {asset.item.name}
              </h1>

              {asset.govAssetCode && (
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>เลขครุภัณฑ์ราชการ: <b className="text-slate-800 dark:text-slate-200">{asset.govAssetCode}</b></span>
                </div>
              )}
            </div>

            {/* Maintenance Banner (If under repair) */}
            {isMaintenance && asset.activeMaintenance && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300 text-sm">
                  <Wrench className="w-4 h-4 text-rose-600 dark:text-rose-400" /> อยู่ระหว่างการส่งซ่อมบำรุง
                </div>
                <div><b>อาการชำรุด:</b> {asset.activeMaintenance.issue}</div>
                {asset.activeMaintenance.repairShop && (
                  <div><b>ส่งซ่อมที่:</b> {asset.activeMaintenance.repairShop}</div>
                )}
                {asset.activeMaintenance.technicianNote && (
                  <div><b>หมายเหตุช่าง:</b> {asset.activeMaintenance.technicianNote}</div>
                )}
              </div>
            )}

            {/* Available Banner */}
            {isAvailable && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> ครุภัณฑ์นี้พร้อมใช้งานในห้องแล็บ
                </div>
                <div className="text-emerald-700 dark:text-emerald-300 font-medium">
                  สถานะว่าง ไม่มีคิวยืมค้างอยู่ สามารถยื่นคำขอเพื่อนำไปฝึกปฏิบัติการได้ทันที
                </div>
              </div>
            )}

            {/* Borrowed Banner (If currently borrowed) */}
            {isBorrowed && asset.activeBorrow && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                asset.activeBorrow.isOverdue
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
                  : 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="font-black flex items-center gap-1.5 text-sm">
                    <Clock className={`w-4 h-4 ${asset.activeBorrow.isOverdue ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span>กำลังถูกยืมใช้งาน</span>
                  </div>
                  {asset.activeBorrow.isOverdue ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                      ⚠️ เกินกำหนดส่งคืน
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      กำลังใช้งาน
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">ผู้ยืมปัจจุบัน</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {asset.activeBorrow.borrowerName}
                    </span>
                    {asset.activeBorrow.borrowerStudentId && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        รหัสนิสิต: {asset.activeBorrow.borrowerStudentId}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {asset.activeBorrow.department}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">กำหนดวันเวลาส่งคืน</span>
                    <span className={`font-bold text-xs block ${asset.activeBorrow.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {asset.activeBorrow.expectedReturnDate
                        ? new Date(asset.activeBorrow.expectedReturnDate).toLocaleString('th-TH')
                        : 'ไม่ระบุ'}
                    </span>
                    {asset.activeBorrow.borrowDate && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                        ยืมเมื่อ: {new Date(asset.activeBorrow.borrowDate).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] pt-1 text-slate-700 dark:text-slate-300">
                  {asset.activeBorrow.course && (
                    <div><b>วิชาที่นำไปใช้:</b> {asset.activeBorrow.course}</div>
                  )}
                  {asset.activeBorrow.purpose && (
                    <div><b>วัตถุประสงค์:</b> {asset.activeBorrow.purpose}</div>
                  )}
                  {asset.activeBorrow.requestNumber && (
                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      เลขคำขอ: {asset.activeBorrow.requestNumber}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Specs & Location Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> สถานที่จัดเก็บประจำ
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{asset.location}</div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> สภาพอุปกรณ์
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {asset.condition === 'GOOD' ? 'สมบูรณ์ดี (Good)' : asset.condition === 'FAIR' ? 'พอใช้ (Fair)' : 'ชำรุด (Damaged)'}
                </div>
              </div>

              {asset.serialNumber && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500">Serial Number (SN)</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{asset.serialNumber}</div>
                </div>
              )}

              {asset.cost && asset.cost > 0 && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> ราคา/มูลค่าจัดซื้อ
                  </div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">
                    ฿{Number(asset.cost).toLocaleString('th-TH')} บาท
                  </div>
                </div>
              )}

              {asset.receivedDate && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> วันที่รับเข้าคลัง
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(asset.receivedDate).toLocaleDateString('th-TH')}
                  </div>
                </div>
              )}
            </div>

            {/* Description & Usage Guide */}
            {asset.item.description && (
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> รายละเอียดและคำแนะนำการใช้งาน:
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50/70 dark:bg-slate-850/80 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {asset.item.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              {currentUser ? (
                <Link
                  href={`/borrow?assetCode=${encodeURIComponent(asset.assetCode)}`}
                  className={`w-full py-3 rounded-2xl text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                    isAvailable
                      ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                      : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <BriefcaseMedical className="w-4 h-4" />
                  <span>{isAvailable ? 'ทำเรื่องขอยืมอุปกรณ์ชิ้นนี้' : 'อุปกรณ์ไม่พร้อมให้ยืมชั่วคราว'}</span>
                </Link>
              ) : (
                <Link
                  href={`/login?redirect=/borrow?assetCode=${encodeURIComponent(asset.assetCode)}`}
                  className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบเพื่อทำเรื่องขอยืมชิ้นนี้</span>
                </Link>
              )}

              <Link
                href="/inventory"
                className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>ดูทะเบียนพัสดุทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
          <div>ระบบบริหารจัดการห้องปฏิบัติการพยาบาลศาสตร์</div>
          <div>สแกน QR Code จากตัวเครื่องเพื่อเปิดดูข้อมูลแบบสาธารณะโดยไม่ต้องล็อกอิน</div>
        </div>
      </div>
    </div>
  );
}
