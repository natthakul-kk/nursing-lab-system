'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, UserRole } from '@/lib/auth-context';
import { 
  Activity, 
  ShieldCheck, 
  UserCheck, 
  Stethoscope, 
  GraduationCap, 
  ChevronDown,
  Building2,
  LogOut,
  LogIn,
  UserCog
} from 'lucide-react';
import ProfileModal from '@/components/profile/ProfileModal';

export default function Navbar() {
  const { currentUser, availableUsers, switchUserById, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> แอดมิน
          </span>
        );
      case 'OFFICER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Activity className="w-3 h-3 text-emerald-600" /> เจ้าหน้าที่แล็บ
          </span>
        );
      case 'APPROVER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <UserCheck className="w-3 h-3 text-amber-600" /> ผู้อนุมัติ
          </span>
        );
      case 'USER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3 h-3 text-blue-600" /> ผู้ใช้งาน
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200 shadow-sm">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-md shadow-teal-500/20">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
            ระบบบริหารพัสดุ-ครุภัณฑ์ & ต้นทุนรายวิชา
          </h1>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" /> ห้องปฏิบัติการพยาบาลศาสตร์
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {/* Cloud Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Supabase Cloud</span>
        </div>

        {/* Quick Switcher dropdown */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 pl-2">สลับบัญชี:</span>
          <div className="relative">
            <select
              value={currentUser?.id || ''}
              onChange={(e) => switchUserById(e.target.value)}
              className="appearance-none bg-white border border-slate-300 hover:border-teal-500 text-slate-800 text-xs font-medium rounded-lg py-1 pl-2.5 pr-7 transition cursor-pointer"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  [{u.role}] {u.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Current User Info, Profile Edit & Logout Button */}
        {currentUser ? (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:border-l border-slate-200">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                {currentUser.department || currentUser.email}
              </div>
            </div>
            <div>{getRoleBadge(currentUser.role)}</div>

            {/* In-app Edit Profile Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              title="แก้ไขข้อมูลส่วนตัว"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">แก้ไขบัญชี</span>
            </button>

            <button
              onClick={logout}
              title="ออกจากระบบ"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบ</span>
          </Link>
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  );
}
