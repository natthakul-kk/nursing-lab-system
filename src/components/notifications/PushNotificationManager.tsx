'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, BellRing, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import {
  VAPID_PUBLIC_KEY,
  urlBase64ToUint8Array,
  isPushNotificationSupported,
} from '@/lib/webpush-client';

export default function PushNotificationManager() {
  const { currentUser } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) return;

    // Check notification permission
    const permission = Notification.permission;

    // If permission already granted, auto-sync subscription with backend in background
    if (permission === 'granted') {
      syncSubscriptionInBackground();
      return;
    }

    // If permission is default and user hasn't dismissed yet, show one-time banner
    if (permission === 'default') {
      const dismissed = localStorage.getItem('push_prompt_dismissed');
      const setupDone = localStorage.getItem('push_prompt_setup_done');

      if (!dismissed && !setupDone) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  const syncSubscriptionInBackground = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      if (sub) {
        await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            userAgent: navigator.userAgent,
          }),
        });
      }
    } catch (err) {
      console.warn('[Push] Background sync error:', err);
    }
  };

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            userAgent: navigator.userAgent,
          }),
        });

        localStorage.setItem('push_prompt_setup_done', 'true');
        setIsSuccess(true);
        setTimeout(() => {
          setShowBanner(false);
        }, 2500);
      } else {
        localStorage.setItem('push_prompt_dismissed', 'true');
        setShowBanner(false);
      }
    } catch (err) {
      console.error('[Push] Setup failed:', err);
      localStorage.setItem('push_prompt_dismissed', 'true');
      setShowBanner(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner || !isSupported) return null;

  return (
    <aside
      aria-label="การแจ้งเตือนผลการอนุมัติ"
      className="fixed bottom-20 md:bottom-6 right-3 md:right-6 z-50 max-w-md w-[calc(100%-1.5rem)] md:w-auto bg-white dark:bg-slate-900 border border-teal-500/30 rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-5 text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-md"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20">
          {isSuccess ? (
            <Check className="w-5 h-5 animate-in zoom-in" />
          ) : (
            <BellRing className="w-5 h-5 animate-bounce" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isSuccess ? (
            <div className="py-1">
              <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">
                เปิดรับการแจ้งเตือนสำเร็จแล้ว 🎉
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                อุปกรณ์นี้จะได้รับการแจ้งเตือนผลคำขอและรายการสำคัญทันที
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  แนะนำสำหรับมือถือ
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                เปิดแจ้งเตือนผลการอนุมัติบนเครื่องนี้
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                รับผลการอนุมัติทันที หรือกดอนุมัติคำขอได้จากหน้าจอมือถือโดยไม่ต้องเปิดคอมพิวเตอร์
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{loading ? 'กำลังตั้งค่า...' : 'เปิดรับการแจ้งเตือน'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  ไว้คราวหลัง
                </button>
              </div>
            </>
          )}
        </div>

        {!isSuccess && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="ปิดการแจ้งเตือน"
            className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
