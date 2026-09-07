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
  QrCode,
  ChevronDown,
  ChevronsUpDown,
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
          setPendingCount(
            (data.pendingBorrows || 0) +
            (data.pendingRequisitions || 0) +
            (data.pendingPracticeCount || 0)
          );
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

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    roles: string[];
    badge?: string;
    badgeCount?: number;
  }

  interface NavGroup {
    groupName: string;
    groupKey: string;
    groupIcon: any;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      groupName: 'ภาพรวม & กำหนดการ',
      groupKey: 'overview',
      groupIcon: LayoutDashboard,
      items: [
        {
          label: 'ภาพรวมห้องแล็บ',
          href: '/',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
        },
        {
          label: 'ตารางงาน & กำหนดรับ-คืน',
          href: '/schedule',
          icon: CalendarDays,
          roles: ['ADMIN', 'OFFICER', 'APPROVER'],
          badge: 'เจ้าหน้าที่',
        },
      ],
    },
    {
      groupName: 'บริการเบิก-ยืม & ฝึกปฏิบัติ',
      groupKey: 'services',
      groupIcon: RefreshCw,
      items: [
        {
          label: 'เบิก-ยืมพัสดุและครุภัณฑ์',
          href: '/borrow',
          icon: RefreshCw,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
          badge: 'One-Stop',
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
          label: 'ประวัติเบิกจ่ายวัสดุ',
          href: '/requisitions',
          icon: FileSpreadsheet,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
        },
        {
          label: 'ศูนย์อนุมัติคำขอ',
          href: '/approvals',
          icon: CheckSquare,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'USER'],
          badgeCount: pendingCount,
        },
      ],
    },
    {
      groupName: 'จัดการคลัง & งานแล็บ',
      groupKey: 'inventory',
      groupIcon: Boxes,
      items: [
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
      ],
    },
    {
      groupName: 'งบประมาณ & รายงาน',
      groupKey: 'analytics',
      groupIcon: BarChart3,
      items: [
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
      ],
    },
    {
      groupName: 'ผู้ดูแลระบบ',
      groupKey: 'admin',
      groupIcon: Users,
      items: [
        {
          label: 'จัดการผู้ใช้ & สิทธิ์',
          href: '/users',
          icon: Users,
          roles: ['ADMIN'],
          badge: 'แอดมิน',
        },
      ],
    },
  ];

  // Track open state for dropdown groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    services: true,
    inventory: true,
    analytics: false,
    admin: false,
  });

  // Auto-expand group containing current pathname
  useEffect(() => {
    navGroups.forEach((g) => {
      if (g.items.some((it) => it.href === pathname)) {
        setOpenGroups((prev) => ({ ...prev, [g.groupKey]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllGroups = () => {
    const anyClosed = Object.values(openGroups).some((v) => !v);
    const updated: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      updated[g.groupKey] = anyClosed;
    });
    setOpenGroups(updated);
  };

  // Current user's role
  const userRole = currentUser?.role || 'USER';

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 h-full flex flex-col justify-between p-4 shadow-xl overflow-y-auto">
      <div>
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2">
          <span>ระบบห้องแล็บพยาบาล</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleAllGroups}
              title="ย่อ/ขยายกลุ่มเมนูทั้งหมด"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-teal-400 rounded transition cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded font-mono border border-slate-700">
              {userRole}
            </span>
          </div>
        </div>

        <nav className="space-y-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(userRole)
            );
            if (visibleItems.length === 0) return null;

            const isOpen = openGroups[group.groupKey] ?? true;
            const hasActiveItem = visibleItems.some((item) => pathname === item.href);

            return (
              <div key={group.groupKey} className="space-y-1">
                {/* Group Dropdown Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupKey)}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold transition cursor-pointer group ${
                    hasActiveItem
                      ? 'text-teal-300 bg-slate-800/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <group.groupIcon className="w-3.5 h-3.5 text-teal-500/80 group-hover:text-teal-400 transition" />
                    <span className="text-[11px] font-bold">{group.groupName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {visibleItems.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasActiveItem && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                        isOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                </button>

                {/* Submenu Dropdown Items */}
                {isOpen && (
                  <div className="space-y-1 pl-2.5 ml-2 border-l border-slate-800/80 mt-0.5">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                            isActive
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon
                              className={`w-3.5 h-3.5 transition ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badgeCount && item.badgeCount > 0 ? (
                            <span className="flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                              {item.badgeCount}
                            </span>
                          ) : item.badge ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-500/30">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
