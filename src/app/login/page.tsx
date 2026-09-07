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
  ShieldCheck
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const success = await login(email);
    if (success) {
      router.push('/');
    } else {
      setError('ไม่พบบัญชีผู้ใช้นี้ หรืออีเมลไม่ถูกต้อง');
      setSubmitting(false);
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
              กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* System Info / Security Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              ระบบงานจริง (Production Mode)
            </span>
            <span>ติดต่อแอดมินเพื่อขอเปิดบัญชีใช้งาน</span>
          </div>
        </div>
      </div>
    </div>
  );
}
