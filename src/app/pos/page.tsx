'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Store,
  ScanBarcode,
  Barcode,
  Search,
  User,
  GraduationCap,
  BookOpen,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Volume2,
  VolumeX,
  Camera,
  Boxes,
  Stethoscope,
  Scissors,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  X,
  Info,
} from 'lucide-react';
import PosReceiptModal from '@/components/pos/PosReceiptModal';
import QrScannerModal from '@/components/qrcode/QrScannerModal';
import { extractCleanCode } from '@/lib/scanner-utils';

interface CartItem {
  id: string; // unique cart entry ID
  type: 'ITEM' | 'BOX' | 'PACK' | 'ASSET';
  targetId: string; // item.id, box.id, pack.id, asset.id
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  lotNumber?: string;
  expiryDate?: string | null;
  boxNumberInYear?: number;
  packNumber?: number;
  piecesPerPack?: number;
}

export default function PosPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const [mode, setMode] = useState<'CHECKOUT' | 'RETURN'>('CHECKOUT');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Form / Selection State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('ฝึกหัตถการในรายวิชา');

  // Scanner State
  const [scanInput, setScanInput] = useState<string>('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);

  // Return Mode State
  const [returnAssetCode, setReturnAssetCode] = useState('');
  const [returnSearching, setReturnSearching] = useState(false);
  const [scannedAssetInfo, setScannedAssetInfo] = useState<any | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED'>('GOOD');
  const [returnNote, setReturnNote] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  // Multi-item lot selector state
  const [multiLotModalData, setMultiLotModalData] = useState<{
    lotNumber: string;
    items: Array<any>;
  } | null>(null);
  const [multiLotSearch, setMultiLotSearch] = useState('');

  const handleSelectMultiLotItem = (entry: any) => {
    if (entry.box) {
      const exists = cart.find((c) => c.type === 'BOX' && c.targetId === entry.box.id);
      if (exists) {
        setScanMessage({ type: 'error', text: `กล่องนี้ (${entry.box.boxCode}) อยู่ในตะกร้าแล้ว` });
        setMultiLotModalData(null);
        return;
      }

      setCart((prev) => [
        ...prev,
        {
          id: `box_${entry.box.id}_${Date.now()}`,
          type: 'BOX',
          targetId: entry.box.id,
          code: entry.box.boxCode,
          name: `${entry.item.name} (${entry.box.boxCode})`,
          unit: entry.item.unit || 'กล่อง',
          quantity: 1,
          unitCost: entry.unitCost || 0,
          lotNumber: entry.lotNumber,
          expiryDate: entry.expiryDate,
          boxNumberInYear: entry.box.boxNumberInYear,
        },
      ]);
      setScanMessage({ type: 'success', text: `เพิ่มกล่อง: ${entry.box.boxCode} (${entry.item.name})` });
    } else {
      const existingIdx = cart.findIndex((c) => c.type === 'ITEM' && c.targetId === entry.item.id);
      if (existingIdx >= 0) {
        const updated = [...cart];
        updated[existingIdx].quantity += 1;
        setCart(updated);
      } else {
        setCart((prev) => [
          ...prev,
          {
            id: `item_${entry.item.id}_${Date.now()}`,
            type: 'ITEM',
            targetId: entry.item.id,
            code: entry.item.code,
            name: entry.item.name,
            unit: entry.item.unit || 'ชิ้น',
            quantity: 1,
            unitCost: entry.unitCost || 0,
          },
        ]);
      }
      setScanMessage({ type: 'success', text: `เพิ่มพัสดุ: ${entry.item.name} (+1)` });
    }
    setMultiLotModalData(null);
    scannerInputRef.current?.focus();
  };

  // Audio Feedback using Web Audio API
  const playBeep = (freq = 880, duration = 0.1, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  // Load initial courses and default to currentUser
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/courses?compact=true');
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
          if (data.length > 0) {
            setSelectedCourseId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load courses', err);
      }
    }
    loadInitial();

    if (currentUser) {
      setSelectedUser({
        id: currentUser.id,
        name: currentUser.name,
        studentId: (currentUser as any).studentId,
        role: currentUser.role,
      });
    }
  }, [currentUser]);

  // Keep scanner input focused for fast barcode gun scanning
  useEffect(() => {
    scannerInputRef.current?.focus();
  }, [mode]);

  // Process Barcode / QR scan
  const handleProcessScan = async (codeToScan: string) => {
    const { cleanCode } = extractCleanCode(codeToScan);
    const raw = cleanCode || codeToScan.trim();
    if (!raw) return;
    setScanLoading(true);
    setScanMessage(null);

    try {
      const res = await fetch(`/api/pos/scan?code=${encodeURIComponent(raw)}`);
      const data = await res.json();

      if (!res.ok) {
        playBeep(320, 0.25, 'sawtooth');
        setScanMessage({ type: 'error', text: data.error || 'ไม่พบข้อมูลบาร์โค้ดนี้' });
        return;
      }

      playBeep(880, 0.1, 'sine');

      if (data.type === 'USER') {
        setSelectedUser(data.user);
        setScanMessage({ type: 'success', text: `ยืนยันตัวตนผู้เบิก: ${data.user.name} (${data.user.studentId || data.user.role})` });
        return;
      }

      if (data.type === 'BOX') {
        // กล่องพัสดุ
        const exists = cart.find((c) => c.type === 'BOX' && c.targetId === data.box.id);
        if (exists) {
          setScanMessage({ type: 'error', text: `กล่องนี้ (${data.box.boxCode}) อยู่ในตะกร้าแล้ว` });
          return;
        }

        setCart((prev) => [
          ...prev,
          {
            id: `box_${data.box.id}_${Date.now()}`,
            type: 'BOX',
            targetId: data.box.id,
            code: data.box.boxCode,
            name: `${data.item.name} (กล่อง #${data.box.boxNumberInYear || data.box.boxNumberInLot})`,
            unit: data.item.unit || 'กล่อง',
            quantity: 1,
            unitCost: data.lot.unitCost || 0,
            lotNumber: data.lot.lotNumber,
            expiryDate: data.lot.expiryDate,
            boxNumberInYear: data.box.boxNumberInYear,
          },
        ]);
        setScanMessage({ type: 'success', text: `เพิ่มกล่อง: ${data.box.boxCode} (${data.item.name})` });
        return;
      }

      if (data.type === 'PACK') {
        // ซองสเตอร์ไรด์แบ่งบรรจุ
        const exists = cart.find((c) => c.type === 'PACK' && c.targetId === data.pack.id);
        if (exists) {
          setScanMessage({ type: 'error', text: `ซองนี้ (${data.pack.packCode}) อยู่ในตะกร้าแล้ว` });
          return;
        }

        const cost = (data.record.unitCostPerPiece || 0) * (data.pack.piecesPerPack || 1);
        setCart((prev) => [
          ...prev,
          {
            id: `pack_${data.pack.id}_${Date.now()}`,
            type: 'PACK',
            targetId: data.pack.id,
            code: data.pack.packCode,
            name: `${data.item.name} (ซองสเตอร์ไรด์ #${data.pack.packNumber})`,
            unit: 'ซอง',
            quantity: 1,
            unitCost: cost,
            expiryDate: data.record.expiryDate,
            packNumber: data.pack.packNumber,
            piecesPerPack: data.pack.piecesPerPack,
          },
        ]);
        setScanMessage({ type: 'success', text: `เพิ่มซองสเตอร์ไรด์: ${data.pack.packCode} (${data.item.name})` });
        return;
      }

      if (data.type === 'SUBLOT') {
        // สแกนจากป้ายชุด Sub-lot ของการแบ่งบรรจุ
        if (data.nextPack) {
          const exists = cart.find((c) => c.type === 'PACK' && c.targetId === data.nextPack.id);
          if (exists) {
            setScanMessage({ type: 'error', text: `ซองถัดไปของชุดนี้ (${data.nextPack.packCode}) อยู่ในตะกร้าแล้ว` });
            return;
          }

          const cost = (data.record.unitCostPerPiece || 0) * (data.nextPack.piecesPerPack || 1);
          setCart((prev) => [
            ...prev,
            {
              id: `pack_${data.nextPack.id}_${Date.now()}`,
              type: 'PACK',
              targetId: data.nextPack.id,
              code: data.nextPack.packCode,
              name: `${data.item.name} (ซองสเตอร์ไรด์ #${data.nextPack.packNumber})`,
              unit: 'ซอง',
              quantity: 1,
              unitCost: cost,
              expiryDate: data.record.expiryDate,
              packNumber: data.nextPack.packNumber,
              piecesPerPack: data.nextPack.piecesPerPack,
            },
          ]);
          setScanMessage({ type: 'success', text: `เพิ่มซองจาก Sub-lot: ${data.nextPack.packCode} (${data.item.name})` });
          return;
        } else {
          playBeep(320, 0.25, 'sawtooth');
          setScanMessage({ type: 'error', text: `ชุด Sub-lot "${data.record.repackCode}" ไม่มีซองพร้อมใช้งานในสต็อกแล้ว` });
          return;
        }
      }

      if (data.type === 'LOT') {
        // สแกนจากป้ายประจำล็อตวัสดุสิ้นเปลือง
        if (data.box) {
          const exists = cart.find((c) => c.type === 'BOX' && c.targetId === data.box.id);
          if (exists) {
            setScanMessage({ type: 'error', text: `กล่องถัดไปของล็อตนี้ (${data.box.boxCode}) อยู่ในตะกร้าแล้ว` });
            return;
          }

          setCart((prev) => [
            ...prev,
            {
              id: `box_${data.box.id}_${Date.now()}`,
              type: 'BOX',
              targetId: data.box.id,
              code: data.box.boxCode,
              name: `${data.item.name} (${data.box.boxCode})`,
              unit: data.item.unit || 'กล่อง',
              quantity: 1,
              unitCost: data.lot.unitCost || 0,
              lotNumber: data.lot.lotNumber,
              expiryDate: data.lot.expiryDate,
              boxNumberInYear: data.box.boxNumberInYear,
            },
          ]);
          setScanMessage({ type: 'success', text: `เพิ่มกล่องจากล็อต: ${data.box.boxCode} (${data.item.name})` });
          return;
        } else {
          playBeep(320, 0.25, 'sawtooth');
          setScanMessage({ type: 'error', text: `ล็อต "${data.lot.lotNumber}" (${data.item.name}) ไม่มีกล่องคงเหลือในสต็อก` });
          return;
        }
      }

      if (data.type === 'LOT_MULTIPLE') {
        playBeep(660, 0.15, 'sine');
        setMultiLotModalData({
          lotNumber: data.lotNumber,
          items: data.items || [],
        });
        setMultiLotSearch('');
        setScanMessage({
          type: 'info',
          text: `พบวัสดุ ${data.items?.length || 0} รายการในงวดจัดซื้อ "${data.lotNumber}" กรุณาเลือกรายการที่ต้องการ`,
        });
        return;
      }

      if (data.type === 'ASSET') {
        // ครุภัณฑ์คงทน (สลับเป็นยืมด่วน)
        if (data.asset.status === 'BORROWED') {
          playBeep(320, 0.25, 'sawtooth');
          setScanMessage({ type: 'error', text: `ครุภัณฑ์ "${data.asset.assetCode}" กำลังถูกยืมอยู่แล้ว ไม่สามารถยืมซ้ำได้` });
          return;
        }

        const exists = cart.find((c) => c.type === 'ASSET' && c.targetId === data.asset.id);
        if (exists) {
          setScanMessage({ type: 'error', text: `ครุภัณฑ์ "${data.asset.assetCode}" อยู่ในตะกร้าแล้ว` });
          return;
        }

        setCart((prev) => [
          ...prev,
          {
            id: `asset_${data.asset.id}_${Date.now()}`,
            type: 'ASSET',
            targetId: data.asset.id,
            code: data.asset.assetCode,
            name: `${data.item.name} [${data.asset.assetCode}]`,
            unit: data.item.unit || 'เครื่อง',
            quantity: 1,
            unitCost: 0,
          },
        ]);
        setScanMessage({ type: 'success', text: `เพิ่มยืมครุภัณฑ์: ${data.asset.assetCode} (${data.item.name})` });
        return;
      }

      if (data.type === 'ITEM') {
        // พัสดุทั่วไป เพิ่มจำนวนในตะกร้า (+1)
        const existingIdx = cart.findIndex((c) => c.type === 'ITEM' && c.targetId === data.item.id);
        if (existingIdx >= 0) {
          const updated = [...cart];
          updated[existingIdx].quantity += 1;
          setCart(updated);
        } else {
          setCart((prev) => [
            ...prev,
            {
              id: `item_${data.item.id}_${Date.now()}`,
              type: 'ITEM',
              targetId: data.item.id,
              code: data.item.code,
              name: data.item.name,
              unit: data.item.unit || 'ชิ้น',
              quantity: 1,
              unitCost: 0,
            },
          ]);
        }
        setScanMessage({ type: 'success', text: `เพิ่มพัสดุ: ${data.item.name} (+1)` });
        return;
      }
    } catch (err) {
      playBeep(320, 0.25, 'sawtooth');
      setScanMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setScanLoading(false);
      setScanInput('');
      scannerInputRef.current?.focus();
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) {
      handleProcessScan(scanInput);
    }
  };

  // Adjust cart quantities
  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id === cartId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== cartId));
  };

  const totalCartCost = cart.reduce((sum, it) => sum + it.unitCost * it.quantity, 0);
  const totalCartQty = cart.reduce((sum, it) => sum + it.quantity, 0);

  // Submit Checkout
  const handleCheckout = async () => {
    if (!selectedUser) {
      alert('กรุณาสแกนหรือเลือกผู้ทำรายการเบิก');
      return;
    }

    if (cart.length === 0) {
      alert('กรุณาสแกนสิ่งของลงในตะกร้าก่อนดำเนินการ');
      return;
    }

    setCheckoutSubmitting(true);
    try {
      const payload = {
        userId: selectedUser.id,
        courseId: selectedCourseId || null,
        purpose: purpose || 'เบิกจ่ายด่วน ณ จุดบริการ (Lab Store POS)',
        operatorId: currentUser?.id,
        cart: cart.map((c) => ({
          type: c.type,
          id: c.targetId,
          name: c.name,
          code: c.code,
          unit: c.unit,
          quantity: c.quantity,
          unitCost: c.unitCost,
        })),
      };

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        playBeep(1200, 0.15, 'sine');
        setCompletedReceipt(data.receipt);
        setCart([]);
        setScanMessage({ type: 'success', text: `ทำรายการสำเร็จ! รหัสใบเสร็จ: ${data.receipt.receiptNumber}` });
      } else {
        playBeep(300, 0.3, 'sawtooth');
        alert(data.error || 'เกิดข้อผิดพลาดในการตัดสต็อก');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Quick Return Handlers
  const handleSearchAssetToReturn = async (code: string) => {
    const { cleanCode } = extractCleanCode(code);
    const raw = cleanCode || code.trim();
    if (!raw) return;
    setReturnSearching(true);
    setReturnSuccessMsg(null);

    try {
      const res = await fetch(`/api/pos/scan?code=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (res.ok && data.type === 'ASSET') {
        playBeep(880, 0.1, 'sine');
        setScannedAssetInfo(data);
      } else {
        playBeep(320, 0.25, 'sawtooth');
        alert(data.error || 'ไม่พบครุภัณฑ์รหัสนี้ หรืออุปกรณ์นี้ไม่ได้อยู่ในรายการยืม');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setReturnSearching(false);
      setReturnAssetCode('');
    }
  };

  const handleConfirmReturn = async () => {
    if (!scannedAssetInfo) return;
    setReturnSubmitting(true);
    try {
      const res = await fetch('/api/pos/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: scannedAssetInfo.asset.assetCode,
          condition: returnCondition,
          note: returnNote,
          operatorId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        playBeep(1000, 0.15, 'sine');
        setReturnSuccessMsg(`รับคืนอุปกรณ์ "${scannedAssetInfo.asset.assetCode}" (${scannedAssetInfo.item.name}) เรียบร้อยแล้ว`);
        setScannedAssetInfo(null);
        setReturnNote('');
        setReturnCondition('GOOD');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการรับคืน');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-3 sm:p-5 lg:p-6 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                จุดบริการเบิกจ่ายด่วน (Lab Store & Express POS)
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                พร้อมรับสแกน
              </span>
            </div>
            <p className="text-xs text-slate-500">
              สแกนตัดสต็อกทันที • คิดต้นทุนรายวิชาอัตโนมัติ • รองรับเครื่องยิงบาร์โค้ด USB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playBeep(600, 0.05);
            }}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? 'เปิดเสียงตอบรับ (คลิกเพื่อปิด)' : 'ปิดเสียงอยู่ (คลิกเพื่อเปิด)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
          </button>

          {/* Mode Switcher */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('CHECKOUT')}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                mode === 'CHECKOUT'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ScanBarcode className="w-4 h-4" />
              <span>เบิกจ่ายด่วน (Checkout)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('RETURN')}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                mode === 'RETURN'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>รับคืนอุปกรณ์ด่วน (Return)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Mode View */}
      {mode === 'CHECKOUT' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Context & Fast Scanner (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* User Identification Card */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>1. ผู้ทำรายการเบิก (Borrower)</span>
                </span>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedUser({
                        id: currentUser.id,
                        name: currentUser.name,
                        studentId: (currentUser as any).studentId,
                        role: currentUser.role,
                      })
                    }
                    className="text-[11px] text-teal-600 hover:underline font-bold"
                  >
                    ฉันเอง
                  </button>
                )}
              </div>

              {selectedUser ? (
                <div className="p-3 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                      {selectedUser.name?.charAt(0) || 'U'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                        {selectedUser.name}
                      </div>
                      <div className="text-[11px] text-teal-800 dark:text-teal-300 font-mono">
                        {selectedUser.studentId ? `รหัสนิสิต: ${selectedUser.studentId}` : `บทบาท: ${selectedUser.role}`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="text-[11px] text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition"
                  >
                    เปลี่ยน
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>ยังไม่ได้ระบุผู้เบิก</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    ยิงบาร์โค้ดบัตรนิสิตที่ช่องสแกนด้านล่าง หรือกดเลือก "ฉันเอง"
                  </p>
                </div>
              )}
            </div>

            {/* Course & Context Selection */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>2. บริบทการใช้งาน (Course Context)</span>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] text-slate-500 font-medium">
                  ผูกต้นทุนกับรายวิชา:
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- ไม่ระบุวิชา (ซ้อมทักษะอิสระ / งานทั่วไป) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 font-medium">
                  วัตถุประสงค์ / หัตถการ:
                </label>
                <input
                  type="text"
                  placeholder="เช่น ฝึกฉีดยาเข้ากล้าม, เตรียมสอน OSCE"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Fast Barcode Input Card */}
            <div className="p-4 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-white dark:to-slate-900 rounded-3xl border-2 border-teal-500/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
                <span className="flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-teal-600" />
                  <span>3. สแกนบาร์โค้ด (Scan Item / Box)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400 hover:underline font-bold"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>เปิดกล้องสแกน</span>
                </button>
              </div>

              <form onSubmit={handleScanSubmit} className="relative">
                <input
                  ref={scannerInputRef}
                  type="text"
                  placeholder="ยิง Barcode หรือสแกน QR Code ที่นี่ (Beep & Scan)..."
                  value={scanInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('http') || val.includes('/asset/') || val.includes('/equipment/') || val.includes('/consumable/') || val.startsWith('{')) {
                      const { cleanCode } = extractCleanCode(val);
                      if (cleanCode) {
                        setScanInput(cleanCode);
                        return;
                      }
                    }
                    setScanInput(val);
                  }}
                  disabled={scanLoading}
                  className="w-full bg-white dark:bg-slate-950 border-2 border-teal-400 dark:border-teal-700 rounded-2xl pl-10 pr-20 py-3 text-sm font-mono font-bold text-slate-900 dark:text-white shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20"
                />
                <Barcode className="w-5 h-5 text-teal-600 absolute left-3.5 top-3.5" />
                <button
                  type="submit"
                  disabled={scanLoading || !scanInput.trim()}
                  className="absolute right-2 top-2 bottom-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  {scanLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>เพิ่ม</span>}
                </button>
              </form>

              {scanMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                    scanMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                      : scanMessage.type === 'info'
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                  }`}
                >
                  {scanMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  ) : scanMessage.type === 'info' ? (
                    <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  )}
                  <span className="truncate">{scanMessage.text}</span>
                </div>
              )}

              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                💡 รองรับการสแกนทั้ง <b>Barcode</b> และ <b>QR Code</b> ทุกรูปแบบ: บัตรนิสิต, กล่องพัสดุ (Box), ซองสเตอร์ไรด์ (Pack), รหัสทั่วไป (Item), และ ครุภัณฑ์ (Asset)
              </div>
            </div>
          </div>

          {/* Right Column: Cart & Checkout Summary (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col min-h-[580px]">
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    รายการพัสดุในตะกร้า ({cart.length} รายการ • รวม {totalCartQty} ชิ้น)
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('คุณต้องการล้างตะกร้าพัสดุทั้งหมดใช่หรือไม่?')) setCart([]);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างตะกร้า</span>
                  </button>
                )}
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[460px]">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-950/50 transition flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      {/* Type Icon Badge */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {item.type === 'BOX' && (
                          <div className="w-full h-full rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 flex items-center justify-center">
                            <Boxes className="w-5 h-5" />
                          </div>
                        )}
                        {item.type === 'PACK' && (
                          <div className="w-full h-full rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 flex items-center justify-center">
                            <Scissors className="w-5 h-5" />
                          </div>
                        )}
                        {item.type === 'ASSET' && (
                          <div className="w-full h-full rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                        )}
                        {item.type === 'ITEM' && (
                          <div className="w-full h-full rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 flex items-center justify-center">
                            <Barcode className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="overflow-hidden space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.code}
                          </span>
                          {item.type === 'ASSET' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800">
                              ยืมด่วน (ต้องส่งคืน)
                            </span>
                          )}
                          {item.type === 'BOX' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              เบิกทั้งกล่อง
                            </span>
                          )}
                          {item.type === 'PACK' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                              ซองสเตอร์ไรด์ ({item.piecesPerPack || 1} ชิ้น)
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          หน่วยนับ: {item.unit} {item.unitCost > 0 ? `• ทุน ฿${item.unitCost}/หน่วย` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Cost */}
                    <div className="flex items-center gap-3">
                      {item.type === 'ITEM' ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-xs transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-xs text-slate-900 dark:text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-xs transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          1 {item.unit}
                        </div>
                      )}

                      {/* Line Cost */}
                      <div className="text-right min-w-[70px]">
                        <div className="font-mono font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          {item.unitCost > 0
                            ? `฿${(item.unitCost * item.quantity).toLocaleString('th-TH', { minimumFractionDigits: 1 })}`
                            : 'ฟรี/ยืม'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                    <ScanBarcode className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-1 animate-pulse" />
                    <div className="font-bold text-xs text-slate-600 dark:text-slate-400">
                      ยังไม่มีรายการพัสดุในตะกร้า
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      ใช้เครื่องยิงบาร์โค้ดยิงรหัสที่ตัวกล่อง ซองสเตอร์ไรด์ หรือฉลากพัสดุ เพื่อเพิ่มลงตะกร้าอัตโนมัติ
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Checkout Summary */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">มูลค่าต้นทุนรวมของการเบิกครั้งนี้:</span>
                    <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                      * บันทึกลงตารางต้นทุนรายวิชาทันที
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                      ฿{totalCartCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={checkoutSubmitting || cart.length === 0 || !selectedUser}
                    onClick={handleCheckout}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-teal-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังตัดสต็อกและบันทึกรายการ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>ยืนยันการเบิกจ่าย (CHECKOUT)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Return Mode View */
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  รับคืนอุปกรณ์และครุภัณฑ์ด่วน (Scan to Return)
                </h2>
                <p className="text-xs text-slate-500">
                  ยิงบาร์โค้ดที่ตัวเครื่องมือ ระบบจะตรวจจับผู้ยืมและปลดล็อกสถานะกลับเป็นพร้อมใช้ทันที
                </p>
              </div>
            </div>

            {/* Return Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchAssetToReturn(returnAssetCode);
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                สแกนหรือพิมพ์รหัสครุภัณฑ์ (Asset Code / Gov Code):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="สแกน QR Code หรือยิง Barcode เช่น EQ-MNK-001..."
                  value={returnAssetCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('http') || val.includes('/asset/') || val.includes('/equipment/') || val.startsWith('{')) {
                      const { cleanCode } = extractCleanCode(val);
                      if (cleanCode) {
                        setReturnAssetCode(cleanCode);
                        return;
                      }
                    }
                    setReturnAssetCode(val);
                  }}
                  disabled={returnSearching}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-indigo-400 dark:border-indigo-700 rounded-2xl pl-10 pr-24 py-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/20"
                />
                <Barcode className="w-5 h-5 text-indigo-600 absolute left-3.5 top-3.5" />
                <button
                  type="submit"
                  disabled={returnSearching || !returnAssetCode.trim()}
                  className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {returnSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'ค้นหา'}
                </button>
              </div>
            </form>

            {returnSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{returnSuccessMsg}</span>
              </div>
            )}

            {/* Scanned Asset Return Card */}
            {scannedAssetInfo && (
              <div className="p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4 animate-fadeIn">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-indigo-600 text-white">
                      {scannedAssetInfo.asset.assetCode}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                      {scannedAssetInfo.item.name}
                    </h3>
                    <div className="text-xs text-slate-500">
                      หมวดหมู่: {scannedAssetInfo.item.category?.name || 'ทั่วไป'} • หน่วยนับ: {scannedAssetInfo.item.unit}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    กำลังถูกยืมอยู่
                  </span>
                </div>

                {scannedAssetInfo.activeBorrow && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ผู้ยืม:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {scannedAssetInfo.activeBorrow.user.name} ({scannedAssetInfo.activeBorrow.user.studentId || 'นิสิต'})
                      </span>
                    </div>
                    {scannedAssetInfo.activeBorrow.course && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">วิชาที่นำไปใช้:</span>
                        <span className="font-bold text-teal-700 dark:text-teal-400">
                          [{scannedAssetInfo.activeBorrow.course.code}] {scannedAssetInfo.activeBorrow.course.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">วันที่ยืม:</span>
                      <span>{new Date(scannedAssetInfo.activeBorrow.borrowDate).toLocaleString('th-TH')} น.</span>
                    </div>
                  </div>
                )}

                {/* Condition Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    สภาพอุปกรณ์ที่รับคืน:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setReturnCondition('GOOD')}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        returnCondition === 'GOOD'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ปกติ สมบูรณ์ (GOOD)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnCondition('DAMAGED')}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        returnCondition === 'DAMAGED'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>พบชำรุด / เสียหาย (DAMAGED)</span>
                    </button>
                  </div>
                </div>

                {returnCondition === 'DAMAGED' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-rose-700">
                      ระบุอาการชำรุด (จะส่งต่อเข้าระบบซ่อมบำรุงอัตโนมัติ):
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น แขนหุ่นหลุด, สายไฟขาด, ชิ้นส่วนไม่ครบ..."
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-900 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setScannedAssetInfo(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={returnSubmitting}
                    onClick={handleConfirmReturn}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {returnSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>ยืนยันรับคืนเข้าคลัง (Check-in)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <QrScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScan={(scannedText: string) => {
            setShowCameraScanner(false);
            if (scannedText) {
              if (mode === 'CHECKOUT') {
                handleProcessScan(scannedText);
              } else {
                handleSearchAssetToReturn(scannedText);
              }
            }
          }}
        />
      )}

      {/* Receipt Printable Modal */}
      {completedReceipt && (
        <PosReceiptModal
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}

      {/* Multi-Lot Matching Items Selector Modal */}
      {multiLotModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    เลือกรายการวัสดุสิ้นเปลือง
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    งวดจัดซื้อเลขที่: <strong className="font-mono text-teal-700 dark:text-teal-300">{multiLotModalData.lotNumber}</strong> (พบ {multiLotModalData.items.length} รายการ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMultiLotModalData(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={multiLotSearch}
                onChange={(e) => setMultiLotSearch(e.target.value)}
                placeholder="พิมพ์ชื่อหรือรหัสพัสดุเพื่อค้นหา..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            </div>

            {/* List of matching items */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[50vh]">
              {multiLotModalData.items
                .filter((entry: any) => {
                  const q = multiLotSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    entry.item?.name?.toLowerCase().includes(q) ||
                    entry.item?.code?.toLowerCase().includes(q) ||
                    (entry.item?.categoryName && entry.item.categoryName.toLowerCase().includes(q))
                  );
                })
                .map((entry: any) => (
                  <button
                    key={entry.lotId}
                    type="button"
                    onClick={() => handleSelectMultiLotItem(entry)}
                    className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-teal-50/60 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700 transition flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition truncate">
                        {entry.item.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{entry.item.code}</span>
                        {entry.item.categoryName && <span>• {entry.item.categoryName}</span>}
                        <span className="text-teal-700 dark:text-teal-400 font-bold">
                          • คงเหลือ {entry.quantityRemaining} {entry.item.unit}
                        </span>
                        {entry.box && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                            • 👉 {entry.box.boxCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition flex-shrink-0">
                      เลือกรายการนี้
                    </div>
                  </button>
                ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMultiLotModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
