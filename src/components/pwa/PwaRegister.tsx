'use client';

import React, { useEffect } from 'react';
import PwaInstallPrompt from './PwaInstallPrompt';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.log('PWA Service Worker registration skipped or failed:', err);
          });
      });
    }
  }, []);

  return <PwaInstallPrompt />;
}
