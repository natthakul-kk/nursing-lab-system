'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  QrCode,
  Layers,
  Archive,
  DoorClosed,
  Check,
  Download,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface PrintItem {
  id: string;
  code: string;
  name: string;
  type: string;
  floor?: string;
  building?: string;
  roomName?: string;
  itemCount?: number;
  assetCount?: number;
  qrCodeToken?: string;
  isRoom?: boolean;
}

interface CabinetQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageList: PrintItem[];
  defaultSelectedId?: string;
}

export default function CabinetQrPrintModal({
  isOpen,
  onClose,
  storageList,
  defaultSelectedId,
}: CabinetQrPrintModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stickerType, setStickerType] = useState<'DOOR' | 'SHELF' | 'ROOM_DOOR'>('DOOR');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultSelectedId) {
        setSelectedIds([defaultSelectedId]);
      } else if (storageList.length > 0) {
        setSelectedIds(storageList.map((s) => s.id));
      }
    }
  }, [isOpen, defaultSelectedId, storageList]);

  // Generate QR code data URLs whenever selected items or origin change
  useEffect(() => {
    if (!isOpen || selectedIds.length === 0) return;

    const generateQrs = async () => {
      setGenerating(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lab.nurse.ubu.ac.th';
      const map: Record<string, string> = {};

      for (const item of storageList.filter((s) => selectedIds.includes(s.id))) {
        const url = item.isRoom
          ? `${origin}/storage/room/${item.code}`
          : `${origin}/storage/${item.code}`;

        try {
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          });
          map[item.id] = qrDataUrl;
        } catch (err) {
          console.error('QR generation failed for', item.code, err);
        }
      }

      setQrImages(map);
      setGenerating(false);
    };

    generateQrs();
  }, [isOpen, selectedIds, storageList]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === storageList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(storageList.map((s) => s.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedItems = storageList.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      {/* Container - hide during print outside the printable area */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Header (Hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                พิมพ์ป้ายสติกเกอร์ QR Code ตู้ / ชั้น / ประตูห้อง
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                สติกเกอร์พร้อม QR Code สแกนดูสต็อกคงเหลือทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls (Hidden on print) */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-4 print:hidden bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Sticker Style Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">รูปแบบป้าย:</span>
              <button
                onClick={() => setStickerType('DOOR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  stickerType === 'DOOR'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                🏷️ ป้ายหน้าบานตู้ (100 x 75 mm)
              </button>
              <button
                onClick={() => setStickerType('SHELF')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  stickerType === 'SHELF'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                📏 ป้ายขอบชั้น/ลิ้นชัก (60 x 30 mm)
              </button>
              <button
                onClick={() => setStickerType('ROOM_DOOR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  stickerType === 'ROOM_DOOR'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                🚪 ป้ายประตูห้องปฏิบัติการ (A5 / 100x140 mm)
              </button>
            </div>

            {/* Print Action */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handlePrint}
                disabled={selectedIds.length === 0 || generating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์สติกเกอร์ ({selectedIds.length} รายการ)</span>
              </button>
            </div>
          </div>

          {/* Quick Select Checklist */}
          {storageList.length > 1 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  {selectedIds.length === storageList.length ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">เลือกแล้ว {selectedIds.length} จาก {storageList.length} รายการ</span>
              </div>
            </div>
          )}
        </div>

        {/* Printable Area / Live Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/40 print:bg-white print:p-0 print:overflow-visible">
          {generating ? (
            <div className="py-16 text-center text-slate-500">กำลังสร้าง QR Code ความละเอียดสูง...</div>
          ) : selectedItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400">กรุณาเลือกตู้หรือจุดจัดเก็บที่ต้องการพิมพ์</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:p-2">
              {selectedItems.map((item) => {
                const qrSrc = qrImages[item.id];
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const scanUrl = item.isRoom
                  ? `${origin}/storage/room/${item.code}`
                  : `${origin}/storage/${item.code}`;

                if (stickerType === 'SHELF') {
                  // Compact Shelf Edge Sticker (60 x 30 mm)
                  return (
                    <div
                      key={item.id}
                      className="bg-white border-2 border-slate-900 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm text-slate-900 print:break-inside-avoid print:shadow-none"
                      style={{ minHeight: '100px' }}
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="font-mono text-xs font-black tracking-wider text-teal-800 border-b border-slate-300 pb-0.5">
                          {item.code}
                        </div>
                        <div className="text-[11px] font-bold truncate mt-1">{item.name}</div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                          {item.floor} • {item.roomName}
                        </div>
                      </div>
                      <div className="w-16 h-16 shrink-0 bg-white p-0.5 border border-slate-300 rounded-md">
                        {qrSrc && <img src={qrSrc} alt={item.code} className="w-full h-full object-contain" />}
                      </div>
                    </div>
                  );
                }

                if (stickerType === 'ROOM_DOOR') {
                  // Room Door Sticker (Large)
                  return (
                    <div
                      key={item.id}
                      className="col-span-full max-w-md mx-auto bg-white border-4 border-teal-800 rounded-3xl p-6 text-slate-900 shadow-md print:break-inside-avoid print:shadow-none space-y-4"
                    >
                      <div className="text-center border-b-2 border-teal-800 pb-3">
                        <div className="text-[11px] font-bold tracking-widest text-teal-700 uppercase">
                          คณะพยาบาลศาสตร์ • ศูนย์ฝึกทักษะทางการพยาบาล
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-1">{item.name}</h2>
                        <div className="inline-block mt-1 font-mono text-sm font-black bg-teal-800 text-white px-3 py-0.5 rounded-lg">
                          ห้องปฏิบัติการ: {item.code}
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-inner border border-slate-300">
                          {qrSrc && <img src={qrSrc} alt={item.code} className="w-full h-full object-contain" />}
                        </div>
                        <span className="text-xs font-bold text-teal-800 mt-2 flex items-center gap-1">
                          📱 สแกนเพื่อดูตู้และพัสดุทั้งหมดในห้องนี้
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">{scanUrl}</span>
                      </div>

                      <div className="text-center text-[10px] text-slate-500 pt-1">
                        ค้นหาพัสดุข้ามตู้ (Room Item Finder) • สถานะสต็อกคงเหลือเรียลไทม์
                      </div>
                    </div>
                  );
                }

                // Default: Door Sticker (100 x 75 mm)
                return (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-900 rounded-2xl p-4 text-slate-900 shadow-sm print:break-inside-avoid print:shadow-none flex flex-col justify-between"
                    style={{ minHeight: '190px' }}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-800">
                          คณะพยาบาลศาสตร์ • NURSING LAB
                        </span>
                        <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                          {item.code}
                        </span>
                      </div>

                      {/* Content with QR Code */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-black leading-tight text-slate-900 line-clamp-2">
                            {item.name}
                          </h3>
                          <div className="text-[11px] text-slate-600 mt-1 font-medium">
                            📍 {item.roomName || 'ห้องปฏิบัติการ'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {item.floor} • {item.building}
                          </div>

                          <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            📱 สแกนเช็คของในตู้นี้
                          </div>
                        </div>

                        <div className="w-24 h-24 shrink-0 bg-white p-1 border-2 border-slate-300 rounded-xl shadow-xs">
                          {qrSrc && <img src={qrSrc} alt={item.code} className="w-full h-full object-contain" />}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Micro URL */}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span>Smart Storage QR</span>
                      <span className="truncate max-w-[150px]">{item.code}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 print:hidden text-xs text-slate-500">
          <span>คำแนะนำ: เลือกพิมพ์แบบ &quot;Fit to printable area&quot; หรือขนาดกระดาษสติกเกอร์ที่ต้องการ</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
