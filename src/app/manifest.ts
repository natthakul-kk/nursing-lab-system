import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ระบบบริหารห้องปฏิบัติการพยาบาลศาสตร์',
    short_name: 'Lab พยาบาล',
    description: 'ระบบบริหารจัดการพัสดุ ครุภัณฑ์ การยืม-คืน และต้นทุนรายวิชา ห้องปฏิบัติการพยาบาลศาสตร์',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0d9488',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'th',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
