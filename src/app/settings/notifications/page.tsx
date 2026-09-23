'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Bell,
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Check,
} from 'lucide-react';

interface NotificationTemplateItem {
  id: string;
  category: string;
  name: string;
  description: string;
  title: string;
  message: string;
  isActive: boolean;
  defaultTitle: string;
  defaultMessage: string;
  variablesList: { name: string; label: string }[];
}

const CATEGORIES = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'BORROW', label: 'ยืม-คืนอุปกรณ์' },
  { key: 'REQUISITION', label: 'เบิกจ่ายวัสดุ' },
  { key: 'ROOM', label: 'จองห้องปฏิบัติการ' },
  { key: 'PRACTICE', label: 'จองฝึกปฏิบัติ' },
  { key: 'SYSTEM', label: 'ระบบ & คลังพัสดุ' },
];

export default function NotificationSettingsPage() {
  const { currentUser, isLoading } = useAuth();
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ [id: string]: { type: 'success' | 'error'; message: string } }>({});

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/notifications');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleFieldChange = (id: string, field: 'title' | 'message' | 'isActive', value: any) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleInsertVariable = (id: string, varName: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            message: `${t.message} {${varName}}`,
          };
        }
        return t;
      })
    );
  };

  const handleSave = async (item: NotificationTemplateItem) => {
    if (!currentUser?.id) return;
    setSavingId(item.id);
    setFeedback((prev) => ({ ...prev, [item.id]: { type: 'success', message: '' } }));

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          message: item.message,
          isActive: item.isActive,
          userId: currentUser.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'บันทึกไม่สำเร็จ');
      }

      setFeedback((prev) => ({
        ...prev,
        [item.id]: { type: 'success', message: 'บันทึกการเปลี่ยนแปลงแล้ว ✅' },
      }));
      setTimeout(() => {
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [item.id]: { type: 'error', message: err.message || 'เกิดข้อผิดพลาด' },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = async (id: string) => {
    if (!currentUser?.id) return;
    if (!confirm('ต้องการคืนค่าข้อความเป็นค่าเริ่มต้นของระบบใช่หรือไม่?')) return;

    setResettingId(id);
    try {
      const res = await fetch('/api/settings/notifications/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: currentUser.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === id ? { ...t, title: data.template.title, message: data.template.message, isActive: true } : t))
          );
        }
        setFeedback((prev) => ({
          ...prev,
          [id]: { type: 'success', message: 'คืนค่าเริ่มต้นเรียบร้อยแล้ว' },
        }));
        setTimeout(() => {
          setFeedback((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 3000);
      }
    } catch (err) {
      alert('ไม่สามารถคืนค่าได้');
    } finally {
      setResettingId(null);
    }
  };

  const handleResetAll = async () => {
    if (!currentUser?.id) return;
    if (!confirm('⚠️ คำเตือน: คุณต้องการคืนค่าเริ่มต้นของทุกข้อความแจ้งเตือนในระบบใช่หรือไม่?')) return;

    try {
      setLoading(true);
      const res = await fetch('/api/settings/notifications/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ALL', userId: currentUser.id }),
      });
      if (res.ok) {
        await fetchTemplates();
        alert('คืนค่าเริ่มต้นทุกรายการเรียบร้อยแล้ว');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการคืนค่า');
    } finally {
      setLoading(false);
    }
  };

  // Helper สำหรับจำลองข้อความตัวอย่างใน Live Preview
  const renderPreview = (text: string, variablesList: { name: string; label: string }[]) => {
    if (!text) return '';
    let preview = text;
    const sampleValues: Record<string, string> = {
      studentName: 'นริศรา สุขใจ',
      requestNumber: 'REQ-25690923-001',
      itemSummary: 'หูฟังแพทย์ (Stethoscope) 2 ชิ้น',
      approverName: 'อ.พรทิพย์ สว่างเนตร',
      reason: 'อุปกรณ์ไม่เพียงพอในวันดังกล่าว',
      roomName: 'ห้องปฏิบัติการพยาบาล 401',
      date: '24 ก.ย. 2569',
      timeSlot: '09:00 - 12:00',
      bookingNumber: 'ROOM-25690923-005',
      dueDate: '25 ก.ย. 2569',
      itemName: 'เข็มฉีดยา Syringe 5ml',
      currentQuantity: '5',
      minQuantity: '20',
      unit: 'กล่อง',
    };

    for (const [key, val] of Object.entries(sampleValues)) {
      preview = preview.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'), val);
    }
    // สำหรับชื่อภาษาไทย
    preview = preview
      .replace(/\{\s*นิสิต\s*\}/gi, sampleValues.studentName)
      .replace(/\{\s*รหัสคำขอ\s*\}/gi, sampleValues.requestNumber)
      .replace(/\{\s*รายการ\s*\}/gi, sampleValues.itemSummary)
      .replace(/\{\s*ห้อง\s*\}/gi, sampleValues.roomName)
      .replace(/\{\s*วันที่\s*\}/gi, sampleValues.date);

    return preview;
  };

  if (!isLoading && currentUser?.role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-slate-500 mt-1">
          หน้านี้สงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น
        </p>
      </div>
    );
  }

  const filteredTemplates = templates.filter((t) => {
    const matchCategory = activeCategory === 'ALL' || t.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-inner">
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                ผู้ดูแลระบบ (Admin)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                In-App & Web Push
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black mt-1">ตั้งค่าข้อความแจ้งเตือน (Templates)</h1>
            <p className="text-xs md:text-sm text-teal-100/70 mt-0.5">
              ปรับแต่งหัวข้อ ข้อความ และตัวแปรอัตโนมัติสำหรับการแจ้งเตือนคำขอและระบบทั้งหมด
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้นทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* Filter and Category Tabs */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.key
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {cat.key === 'ALL'
                  ? templates.length
                  : templates.filter((t) => t.category === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อเทมเพลต, หัวข้อ หรือข้อความ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
          <span>กำลังโหลดเทมเพลตข้อความ...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          ไม่พบรายการเทมเพลตที่ตรงกับเงื่อนไขการค้นหา
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTemplates.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl shadow-sm transition-all overflow-hidden ${
                item.isActive
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-950/40'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </h3>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) => handleFieldChange(item.id, 'isActive', e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                    />
                    <span>{item.isActive ? 'เปิดใช้งาน' : 'ปิดการแจ้งเตือน'}</span>
                  </label>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Inputs Column */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      หัวข้อการแจ้งเตือน (Title)
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                      placeholder="ระบุหัวข้อแจ้งเตือน..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      เนื้อหาข้อความ (Message)
                    </label>
                    <textarea
                      rows={3}
                      value={item.message}
                      onChange={(e) => handleFieldChange(item.id, 'message', e.target.value)}
                      placeholder="ระบุเนื้อหาข้อความ..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                    />
                  </div>

                  {/* Variables Helper */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                      คลิกเพื่อแทรกตัวแปรอัตโนมัติ (Placeholders):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.variablesList?.map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => handleInsertVariable(item.id, v.name)}
                          className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-700 dark:text-teal-300 font-mono transition cursor-pointer flex items-center gap-1"
                          title={`แทรก ${v.label}`}
                        >
                          <span>+{`{${v.name}}`}</span>
                          <span className="text-[10px] text-teal-600/70 dark:text-teal-400/70 font-sans">
                            ({v.label})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Preview Column */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      <Smartphone className="w-4 h-4 text-teal-600" />
                      <span>ตัวอย่างการแสดงผลจริง (Live Preview)</span>
                    </div>

                    {/* Mobile Notification Mockup */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-950 text-white border border-slate-800 shadow-lg space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-md bg-teal-500 flex items-center justify-center text-[9px] text-white font-bold">
                            N
                          </div>
                          <span className="font-semibold text-slate-300">ระบบห้องปฏิบัติการพยาบาล</span>
                        </div>
                        <span>ตอนนี้</span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {renderPreview(item.title, item.variablesList) || 'หัวข้อแจ้งเตือน'}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                          {renderPreview(item.message, item.variablesList) || 'เนื้อหาข้อความแจ้งเตือน...'}
                        </p>
                      </div>

                      <div className="pt-1 flex gap-1.5">
                        <div className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] text-teal-300 font-semibold">
                          🔍 ดูรายละเอียด
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons & Feedback */}
                  <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                    <button
                      type="button"
                      onClick={() => handleReset(item.id)}
                      disabled={resettingId === item.id || savingId === item.id}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{resettingId === item.id ? 'กำลังคืนค่า...' : 'คืนค่าเริ่มต้น'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {feedback[item.id] && (
                        <span
                          className={`text-xs font-bold flex items-center gap-1 ${
                            feedback[item.id].type === 'success'
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {feedback[item.id].message}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSave(item)}
                        disabled={savingId === item.id}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingId === item.id ? 'กำลังบันทึก...' : 'บันทึก'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
