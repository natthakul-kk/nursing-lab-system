'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { COMMON_USER_PREFIXES } from '@/lib/user-utils';
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  Send,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { currentUser, updateUser, setCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PASSWORD'>('PROFILE');

  // Profile form state
  const [formData, setFormData] = useState({
    prefix: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    studentId: '',
  });
  const [customPrefixMode, setCustomPrefixMode] = useState(false);

  // Change password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Email verification state
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailSendingOtp, setEmailSendingOtp] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailOtpSentTo, setEmailOtpSentTo] = useState('');
  const [emailDevOtp, setEmailDevOtp] = useState<string | null>(null);


  useEffect(() => {
    if (currentUser) {
      const currentPrefix = currentUser.prefix || '';
      setFormData({
        prefix: currentPrefix,
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        department: currentUser.department || '',
        studentId: currentUser.studentId || '',
      });
      setCustomPrefixMode(Boolean(currentPrefix && !COMMON_USER_PREFIXES.includes(currentPrefix)));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccessMsg(null);
      setErrorMsg(null);
      setIsVerifyingEmail(false);
      setEmailOtp('');
      setEmailDevOtp(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Request Email Change OTP
  const handleRequestEmailOtp = async (targetEmail: string) => {
    if (!currentUser) return false;
    setEmailSendingOtp(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          newEmail: targetEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'ไม่สามารถส่งรหัสยืนยันไปยังอีเมลใหม่ได้');
        setEmailSendingOtp(false);
        return false;
      }

      setIsVerifyingEmail(true);
      setEmailOtpSentTo(targetEmail);
      if (data.devOtp) {
        setEmailDevOtp(data.devOtp);
      }
      setSuccessMsg(data.message || 'ส่งรหัสยืนยัน (OTP) ไปยังอีเมลใหม่เรียบร้อยแล้ว');
      return true;
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      return false;
    } finally {
      setEmailSendingOtp(false);
    }
  };

  // Verify Email OTP & Finish Saving Profile
  const handleVerifyEmailAndSave = async () => {
    if (!currentUser) return;
    if (!emailOtp || emailOtp.trim().length !== 6) {
      setErrorMsg('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }

    setEmailVerifyLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          otp: emailOtp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'รหัสยืนยัน OTP ไม่ถูกต้อง');
        setEmailVerifyLoading(false);
        return;
      }

      // Also update other profile fields (name, phone, department)
      await updateUser({
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        email: data.user?.email || emailOtpSentTo,
      });

      if (data.user) {
        setCurrentUser(data.user);
      }

      setSuccessMsg('ยืนยันและเปลี่ยนอีเมลสำเร็จแล้ว');
      setIsVerifyingEmail(false);
      setEmailOtp('');

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการยืนยัน OTP กรุณาลองใหม่');
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const isEmailChanged =
      formData.email.trim().toLowerCase() !== (currentUser?.email || '').toLowerCase();

    // If email is changed, user must verify OTP sent to the new email
    if (isEmailChanged) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setErrorMsg('รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        return;
      }

      await handleRequestEmailOtp(formData.email.trim());
      return;
    }

    // Email unchanged: save profile directly
    setSubmitting(true);
    const success = await updateUser({
      prefix: formData.prefix ? formData.prefix.trim() : null,
      name: formData.name,
      phone: formData.phone,
      department: formData.department,
    });
    setSubmitting(false);

    if (success) {
      setSuccessMsg('บันทึกการแก้ไขข้อมูลผู้ใช้สำเร็จแล้ว');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (passwordData.newPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        setSubmitting(false);
        return;
      }

      setSuccessMsg(data.message || 'เปลี่ยนรหัสผ่านสำเร็จแล้ว');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 p-6 text-white flex items-center justify-between border-b border-teal-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">จัดการบัญชีผู้ใช้งาน</h3>
              <p className="text-xs text-teal-200">แก้ไขข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PROFILE');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PROFILE'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>ข้อมูลส่วนตัว</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('PASSWORD');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PASSWORD'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>เปลี่ยนรหัสผ่าน</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'PROFILE' ? (
            /* Tab 1: Profile Details Form */
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prefix & Name */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">คำนำหน้า</label>
                      <button
                        type="button"
                        onClick={() => setCustomPrefixMode(!customPrefixMode)}
                        className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                      >
                        {customPrefixMode ? 'เลือกจากรายการ' : 'พิมพ์ระบุเอง'}
                      </button>
                    </div>
                    {customPrefixMode ? (
                      <input
                        type="text"
                        placeholder="เช่น นาย, ผศ.ดร."
                        value={formData.prefix}
                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      />
                    ) : (
                      <select
                        value={COMMON_USER_PREFIXES.includes(formData.prefix) ? formData.prefix : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__CUSTOM__') {
                            setCustomPrefixMode(true);
                          } else {
                            setFormData({ ...formData, prefix: val });
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {COMMON_USER_PREFIXES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        <option value="__CUSTOM__">+ พิมพ์ระบุเอง...</option>
                      </select>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อ - สกุล *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">อีเมล *</label>
                    {formData.email.trim().toLowerCase() !== (currentUser.email || '').toLowerCase() && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-medium">
                        ต้องยืนยัน OTP ที่อีเมลใหม่
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      disabled={isVerifyingEmail}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition ${
                        formData.email.trim().toLowerCase() !== (currentUser.email || '').toLowerCase()
                          ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="08X-XXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Student / User ID (Admin-only editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">รหัสประจำตัว (ID)</label>
                    <span className="text-[10px] text-slate-400 font-normal">กำหนดโดยผู้ดูแลระบบ</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={formData.studentId || 'ยังไม่ได้กำหนด'}
                      className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 cursor-not-allowed select-none"
                    />
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">สาขาวิชา / ชั้นปี</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="เช่น นิสิตพยาบาล ชั้นปีที่ 2"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Email Change OTP Verification Card */}
              {isVerifyingEmail && (
                <div className="p-4 rounded-2xl bg-teal-50/80 border-2 border-teal-500/40 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-teal-950">ยืนยันรหัส OTP เพื่อเปลี่ยนอีเมล</h4>
                      <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                        ระบบได้ส่งรหัส OTP 6 หลักไปยัง <span className="font-bold font-mono underline">{emailOtpSentTo}</span> แล้ว (รหัสมีอายุ 15 นาที)
                      </p>
                      {emailDevOtp && (
                        <div className="mt-1 inline-block px-2 py-0.5 rounded bg-teal-200/70 text-teal-900 text-[10px] font-mono font-bold">
                          [โหมดทดสอบ Dev OTP: {emailDevOtp}]
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">กรอกรหัสยืนยัน OTP 6 หลัก</label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="••••••"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white dark:bg-slate-950 border border-teal-300 dark:border-teal-700 rounded-xl py-2.5 px-4 text-center font-mono font-bold text-lg tracking-widest text-teal-900 dark:text-teal-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={emailSendingOtp}
                      onClick={() => handleRequestEmailOtp(emailOtpSentTo)}
                      className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 underline transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{emailSendingOtp ? 'กำลังส่งใหม่...' : 'ส่งรหัส OTP อีกครั้ง'}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsVerifyingEmail(false);
                          setEmailOtp('');
                          setFormData({ ...formData, email: currentUser.email });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        ยกเลิก (ใช้อีเมลเดิม)
                      </button>
                      <button
                        type="button"
                        disabled={emailVerifyLoading || emailOtp.length !== 6}
                        onClick={handleVerifyEmailAndSave}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{emailVerifyLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันและเปลี่ยนอีเมล'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Role Notice */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  บทบาทในระบบ:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                  {currentUser.role}
                </span>
              </div>

              {/* Buttons */}
              {!isVerifyingEmail && (
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || emailSendingOtp}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {submitting || emailSendingOtp
                        ? 'กำลังส่งรหัสยืนยัน...'
                        : formData.email.trim().toLowerCase() !== (currentUser.email || '').toLowerCase()
                        ? 'ขอรหัส OTP เพื่อเปลี่ยนอีเมล'
                        : 'บันทึกข้อมูล'}
                    </span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Tab 2: Change Password Form */
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสผ่านปัจจุบัน *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="กรอกรหัสผ่านปัจจุบันของท่าน"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-10 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสผ่านใหม่ * <span className="text-slate-400 font-normal">(อย่างน้อย 6 ตัวอักษร)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      placeholder="กรอกรหัสผ่านใหม่"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-10 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ยืนยันรหัสผ่านใหม่อีกครั้ง *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Security Hint */}
              <div className="p-3 bg-teal-50 dark:bg-teal-950/60 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  ความปลอดภัยของรหัสผ่าน:
                </div>
                <p className="text-teal-700 dark:text-teal-400">
                  รหัสผ่านจะได้รับการเข้ารหัสด้วยอัลกอริทึม Bcrypt ก่อนบันทึกลงฐานข้อมูล Supabase
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submitting ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
