'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse border border-slate-300/40" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative inline-flex items-center gap-2.5 p-1 rounded-full transition-all duration-300 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
        isDark
          ? 'bg-slate-900 border border-slate-700/80 shadow-inner'
          : 'bg-slate-100 border border-slate-300/80 shadow-sm'
      } ${className}`}
      title={isDark ? 'คลิกเพื่อสลับเป็นโหมดสว่าง (Light Mode)' : 'คลิกเพื่อสลับเป็นโหมดมืด (Dark Mode)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Visual Track Container */}
      <div className="relative w-12 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300">
        {/* Ambient background icons */}
        <Sun className={`w-3.5 h-3.5 text-amber-500 absolute left-1.5 transition-opacity duration-300 ${isDark ? 'opacity-20' : 'opacity-80'}`} />
        <Moon className={`w-3 h-3 text-cyan-400 absolute right-1.5 transition-opacity duration-300 ${isDark ? 'opacity-80' : 'opacity-20'}`} />

        {/* Sliding Indicator Knob */}
        <div
          className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ease-out shadow-md ${
            isDark
              ? 'translate-x-6 bg-gradient-to-tr from-slate-900 to-indigo-950 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
              : 'translate-x-0 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 border border-amber-300/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
          ) : (
            <Sun className="w-3 h-3 text-amber-950" />
          )}
        </div>
      </div>

      {showLabel && (
        <span className="text-xs font-semibold pr-2 text-slate-700 dark:text-slate-300">
          {isDark ? 'โหมดมืด (Dark)' : 'โหมดสว่าง (Light)'}
        </span>
      )}
    </button>
  );
}

