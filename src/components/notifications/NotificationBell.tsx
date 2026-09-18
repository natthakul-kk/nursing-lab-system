'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  GraduationCap,
  FileText,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  linkUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'เมื่อสักครู่';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'เมื่อวานนี้';
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (showLoading = false) => {
    if (!currentUser?.id) return;
    if (showLoading) setLoading(true);

    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Run system check (staff/admin only) periodically
  useEffect(() => {
    if (!currentUser?.id) return;

    fetchNotifications();

    if (isOfficer || isAdmin) {
      fetch('/api/notifications/check-system', { method: 'POST' }).catch(() => {});
    }

    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000); // Check every 45s

    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.id, isOfficer, isAdmin]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, linkUrl?: string | null) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {}

    setIsOpen(false);

    if (linkUrl) {
      router.push(linkUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id || unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'REJECTION':
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      case 'STOCK_ALERT':
        return <Package className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'DUE_REMINDER':
        return <Clock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      case 'INSTRUCTOR_ACK':
        return <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />;
      case 'REQUEST_SUBMITTED':
        return <FileText className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />;
    }
  };

  if (!currentUser) return null;

  const displayedNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer"
        title="การแจ้งเตือน"
      >
        <Bell className="w-4 h-4" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/70 px-2 py-0.5 rounded-full">
                  ใหม่ {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer px-2 py-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950"
                  title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>อ่านทั้งหมด</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="รีเฟรชการแจ้งเตือน"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center p-1.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`flex-1 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              ทั้งหมด ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`flex-1 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              ยังไม่อ่าน ({unreadCount})
            </button>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">
                  {filter === 'UNREAD' ? 'ไม่มีการแจ้งเตือนที่ยังไม่อ่าน' : 'ไม่มีรายการแจ้งเตือน'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id, notif.linkUrl)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                    notif.isRead
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                      : 'bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-900 dark:text-white font-medium'
                  }`}
                >
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4
                        className={`text-xs font-bold leading-tight truncate ${
                          notif.isRead
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.linkUrl && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400">
                        <span>คลิกเพื่อดูรายละเอียด</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
            ระบบศูนย์ฝึกทักษะทางการพยาบาล • แจ้งเตือนแบบเรียลไทม์
          </div>
        </div>
      )}
    </div>
  );
}
