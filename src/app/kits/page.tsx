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
  RefreshCw
} from 'lucide-react';
import LoadingSpinner, { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function PracticeKitsPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const isStaff = isOfficer || isAdmin;

  const [kits, setKits] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Quick Request Modal State
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

  const handleOpenRequest = (kit: any) => {
    setRequestTargetKit(kit);
    setRequestForm({
      setsRequested: 1,
      courseId: courses[0]?.id || '',
      advisorName: '',
      purpose: 'สำหรับการฝึกปฏิบัติการในรายวิชา',
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
        alert('ยื่นคำขอชุดฝึก ' + requestTargetKit.name + ' จำนวน ' + requestForm.setsRequested + ' ชุด สำเร็จ! ระบบได้สร้างคำขอไปยังศูนย์อนุมัติเรียบร้อยแล้ว');
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
            ชุดอุปกรณ์และเวชภัณฑ์สำเร็จรูปสำหรับฝึกหัตถการตามรายวิชา ขอยืมและเบิกได้ในคลิกเดียว
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
                setShowCreateModal(true);
                if (allItems.length > 0 && !kitForm.items[0].itemId) {
                  setKitForm((prev) => ({
                    ...prev,
                    items: [{ itemId: allItems[0].id, quantity: 1 }],
                  }));
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างชุดฝึกใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ทุกหมวดหมู่ ({kits.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat} ({kits.filter((k) => k.category === cat).length})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
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
          <h3 className="text-base font-bold text-slate-700">ยังไม่มีชุดฝึกปฏิบัติการในระบบ</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            เจ้าหน้าที่แล็บหรือแอดมินสามารถสร้างชุดฝึกปฏิบัติการมาตรฐาน (เช่น ชุดทำแผล, ชุดสวนปัสสาวะ) เพื่อให้นิสิตและอาจารย์กดเลือกใช้ได้ทันที
          </p>
          {isStaff && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างชุดฝึกปฏิบัติการแรก</span>
            </button>
          )}
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
                      <button
                        onClick={() => handleDeleteKit(kit)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="ลบชุดฝึกนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

                  {/* Components Breakdown */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>ส่วนประกอบในชุด ({kit.components?.length || 0} รายการ):</span>
                      <span className="text-[10px] text-slate-400 font-normal">จำนวนต่อ 1 ชุด</span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-xs">
                      {kit.components?.map((c: any) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                c.type === 'EQUIPMENT' ? 'bg-blue-500' : 'bg-teal-500'
                              }`}
                            />
                            <span className="text-slate-700 font-medium truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600 font-bold font-mono text-[11px]">
                            <span>x {c.quantityPerKit} {c.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Stock Readiness & Action */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
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
                          <span>อุปกรณ์ไม่พอจัด</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRequest(kit)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                    <span>ขอยืม/เบิกชุดนี้</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK REQUEST FOR KIT */}
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
                  <label className="block text-xs font-bold text-teal-900 mb-0.5">
                    จำนวนชุดที่ต้องการ (เซ็ต)
                  </label>
                  <span className="text-[11px] text-teal-700">
                    สต็อกในแล็บปัจจุบันพร้อมจัดได้สูงสุด: <b>{requestTargetKit.maxAvailableKits}</b> ชุด
                  </span>
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    min="1"
                    value={requestForm.setsRequested}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        setsRequested: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-center text-base font-black text-teal-950 focus:ring-2 focus:ring-teal-500"
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

              {/* Auto Summary Breakdown */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600" /> ระบบจะทำการสร้างคำขออัตโนมัติ:
                </div>
                <div className="text-slate-600 pl-5 space-y-1">
                  <div>• <b>คำขอยืมครุภัณฑ์:</b> จะรวมชิ้นส่วนครุภัณฑ์ทั้งหมดคูณด้วย {requestForm.setsRequested} ชุด</div>
                  <div>• <b>คำขอเบิกวัสดุสิ้นเปลือง:</b> จะรวมเวชภัณฑ์สิ้นเปลืองทั้งหมดคูณด้วย {requestForm.setsRequested} ชุด</div>
                </div>
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
      {/* MODAL: CREATE PRACTICE KIT */}
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
                    กำหนดชุดอุปกรณ์และเวชภัณฑ์มาตรฐานสำหรับนิสิตและอาจารย์
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

              {/* Item Components in Kit */}
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
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <div className="flex-1">
                        <select
                          value={row.itemId}
                          onChange={(e) => {
                            const updated = [...kitForm.items];
                            updated[idx].itemId = e.target.value;
                            setKitForm({ ...kitForm, items: updated });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                          required
                        >
                          {allItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              [{it.type === 'EQUIPMENT' ? 'ครุภัณฑ์' : 'สิ้นเปลือง'}] {it.name} ({it.code})
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
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{createSubmitting ? 'กำลังบันทึก...' : 'สร้างชุดฝึก'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}