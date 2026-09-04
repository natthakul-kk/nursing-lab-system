'use client';

import React from 'react';
import { Database } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  submessage?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  message = 'กำลังโหลดข้อมูล...',
  submessage = 'กำลังเชื่อมต่อและดึงข้อมูลจาก Cloud Database',
  size = 'md',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinnerSize =
    size === 'sm'
      ? 'w-6 h-6 border-2'
      : size === 'lg'
      ? 'w-14 h-14 border-4'
      : 'w-10 h-10 border-[3px]';

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-6">
      <div className="relative flex items-center justify-center mb-3">
        <div
          className={`${spinnerSize} rounded-full border-teal-100 border-t-teal-600 border-r-teal-500 animate-spin`}
        />
        <div className="absolute flex items-center justify-center">
          <Database className="w-4 h-4 text-teal-600 animate-pulse" />
        </div>
      </div>

      <p className="text-sm font-bold text-slate-700 tracking-wide">{message}</p>
      {submessage && (
        <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping inline-block" />
          <span>{submessage}</span>
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4">
          {content}
        </div>
      </div>
    );
  }

  return <div className="w-full flex items-center justify-center py-12">{content}</div>;
}

export function TableLoadingRow({
  colSpan = 5,
  message = 'กำลังโหลดข้อมูลในตาราง...',
}: {
  colSpan?: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-14 text-center">
        <div className="flex flex-col items-center justify-center gap-2.5">
          <div className="w-8 h-8 rounded-full border-[3px] border-teal-100 border-t-teal-600 animate-spin" />
          <p className="text-xs font-bold text-slate-600">{message}</p>
          <p className="text-[11px] text-slate-400">กำลังซิงค์ข้อมูลล่าสุดจาก Supabase...</p>
        </div>
      </td>
    </tr>
  );
}
