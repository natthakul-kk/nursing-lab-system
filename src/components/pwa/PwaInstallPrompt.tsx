'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, X, PlusSquare } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isApp);
    if (isApp) return;

    // Check if dismissed before
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIosDevice && isSafari) {
      setIsIOS(true);
      // Show prompt on iOS after a brief delay
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chromium beforeinstallprompt handler
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Do not render if already standalone, dismissed, or not visible
  if (isStandalone || dismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-bounce-short">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-teal-500/40 text-white p-4 rounded-2xl shadow-2xl shadow-teal-950/50 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ติดตั้งแอปห้องแล็บพยาบาล</h4>
              <p className="text-[11px] text-teal-300">ใช้งานสะดวก เต็มหน้าจอ เปิดไว ไม่ต้องเข้าเบราว์เซอร์</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          // Instructions for iOS Safari
          <div className="text-[11px] bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-1.5 text-slate-300">
            <p className="font-semibold text-teal-300">วิธีติดตั้งบน iPhone / iPad:</p>
            <p className="flex items-center gap-1.5">
              1. กดปุ่ม <Share className="w-3.5 h-3.5 text-teal-400 inline" /> (แชร์) ด้านล่างของ Safari
            </p>
            <p className="flex items-center gap-1.5">
              2. เลื่อนลงแล้วเลือก <PlusSquare className="w-3.5 h-3.5 text-teal-400 inline" /> <strong>"เพิ่มไปยังหน้าจอโฮม"</strong>
            </p>
          </div>
        ) : (
          // One-click install for Android / Chrome / Edge
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ติดตั้งแอปลงมือถือทันที</span>
          </button>
        )}
      </div>
    </div>
  );
}
