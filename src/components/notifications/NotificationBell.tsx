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
  Smartphone,
  Send,
  BellRing,
  Settings,
} from 'lucide-react';
import {
  VAPID_PUBLIC_KEY,
  urlBase64ToUint8Array,
  isPushNotificationSupported,
  getNotificationPermission,
} from '@/lib/webpush-client';

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

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playNote(659.25, now, 0.22);       // E5
    playNote(880.00, now + 0.10, 0.35); // A5
  } catch {}
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

  // Real-time Toast & Sound states
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  // Push Notification state
  const [pushStatus, setPushStatus] = useState<'LOADING' | 'ENABLED' | 'DISABLED' | 'BLOCKED' | 'UNSUPPORTED'>('LOADING');
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const checkPush = async () => {
    if (typeof window === 'undefined') return;
    if (!isPushNotificationSupported()) {
      setPushStatus('UNSUPPORTED');
      return;
    }
    const perm = getNotificationPermission();
    if (perm === 'unsupported') {
      setPushStatus('UNSUPPORTED');
      return;
    }
    if (perm === 'denied') {
      setPushStatus('BLOCKED');
      return;
    }
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub && perm === 'granted') {
        setPushStatus('ENABLED');
        if (currentUser?.id) {
          fetch('/api/notifications/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              subscription: sub.toJSON(),
              userAgent: navigator.userAgent,
            }),
          }).catch(() => {});
        }
      } else {
        setPushStatus('DISABLED');
      }
    } catch {
      setPushStatus(perm === 'granted' ? 'ENABLED' : 'DISABLED');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkPush();
      setPushFeedback(null);
    }
  }, [isOpen]);

  const handleEnablePushFromBell = async () => {
    if (!currentUser?.id) return;
    setIsSubscribingPush(true);
    setPushFeedback(null);
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
      }
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const res = await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            subscription: sub.toJSON(),
            userAgent: navigator.userAgent,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'บันทึกอุปกรณ์ไม่สำเร็จ');
        }
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('push_prompt_setup_done', 'true');
          }
        } catch {}
        setPushStatus('ENABLED');
        setPushFeedback({ success: true, message: 'เปิดรับแจ้งเตือนบนอุปกรณ์นี้สำเร็จแล้ว ✅' });
      } else if (permission === 'denied') {
        setPushStatus('BLOCKED');
        setPushFeedback({ success: false, message: 'เบราว์เซอร์บล็อกการแจ้งเตือน' });
      }
    } catch (err: any) {
      setPushFeedback({ success: false, message: err.message || 'ตั้งค่าไม่สำเร็จ' });
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleTestPushFromBell = async () => {
    if (!currentUser) return;
    setIsTestingPush(true);
    setPushFeedback(null);
    try {
      const res = await fetch('/api/notifications/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPushFeedback({ success: true, message: 'ส่งการแจ้งเตือนเข้าเครื่องนี้แล้ว 🔔' });
      } else {
        setPushFeedback({ success: false, message: data.message || data.error || 'ส่งไม่สำเร็จ' });
      }
    } catch (err) {
      setPushFeedback({ success: false, message: 'ติดต่อเซิร์ฟเวอร์ไม่ได้' });
    } finally {
      setIsTestingPush(false);
    }
  };

  const fetchNotifications = async (showLoading = false) => {
    if (!currentUser?.id) return;
    if (showLoading) setLoading(true);

    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        const items: NotificationItem[] = data.notifications || [];
        setNotifications(items);
        setUnreadCount(data.unreadCount || 0);

        if (items.length > 0) {
          const newest = items[0];
          // หากมีแจ้งเตือนใหม่เข้ามาและยังไม่ได้อ่าน
          if (
            !isFirstLoadRef.current &&
            lastSeenNotifIdRef.current &&
            newest.id !== lastSeenNotifIdRef.current &&
            !newest.isRead
          ) {
            playNotificationChime();
            setActiveToast(newest);

            // ส่ง Notification บนเบราว์เซอร์หากเปิดสิทธิ์ไว้
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              try {
                new Notification(newest.title, {
                  body: newest.message,
                  icon: '/icons/icon-192x192.png',
                });
              } catch {}
            }
          }
          lastSeenNotifIdRef.current = newest.id;
        }
        isFirstLoadRef.current = false;
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Auto-dismiss floating toast
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Run system check (staff/admin only) periodically
  useEffect(() => {
    if (!currentUser?.id) return;

    fetchNotifications();

    if (isOfficer || isAdmin) {
      fetch('/api/notifications/check-system', { method: 'POST' }).catch(() => {});
    }

    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000); // Check every 15s for instant alerts

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
        <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-16px)] sm:max-w-none rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[82vh] flex flex-col">
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
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/settings/notifications');
                  }}
                  className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="ตั้งค่าข้อความแจ้งเตือน (สำหรับแอดมิน)"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
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

          {/* Web Push Device Status Strip */}
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Smartphone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate text-[11px]">
                  {pushStatus === 'ENABLED'
                    ? 'แจ้งเตือนบนอุปกรณ์: เปิดอยู่ 🟢'
                    : pushStatus === 'BLOCKED'
                    ? 'แจ้งเตือนบนอุปกรณ์: ถูกบล็อก 🔴'
                    : pushStatus === 'UNSUPPORTED'
                    ? 'แจ้งเตือนบนอุปกรณ์: ไม่รองรับ'
                    : 'แจ้งเตือนเข้ามือถือ: ยังไม่เปิด ⚪'}
                </span>
              </div>

              <div>
                {pushStatus === 'DISABLED' && (
                  <button
                    type="button"
                    onClick={handleEnablePushFromBell}
                    disabled={isSubscribingPush}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-xs cursor-pointer transition disabled:opacity-50 shrink-0"
                  >
                    {isSubscribingPush ? 'กำลังเปิด...' : 'เปิดใช้งาน'}
                  </button>
                )}
                {pushStatus === 'ENABLED' && (
                  <button
                    type="button"
                    onClick={handleTestPushFromBell}
                    disabled={isTestingPush}
                    className="px-2.5 py-1 rounded-lg border border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 font-bold text-[11px] cursor-pointer transition disabled:opacity-50 shrink-0 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isTestingPush ? 'กำลังส่ง...' : 'ทดสอบส่ง'}</span>
                  </button>
                )}
              </div>
            </div>

            {pushFeedback && (
              <div
                className={`mt-1.5 p-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                  pushFeedback.success
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                }`}
              >
                <span>{pushFeedback.message}</span>
              </div>
            )}
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
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(82vh-170px)] sm:max-h-[380px]">
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

      {/* Floating In-App Toast Popup (เด้งเตือนสดบนหน้าจอ) */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-[99999] max-w-sm w-[calc(100vw-2.5rem)] md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-teal-500/50 dark:border-teal-400/40 rounded-2xl shadow-2xl p-4 transition-all transform animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0 relative">
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full" />
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-full">
                  แจ้งเตือนใหม่ 🔔
                </span>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1 truncate">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2.5">
                {activeToast.message}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleMarkAsRead(activeToast.id, activeToast.linkUrl);
                    setActiveToast(null);
                  }}
                  className="flex-1 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <span>เปิดดูทันที</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setActiveToast(null)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg transition"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
