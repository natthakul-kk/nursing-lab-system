'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Package,
  Boxes,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  BookOpen,
  User,
  Sparkles,
  RefreshCw,
  Layers,
  HelpCircle,
  GraduationCap,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface UnifiedRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnifiedRequestModal({ isOpen, onClose, onSuccess }: UnifiedRequestModalProps) {
  const { currentUser, isTeacher } = useAuth();
  const isStudent = currentUser?.role === 'USER' && !isTeacher;

  const [loadingItems, setLoadingItems] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [consumablesList, setConsumablesList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [useTarget, setUseTarget] = useState<'SIMULATION' | 'HUMAN'>('SIMULATION');
  const [borrowDate, setBorrowDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  // Items State
  const [borrowItems, setBorrowItems] = useState<{ itemId: string; quantity: number | string; categoryId?: string }[]>([
    { itemId: '', quantity: '' },
  ]);
  const [requisitionItems, setRequisitionItems] = useState<{ itemId: string; quantity: number | string; categoryId?: string }[]>([
    { itemId: '', quantity: '' },
  ]);

  // Load dropdown resources on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoadingItems(true);
      try {
        const [eqRes, conRes, cRes, insRes] = await Promise.all([
          fetch('/api/items?type=EQUIPMENT&compact=true'),
          fetch('/api/items?type=CONSUMABLE&compact=true'),
          fetch('/api/courses?compact=true'),
          fetch('/api/users?role=APPROVER'),
        ]);

        if (eqRes.ok) {
          const rawEq = await eqRes.json();
          setEquipmentList(rawEq.filter((e: any) => e.isBorrowable !== false));
        }
        if (conRes.ok) setConsumablesList(await conRes.json());
        if (cRes.ok) setCourses(await cRes.json());
        if (insRes.ok) setInstructors(await insRes.json());
      } catch (err) {
        console.error('Failed to load modal data:', err);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchData();


  }, [isOpen]);

  if (!isOpen) return null;

  // Compute estimated cost for consumables
  const totalEstimatedCost = requisitionItems.reduce((sum, row) => {
    if (!row.itemId) return sum;
    const it = consumablesList.find((c) => c.id === row.itemId);
    const q = Number(row.quantity) || 0;
    return sum + (it?.unitCost || 0) * q;
  }, 0);

  // Compute stock validation errors
  const hasEquipmentStockError = borrowItems.some((it) => {
    if (!it.itemId) return false;
    const eq = equipmentList.find((e) => e.id === it.itemId);
    const q = Number(it.quantity) || 0;
    return eq && (eq.currentStock <= 0 || (q > 0 && q > eq.currentStock));
  });

  const hasConsumableStockError = requisitionItems.some((it) => {
    if (!it.itemId) return false;
    const con = consumablesList.find((c) => c.id === it.itemId);
    const q = Number(it.quantity) || 0;
    return con && (con.currentStock <= 0 || (q > 0 && q > con.currentStock));
  });

  const hasStockError = hasEquipmentStockError || hasConsumableStockError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purpose.trim()) {
      alert('กรุณาระบุวัตถุประสงค์และสถานที่ใช้งาน');
      return;
    }

    if (isStudent && !advisorName?.trim()) {
      alert('⚠️ เนื่องจากท่านเป็นนิสิต กรุณาระบุหรือเลือกอาจารย์ผู้รับทราบ/อาจารย์ประจำวิชา (ไม่อนุญาตให้เว้นว่าง)');
      return;
    }

    const validBorrow = borrowItems.filter((it) => it.itemId);
    const validReq = requisitionItems.filter((it) => it.itemId);

    if (validBorrow.length === 0 && validReq.length === 0) {
      alert('กรุณาเลือกรายการครุภัณฑ์ที่ต้องการยืม หรือวัสดุสิ้นเปลืองที่ต้องการเบิกอย่างน้อย 1 รายการ');
      return;
    }

    // Validate quantities are entered and >= 1
    for (const it of validBorrow) {
      const q = Number(it.quantity);
      if (!q || q < 1) {
        alert('กรุณาระบุจำนวนครุภัณฑ์ที่ต้องการยืมให้ถูกต้อง (อย่างน้อย 1)');
        return;
      }
    }
    for (const it of validReq) {
      const q = Number(it.quantity);
      if (!q || q < 1) {
        alert('กรุณาระบุจำนวนวัสดุสิ้นเปลืองที่ต้องการเบิกให้ถูกต้อง (อย่างน้อย 1)');
        return;
      }
    }

    // Validate Equipment limits
    for (const it of validBorrow) {
      const eq = equipmentList.find((e) => e.id === it.itemId);
      const q = Number(it.quantity);
      if (eq) {
        if (eq.currentStock <= 0) {
          alert(`ครุภัณฑ์ "${eq.name}" ไม่มีอุปกรณ์พร้อมให้ยืมในขณะนี้ (มีในคลัง ${eq.physicalStock || 0} ชิ้น แต่ถูกจองรอส่งมอบแล้ว ${eq.reservedStock || 0} ชิ้น)`);
          return;
        }
        if (q > eq.currentStock) {
          alert(`ไม่สามารถขอยืมเกินจำนวนพร้อมใช้ได้: ครุภัณฑ์ "${eq.name}" มีพร้อมให้ยืม ${eq.currentStock} ${eq.unit || 'ชิ้น'} (จากคลัง ${eq.physicalStock || eq.currentStock} แต่มีคิวรอส่งมอบ ${eq.reservedStock || 0})`);
          return;
        }
      }
    }

    // Validate Consumable limits
    for (const it of validReq) {
      const con = consumablesList.find((c) => c.id === it.itemId);
      const q = Number(it.quantity);
      if (con) {
        if (con.currentStock <= 0) {
          alert(`วัสดุ "${con.name}" หมดหรือถูกจองเต็มแล้วในขณะนี้ (มีในคลัง ${con.physicalStock || 0} ${con.unit} แต่มีคำขอรอจ่ายแล้ว ${con.reservedStock || 0} ${con.unit})`);
          return;
        }
        if (q > con.currentStock) {
          alert(`ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${con.name}" มีพร้อมให้ขอ ${con.currentStock} ${con.unit} (จากคลัง ${con.physicalStock || con.currentStock} แต่มีคำขอรอจ่ายอยู่ ${con.reservedStock || 0} ${con.unit})`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          courseId: courseId || null,
          advisorName: advisorName || null,
          purpose,
          borrowDate,
          expectedReturnDate,
          borrowItems: validBorrow.map((b) => ({ ...b, quantity: Number(b.quantity) })),
          requisitionItems: validReq.map((r) => ({ ...r, quantity: Number(r.quantity) })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('🎉 ' + (data.message || 'บันทึกคำขอแบบรวมเรียบร้อยแล้ว'));
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกคำขอ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50 via-indigo-50/50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/30 flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  ยื่นคำขอเบิก-ยืมพัสดุแล็บแบบครบวงจร
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  One-Stop Lab Request
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                กรอกข้อมูลครั้งเดียว เลือกได้ทั้งครุภัณฑ์ที่ต้องส่งคืน และวัสดุสิ้นเปลืองที่ใช้แล้วหมดไป
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Section 1: Course & Purpose */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-4">
            {/* Selector: วัตถุประสงค์ความปลอดภัย (ฝึกกับหุ่น vs ใช้กับคนจริง) */}
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                เป้าหมายการนำไปใช้งาน (Safety & Clinical Target) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setUseTarget('SIMULATION')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    useTarget === 'SIMULATION'
                      ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 dark:text-teal-200 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="text-2xl">🧪</span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>ฝึกปฏิบัติการกับหุ่นจำลอง</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-bold">Sim-Lab</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      สำหรับฝึกหัตถการกับหุ่นพยาบาล (อนุญาตให้เบิกของหมดอายุเพื่อฝึกซ้ำได้)
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUseTarget('HUMAN')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    useTarget === 'HUMAN'
                      ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-200 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="text-2xl">🧑‍⚕️</span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="text-rose-700 dark:text-rose-400">ใช้งานกับคนจริง / คลินิก</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-black">คนจริง</span>
                    </div>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 leading-tight">
                      สำหรับใช้กับผู้ป่วยจริง (ระบบจะบล็อกและห้ามเบิกล็อตที่หมดอายุเด็ดขาด 100%)
                    </p>
                  </div>
                </button>
              </div>

              {useTarget === 'HUMAN' && (
                <div className="p-2.5 bg-rose-100/70 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>มาตรการความปลอดภัยผู้ป่วย: ระบบจะจ่ายเฉพาะเวชภัณฑ์ที่ยังไม่หมดอายุเท่านั้น หากรายการใดหมดอายุแล้วจะไม่สามารถเบิกได้</span>
                </div>
              )}
            </div>

            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              1. ข้อมูลรายวิชาและวันเวลาที่ใช้งาน
            </h3>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รายวิชาทางการพยาบาล
                  </label>
                  <select
                    value={courseId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      setCourseId(cId);
                      const selectedCourse = courses.find((c) => c.id === cId);
                      if (selectedCourse?.instructorName) {
                        setAdvisorName(selectedCourse.instructorName);
                        setIsEditingAdvisor(false);
                      } else if (!cId) {
                        setAdvisorName('');
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">-- ไม่ระบุรายวิชา (ฝึกปฏิบัติส่วนบุคคล/กิจกรรมอื่น) --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} {c.name} ({c.instructorName || 'อ.ผู้รับผิดชอบ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      อาจารย์ผู้รับทราบ / ที่ปรึกษา {isStudent && <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>}
                    </label>
                    {courseId && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEditingAdvisor ? 'ซ่อนตัวเลือก' : 'แก้ไขอาจารย์'}</span>
                      </button>
                    )}
                  </div>

                  {courseId && !isEditingAdvisor ? (
                    <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="font-bold text-teal-900 dark:text-teal-200">
                          {advisorName || courses.find((c) => c.id === courseId)?.instructorName || 'อาจารย์ผู้รับผิดชอบ'}
                        </span>
                        <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded-md font-bold">
                          ขึ้นให้อัตโนมัติ
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingAdvisor(true)}
                        className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                      >
                        แก้ไขอาจารย์
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        required={isStudent}
                        value={advisorName}
                        onChange={(e) => setAdvisorName(e.target.value)}
                        className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 ${
                          isStudent && !advisorName ? 'border-amber-300 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-900/50' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="">-- กรุณาเลือกอาจารย์จากรายชื่อ --</option>
                        {advisorName && !instructors.some((ins) => ins.name === advisorName) && (
                          <option value={advisorName}>
                            {advisorName} (อาจารย์ประจำรายวิชา)
                          </option>
                        )}
                        {instructors.map((ins) => (
                          <option key={ins.id} value={ins.name}>
                            {ins.name} ({ins.department || 'อาจารย์พยาบาล'})
                          </option>
                        ))}
                      </select>
                      {courseId && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const sc = courses.find((c) => c.id === courseId);
                              if (sc?.instructorName) setAdvisorName(sc.instructorName);
                              setIsEditingAdvisor(false);
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                          >
                            ↺ กลับไปใช้อาจารย์ประจำวิชา ({courses.find((c) => c.id === courseId)?.instructorName})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วันและเวลาที่ต้องการรับของ *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วันและเวลากำหนดส่งคืนครุภัณฑ์
                </label>
                <input
                  type="datetime-local"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                วัตถุประสงค์และสถานที่ใช้งาน *
              </label>
              <textarea
                rows={2}
                required
                placeholder="เช่น ฝึกทักษะการทำแผลปลอดเชื้อและตรวจสัญญาณชีพ ห้อง Lab Skill 1"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Section 2: Equipment to Borrow */}
          <div className="border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  2. รายการครุภัณฑ์/อุปกรณ์ที่ต้องการยืม (Equipment)
                </h3>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                  ✓ เป็นของใช้แล้วต้องนำมาส่งคืนห้องแล็บ เช่น หุ่นฝึก, ชุดตรวจ, เครื่องวัดความดัน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBorrowItems([...borrowItems, { itemId: '', quantity: '' }])}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการยืม</span>
              </button>
            </div>

            <div className="space-y-2">
              {borrowItems.map((row, idx) => {
                const categoryMap = new Map<string, string>();
                equipmentList.forEach((eq) => {
                  if (eq.category?.name) categoryMap.set(eq.category.id || eq.category.name, eq.category.name);
                });
                const selectedCat = (row as any).categoryId || '';
                const filteredList = selectedCat
                  ? equipmentList.filter((eq) => eq.category?.id === selectedCat || eq.category?.name === selectedCat)
                  : equipmentList;

                const chosenEq = equipmentList.find((e) => e.id === row.itemId);
                const isOutOfStock = chosenEq && chosenEq.currentStock <= 0;
                const isOverStock = chosenEq && chosenEq.currentStock > 0 && row.quantity !== '' && Number(row.quantity) > chosenEq.currentStock;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition ${
                      isOutOfStock || isOverStock ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <select
                          value={selectedCat}
                          onChange={(e) => {
                            const catVal = e.target.value;
                            const updated = [...borrowItems];
                            (updated[idx] as any).categoryId = catVal;
                            setBorrowItems(updated);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <option value="">-- ทุกหมวดครุภัณฑ์ --</option>
                          {Array.from(categoryMap.entries()).map(([id, name]) => (
                            <option key={id} value={id}>📁 {name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-5">
                        <select
                          value={row.itemId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const eq = equipmentList.find((x) => x.id === val);
                            const updated = [...borrowItems];
                            updated[idx].itemId = val;
                            if (eq && eq.currentStock > 0 && row.quantity !== '' && Number(updated[idx].quantity) > eq.currentStock) {
                              updated[idx].quantity = eq.currentStock;
                            }
                            setBorrowItems(updated);
                          }}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                        >
                          <option value="">-- เลือกครุภัณฑ์ ({filteredList.length}) --</option>
                          {filteredList.map((eq) => {
                            const avail = eq.availableStock ?? eq.currentStock;
                            const isReserved = eq.reservedStock > 0;
                            return (
                              <option key={eq.id} value={eq.id}>
                                {eq.name} (พร้อมให้ยืม {avail} {eq.unit}){isReserved ? ` [รอส่งมอบ ${eq.reservedStock}]` : ''}{avail <= 0 ? ' [คิวเต็ม]' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max={chosenEq ? Math.max(1, chosenEq.currentStock) : undefined}
                          value={row.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? '' : Math.max(1, parseInt(raw, 10));
                            const updated = [...borrowItems];
                            updated[idx].quantity = val;
                            setBorrowItems(updated);
                          }}
                          className={`w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs font-bold text-center ${
                            isOverStock || isOutOfStock ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' : ''
                          }`}
                          placeholder="กรุณากรอกจำนวน"
                        />
                        {borrowItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBorrowItems(borrowItems.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {chosenEq && (
                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        {isOutOfStock ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            {chosenEq.physicalStock > 0 && chosenEq.reservedStock > 0
                              ? `มีในคลัง ${chosenEq.physicalStock} ${chosenEq.unit} แต่ถูกจองรอส่งมอบแล้ว ${chosenEq.reservedStock} (ไม่เหลือพร้อมให้ยืม)`
                              : `ไม่มีเครื่องพร้อมใช้งานในขณะนี้`}
                          </span>
                        ) : isOverStock ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            ขอยืมเกินยอดพร้อมใช้ (พร้อมให้ยืม {chosenEq.currentStock} จากคลัง {chosenEq.physicalStock ?? chosenEq.currentStock} {chosenEq.unit}{chosenEq.reservedStock ? ` | รอส่งมอบ ${chosenEq.reservedStock}` : ''})
                          </span>
                        ) : (
                          <span className="text-blue-700 font-medium flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                            พร้อมให้ยืม: <strong className="font-bold text-slate-900">{chosenEq.currentStock} {chosenEq.unit}</strong>
                            {chosenEq.reservedStock > 0 && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                                คลัง {chosenEq.physicalStock} | รอส่งมอบ {chosenEq.reservedStock}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Consumables to Requisition */}
          <div className="border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-teal-900 dark:text-teal-300 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  3. รายการวัสดุสิ้นเปลืองที่ต้องการเบิก (Consumables)
                </h3>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  ✓ เป็นพัสดุใช้หมดไป เช่น ถุงมือ, สำลี, แอลกอฮอล์, เข็ม, Syringe <strong className="underline">ไม่ต้องส่งคืน</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequisitionItems([...requisitionItems, { itemId: '', quantity: '' }])}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shadow-teal-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มวัสดุสิ้นเปลือง
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {requisitionItems.map((row, idx) => {
                const categoryMap = new Map<string, string>();
                consumablesList.forEach((c) => {
                  if (c.category?.name) categoryMap.set(c.category.id || c.category.name, c.category.name);
                });
                const selectedCat = (row as any).categoryId || '';
                const filteredList = selectedCat
                  ? consumablesList.filter((c) => c.category?.id === selectedCat || c.category?.name === selectedCat)
                  : consumablesList;

                const chosenItem = consumablesList.find((c) => c.id === row.itemId);
                const isOutOfStock = chosenItem && chosenItem.currentStock <= 0;
                const isOverStock = chosenItem && chosenItem.currentStock > 0 && row.quantity !== '' && Number(row.quantity) > chosenItem.currentStock;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition ${
                      isOutOfStock || isOverStock ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <select
                          value={selectedCat}
                          onChange={(e) => {
                            const catVal = e.target.value;
                            const updated = [...requisitionItems];
                            (updated[idx] as any).categoryId = catVal;
                            setRequisitionItems(updated);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <option value="">-- ทุกหมวดวัสดุ --</option>
                          {Array.from(categoryMap.entries()).map(([id, name]) => (
                            <option key={id} value={id}>📁 {name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-5">
                        <select
                          value={row.itemId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const it = consumablesList.find((x) => x.id === val);
                            const updated = [...requisitionItems];
                            updated[idx].itemId = val;
                            if (it && it.currentStock > 0 && row.quantity !== '' && Number(updated[idx].quantity) > it.currentStock) {
                              updated[idx].quantity = it.currentStock;
                            }
                            setRequisitionItems(updated);
                          }}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                        >
                          <option value="">-- เลือกรายการวัสดุ ({filteredList.length}) --</option>
                          {filteredList.map((c) => {
                            const avail = c.availableStock ?? c.currentStock;
                            const isReserved = c.reservedStock > 0;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} (พร้อมเบิก: {avail} {c.unit}){isReserved ? ` [รอจ่าย ${c.reservedStock}]` : ''}{avail <= 0 ? ' [คิวเต็ม/หมด]' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max={chosenItem ? Math.max(1, chosenItem.currentStock) : undefined}
                          value={row.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? '' : Math.max(1, parseInt(raw, 10));
                            const updated = [...requisitionItems];
                            updated[idx].quantity = val;
                            setRequisitionItems(updated);
                          }}
                          className={`w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs font-bold text-center ${
                            isOverStock || isOutOfStock ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' : ''
                          }`}
                          placeholder="กรุณากรอกจำนวน"
                        />
                        {requisitionItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRequisitionItems(requisitionItems.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {chosenItem && (
                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        {isOutOfStock ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {chosenItem.physicalStock > 0 && chosenItem.reservedStock > 0
                              ? `มีในคลัง ${chosenItem.physicalStock} ${chosenItem.unit} แต่มีคำขอรอจ่ายแล้ว ${chosenItem.reservedStock} (ไม่เหลือพร้อมให้เบิก)`
                              : `วัสดุนี้หมดในคลัง ไม่สามารถเบิกได้`}
                          </span>
                        ) : isOverStock ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            ขอเกินยอดพร้อมเบิก (พร้อมขอ {chosenItem.currentStock} จากคลัง {chosenItem.physicalStock ?? chosenItem.currentStock} {chosenItem.unit}{chosenItem.reservedStock ? ` | รอจ่าย ${chosenItem.reservedStock}` : ''})
                          </span>
                        ) : (
                          <span className="text-teal-700 font-medium flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                            พร้อมเบิก: <strong className="font-bold text-slate-900">{chosenItem.currentStock} {chosenItem.unit}</strong>
                            {chosenItem.reservedStock > 0 && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                                คลัง {chosenItem.physicalStock} | รอจ่าย {chosenItem.reservedStock}
                              </span>
                            )}
                          </span>
                        )}
                        <span className="text-slate-500 font-medium">
                          ประมาณการ: ฿{((chosenItem.unitCost || 0) * (Number(row.quantity) || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span>สรุปคำขอ: </span>
            <strong className="text-blue-700">
              {borrowItems.filter((i) => i.itemId).length} รายการครุภัณฑ์
            </strong>
            <span className="mx-1.5">•</span>
            <strong className="text-teal-700">
              {requisitionItems.filter((i) => i.itemId).length} รายการวัสดุ
            </strong>
            {totalEstimatedCost > 0 && (
              <span className="block sm:inline sm:ml-2 text-slate-500">
                (ยอดประมาณการ: ฿{totalEstimatedCost.toFixed(2)})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasStockError && (
              <span className="w-full sm:w-auto text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> มีรายการที่ขอเกินสต็อกคงเหลือ
              </span>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={submitting || hasStockError}
              onClick={handleSubmit}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ส่งคำขอเบิก-ยืม</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
