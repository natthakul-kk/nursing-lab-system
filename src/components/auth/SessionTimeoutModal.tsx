'use client';

import React from 'react';
import { Clock, ShieldAlert, RefreshCw, LogOut } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutModal({
  isOpen,
  secondsRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">แจ้งเตือนเซสชันใกล้หมดเวลา</h3>
            <p className="text-xs text-slate-500">ระบบตรวจพบว่าไม่มีการใช้งานมาระยะหนึ่งแล้ว</p>
          </div>
        </div>

        {/* Countdown Box */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 text-center space-y-1">
          <p className="text-xs text-amber-900 font-medium">
            ระบบจะออกจากระบบอัตโนมัติเพื่อความปลอดภัยในอีก
          </p>
          <div className="text-3xl font-black font-mono text-amber-700 tracking-wider">
            {timeFormatted}
          </div>
          <p className="text-[11px] text-amber-800/80">
            (นาที : วินาที)
          </p>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          หากท่านยังคงใช้งานอยู่ กรุณากดปุ่ม <b>"ต่อเวลาการใช้งาน"</b> ด้านล่างเพื่อทำงานต่อโดยข้อมูลไม่สูญหาย
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
          <button
            type="button"
            onClick={onExtend}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ต่อเวลาการใช้งาน</span>
          </button>
        </div>
      </div>
    </div>
  );
}
