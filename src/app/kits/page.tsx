'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  BriefcaseMedical,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Package,
  Calendar,
  BookOpen,
  User,
  Layers,
  X,
  Trash2,
  Edit3,
  ArrowRight,
  Sparkles,
  Clock,
  Info,
  RefreshCw,
  Printer,
  Zap,
  FileText,
  CheckSquare,
  MapPin,
  Flame
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PracticeKitsPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const isStaff = isOfficer || isAdmin;

  const [kits, setKits] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Quick Request Modal State (For Student/Borrower)
  const [requestTargetKit, setRequestTargetKit] = useState<any | null>(null);
  const [requestForm, setRequestForm] = useState({
    setsRequested: 1,
    courseId: '',
    advisorName: '',
    purpose: '',
    borrowDate: '',
    expectedReturnDate: '',
  });
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Create Kit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [kitForm, setKitForm] = useState({
    code: '',
    name: '',
    category: 'หัตถการพื้นฐาน',
    description: '',
    targetCourse: '',
    items: [{ itemId: '', quantity: 1 }],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit Kit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetKit, setEditTargetKit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    id: '',
    code: '',
    name: '',
    category: 'หัตถการพื้นฐาน',
    description: '',
    targetCourse: '',
    items: [{ itemId: '', quantity: 1 }],
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Prepare Kit for Class Modal State (Direct Dispense by Staff/Officer)
  const [prepareTargetKit, setPrepareTargetKit] = useState<any | null>(null);
  const [prepareForm, setPrepareForm] = useState({
    setsToPrepare: 5,
    courseId: '',
    instructorName: '',
    roomOrLocation: 'ห้องปฏิบัติการพยาบาล 1 (Lab 1)',
    note: '',
  });
  const [prepareSubmitting, setPrepareSubmitting] = useState(false);

  // Checklist Sheet Print Modal State
  const [prepChecklist, setPrepChecklist] = useState<any | null>(null);

  const fetchKitsAndItems = async () => {
    setLoading(true);
    try {
      const [kitsRes, itemsRes, coursesRes] = await Promise.all([
        fetch('/api/kits'),
        fetch('/api/items'),
        fetch('/api/courses'),
      ]);

      if (kitsRes.ok) {
        const kData = await kitsRes.json();
        setKits(kData);
      }
      if (itemsRes.ok) {
        const iData = await itemsRes.json();
        setAllItems(iData);
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData);
        if (cData.length > 0 && !requestForm.courseId) {
          setRequestForm((prev) => ({ ...prev, courseId: cData[0].id }));
          setPrepareForm((prev) => ({ ...prev, courseId: cData[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitsAndItems();
  }, []);

  const categories = Array.from(new Set(kits.map((k) => k.category))).filter(Boolean);

  const filteredKits = kits.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.targetCourse && k.targetCourse.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (k.description && k.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || k.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Open Quick Request
  const handleOpenRequest = (kit: any) => {
    setRequestTargetKit(kit);
    setRequestForm({
      setsRequested: 1,
      courseId: courses[0]?.id || '',
      advisorName: '',
      purpose: 'สำหรับการฝึกปฏิบัติการในรายวิชา ' + (kit.targetCourse || ''),
      borrowDate: new Date().toISOString().slice(0, 16),
      expectedReturnDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    });
  };

  const handleSubmitQuickRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTargetKit || !currentUser) return;
    setRequestSubmitting(true);

    try {
      const res = await fetch('/api/kits/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitId: requestTargetKit.id,
          setsRequested: requestForm.setsRequested,
          userId: currentUser.id,
          courseId: requestForm.courseId,
          advisorName: requestForm.advisorName,
          purpose: requestForm.purpose,
          borrowDate: requestForm.borrowDate,
          expectedReturnDate: requestForm.expectedReturnDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('ยื่นคำขอชุดฝึก ' + requestTargetKit.name + ' จำนวน ' + requestForm.setsRequested + ' ชุด สำเร็จ! ระบบได้ส่งเรื่องไปยังศูนย์อนุมัติเรียบร้อยแล้ว');
        setRequestTargetKit(null);
        fetchKitsAndItems();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยื่นคำขอชุดฝึก');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Open Prepare for Class Modal
  const handleOpenPrepare = (kit: any) => {
    setPrepareTargetKit(kit);
    setPrepareForm({
      setsToPrepare: Math.min(kit.maxAvailableKits || 1, 5) || 1,
      courseId: courses[0]?.id || '',
      instructorName: '',
      roomOrLocation: 'ห้องปฏิบัติการพยาบาล 1 (Lab 1)',
      note: 'จัดเตรียมชุดฝึกหัตถการประจำคาบเรียน',
    });
  };

  const handleSubmitPrepare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepareTargetKit) return;
    setPrepareSubmitting(true);

    try {
      const res = await fetch('/api/kits/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitId: prepareTargetKit.id,
          setsToPrepare: prepareForm.setsToPrepare,
          userId: currentUser?.id,
          courseId: prepareForm.courseId,
          instructorName: prepareForm.instructorName,
          roomOrLocation: prepareForm.roomOrLocation,
          note: prepareForm.note,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPrepareTargetKit(null);
        setPrepChecklist(data);
        fetchKitsAndItems();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการตัดสต็อกจัดเตรียมชุดฝึก');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setPrepareSubmitting(false);
    }
  };

  // Open Edit Kit Modal
  const handleOpenEdit = (kit: any) => {
    setEditTargetKit(kit);
    setEditForm({
      id: kit.id,
      code: kit.code,
      name: kit.name,
      category: kit.category || 'หัตถการพื้นฐาน',
      description: kit.description || '',
      targetCourse: kit.targetCourse || '',
      items: kit.components?.map((c: any) => ({
        itemId: c.itemId,
        quantity: c.quantityPerKit,
      })) || [{ itemId: allItems[0]?.id || '', quantity: 1 }],
    });
    setShowEditModal(true);
  };

  const handleUpdateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || editForm.items.length === 0) {
      alert('กรุณากรอกชื่อชุดฝึกและเลือกส่วนประกอบอย่างน้อย 1 รายการ');
      return;
    }
    setEditSubmitting(true);

    try {
      const res = await fetch('/api/kits/' + editForm.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          description: editForm.description,
          targetCourse: editForm.targetCourse,
          items: editForm.items,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditTargetKit(null);
        fetchKitsAndItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการแก้ไขชุดฝึก');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create Kit
  const handleAddKitItemRow = () => {
    if (allItems.length > 0) {
      setKitForm((prev) => ({
        ...prev,
        items: [...prev.items, { itemId: allItems[0].id, quantity: 1 }],
      }));
    }
  };

  const handleRemoveKitItemRow = (idx: number) => {
    setKitForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleAddEditItemRow = () => {
    if (allItems.length > 0) {
      setEditForm((prev) => ({
        ...prev,
        items: [...prev.items, { itemId: allItems[0].id, quantity: 1 }],
      }));
    }
  };

  const handleRemoveEditItemRow = (idx: number) => {
    setEditForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitForm.name || kitForm.items.length === 0) {
      alert('กรุณากรอกชื่อชุดฝึกและเลือกส่วนประกอบอย่างน้อย 1 รายการ');
      return;
    }
    setCreateSubmitting(true);

    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kitForm),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setKitForm({
          code: '',
          name: '',
          category: 'หัตถการพื้นฐาน',
          description: '',
          targetCourse: '',
          items: [{ itemId: allItems[0]?.id || '', quantity: 1 }],
        });
        fetchKitsAndItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการสร้างชุดฝึก');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteKit = async (kit: any) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบชุดฝึก: ' + kit.name + ' ?')) return;
    try {
      const res = await fetch('/api/kits/' + kit.id, { method: 'DELETE' });
      if (res.ok) {
        fetchKitsAndItems();
      } else {
        alert('เกิดข้อผิดพลาดในการลบชุดฝึก');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  // Helper function to format item label with Repack / Unit / Stock
  const getItemOptionLabel = (it: any) => {
    const isRepack = it.code?.startsWith('RP-') || it.name?.includes('ซองละ') || it.name?.includes('ปลอดเชื้อ');
    const typeLabel = isRepack
      ? '📦 [Repack]'
      : it.type === 'EQUIPMENT'
      ? '🩺 [ครุภัณฑ์]'
      : '🧪 [สิ้นเปลือง]';
    return `${typeLabel} ${it.name} (${it.code}) - เหลือ ${it.currentStock ?? 0} ${it.unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BriefcaseMedical className="w-6 h-6 text-teal-600" />
            ชุดฝึกปฏิบัติการพยาบาล (Practice Kits & Set Kits)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            รวมรายการครุภัณฑ์ เวชภัณฑ์ทั่วไป และวัสดุแบ่งบรรจุ (Repack) สำเร็จรูปสำหรับคาบเรียนแล็บ ตัดสต็อกและพิมพ์ใบตรวจรับได้ทันที
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchKitsAndItems}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isStaff && (
            <button
              onClick={() => {
                setKitForm({
                  code: '',
                  name: '',
                  category: 'หัตถการพื้นฐาน',
                  description: '',
                  targetCourse: '',
                  items: [{ itemId: allItems[0]?.id || '', quantity: 1 }],
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างชุดฝึกปฏิบัติการใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({kits.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อชุดฝึก, รหัส, รายวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Kits Catalog Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
          <LoadingSpinner />
          <span>กำลังโหลดรายการชุดฝึกปฏิบัติการและคำนวณความพร้อมสต็อก...</span>
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <BriefcaseMedical className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">ยังไม่มีชุดฝึกปฏิบัติการในหมวดหมู่นี้</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            เจ้าหน้าที่แล็บหรือแอดมินสามารถสร้างชุดฝึกมาตรฐาน พร้อมเลือกวัสดุย่อยที่แบ่งบรรจุ (Repack) เพื่อให้นิสิตและอาจารย์เบิกใช้ได้ทันที
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredKits.map((kit) => {
            const isAvailable = kit.maxAvailableKits > 0;

            return (
              <div
                key={kit.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-teal-500/40 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 pb-3 border-b border-slate-100 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                        {kit.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug group-hover:text-teal-700 transition">
                        {kit.name}
                      </h3>
                    </div>

                    {isStaff && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(kit)}
                          className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-teal-50 transition cursor-pointer"
                          title="แก้ไขชุดฝึกนี้"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteKit(kit)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="ลบชุดฝึกนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {kit.category}
                    </span>
                    {kit.targetCourse && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {kit.targetCourse}
                      </span>
                    )}
                  </div>

                  {kit.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {kit.description}
                    </p>
                  )}

                  {/* Components Breakdown with Repack tags */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>ส่วนประกอบในชุด ({kit.components?.length || 0} รายการ):</span>
                      <span className="text-[10px] text-slate-400 font-normal">จำนวนต่อ 1 ชุด</span>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                      {kit.components?.map((c: any) => {
                        const isRepack = c.code?.startsWith('RP-') || c.name?.includes('ซองละ') || c.name?.includes('ปลอดเชื้อ');

                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100/80 hover:bg-slate-100/80 transition"
                          >
                            <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                              {isRepack ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                                  Repack
                                </span>
                              ) : c.type === 'EQUIPMENT' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                                  ครุภัณฑ์
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 flex-shrink-0">
                                  สิ้นเปลือง
                                </span>
                              )}
                              <span className="text-slate-700 font-medium truncate" title={c.name}>
                                {c.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-right">
                              <span className="text-slate-700 font-bold font-mono text-[11px]">
                                x {c.quantityPerKit} {c.unit}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({c.currentStock})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Stock Readiness & Actions */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">สต็อกพร้อมจัดได้</div>
                    <div
                      className={`text-sm font-black flex items-center gap-1.5 ${
                        isAvailable ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{kit.maxAvailableKits} ชุด</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span>อุปกรณ์/วัสดุไม่พอจัด</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* For Staff: Direct Class Prep / Dispense */}
                    {isStaff && (
                      <button
                        onClick={() => handleOpenPrepare(kit)}
                        disabled={!isAvailable}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
                        title="ตัดสต็อกและพิมพ์ใบจัดเตรียมชุดสำหรับคาบเรียน"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>จัดเตรียมชุดแล็บ</span>
                      </button>
                    )}

                    {/* Quick Request for Students/Users */}
                    <button
                      onClick={() => handleOpenRequest(kit)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                      <span>ขอยืม/เบิกชุดนี้</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PREPARE KIT FOR CLASS (INSTANT DISPENSE) */}
      {/* ========================================================================= */}
      {prepareTargetKit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    จัดเตรียมชุดสำหรับคาบเรียน (Prepare for Class)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ตัดสต็อกวัสดุสิ้นเปลือง/Repack อัตโนมัติ (FIFO) พร้อมออกใบตรวจรับอุปกรณ์
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPrepareTargetKit(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrepare} className="space-y-4">
              {/* Kit Info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                    {prepareTargetKit.code}
                  </span>
                  <div className="font-bold text-slate-900 text-xs mt-1">
                    {prepareTargetKit.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-medium">สต็อกพร้อมจัดสูงสุด</div>
                  <div className="text-xs font-black text-emerald-600">
                    {prepareTargetKit.maxAvailableKits} ชุด
                  </div>
                </div>
              </div>

              {/* Number of Sets to Prepare */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนชุดที่ต้องการจัดเตรียม *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={prepareTargetKit.maxAvailableKits || 100}
                    value={prepareForm.setsToPrepare}
                    onChange={(e) =>
                      setPrepareForm({
                        ...prepareForm,
                        setsToPrepare: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center text-teal-700 focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สำหรับรายวิชา *
                  </label>
                  <select
                    value={prepareForm.courseId}
                    onChange={(e) => setPrepareForm({ ...prepareForm, courseId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instructor & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อาจารย์ผู้สอนประจำคาบ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อ. ดร. วิมลรัตน์"
                    value={prepareForm.instructorName}
                    onChange={(e) =>
                      setPrepareForm({ ...prepareForm, instructorName: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ห้องปฏิบัติการ / สถานที่
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Lab 2 ตึกพยาบาลศาสตร์"
                    value={prepareForm.roomOrLocation}
                    onChange={(e) =>
                      setPrepareForm({ ...prepareForm, roomOrLocation: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น ฝึกหัตถการกลุ่มเรียนวันจันทร์บ่าย"
                  value={prepareForm.note}
                  onChange={(e) => setPrepareForm({ ...prepareForm, note: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Pre-Check Stock Breakdown Table */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>ประมาณการยอดตัดสต็อก ({prepareForm.setsToPrepare} ชุด):</span>
                  <span className="text-[10px] text-slate-400">หักยอด FIFO</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {prepareTargetKit.components?.map((c: any) => {
                    const totalNeeded = c.quantityPerKit * prepareForm.setsToPrepare;
                    const isEnough = c.currentStock >= totalNeeded;
                    const isRepack = c.code?.startsWith('RP-') || c.name?.includes('ซองละ');

                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                          {isRepack ? (
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-700">
                              Repack
                            </span>
                          ) : c.type === 'EQUIPMENT' ? (
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-700">
                              ครุภัณฑ์
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-teal-100 text-teal-700">
                              สิ้นเปลือง
                            </span>
                          )}
                          <span className="text-slate-700 truncate">{c.name}</span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[10px]">
                          <span className="text-slate-700 font-bold">
                            ใช้ {totalNeeded} {c.unit}
                          </span>
                          <span
                            className={`font-bold ${
                              isEnough ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isEnough ? 'พอจัด ✅' : 'ไม่พอ ❌'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrepareTargetKit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={prepareSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>{prepareSubmitting ? 'กำลังตัดสต็อก...' : 'ยืนยันจัดเตรียมชุดแล็บ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PRACTICE KIT */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    แก้ไขชุดฝึกปฏิบัติการ (Edit Practice Kit)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ปรับปรุงชื่อ รายวิชา และส่วนประกอบวัสดุย่อยในชุดฝึก
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateKit} className="space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อชุดฝึกปฏิบัติการ *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสชุด</label>
                  <input
                    type="text"
                    value={editForm.code}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่หัตถการ
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รายวิชาที่ใช้บ่อย
                  </label>
                  <input
                    type="text"
                    value={editForm.targetCourse}
                    onChange={(e) => setEditForm({ ...editForm, targetCourse: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายละเอียด / หัตถการที่ใช้
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Edit Components in Kit */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    รายการอุปกรณ์และเวชภัณฑ์ในชุด (ต่อ 1 เซ็ต) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEditItemRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มส่วนประกอบ
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editForm.items.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80"
                    >
                      <div className="flex-1">
                        <select
                          value={row.itemId}
                          onChange={(e) => {
                            const updated = [...editForm.items];
                            updated[idx].itemId = e.target.value;
                            setEditForm({ ...editForm, items: updated });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                          required
                        >
                          {allItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              {getItemOptionLabel(it)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => {
                            const updated = [...editForm.items];
                            updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setEditForm({ ...editForm, items: updated });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs font-bold"
                          placeholder="จำนวน"
                          required
                        />
                      </div>

                      {editForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขชุดฝึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHECKLIST PRINT SHEET */}
      {/* ========================================================================= */}
      {prepChecklist && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none print:p-0">
            {/* Action Bar (Hidden on Print) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800 text-sm">
                  ตัดสต็อกและจัดเตรียมชุดฝึกสำเร็จ!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบตรวจรับชุดฝึก (Print)</span>
                </button>
                <button
                  onClick={() => setPrepChecklist(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="space-y-4 text-slate-800 print:text-black">
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-slate-800">
                <h2 className="text-lg font-bold">
                  คณะพยาบาลศาสตร์ / วิทยาลัยพยาบาล
                </h2>
                <h3 className="text-sm font-semibold text-slate-600 print:text-black">
                  ใบรายการจัดเตรียมและตรวจรับชุดฝึกปฏิบัติการ (Practice Kit Preparation Checklist)
                </h3>
                <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-500 pt-1">
                  <span>เลขที่เอกสาร: <b>{prepChecklist.prepReference}</b></span>
                  <span>วันที่: <b>{new Date(prepChecklist.preparedAt).toLocaleString('th-TH')}</b></span>
                </div>
              </div>

              {/* Kit & Course Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 print:bg-transparent print:border-slate-400">
                <div>
                  <span className="text-slate-500">ชุดฝึกปฏิบัติการ:</span>{' '}
                  <b className="text-slate-900 font-bold">{prepChecklist.kit.name} ({prepChecklist.kit.code})</b>
                </div>
                <div>
                  <span className="text-slate-500">จำนวนที่จัดเตรียม:</span>{' '}
                  <b className="text-teal-700 font-black text-sm">{prepChecklist.numSets} ชุด</b>
                </div>
                <div>
                  <span className="text-slate-500">สำหรับรายวิชา:</span>{' '}
                  <b>{prepChecklist.course ? `[${prepChecklist.course.code}] ${prepChecklist.course.name}` : 'ทั่วไป'}</b>
                </div>
                <div>
                  <span className="text-slate-500">อาจารย์ผู้สอน:</span>{' '}
                  <b>{prepChecklist.instructorName}</b>
                </div>
                <div>
                  <span className="text-slate-500">สถานที่ / ห้องแล็บ:</span>{' '}
                  <b>{prepChecklist.roomOrLocation}</b>
                </div>
                <div>
                  <span className="text-slate-500">หมายเหตุ:</span>{' '}
                  <span>{prepChecklist.note || '-'}</span>
                </div>
              </div>

              {/* Checklist Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300 text-center w-10">ลำดับ</th>
                      <th className="p-2 border border-slate-300">รายการอุปกรณ์ / เวชภัณฑ์</th>
                      <th className="p-2 border border-slate-300 text-center w-24">ประเภท</th>
                      <th className="p-2 border border-slate-300 text-center w-20">ต่อ 1 ชุด</th>
                      <th className="p-2 border border-slate-300 text-center w-24">รวมที่จัด ({prepChecklist.numSets} ชุด)</th>
                      <th className="p-2 border border-slate-300 text-center w-28">ตรวจรับอุปกรณ์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepChecklist.items?.map((item: any, idx: number) => {
                      const isRepack = item.code?.startsWith('RP-') || item.name?.includes('ซองละ');

                      return (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                          <td className="p-2 border border-slate-300">
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                          </td>
                          <td className="p-2 border border-slate-300 text-center">
                            {isRepack ? (
                              <span className="font-bold text-purple-700">Repack</span>
                            ) : item.type === 'EQUIPMENT' ? (
                              <span className="font-bold text-blue-700">ครุภัณฑ์</span>
                            ) : (
                              <span className="font-bold text-teal-700">สิ้นเปลือง</span>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            {item.qtyPerSet} {item.unit}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-bold">
                            {item.totalQtyDispensed} {item.unit}
                          </td>
                          <td className="p-2 border border-slate-300 text-center">
                            <div className="inline-flex items-center gap-2 text-[10px]">
                              <span>[  ] ครบ</span>
                              <span>[  ] ชำรุด</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Signature Section */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
                <div className="space-y-6">
                  <div>ลงชื่อ ................................................................</div>
                  <div>( ................................................................ )</div>
                  <div className="text-slate-500 font-medium">เจ้าหน้าที่ผู้จัดเตรียมชุดฝึก</div>
                </div>

                <div className="space-y-6">
                  <div>ลงชื่อ ................................................................</div>
                  <div>( ................................................................ )</div>
                  <div className="text-slate-500 font-medium">อาจารย์ผู้สอน / ตัวแทนนิสิตผู้ตรวจรับ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUICK REQUEST FOR KIT (EXISTING) */}
      {/* ========================================================================= */}
      {requestTargetKit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <BriefcaseMedical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    ยื่นคำขอชุดฝึกปฏิบัติการ (Quick Request)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {requestTargetKit.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRequestTargetKit(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuickRequest} className="space-y-4">
              {/* Number of Kits */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-100 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-teal-900">จำนวนชุดที่ต้องการขอเบิก/ยืม</div>
                  <div className="text-[11px] text-teal-700">สต็อกพร้อมจัดได้สูงสุด: {requestTargetKit.maxAvailableKits} ชุด</div>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    max={requestTargetKit.maxAvailableKits || 100}
                    value={requestForm.setsRequested}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        setsRequested: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-white border border-teal-200 rounded-xl px-2.5 py-1.5 text-center font-bold text-sm text-teal-900 focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Course & Advisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สำหรับรายวิชา
                  </label>
                  <select
                    value={requestForm.courseId}
                    onChange={(e) => setRequestForm({ ...requestForm, courseId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อาจารย์ผู้สอน / ที่ปรึกษา
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่ออาจารย์ที่รับทราบ"
                    value={requestForm.advisorName}
                    onChange={(e) => setRequestForm({ ...requestForm, advisorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันและเวลาที่ต้องการใช้
                  </label>
                  <input
                    type="datetime-local"
                    value={requestForm.borrowDate}
                    onChange={(e) => setRequestForm({ ...requestForm, borrowDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กำหนดส่งคืนครุภัณฑ์
                  </label>
                  <input
                    type="datetime-local"
                    value={requestForm.expectedReturnDate}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, expectedReturnDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์ / หัวข้อการฝึกปฏิบัติ
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ฝึกทำแผลผ่าตัดช่องท้อง กลุ่ม 1-5"
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestTargetKit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{requestSubmitting ? 'กำลังส่งคำขอ...' : 'ยืนยันยื่นคำขอชุดฝึก'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CREATE PRACTICE KIT */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    สร้างชุดฝึกปฏิบัติการใหม่ (New Practice Kit)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลือกเครื่องมือ ครุภัณฑ์ และวัสดุย่อยที่ Repack แล้วมารวมเป็นชุดหัตถการมาตรฐาน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKit} className="space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อชุดฝึกปฏิบัติการ *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ชุดฝึกปฏิบัติการทำแผลปราศจากเชื้อ (Dressing Set)"
                    value={kitForm.name}
                    onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสชุด (เว้นว่างเพื่อสร้างอัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    placeholder="KIT-DRESSING-01"
                    value={kitForm.code}
                    onChange={(e) => setKitForm({ ...kitForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่หัตถการ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น หัตถการพื้นฐาน, การดูแลผู้ป่วยวิกฤต"
                    value={kitForm.category}
                    onChange={(e) => setKitForm({ ...kitForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รายวิชาที่ใช้บ่อย (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น NUR2101 การพยาบาลพื้นฐาน"
                    value={kitForm.targetCourse}
                    onChange={(e) => setKitForm({ ...kitForm, targetCourse: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายละเอียด / หัตถการที่ใช้
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ใช้สำหรับฝึกหัตถการการทำแผลแห้งและแผลเปียก"
                  value={kitForm.description}
                  onChange={(e) => setKitForm({ ...kitForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Item Components in Kit with Repack labels */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    รายการอุปกรณ์และเวชภัณฑ์ในชุด (ต่อ 1 เซ็ต) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddKitItemRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มส่วนประกอบ
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {kitForm.items.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80"
                    >
                      <div className="flex-1">
                        <select
                          value={row.itemId}
                          onChange={(e) => {
                            const updated = [...kitForm.items];
                            updated[idx].itemId = e.target.value;
                            setKitForm({ ...kitForm, items: updated });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                          required
                        >
                          {allItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              {getItemOptionLabel(it)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => {
                            const updated = [...kitForm.items];
                            updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setKitForm({ ...kitForm, items: updated });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs font-bold"
                          placeholder="จำนวน"
                          required
                        />
                      </div>

                      {kitForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKitItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {createSubmitting ? 'กำลังบันทึก...' : 'สร้างชุดฝึกปฏิบัติการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
