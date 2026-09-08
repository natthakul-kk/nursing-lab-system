'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Stethoscope,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  Clock,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [timeoutNotice, setTimeoutNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if redirected due to session timeout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'timeout') {
        setTimeoutNotice(true);
      }
    }
  }, []);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTimeoutNotice(false);
    setSubmitting(true);

    const res = await login(email, password, rememberMe);
    if (res.success) {
      router.push('/');
    } else {
      setError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setSubmitting(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setDevOtpHint(null);
    setForgotSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || 'ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้');
        setForgotSubmitting(false);
        return;
      }

      setForgotSuccess(data.message);
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setForgotStep('VERIFY');
    } catch (err) {
      setForgotError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setForgotSubmitting(false);
    }
  };

  // Step 2: Verify OTP and Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (newPassword.length < 6) {
      setForgotError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setForgotSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otpCode: forgotOtp,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || 'การรีเซ็ตรหัสผ่านไม่สำเร็จ');
        setForgotSubmitting(false);
        return;
      }

      setForgotSuccess('รีเซ็ตรหัสผ่านใหม่สำเร็จแล้ว ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที');
      // Prefill login form
      setEmail(forgotEmail);
      setPassword(newPassword);

      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotStep('REQUEST');
        setForgotEmail('');
        setForgotOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setForgotSuccess(null);
      }, 2000);
    } catch (err) {
      setForgotError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-white shadow-xl shadow-teal-500/20 mb-2">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            ระบบบริหารพัสดุและครุภัณฑ์
          </h1>
          <p className="text-xs text-teal-300 font-medium flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> ห้องปฏิบัติการพยาบาลศาสตร์ (Simulation Lab)
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">เข้าสู่ระบบ (Sign In)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบงานจริง
            </p>
          </div>

          {timeoutNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">เซสชันหมดอายุ</div>
                <div className="text-[11px] text-amber-800 font-normal mt-0.5">
                  ไม่มีการใช้งานเป็นเวลานานเกินกำหนด ระบบออกจากระบบอัตโนมัติเพื่อความปลอดภัย กรุณาเข้าสู่ระบบใหม่อีกครั้ง
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลผู้ใช้งาน</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="กรอกอีเมลที่ลงทะเบียนไว้"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">รหัสผ่าน</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotStep('REQUEST');
                    setForgotError(null);
                    setForgotSuccess(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between px-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 accent-teal-600"
                />
                <span className="text-xs font-medium text-slate-700">จดจำฉันไว้ในระบบ</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {rememberMe ? 'ค้างไว้ 30 วัน (มือถือ)' : 'ค้างไว้ 8 ชม. (คอมแล็บ)'}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'กำลังตรวจสอบรหัสผ่าน...' : 'เข้าสู่ระบบ'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* System Info / Security Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              การเข้ารหัสรหัสผ่าน Bcrypt มาตรฐานสูง
            </span>
            <span>ติดต่อแอดมินเพื่อขอเปิดบัญชีใช้งาน</span>
          </div>
        </div>
      </div>

      {/* Forgot Password / Reset Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">รีเซ็ตรหัสผ่าน (Reset Password)</h3>
                  <p className="text-[11px] text-teal-200">
                    {forgotStep === 'REQUEST' ? 'ขั้นตอนที่ 1: ขอรหัสยืนยัน OTP' : 'ขั้นตอนที่ 2: กรอกรหัส OTP และตั้งรหัสผ่านใหม่'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {forgotError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {devOtpHint && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-700 font-bold">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>รหัสยืนยัน OTP สำหรับทดสอบ:</span>
                  </div>
                  <div className="font-mono text-base font-extrabold text-teal-700 tracking-wider">
                    {devOtpHint}
                  </div>
                </div>
              )}

              {forgotStep === 'REQUEST' ? (
                /* Step 1: Request OTP Form */
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลบัญชีผู้ใช้</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="กรอกอีเมลที่ต้องการรีเซ็ตรหัสผ่าน"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ระบบจะส่งรหัสยืนยัน 6 หลัก (OTP) ไปยังอีเมลของท่าน
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={forgotSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>{forgotSubmitting ? 'กำลังส่งรหัส OTP...' : 'ส่งรหัสยืนยัน OTP'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Verify OTP & Set New Password */
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รหัสยืนยัน OTP (6 หลัก)</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="เช่น 123456"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-center text-base font-mono font-bold tracking-widest focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านใหม่</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep('REQUEST')}
                      className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      disabled={forgotSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{forgotSubmitting ? 'กำลังบันทึก...' : 'ยืนยันรหัสผ่านใหม่'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
