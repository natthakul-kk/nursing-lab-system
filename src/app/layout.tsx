import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import PwaRegister from '@/components/pwa/PwaRegister';

export const metadata: Metadata = {
  title: 'ระบบบริหารวัสดุ-ครุภัณฑ์และต้นทุนรายวิชา | ห้องปฏิบัติการพยาบาล',
  description: 'Nursing Simulation Lab Inventory, Borrow-Return & Course Cost Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lab พยาบาล',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0d9488',
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
        <PwaRegister />
      </body>
    </html>
  );
}
