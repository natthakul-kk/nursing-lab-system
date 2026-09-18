'use client';

import React, { useState } from 'react';

interface CourseBudgetDonutProps {
  allocatedBudget: number;
  totalExpense: number;
  percentBudget: number;
  courseCode?: string;
  size?: number;
  strokeWidth?: number;
}

export default function CourseBudgetDonut({
  allocatedBudget,
  totalExpense,
  percentBudget,
  courseCode,
  size = 60,
  strokeWidth = 6.5,
}: CourseBudgetDonutProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Geometry
  const center = size / 2;
  const radius = center - strokeWidth - 1;
  const circumference = 2 * Math.PI * radius;

  // Percentage calculations
  const rawPercent = percentBudget || (allocatedBudget > 0 ? (totalExpense / allocatedBudget) * 100 : 0);
  const displayPercent = Math.round(rawPercent * 10) / 10;
  const clampedPercent = Math.min(Math.max(rawPercent, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  // Remaining budget
  const remainingBudget = Math.max(0, allocatedBudget - totalExpense);
  const isOverBudget = totalExpense > allocatedBudget && allocatedBudget > 0;

  // Colors based on risk level
  let strokeColor = '#0d9488'; // Teal-600
  let badgeBg = 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300';
  if (rawPercent > 85) {
    strokeColor = '#f43f5e'; // Rose-500
    badgeBg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
  } else if (rawPercent >= 60) {
    strokeColor = '#f59e0b'; // Amber-500
    badgeBg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
  }

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0 select-none group cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(!showTooltip)}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-label={`งบประมาณวิชา ${courseCode || ''}: ใช้ไปแล้ว ${displayPercent}%`}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200 dark:text-slate-700/80 transition-colors"
        />

        {/* Progress Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Label (Percentage) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none"
          style={{ fontSize: size <= 56 ? '11px' : '12px' }}
        >
          {displayPercent > 999 ? '>999%' : `${Math.round(displayPercent)}%`}
        </span>
      </div>

      {/* Interactive Tooltip Popover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-xl shadow-xl border border-slate-700/80 text-[11px] z-30 pointer-events-none animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700 font-bold">
            <span className="text-slate-300">{courseCode || 'งบประมาณรายวิชา'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>
              ใช้ไป {displayPercent}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>งบที่ได้รับ:</span>
              <span className="font-mono font-bold text-white">
                ฿{allocatedBudget.toLocaleString('th-TH')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>ใช้จริงสะสม:</span>
              <span className="font-mono font-bold text-emerald-400">
                ฿{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>คงเหลือ:</span>
              <span
                className={`font-mono font-bold ${
                  isOverBudget ? 'text-rose-400' : 'text-teal-300'
                }`}
              >
                {isOverBudget
                  ? `(เกินงบ ฿${(totalExpense - allocatedBudget).toLocaleString('th-TH')})`
                  : `฿${remainingBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
}
