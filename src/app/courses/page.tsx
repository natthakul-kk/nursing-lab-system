'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3,
  BookOpen,
  Coins,
  Download,
  Printer,
  Plus,
  Layers,
  Calendar,
  User,
  CheckCircle2,
  ChevronRight,
  PieChart,
  FileSpreadsheet,
  Building,
  ShieldAlert
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function CoursesPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New Course Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    semester: '1',
    academicYear: '2569',
    instructorName: '',
    description: '',
    allocatedBudget: 50000,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'USER') {
      router.push('/');
      return;
    }
    fetchCourses();
  }, [currentUser, router]);

  if (currentUser?.role === 'USER') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">ไม่มีสิทธิ์เข้าถึงหน้านี้</h3>
        <p className="text-xs text-slate-500">
          หน้ารายงานต้นทุนวัสดุตามรายวิชาสงวนไว้สำหรับเจ้าหน้าที่ คณาจารย์ผู้สอน และผู้บริหารเท่านั้น
        </p>
      </div>
    );
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name || !newCourse.instructorName) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse),
      });
      if (res.ok) {
        setShowNewModal(false);
        setNewCourse({
          code: '',
          name: '',
          semester: '1',
          academicYear: '2569',
          instructorName: '',
          description: '',
          allocatedBudget: 50000,
        });
        fetchCourses();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกรายวิชา');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  // CSV Export for the selected course materials breakdown
  const handleExportCSV = () => {
    if (!selectedCourse) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel in Thai
    csvContent += `รายงานสรุปการใช้วัสดุและต้นทุนประจำรายวิชา\n`;
    csvContent += `รหัสวิชา,${selectedCourse.code}\n`;
    csvContent += `ชื่อวิชา,${selectedCourse.name}\n`;
    csvContent += `ผู้ประสานงานรายวิชา,${selectedCourse.instructorName}\n`;
    csvContent += `ภาคเรียน/ปีการศึกษา,${selectedCourse.semester}/${selectedCourse.academicYear}\n`;
    csvContent += `งบประมาณที่ได้รับจัดสรร,${selectedCourse.allocatedBudget}\n`;
    csvContent += `ยอดใช้วัสดุจริงรวม,${selectedCourse.totalExpense}\n`;
    csvContent += `งบประมาณคงเหลือ,${selectedCourse.remainingBudget}\n\n`;

    csvContent += `ลำดับ,รหัสวัสดุ,รายการวัสดุสิ้นเปลือง,จำนวนที่ใช้ไป,หน่วยนับ,ต้นทุนรวม (บาท)\n`;

    selectedCourse.itemsUsed.forEach((item: any, idx: number) => {
      csvContent += `${idx + 1},${item.code},"${item.name}",${item.totalQuantity},${item.unit},${item.totalCost.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานต้นทุน_${selectedCourse.code}_${selectedCourse.academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลรายวิชาและวิเคราะห์ต้นทุน..."
        submessage="กำลังคำนวณยอดงบประมาณและการเบิกใช้วัสดุจาก Supabase"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            รายงานสรุปการใช้วัสดุและต้นทุนรายวิชา (Course Cost Analytics)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            วิเคราะห์ปริมาณการใช้วัสดุสิ้นเปลืองจริง และต้นทุนแยกรายวิชาการเรียนการสอนทางการพยาบาล
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!selectedCourse}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Export Excel (CSV)</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>พิมพ์รายงาน</span>
          </button>
          {(isAdmin || isOfficer) && (
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายวิชา</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Courses List (Left) + Detail & Cost Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Course Selector Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            รายวิชาทั้งหมด ({courses.length})
          </h3>

          <div className="space-y-2.5">
            {courses.map((c) => {
              const isSelected = selectedCourseId === c.id;
              const percent = Math.min(c.percentUsed, 100);

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800">
                      {c.code}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      ฿{c.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1">{c.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">ผู้สอน: {c.instructorName}</p>

                  {/* Mini Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>ใช้วัสดุไปแล้ว {c.percentUsed}%</span>
                      <span>งบ ฿{c.allocatedBudget.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          percent > 85 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep-dive Breakdown of Materials & Costs for Selected Course */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCourse ? (
            <>
              {/* Course Overview Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-mono text-xs font-bold">
                        {selectedCourse.code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{selectedCourse.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      ผู้ประสานงาน: {selectedCourse.instructorName} | ภาคเรียนที่{' '}
                      {selectedCourse.semester}/{selectedCourse.academicYear}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:pl-4 border-slate-100">
                    <span className="text-xs text-slate-400 font-bold block">ยอดใช้วัสดุจริงสะสม</span>
                    <div className="text-2xl font-black text-emerald-700">
                      ฿{selectedCourse.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[11px] font-bold text-slate-400 block">งบที่ได้รับจัดสรร</span>
                    <span className="text-sm font-bold text-slate-800">
                      ฿{selectedCourse.allocatedBudget.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-[11px] font-bold text-emerald-700 block">งบประมาณคงเหลือ</span>
                    <span className="text-sm font-bold text-emerald-800">
                      ฿{selectedCourse.remainingBudget.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-center">
                    <span className="text-[11px] font-bold text-teal-700 block">จำนวนชนิดวัสดุที่ใช้</span>
                    <span className="text-sm font-bold text-teal-800">
                      {selectedCourse.itemsUsed?.length || 0} ชนิด
                    </span>
                  </div>
                </div>
              </div>

              {/* Materials Usage Breakdown Table (THE CORE REQUIREMENT) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" />
                    รายการวัสดุที่ใช้ไปและต้นทุน (Material Usage & Cost Details)
                  </h4>
                  <span className="text-xs text-slate-400">
                    เรียงตามมูลค่าที่ใช้มากที่สุด
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">รหัสพัสดุ</th>
                        <th className="py-3 px-3">รายการวัสดุสิ้นเปลือง</th>
                        <th className="py-3 px-3 text-center">ปริมาณที่ใช้ไป</th>
                        <th className="py-3 px-3 text-right">ต้นทุนรวม (บาท)</th>
                        <th className="py-3 px-3 text-right">สัดส่วนในวิชา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedCourse.itemsUsed?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            ยังไม่มีการบันทึกการเบิกจ่ายวัสดุสำหรับรายวิชานี้
                          </td>
                        </tr>
                      ) : (
                        selectedCourse.itemsUsed.map((item: any) => {
                          const percentOfCourse =
                            selectedCourse.totalExpense > 0
                              ? ((item.totalCost / selectedCourse.totalExpense) * 100).toFixed(1)
                              : '0.0';

                          return (
                            <tr key={item.code} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 px-3 font-mono text-teal-700 font-bold">
                                {item.code}
                              </td>
                              <td className="py-3 px-3 text-slate-900 font-bold">
                                {item.name}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-black text-slate-800 text-sm">
                                  {item.totalQuantity}
                                </span>{' '}
                                <span className="text-slate-500">{item.unit}</span>
                              </td>
                              <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                                ฿{item.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-500">
                                {percentOfCourse}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {selectedCourse.itemsUsed?.length > 0 && (
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-slate-700">
                            รวมต้นทุนวัสดุสิ้นเปลืองทั้งหมด
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-700 text-base font-black">
                            ฿{selectedCourse.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500">100%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Requisition Request History for this course */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  ประวัติใบเบิกของรายวิชา ({selectedCourse.recentRequisitions?.length || 0} ครั้ง)
                </h4>
                <div className="divide-y divide-slate-100">
                  {selectedCourse.recentRequisitions?.map((req: any) => (
                    <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{req.requestNumber}</div>
                        <div className="text-slate-500 mt-0.5">{req.purpose}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700">
                          ฿{req.totalCost.toFixed(2)} บาท
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedCourse.recentRequisitions ||
                    selectedCourse.recentRequisitions.length === 0) && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      ยังไม่มีประวัติใบเบิก
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border text-slate-400 text-xs">
              กรุณาเลือกรายวิชาเพื่อดูสรุปต้นทุน
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Course */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                เพิ่มรายวิชาพยาบาลศาสตร์ใหม่
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสวิชา (Course Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น NUR2203"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourse.academicYear}
                    onChange={(e) => setNewCourse({ ...newCourse, academicYear: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อรายวิชา (ภาษาไทยและอังกฤษ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การพยาบาลสุขภาพจิตและจิตเวช"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อาจารย์ผู้ประสานงานรายวิชา *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผศ.ดร. นภาพร มงคลการ"
                  value={newCourse.instructorName}
                  onChange={(e) => setNewCourse({ ...newCourse, instructorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  งบประมาณวัสดุที่ได้รับการจัดสรร (บาท) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={newCourse.allocatedBudget}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, allocatedBudget: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกรายวิชา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
