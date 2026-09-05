'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  Users,
  ShieldCheck,
  Activity,
  UserCheck,
  GraduationCap,
  Plus,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function UsersPage() {
  const { availableUsers, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; updated: number; errors?: string[] } | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'USER',
    department: '',
    studentId: '',
    phone: '',
  });
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewUser({
          name: '',
          email: '',
          role: 'USER',
          department: '',
          studentId: '',
          phone: '',
        });
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาดในการเพิ่มผู้ใช้');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'ชื่อ-นามสกุล': 'นายสมชาย พยาบาลดี',
        'อีเมล': 'somchai.p@nurse.ac.th',
        'บทบาท': 'USER',
        'ภาควิชา/คณะ': 'การพยาบาลพื้นฐาน',
        'รหัสนิสิต/บุคลากร': '66010001',
        'เบอร์โทร': '0812345678',
      },
      {
        'ชื่อ-นามสกุล': 'นางสาวพยาบาล รักเด็ก',
        'อีเมล': 'nurse.r@nurse.ac.th',
        'บทบาท': 'USER',
        'ภาควิชา/คณะ': 'การพยาบาลเด็ก',
        'รหัสนิสิต/บุคลากร': '66010002',
        'เบอร์โทร': '0898765432',
      },
      {
        'ชื่อ-นามสกุล': 'ผศ.ดร.อาจารย์ ประจำวิชา',
        'อีเมล': 'instructor@nurse.ac.th',
        'บทบาท': 'APPROVER',
        'ภาควิชา/คณะ': 'คณะพยาบาลศาสตร์',
        'รหัสนิสิต/บุคลากร': 'T0042',
        'เบอร์โทร': '0861112233',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มผู้ใช้งาน');
    XLSX.writeFile(wb, 'Template_User_Accounts.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        alert('ไฟล์ไม่มีข้อมูลหรือข้อมูลว่างเปล่า');
        return;
      }
      setPreviewData(jsonData);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx หรือ .csv ที่ถูกต้อง');
    }
  };

  const handleBulkSubmit = async () => {
    if (previewData.length === 0) return;
    setBulkSubmitting(true);
    setBulkResult(null);

    try {
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: previewData }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkResult(data);
        fetchUsers();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> ผู้ดูแลระบบ (Admin)
          </span>
        );
      case 'OFFICER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Activity className="w-3.5 h-3.5 text-emerald-600" /> เจ้าหน้าที่แล็บ (Officer)
          </span>
        );
      case 'APPROVER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" /> ผู้อนุมัติ (Approver)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> ผู้ใช้งาน (User)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            จัดการผู้ใช้งานและสิทธิ์ในระบบ (User Accounts & Roles)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดบทบาทผู้ใช้งาน: ผู้ดูแลระบบ (Admin), เจ้าหน้าที่แล็บ (Officer), ผู้อนุมัติ (Approver) และผู้ใช้ทั่วไป (User)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setShowBulkModal(true);
              setBulkFile(null);
              setPreviewData([]);
              setBulkResult(null);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>นำเข้าจาก Excel / CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบัญชีผู้ใช้</span>
          </button>
        </div>
      </div>

      {/* Role Descriptions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-1.5">
          <div className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" /> แอดมิน (Admin)
          </div>
          <p className="text-[11px] text-purple-800 leading-relaxed">
            ดูแลระบบทั้งหมด เพิ่ม/แก้ไขผู้ใช้งาน กำหนดสิทธิ์ และเข้าถึงรายงานและข้อมูลทุกส่วน
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1.5">
          <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-600" /> เจ้าหน้าที่แล็บ (Officer)
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            จัดการคลังพัสดุ รับเข้าสต็อก ตรวจจ่ายอุปกรณ์ และตรวจรับคืนพร้อมประเมินสภาพ
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-1.5">
          <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-amber-600" /> ผู้อนุมัติ (Approver)
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            พิจารณาอนุมัติคำขอยืมครุภัณฑ์ และคำขอเบิกวัสดุสิ้นเปลืองสำหรับรายวิชา
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-1.5">
          <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-blue-600" /> ผู้ใช้งาน (User)
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            อาจารย์ผู้สอนหรือนิสิต ค้นหาของในคลัง ยื่นคำขอยืมหรือเบิกวัสดุสำหรับเรียน
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">อีเมล / รหัสนิสิต</th>
                <th className="py-3 px-4">หน่วยงาน / ภาควิชา</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4">สิทธิ์การใช้งาน</th>
                <th className="py-3 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableLoadingRow colSpan={6} message="กำลังโหลดรายชื่อผู้ใช้งานและกำหนดสิทธิ์..." />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ใช้งานในระบบ
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{u.email}</span>
                    </div>
                    {u.studentId && (
                      <div className="text-[10px] text-teal-700 font-mono mt-0.5">
                        รหัส: {u.studentId}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {u.department || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {u.phone || '-'}
                  </td>
                  <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setEditingUser({ ...u, password: '' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-teal-600" />
                      <span>แก้ไข</span>
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                เพิ่มบัญชีผู้ใช้งานใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น อ. ดร. วิภาดา สมรรถนะ"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อีเมล (Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@nurse.university.ac.th"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สิทธิ์การใช้งาน (Role) *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="USER">ผู้ใช้งานทั่วไป (อาจารย์ / นศ.)</option>
                  <option value="APPROVER">ผู้อนุมัติ (Approver / หัวหน้าสาขา)</option>
                  <option value="OFFICER">เจ้าหน้าที่ห้องแล็บ (Officer)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หน่วยงาน / ภาควิชา / ชั้นปี
                </label>
                <input
                  type="text"
                  placeholder="เช่น กลุ่มวิชาการพยาบาลเด็ก, นศ.พยาบาลศาสตร์ ชั้นปี 2"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสนิสิต (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 6610210099"
                    value={newUser.studentId}
                    onChange={(e) => setNewUser({ ...newUser, studentId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-600" />
                แก้ไขข้อมูลผู้ใช้งาน
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อีเมล (Email) *
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สิทธิ์การใช้งาน (Role) *
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="USER">ผู้ใช้งานทั่วไป (อาจารย์ / นศ.)</option>
                  <option value="APPROVER">ผู้อนุมัติ (Approver / หัวหน้าสาขา)</option>
                  <option value="OFFICER">เจ้าหน้าที่ห้องแล็บ (Officer)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หน่วยงาน / ภาควิชา / ชั้นปี
                </label>
                <input
                  type="text"
                  placeholder="เช่น กลุ่มวิชาการพยาบาลเด็ก, นศ.พยาบาลศาสตร์ ชั้นปี 2"
                  value={editingUser.department || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสนิสิต (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 6610210099"
                    value={editingUser.studentId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, studentId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตั้งรหัสผ่านใหม่ <span className="text-slate-400 font-normal">(เว้นว่างไว้หากไม่เปลี่ยน)</span>
                </label>
                <input
                  type="password"
                  placeholder="กรอกหากต้องการเปลี่ยนรหัสผ่าน"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    นำเข้าบัญชีผู้ใช้งานจากไฟล์ Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    นำเข้ารายชื่อนิสิตทั้งชั้นปี, อาจารย์ หรือเจ้าหน้าที่พร้อมกันทีละหลายรายการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    ดาวน์โหลดแม่แบบไฟล์ Excel
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ใช้เทมเพลตมาตรฐานที่มีหัวตารางถูกต้อง (ชื่อ-นามสกุล, อีเมล, บทบาท, ภาควิชา, รหัส, เบอร์โทร)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold shadow-sm transition flex-shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600" />
                  <span>ดาวน์โหลด Template (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  เลือกไฟล์ที่กรอกข้อมูลแล้ว (.xlsx, .xls, .csv)
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center transition bg-white">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm inline-block transition">
                      เลือกไฟล์จากคอมพิวเตอร์
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {bulkFile ? `ไฟล์ที่เลือก: ${bulkFile.name}` : 'รองรับไฟล์ Excel และ CSV'}
                  </p>
                </div>
              </div>

              {/* Preview Box */}
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>ตัวอย่างข้อมูลที่จะนำเข้า ({previewData.length} รายการ)</span>
                    <span className="text-[11px] text-teal-600 font-medium">แสดง 5 แถวแรก</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          {Object.keys(previewData[0] || {}).slice(0, 6).map((col) => (
                            <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.keys(previewData[0] || {}).slice(0, 6).map((col) => (
                              <td key={col} className="p-2 whitespace-nowrap text-slate-600">
                                {String(row[col] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result Summary */}
              {bulkResult && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> นำเข้าข้อมูลเรียบร้อยแล้ว
                  </div>
                  <p className="text-xs">
                    สร้างผู้ใช้ใหม่: <b>{bulkResult.created}</b> บัญชี | อัปเดตข้อมูลเดิม: <b>{bulkResult.updated}</b> บัญชี
                  </p>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <b>พบข้อผิดพลาดบางรายการ:</b>
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                        {bulkResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              {previewData.length > 0 && (
                <button
                  type="button"
                  disabled={bulkSubmitting}
                  onClick={handleBulkSubmit}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{bulkSubmitting ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้า ${previewData.length} รายการ`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
