'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Boxes,
  ArrowDownToLine,
  RefreshCw,
  FileSpreadsheet,
  CheckSquare,
  BarChart3,
  Users,
  Clock,
  Shield,
  GraduationCap,
  UserCog,
  CalendarDays,
  BriefcaseMedical,
  PackageCheck,
  QrCode
} from 'lucide-react';
import ProfileModal from '@/components/profile/ProfileModal';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, isOfficer, isApprover, isAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setPendingCount((data.pendingBorrows || 0) + (data.pendingRequisitions || 0));
        }
      } catch (err) {
        // silent fail
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Hide sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  const allNavItems = [
    {
      label: 'ภาพรวมห้องแล็บ',
      href: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
    },
    {
      label: 'ทะเบียนพัสดุ-ครุภัณฑ์',
      href: '/inventory',
      icon: Boxes,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
    },
    {
      label: 'รับเข้าพัสดุ (Stock In)',
      href: '/stock-in',
      icon: ArrowDownToLine,
      roles: ['ADMIN', 'OFFICER'],
      badge: 'เจ้าหน้าที่',
    },
    {
      label: 'แบ่งบรรจุ & สเตอร์ไรด์',
      href: '/repack',
      icon: PackageCheck,
      roles: ['ADMIN', 'OFFICER'],
      badge: 'งานแล็บ',
    },
    {
      label: 'ระบบยืม-คืน ครุภัณฑ์',
      href: '/borrow',
      icon: RefreshCw,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
    },
    {
      label: 'เบิกจ่ายวัสดุสิ้นเปลือง',
      href: '/requisitions',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
    },
    {
      label: 'ชุดฝึกปฏิบัติการ (Kits)',
      href: '/kits',
      icon: BriefcaseMedical,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
      badge: 'แนะนำ',
    },
    {
      label: 'ขอเข้าฝึกปฏิบัติด้วยตนเอง',
      href: '/practice',
      icon: QrCode,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
      badge: 'ใหม่',
    },
    {
      label: 'ศูนย์อนุมัติคำขอ',
      href: '/approvals',
      icon: CheckSquare,
      roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
      badgeCount: pendingCount,
    },
    {
      label: 'ตารางงาน & กำหนดรับ-คืน',
      href: '/schedule',
      icon: CalendarDays,
      roles: ['ADMIN', 'OFFICER', 'APPROVER'],
      badge: 'เจ้าหน้าที่',
    },
    {
      label: 'ต้นทุนวัสดุตามรายวิชา',
      href: '/courses',
      icon: BarChart3,
      roles: ['ADMIN', 'OFFICER', 'APPROVER'],
    },
    {
      label: 'รายงาน & วิเคราะห์ข้อมูล',
      href: '/reports',
      icon: BarChart3,
      roles: ['ADMIN', 'OFFICER', 'APPROVER'],
    },
    {
      label: 'จัดการผู้ใช้ & สิทธิ์',
      href: '/users',
      icon: Users,
      roles: ['ADMIN'],
      badge: 'แอดมิน',
    },
  ];

  // Filter items matching the user's role
  const userRole = currentUser?.role || 'USER';
  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 h-full flex flex-col justify-between p-4 shadow-xl overflow-y-auto">
      <div>
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>เมนูที่ได้รับสิทธิ์</span>
          <span className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded font-mono">
            {userRole}
          </span>
        </div>

        <nav className="space-y-1.5 mt-2">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                    {item.badgeCount}
                  </span>
                ) : item.badge ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-500/30">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role status footer & Profile Edit */}
      <div className="mt-8 pt-4 border-t border-slate-800 text-xs space-y-2">
        <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
            <Shield className="w-3.5 h-3.5" />
            <span>สิทธิ์การใช้งานปัจจุบัน:</span>
          </div>
          <div className="text-xs font-bold text-white">
            {currentUser?.name || 'ผู้ใช้งาน'}
          </div>
          <div className="text-[10px] text-slate-400">
            {userRole === 'ADMIN' && 'เข้าถึงและกำหนดค่าได้ทุกระบบ'}
            {userRole === 'OFFICER' && 'จัดการคลัง รับเข้า จ่ายของ และตรวจคืน'}
            {userRole === 'APPROVER' && 'มีสิทธิ์อนุมัติคำขอยืมและเบิก'}
            {userRole === 'USER' && 'มีสิทธิ์ยื่นคำขอยืมและขอเบิกวัสดุ'}
          </div>
        </div>

        {/* Quick Edit Profile Button */}
        {currentUser && (
          <button
            onClick={() => {
              const navbarEditBtn = document.querySelector<HTMLButtonElement>('[title="แก้ไขข้อมูลส่วนตัว"]');
              if (navbarEditBtn) {
                navbarEditBtn.click();
              } else {
                setIsProfileOpen(true);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            <UserCog className="w-4 h-4 text-teal-400" />
            <span>แก้ไขบัญชีส่วนตัว</span>
          </button>
        )}
      </div>

      {/* Fallback Profile Modal if not in Navbar */}
      {isProfileOpen && (
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      )}
    </aside>
  );
}
