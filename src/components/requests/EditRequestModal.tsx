'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Package,
  Boxes,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  BookOpen,
  User,
  Sparkles,
  RefreshCw,
  Layers,
  GraduationCap,
  CheckCircle2,
  Edit3,
  Clock,
} from 'lucide-react';
import { formatTeacherName, formatUserName } from '@/lib/user-utils';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: any; // BorrowRequest or RequisitionRequest
  requestType: 'BORROW' | 'REQUISITION' | 'UNIFIED';
}

export default function EditRequestModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  requestType,
}: EditRequestModalProps) {
  const { currentUser, isTeacher } = useAuth();
  const isStudent = currentUser?.role === 'USER' && !isTeacher;

  const [loadingItems, setLoadingItems] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [consumablesList, setConsumablesList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [useTarget, setUseTarget] = useState<'SIMULATION' | 'HUMAN'>('SIMULATION');
  const [borrowDate, setBorrowDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');

  // Items State
  const [borrowItems, setBorrowItems] = useState<
    { itemId: string; quantity: number | string; categoryId?: string }[]
  >([]);
  const [requisitionItems, setRequisitionItems] = useState<
    {
      itemId: string;
      quantity: number | string;
      categoryId?: string;
      isSubUnit?: boolean;
      requestedUnit?: string;
    }[]
  >([]);

  // Format date helper for input type="datetime-local"
  const formatDateTimeLocal = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  };

  // Format date helper for input type="date"
  const formatDateLocal = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 10);
  };

  // Populate data from initialData when modal opens
  useEffect(() => {
    if (!isOpen || !initialData) return;

    setConflictError(null);
    setCourseId(initialData.courseId || '');
    setAdvisorName(initialData.advisorName || '');
    setPurpose(initialData.purpose || '');
    setUseTarget(initialData.useTarget || 'SIMULATION');

    if (requestType === 'BORROW' || requestType === 'UNIFIED') {
      setBorrowDate(formatDateTimeLocal(initialData.borrowDate));
      setExpectedReturnDate(formatDateTimeLocal(initialData.expectedReturnDate));

      const bItems = (initialData.items || []).map((it: any) => ({
        itemId: it.itemId,
        quantity: it.quantity || 1,
        categoryId: it.item?.categoryId || '',
      }));
      setBorrowItems(bItems.length > 0 ? bItems : [{ itemId: '', quantity: '' }]);

      // Check if unified with linked requisition
      const linkedReq = initialData.requisitionRequest;
      if (linkedReq && linkedReq.items) {
        const rItems = linkedReq.items.map((it: any) => ({
          itemId: it.itemId,
          quantity: it.quantityRequested || 1,
          isSubUnit: Boolean(it.isSubUnit),
          requestedUnit: it.requestedUnit || '',
          categoryId: it.item?.categoryId || '',
        }));
        setRequisitionItems(rItems.length > 0 ? rItems : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]);
      } else {
        setRequisitionItems([]);
      }
    } else {
      // Pure REQUISITION
      setDateNeeded(formatDateLocal(initialData.dateNeeded));
      const rItems = (initialData.items || []).map((it: any) => ({
        itemId: it.itemId,
        quantity: it.quantityRequested || 1,
        isSubUnit: Boolean(it.isSubUnit),
        requestedUnit: it.requestedUnit || '',
        categoryId: it.item?.categoryId || '',
      }));
      setRequisitionItems(rItems.length > 0 ? rItems : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]);

      // Check if unified with linked borrow
      const linkedBorrow = initialData.borrowRequest;
      if (linkedBorrow && linkedBorrow.items) {
        setBorrowDate(formatDateTimeLocal(linkedBorrow.borrowDate));
        setExpectedReturnDate(formatDateTimeLocal(linkedBorrow.expectedReturnDate));
        const bItems = linkedBorrow.items.map((it: any) => ({
          itemId: it.itemId,
          quantity: it.quantity || 1,
          categoryId: it.item?.categoryId || '',
        }));
        setBorrowItems(bItems.length > 0 ? bItems : [{ itemId: '', quantity: '' }]);
      } else {
        setBorrowItems([]);
      }
    }
  }, [isOpen, initialData, requestType]);

  // Load items, courses, instructors
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
        console.error('Failed to load edit modal data:', err);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen || !initialData) return null;


  const showBorrowSection = requestType === 'BORROW' || requestType === 'UNIFIED' || borrowItems.length > 0;
  const showReqSection = requestType === 'REQUISITION' || requestType === 'UNIFIED' || requisitionItems.length > 0;

  // Handlers for borrow items
  const handleAddBorrowItem = () => {
    setBorrowItems([...borrowItems, { itemId: '', quantity: '' }]);
  };

  const handleRemoveBorrowItem = (index: number) => {
    setBorrowItems(borrowItems.filter((_, i) => i !== index));
  };

  const handleBorrowItemChange = (index: number, field: string, value: any) => {
    const updated = [...borrowItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'itemId') {
      const match = equipmentList.find((e) => e.id === value);
      if (match?.categoryId) updated[index].categoryId = match.categoryId;
    }
    setBorrowItems(updated);
  };

  // Handlers for requisition items
  const handleAddRequisitionItem = () => {
    setRequisitionItems([
      ...requisitionItems,
      { itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' },
    ]);
  };

  const handleRemoveRequisitionItem = (index: number) => {
    setRequisitionItems(requisitionItems.filter((_, i) => i !== index));
  };

  const handleRequisitionItemChange = (index: number, field: string, value: any) => {
    const updated = [...requisitionItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'itemId') {
      const match = consumablesList.find((c) => c.id === value);
      if (match) {
        updated[index].categoryId = match.categoryId || '';
        updated[index].isSubUnit = false;
        updated[index].requestedUnit = match.unit;
      }
    }
    setRequisitionItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

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
      alert('กรุณาเลือกรายการครุภัณฑ์หรือวัสดุที่ต้องการขออย่างน้อย 1 รายการ');
      return;
    }

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

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: initialData.id,
          requestType,
          lastKnownUpdatedAt: initialData.updatedAt,
          userId: currentUser?.id,
          purpose,
          useTarget,
          courseId: courseId || null,
          advisorName: advisorName || null,
          borrowDate: borrowDate ? new Date(borrowDate).toISOString() : undefined,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
          dateNeeded: dateNeeded ? new Date(dateNeeded).toISOString() : undefined,
          borrowItems: validBorrow,
          requisitionItems: validReq,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.error === 'CONCURRENCY_CONFLICT') {
          setConflictError(data.message || '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง');
          return;
        }
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไขคำขอ');
        return;
      }

      alert('✅ บันทึกการแก้ไขคำขอเรียบร้อยแล้ว สถานะถูกปรับเป็น "รออนุมัติ"');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                ✏️ แก้ไขคำขอ: {initialData.requestNumber}
              </h2>
              <p className="text-xs text-amber-100/90 font-medium">
                {requestType === 'UNIFIED'
                  ? 'คำขอร่วม (ยืมครุภัณฑ์ & เบิกวัสดุสิ้นเปลือง)'
                  : requestType === 'BORROW'
                  ? 'คำขอยืมครุภัณฑ์'
                  : 'คำขอเบิกวัสดุสิ้นเปลือง'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>



        {/* Conflict Error Notice */}
        {conflictError && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-bold">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{conflictError}</span>
            </div>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition cursor-pointer flex-shrink-0"
            >
              รีเฟรชข้อมูลล่าสุด
            </button>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Course and Advisor */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>รายวิชาและอาจารย์ผู้รับผิดชอบ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  เลือกรายวิชา (ถ้ามี)
                </label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    const selCourseId = e.target.value;
                    setCourseId(selCourseId);
                    const sel = courses.find((c) => c.id === selCourseId);
                    if (sel?.instructorName) {
                      setAdvisorName(sel.instructorName);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- ไม่ระบุรายวิชา (ยืม/เบิกส่วนตัว/กิจกรรม) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} {c.name} {c.instructorName ? `(${c.instructorName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  อาจารย์ผู้รับทราบ/ผู้อนุมัติ {isStudent && <span className="text-rose-500">* (นิสิตต้องระบุ)</span>}
                </label>
                <div className="flex gap-2">
                  <select
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- เลือกอาจารย์จากรายชื่อ --</option>
                    {instructors.map((ins) => (
                      <option key={ins.id} value={ins.name}>
                        {formatTeacherName(ins.name)}
                      </option>
                    ))}
                    {advisorName && !instructors.some((ins) => ins.name === advisorName) && (
                      <option value={advisorName}>{formatTeacherName(advisorName)} (ระบุเอง)</option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                    title="พิมพ์ชื่ออาจารย์เอง"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isEditingAdvisor && (
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ-นามสกุลอาจารย์ผู้รับผิดชอบ"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="mt-2 w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                )}
              </div>
            </div>

            {/* Purpose & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  วัตถุประสงค์ & สถานที่ใช้งาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ฝึกทักษะการฉีดยา ห้องปฏิบัติการ 301"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  เป้าหมายการใช้งาน
                </label>
                <select
                  value={useTarget}
                  onChange={(e: any) => setUseTarget(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="SIMULATION">🤖 ฝึกกับหุ่นจำลอง (Simulation)</option>
                  <option value="HUMAN">🩺 ใช้กับคนจริง (Human Patients)</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              {showBorrowSection ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      วัน-เวลาที่ขอยืม
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={borrowDate}
                      onChange={(e) => setBorrowDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      วัน-เวลาที่กำหนดส่งคืน
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    วันที่ต้องการใช้พัสดุ
                  </label>
                  <input
                    type="date"
                    required
                    value={dateNeeded}
                    onChange={(e) => setDateNeeded(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Equipment Borrow Items */}
          {showBorrowSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>รายการครุภัณฑ์ที่ขอยืม</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBorrowItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มครุภัณฑ์</span>
                </button>
              </div>

              <div className="space-y-2">
                {borrowItems.map((item, idx) => {
                  const matchEq = equipmentList.find((e) => e.id === item.itemId);
                  const availCount = matchEq?.availableAssets?.length ?? matchEq?.currentStock ?? 0;
                  const isOver = item.itemId && Number(item.quantity) > availCount;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex-1 w-full">
                        <select
                          value={item.itemId}
                          onChange={(e) => handleBorrowItemChange(idx, 'itemId', e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">-- เลือกครุภัณฑ์ --</option>
                          {equipmentList.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.name} (พร้อมใช้ {eq.availableAssets?.length ?? eq.currentStock} {eq.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="number"
                          min="1"
                          placeholder="จำนวน"
                          value={item.quantity}
                          onChange={(e) => handleBorrowItemChange(idx, 'quantity', e.target.value)}
                          className={`w-24 text-xs p-2.5 rounded-xl border text-center font-bold ${
                            isOver
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                          }`}
                        />
                        <span className="text-xs text-slate-500 min-w-[36px]">
                          {matchEq?.unit || 'ชิ้น'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBorrowItem(idx)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="ลบแถว"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Requisition Consumable Items */}
          {showReqSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>รายการวัสดุสิ้นเปลืองที่ขอเบิก</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddRequisitionItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มวัสดุ</span>
                </button>
              </div>

              <div className="space-y-2">
                {requisitionItems.map((item, idx) => {
                  const matchCons = consumablesList.find((c) => c.id === item.itemId);
                  const ratio = Number(matchCons?.conversionRatio) > 0 ? Number(matchCons?.conversionRatio) : 1;
                  const totalPieces = (matchCons?.currentStock || 0) * ratio + (matchCons?.openPackRemainder || 0);
                  const isSub = Boolean(item.isSubUnit);
                  const maxAllowed = isSub ? totalPieces : matchCons?.currentStock || 0;
                  const isOver = item.itemId && Number(item.quantity) > maxAllowed;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex-1 w-full">
                          <select
                            value={item.itemId}
                            onChange={(e) => handleRequisitionItemChange(idx, 'itemId', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          >
                            <option value="">-- เลือกวัสดุสิ้นเปลือง --</option>
                            {consumablesList.map((con) => (
                              <option key={con.id} value={con.id}>
                                {con.name} (สต็อก: {con.currentStock} {con.unit}
                                {con.conversionRatio > 1
                                  ? ` | ${con.currentStock * con.conversionRatio + (con.openPackRemainder || 0)} ${con.usageUnit}`
                                  : ''}
                                )
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="number"
                            min="1"
                            placeholder="จำนวน"
                            value={item.quantity}
                            onChange={(e) => handleRequisitionItemChange(idx, 'quantity', e.target.value)}
                            className={`w-24 text-xs p-2.5 rounded-xl border text-center font-bold ${
                              isOver
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                            }`}
                          />

                          {/* Sub-unit toggle pills if convertible */}
                          {matchCons && ratio > 1 ? (
                            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  handleRequisitionItemChange(idx, 'isSubUnit', false);
                                  handleRequisitionItemChange(idx, 'requestedUnit', matchCons.unit);
                                }}
                                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                                  !isSub
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                📦 {matchCons.unit}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleRequisitionItemChange(idx, 'isSubUnit', true);
                                  handleRequisitionItemChange(idx, 'requestedUnit', matchCons.usageUnit || 'ชิ้น');
                                }}
                                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                                  isSub
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                ✨ {matchCons.usageUnit || 'ชิ้น'} (ย่อย)
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 min-w-[36px]">
                              {matchCons?.unit || 'หน่วย'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveRequisitionItem(idx)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="ลบแถว"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stock availability indicator */}
                      {matchCons && (
                        <div className="text-[11px] text-slate-500 pl-1 flex items-center justify-between">
                          <span>
                            พร้อมเบิก:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {matchCons.currentStock} {matchCons.unit}
                            </strong>
                            {ratio > 1 && (
                              <span>
                                {' '}(รวมเศษเปิด:{' '}
                                <strong className="text-amber-600 dark:text-amber-400">
                                  {totalPieces} {matchCons.usageUnit || 'ชิ้น'}
                                </strong>
                                )
                              </span>
                            )}
                          </span>
                          {isOver && (
                            <span className="text-rose-600 font-bold">
                              ⚠️ ระบุเกินสต็อกพร้อมใช้
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
              <span>ตรวจสอบข้อมูลให้ถูกต้องก่อนกดบันทึก</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกการแก้ไข...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการแก้ไขคำขอ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
