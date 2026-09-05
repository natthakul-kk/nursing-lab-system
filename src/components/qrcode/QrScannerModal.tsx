'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  X,
  FlipHorizontal,
  Search,
  AlertTriangle,
  CheckCircle2,
  Barcode,
  Keyboard,
  Sparkles
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QrScannerModal({ isOpen, onClose }: QrScannerModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const readerElementId = 'qr-reader-video-container';

  // Helper to extract asset code from scanned text (URL, JSON, or plain code)
  const processScannedResult = (decodedText: string) => {
    if (!decodedText) return;
    const cleanText = decodedText.trim();

    // 1. Check if it's a URL like http.../asset/[code]
    const assetUrlMatch = cleanText.match(/\/asset\/([^\/\?#]+)/);
    if (assetUrlMatch && assetUrlMatch[1]) {
      const code = decodeURIComponent(assetUrlMatch[1]);
      stopScannerAndNavigate(`/asset/${encodeURIComponent(code)}`);
      return;
    }

    // 2. Check if it's JSON
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.assetCode) {
          stopScannerAndNavigate(`/asset/${encodeURIComponent(parsed.assetCode)}`);
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Plain asset code
    stopScannerAndNavigate(`/asset/${encodeURIComponent(cleanText)}`);
  };

  const stopScannerAndNavigate = (targetUrl: string) => {
    stopScanner();
    onClose();
    router.push(targetUrl);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // ignore stop error
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'CAMERA') {
      stopScanner();
      return;
    }

    let isMounted = true;

    async function startScanner() {
      setCameraError(null);
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMounted) return;

        // Check container
        const container = document.getElementById(readerElementId);
        if (!container) return;

        const html5QrCode = new Html5Qrcode(readerElementId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' }, // prefer rear camera
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success
            processScannedResult(decodedText);
          },
          () => {
            // Frame error (normal during scanning)
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        if (isMounted) {
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'กรุณาอนุญาตให้ระบบเข้าถึงกล้องถ่ายรูปในเบราว์เซอร์ของคุณ'
              : 'ไม่สามารถเปิดกล้องได้ หรืออุปกรณ์ของคุณไม่มีกล้องที่ใช้งานได้'
          );
          setActiveTab('MANUAL');
        }
      }
    }

    // Small delay to ensure DOM rendered
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScannedResult(manualCode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">สแกน QR Code ครุภัณฑ์</h3>
              <p className="text-[11px] text-slate-500">ส่องกล้องไปที่ป้าย QR Code เพื่อดูข้อมูลทันที</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('CAMERA')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CAMERA'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>เปิดกล้องสแกน</span>
            </button>
            <button
              onClick={() => setActiveTab('MANUAL')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'MANUAL'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>ยิงบาร์โค้ด / พิมพ์รหัส</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 pt-0 space-y-4">
          {activeTab === 'CAMERA' && (
            <div className="space-y-3">
              {/* Camera Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center border-2 border-dashed border-teal-500/40">
                <div id={readerElementId} className="w-full h-full" />

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-3">
                    <AlertTriangle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('MANUAL')}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition"
                    >
                      สลับไปพิมพ์รหัสแทน
                    </button>
                  </div>
                )}
              </div>

              <p className="text-center text-[11px] text-slate-400">
                วางกล้องให้ตรงกับป้าย QR Code ระบบจะตรวจจับและเปิดหน้าให้อัตโนมัติ
              </p>
            </div>
          )}

          {activeTab === 'MANUAL' && (
            <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-2xl text-[11px] text-teal-800 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>รองรับเครื่องยิงบาร์โค้ด USB หรือพิมพ์รหัสแล็บ/เลขครุภัณฑ์</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสครุภัณฑ์ หรือเลขที่สแกนได้
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="เช่น MNK-2569-01 หรือ 7440-001-0001/2569"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>ค้นหาและเปิดดูข้อมูลครุภัณฑ์</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
