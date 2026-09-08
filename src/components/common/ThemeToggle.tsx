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
      <button
        type="button"
        className={`w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 opacity-60 ${className}`}
        aria-label="Toggle Dark / Light Mode"
      >
        <span className="w-4 h-4 rounded-full bg-slate-300 animate-pulse" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer select-none group ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-amber-300 shadow-sm hover:border-amber-400/50'
          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm hover:border-slate-300'
      } ${className}`}
      title={isDark ? 'สลับเป็นโหมดสว่าง (Light Mode)' : 'สลับเป็นโหมดมืด (Dark Mode)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-amber-300 transition-transform duration-300 rotate-0 scale-100 drop-shadow-[0_0_6px_rgba(252,211,77,0.5)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 rotate-0 scale-100 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? 'โหมดมืด' : 'โหมดสว่าง'}
        </span>
      )}
    </button>
  );
}
