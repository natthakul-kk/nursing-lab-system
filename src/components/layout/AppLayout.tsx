'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();
  const isLoginPage = pathname === '/login';
  const isPublicAssetPage = pathname?.startsWith('/asset/');

  if (isLoginPage || isPublicAssetPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner
          size="lg"
          message="กำลังเชื่อมต่อระบบห้องปฏิบัติการพยาบาล..."
          submessage="กำลังโหลดข้อมูลจาก Supabase Cloud Database"
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
