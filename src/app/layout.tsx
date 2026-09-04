import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'ระบบบริหารวัสดุ-ครุภัณฑ์และต้นทุนรายวิชา | ห้องปฏิบัติการพยาบาล',
  description: 'Nursing Simulation Lab Inventory, Borrow-Return & Course Cost Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased bg-slate-50 text-slate-900">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
