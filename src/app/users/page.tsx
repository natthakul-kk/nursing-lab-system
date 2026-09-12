'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  Users,
  ShieldCheck,
  Activity,
  UserCheck,
  GraduationCap,
  BookOpen,
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
  X,
  Search,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';
import { COMMON_USER_PREFIXES, formatUserName } from '@/lib/user-utils';

export default function UsersPage() {
  const { availableUsers, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created?: number; createdCount?: number; updated?: number; updatedCount?: number; errors?: string[] } | null>(null);
  const [newUser, setNewUser] = useState({
    prefix: '',
    name: '',
    email: '',
    password: '123456',
    role: 'USER',
    department: '',
    studentId: '',
    phone: '',
  });
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [resetShowPassword, setResetShowPassword] = useState<boolean>(false);
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetCopied, setResetCopied] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
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
          prefix: '',
          name: '',
          email: '',
          password: '123456',
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

  const generateRandomPassword = () => {
    const prefixes = ['Lab', 'Nurse', 'Med', 'Care'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pass = `${randomPrefix}@${randomNum}`;
    setNewResetPassword(pass);
    setResetError(null);
    setResetCopied(false);
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;

    if (!newResetPassword || newResetPassword.length < 6) {
      setResetError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setResetSubmitting(true);
    setResetError(null);
    setResetSuccessMessage(null);

    try {
      const res = await fetch(`/api/users/${resettingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword }),
      });

      if (res.ok) {
        setResetSuccessMessage(`เปลี่ยนรหัสผ่านสำหรับคุณ ${resettingUser.name} สำเร็จแล้ว`);
        fetchUsers();
      } else {
        const err = await res.json();
        setResetError(err.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } catch (err) {
      setResetError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setResetSubmitting(false);
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
        'คำนำหน้า': 'นาย',
        'ชื่อ-นามสกุล': 'สมชาย พยาบาลดี',
        'อีเมล': 'somchai.p@nurse.ac.th',
        'บทบาท': 'USER',
        'ภาควิชา/คณะ': 'การพยาบาลพื้นฐาน',
        'รหัสนิสิต/บุคลากร': '66010001',
        'เบอร์โทร': '0812345678',
      },
      {
        'คำนำหน้า': 'ผศ.ดร.',
        'ชื่อ-นามสกุล': 'สมศรี ใจดี (อาจารย์ผู้สอน)',
        'อีเมล': 'somsri.t@nurse.ac.th',
        'บทบาท': 'TEACHER',
        'ภาควิชา/คณะ': 'ภาควิชาการพยาบาลเด็ก',
        'รหัสนิสิต/บุคลากร': 'T0042',
        'เบอร์โทร': '0861112233',
      },
      {
        'คำนำหน้า': 'รศ.ดร.',
        'ชื่อ-นามสกุล': 'ประสิทธิ์ รักงาน (หัวหน้าภาค)',
        'อีเมล': 'prasit.h@nurse.ac.th',
        'บทบาท': 'APPROVER',
        'ภาควิชา/คณะ': 'ภาควิชาการพยาบาลเด็ก',
        'รหัสนิสิต/บุคลากร': 'T0001',
        'เบอร์โทร': '0899998877',
      },
      {
        'คำนำหน้า': 'นางสาว',
        'ชื่อ-นามสกุล': 'พิมพ์ใจ ว่องไว (เจ้าหน้าที่แล็บ)',
        'อีเมล': 'pimjai.w@nurse.ac.th',
        'บทบาท': 'OFFICER',
        'ภาควิชา/คณะ': 'งานห้องปฏิบัติการพยาบาล',
        'รหัสนิสิต/บุคลากร': 'ST0021',
        'เบอร์โทร': '0854443322',
      },
      {
        'คำนำหน้า': 'ดร.',
        'ชื่อ-นามสกุล': 'ธนากร เชี่ยวชาญ (ผู้ดูแลระบบ)',
        'อีเมล': 'thanakorn.c@nurse.ac.th',
        'บทบาท': 'ADMIN',
        'ภาควิชา/คณะ': 'ศูนย์เทคโนโลยีสารสนเทศ',
        'รหัสนิสิต/บุคลากร': 'AD0001',
        'เบอร์โทร': '0825556677',
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
            <UserCheck className="w-3.5 h-3.5 text-amber-600" /> ผู้อนุมัติ / หัวหน้าภาค (Approver)
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> อาจารย์ผู้สอน (Teacher)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> นิสิต / ผู้ใช้งาน (Student)
          </span>
        );
    }
  };

  const tabCounts = {
    ALL: users.length,
    ADMIN: users.filter((u) => u.role === 'ADMIN').length,
    OFFICER: users.filter((u) => u.role === 'OFFICER').length,
    APPROVER: users.filter((u) => u.role === 'APPROVER').length,
    TEACHER: users.filter((u) => u.role === 'TEACHER').length,
    USER: users.filter((u) => u.role === 'USER').length,
  };

  const filteredUsers = users.filter((u) => {
    if (selectedTab !== 'ALL' && u.role !== selectedTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const prefix = (u.prefix || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      const fullName = formatUserName(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const studentId = (u.studentId || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      return (
        name.includes(q) ||
        fullName.includes(q) ||
        prefix.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        studentId.includes(q) ||
        phone.includes(q)
      );
    }
    return true;
  });

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

      {/* Role Descriptions Grid (Interactive Click to Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setSelectedTab(selectedTab === 'ADMIN' ? 'ALL' : 'ADMIN')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer hover:shadow-md ${
            selectedTab === 'ADMIN'
              ? 'border-purple-400 ring-2 ring-purple-400 shadow-md bg-purple-100/70 dark:bg-purple-950/60 dark:border-purple-500'
              : 'bg-purple-50/80 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50 hover:dark:bg-purple-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-purple-900 dark:text-purple-300 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" /> แอดมิน (Admin)
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-200/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
              {tabCounts.ADMIN} คน
            </span>
          </div>
          <p className="text-[11px] text-purple-800 dark:text-purple-300/80 leading-relaxed mt-1.5">
            ดูแลระบบทั้งหมด เพิ่ม/แก้ไขผู้ใช้ กำหนดสิทธิ์ และเข้าถึงข้อมูลทุกส่วน
          </p>
        </div>

        <div
          onClick={() => setSelectedTab(selectedTab === 'OFFICER' ? 'ALL' : 'OFFICER')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer hover:shadow-md ${
            selectedTab === 'OFFICER'
              ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-md bg-emerald-100/70 dark:bg-emerald-950/60 dark:border-emerald-500'
              : 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 hover:dark:bg-emerald-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> จนท.แล็บ (Officer)
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              {tabCounts.OFFICER} คน
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80 leading-relaxed mt-1.5">
            จัดการคลัง รับเข้าสต็อก ตรวจจ่ายอุปกรณ์ และตรวจรับคืนพร้อมประเมินสภาพ
          </p>
        </div>

        <div
          onClick={() => setSelectedTab(selectedTab === 'APPROVER' ? 'ALL' : 'APPROVER')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer hover:shadow-md ${
            selectedTab === 'APPROVER'
              ? 'border-amber-400 ring-2 ring-amber-400 shadow-md bg-amber-100/70 dark:bg-amber-950/60 dark:border-amber-500'
              : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50 hover:dark:bg-amber-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-amber-900 dark:text-amber-300 text-xs flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" /> ผู้อนุมัติ (Approver)
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
              {tabCounts.APPROVER} คน
            </span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed mt-1.5">
            หัวหน้าภาค/ประธานสาขา พิจารณาอนุมัติคำขอยืม-เบิกขั้นสุดท้ายส่งต่อห้องแล็บ
          </p>
        </div>

        <div
          onClick={() => setSelectedTab(selectedTab === 'TEACHER' ? 'ALL' : 'TEACHER')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer hover:shadow-md ${
            selectedTab === 'TEACHER'
              ? 'border-indigo-400 ring-2 ring-indigo-400 shadow-md bg-indigo-100/70 dark:bg-indigo-950/60 dark:border-indigo-500'
              : 'bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50 hover:dark:bg-indigo-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-indigo-900 dark:text-indigo-300 text-xs flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> อาจารย์ (Teacher)
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
              {tabCounts.TEACHER} คน
            </span>
          </div>
          <p className="text-[11px] text-indigo-800 dark:text-indigo-300/80 leading-relaxed mt-1.5">
            อาจารย์ผู้สอน/ที่ปรึกษา กดรับทราบคำขอนิสิต ยืมพัสดุสอน และดูต้นทุนวิชา
          </p>
        </div>

        <div
          onClick={() => setSelectedTab(selectedTab === 'USER' ? 'ALL' : 'USER')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer hover:shadow-md ${
            selectedTab === 'USER'
              ? 'border-blue-400 ring-2 ring-blue-400 shadow-md bg-blue-100/70 dark:bg-blue-950/60 dark:border-blue-500'
              : 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50 hover:dark:bg-blue-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-blue-900 dark:text-blue-300 text-xs flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" /> นิสิต (Student)
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {tabCounts.USER} คน
            </span>
          </div>
          <p className="text-[11px] text-blue-800 dark:text-blue-300/80 leading-relaxed mt-1.5">
            นิสิตผู้เรียน ค้นหาพัสดุ ยื่นคำขอยืมหรือเบิก และจองห้องฝึกปฏิบัติ
          </p>
        </div>
      </div>

      {/* Role Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Role Tabs (Desktop) */}
        <div className="hidden lg:flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: 'ทั้งหมด (รวม)', icon: Users, count: tabCounts.ALL },
            { key: 'ADMIN', label: 'ผู้ดูแลระบบ', icon: ShieldCheck, count: tabCounts.ADMIN },
            { key: 'OFFICER', label: 'เจ้าหน้าที่แล็บ', icon: Activity, count: tabCounts.OFFICER },
            { key: 'APPROVER', label: 'ผู้อนุมัติ/หัวหน้าภาค', icon: UserCheck, count: tabCounts.APPROVER },
            { key: 'TEACHER', label: 'อาจารย์ผู้สอน', icon: BookOpen, count: tabCounts.TEACHER },
            { key: 'USER', label: 'นิสิต/ผู้ใช้ทั่วไป', icon: GraduationCap, count: tabCounts.USER },
          ].map((tab) => {
            const isSelected = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-sm ring-2 ring-slate-700/50 dark:ring-teal-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-400 dark:text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-teal-500 dark:bg-teal-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Role Dropdown (Compact / Mobile Mode) */}
        <div className="flex lg:hidden items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">กลุ่มผู้ใช้:</label>
          <select
            value={selectedTab}
            onChange={(e) => setSelectedTab(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            <option value="ALL">ทั้งหมด (รวม) ({tabCounts.ALL})</option>
            <option value="ADMIN">ผู้ดูแลระบบ (Admin) ({tabCounts.ADMIN})</option>
            <option value="OFFICER">เจ้าหน้าที่แล็บ (Officer) ({tabCounts.OFFICER})</option>
            <option value="APPROVER">ผู้อนุมัติ/หัวหน้าภาค (Approver) ({tabCounts.APPROVER})</option>
            <option value="TEACHER">อาจารย์ผู้สอน (Teacher) ({tabCounts.TEACHER})</option>
            <option value="USER">นิสิต/ผู้ใช้ทั่วไป (Student/User) ({tabCounts.USER})</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล, รหัส, ภาควิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">อีเมล / รหัสนิสิต</th>
                <th className="py-3 px-4">หน่วยงาน / ภาควิชา</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4">สิทธิ์การใช้งาน</th>
                <th className="py-3 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <TableLoadingRow colSpan={6} message="กำลังโหลดรายชื่อผู้ใช้งานและกำหนดสิทธิ์..." />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-medium">
                        {searchQuery
                          ? `ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา "${searchQuery}"`
                          : `ไม่พบผู้ใช้งานในกลุ่ม "${selectedTab === 'ALL' ? 'ทั้งหมด' : selectedTab}"`}
                      </span>
                      {(selectedTab !== 'ALL' || searchQuery) && (
                        <button
                          onClick={() => {
                            setSelectedTab('ALL');
                            setSearchQuery('');
                          }}
                          className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold underline cursor-pointer mt-1"
                        >
                          ล้างตัวกรองทั้งหมด
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 flex-wrap">
                      {u.prefix && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-[11px] border border-teal-200/60 dark:border-teal-800/60">
                          {u.prefix}
                        </span>
                      )}
                      <span>{u.prefix && u.name.startsWith(u.prefix) ? u.name.slice(u.prefix.length).trim() : u.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{u.email}</span>
                    </div>
                    {u.studentId && (
                      <div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono mt-0.5">
                        รหัส: {u.studentId}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                    {u.department || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {u.phone || '-'}
                  </td>
                  <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setResettingUser(u);
                          setNewResetPassword('123456');
                          setResetSuccessMessage(null);
                          setResetCopied(false);
                          setResetError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold text-xs transition cursor-pointer"
                        title="รีเซ็ตรหัสผ่านให้ผู้ใช้นี้"
                      >
                        <KeyRound className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>รีเซ็ตรหัส</span>
                      </button>
                      <button
                        onClick={() => setEditingUser({ ...u, password: '' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 font-bold text-xs transition cursor-pointer"
                        title="แก้ไขข้อมูลผู้ใช้"
                      >
                        <Edit3 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>แก้ไข</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                เพิ่มบัญชีผู้ใช้งานใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คำนำหน้า
                  </label>
                  <input
                    list="new-user-prefix-list"
                    type="text"
                    placeholder="เช่น นาย, ผศ.ดร."
                    value={newUser.prefix}
                    onChange={(e) => setNewUser({ ...newUser, prefix: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                  <datalist id="new-user-prefix-list">
                    {COMMON_USER_PREFIXES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย พยาบาลดี"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมล (Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@nurse.university.ac.th"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่านเริ่มต้น (Default Password)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="เช่น 123456"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  ค่าเริ่มต้นคือ 123456 (ระบบจะเข้ารหัส Bcrypt เมื่อบันทึก)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สิทธิ์การใช้งาน (Role) *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                >
                  <option value="USER">นิสิต / นักศึกษา (Student)</option>
                  <option value="TEACHER">อาจารย์ผู้สอน / ที่ปรึกษา (Teacher)</option>
                  <option value="APPROVER">ผู้อนุมัติ / หัวหน้าภาค (Approver)</option>
                  <option value="OFFICER">เจ้าหน้าที่ห้องแล็บ (Officer)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หน่วยงาน / ภาควิชา / ชั้นปี
                </label>
                <input
                  type="text"
                  placeholder="เช่น กลุ่มวิชาการพยาบาลเด็ก, นศ.พยาบาลศาสตร์ ชั้นปี 2"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสประจำตัว (ID) / รหัสนิสิต
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 6610210099, T0042 หรือ admin"
                    value={newUser.studentId}
                    onChange={(e) => setNewUser({ ...newUser, studentId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                แก้ไขข้อมูลผู้ใช้งาน
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คำนำหน้า
                  </label>
                  <input
                    list="edit-user-prefix-list"
                    type="text"
                    placeholder="เช่น นาย, ผศ.ดร."
                    value={editingUser.prefix || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, prefix: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                  <datalist id="edit-user-prefix-list">
                    {COMMON_USER_PREFIXES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมล (Email) *
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สิทธิ์การใช้งาน (Role) *
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                >
                  <option value="USER">นิสิต / นักศึกษา (Student)</option>
                  <option value="TEACHER">อาจารย์ผู้สอน / ที่ปรึกษา (Teacher)</option>
                  <option value="APPROVER">ผู้อนุมัติ / หัวหน้าภาค (Approver)</option>
                  <option value="OFFICER">เจ้าหน้าที่ห้องแล็บ (Officer)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หน่วยงาน / ภาควิชา / ชั้นปี
                </label>
                <input
                  type="text"
                  placeholder="เช่น กลุ่มวิชาการพยาบาลเด็ก, นศ.พยาบาลศาสตร์ ชั้นปี 2"
                  value={editingUser.department || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสประจำตัว (ID) / รหัสนิสิต
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 6610210099, T0042 หรือ admin"
                    value={editingUser.studentId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, studentId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ตั้งรหัสผ่านใหม่ <span className="text-slate-400 dark:text-slate-500 font-normal">(เว้นว่างไว้หากไม่เปลี่ยน)</span>
                </label>
                <input
                  type="password"
                  placeholder="กรอกหากต้องการเปลี่ยนรหัสผ่าน"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

      {/* Admin Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">รีเซ็ตรหัสผ่านโดยผู้ดูแลระบบ</h3>
                  <p className="text-[11px] text-amber-200">
                    กำหนดรหัสผ่านใหม่ให้แก่ผู้ใช้งาน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* User Info Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{formatUserName(resettingUser)}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>{resettingUser.email}</span>
                </div>
                {resettingUser.studentId && (
                  <div className="text-[11px] text-teal-700 dark:text-teal-400 font-mono">
                    รหัสนิสิต: {resettingUser.studentId}
                  </div>
                )}
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccessMessage ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{resetSuccessMessage}</span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">รหัสผ่านใหม่ที่ตั้งไว้:</div>
                        <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{newResetPassword}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newResetPassword);
                          setResetCopied(true);
                          setTimeout(() => setResetCopied(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 transition cursor-pointer"
                      >
                        {resetCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{resetCopied ? 'คัดลอกแล้ว!' : 'คัดลอกรหัส'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setResettingUser(null)}
                      className="px-5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAdminResetPassword} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        รหัสผ่านใหม่ *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>สุ่มรหัสผ่านปลอดภัย</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={resetShowPassword ? 'text' : 'password'}
                        required
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-10 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setResetShowPassword(!resetShowPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      เช่น 123456 หรือคลิก "สุ่มรหัสผ่านปลอดภัย" ด้านบน
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>รหัสผ่านใหม่จะถูกเข้ารหัส Bcrypt โดยอัตโนมัติ ผู้ใช้สามารถเข้าสู่ระบบด้วยรหัสนี้ได้ทันที</span>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setResettingUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{resetSubmitting ? 'กำลังบันทึก...' : 'ยืนยันตั้งรหัสผ่านใหม่'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    นำเข้าบัญชีผู้ใช้งานจากไฟล์ Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    นำเข้ารายชื่อนิสิตทั้งชั้นปี, อาจารย์ หรือเจ้าหน้าที่พร้อมกันทีละหลายรายการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    ดาวน์โหลดแม่แบบไฟล์ Excel
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ใช้เทมเพลตมาตรฐานที่มีหัวตารางถูกต้อง (ชื่อ-นามสกุล, อีเมล, บทบาท, ภาควิชา, รหัส, เบอร์โทร)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold shadow-sm transition flex-shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>ดาวน์โหลด Template (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  เลือกไฟล์ที่กรอกข้อมูลแล้ว (.xlsx, .xls, .csv)
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-6 text-center transition bg-white dark:bg-slate-850 dark:bg-slate-900">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
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
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    {bulkFile ? `ไฟล์ที่เลือก: ${bulkFile.name}` : 'รองรับไฟล์ Excel และ CSV'}
                  </p>
                </div>
              </div>

              {/* Preview Box */}
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>ตัวอย่างข้อมูลที่จะนำเข้า ({previewData.length} รายการ)</span>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">แสดง 5 แถวแรก</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          {Object.keys(previewData[0] || {}).map((col) => (
                            <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            {Object.keys(previewData[0] || {}).map((col) => (
                              <td key={col} className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
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
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> นำเข้าข้อมูลเรียบร้อยแล้ว
                  </div>
                  <p className="text-xs">
                    สร้างผู้ใช้ใหม่: <b>{bulkResult.created ?? bulkResult.createdCount ?? 0}</b> บัญชี | อัปเดตข้อมูลเดิม: <b>{bulkResult.updated ?? bulkResult.updatedCount ?? 0}</b> บัญชี
                  </p>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
