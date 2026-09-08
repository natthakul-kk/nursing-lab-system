'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, IDLE_TIMEOUT_MS, WARNING_BEFORE_MS } from '@/lib/auth-context';
import SessionTimeoutModal from './SessionTimeoutModal';

export default function SessionActivityWatcher() {
  const { currentUser, logout, extendSession } = useAuth();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const lastTouchRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser) {
      setIsWarningOpen(false);
      return;
    }

    // Update last activity throttled (at most once every 60 seconds)
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastTouchRef.current > 60 * 1000) {
        lastTouchRef.current = now;
        extendSession();
      }
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check interval every 5 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const lastActiveStr = localStorage.getItem('session_last_active');
      const expiresAtStr = localStorage.getItem('session_expires_at');

      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : now;
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : now + 8 * 60 * 60 * 1000;

      // 1. Check absolute expiration
      if (now >= expiresAt) {
        console.log('[SESSION WATCHER] Absolute expiration reached.');
        logout('timeout');
        return;
      }

      // 2. Check idle expiration
      const elapsedIdle = now - lastActive;
      const remainingIdle = IDLE_TIMEOUT_MS - elapsedIdle;

      if (remainingIdle <= 0) {
        console.log('[SESSION WATCHER] Idle timeout reached.');
        logout('timeout');
        return;
      }

      // 3. Check warning threshold (<= 2 minutes)
      if (remainingIdle <= WARNING_BEFORE_MS) {
        setIsWarningOpen(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remainingIdle / 1000)));
      } else {
        setIsWarningOpen(false);
      }
    }, 5000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser, logout, extendSession]);

  const handleExtend = () => {
    lastTouchRef.current = Date.now();
    extendSession();
    setIsWarningOpen(false);
  };

  const handleLogoutNow = () => {
    setIsWarningOpen(false);
    logout();
  };

  return (
    <SessionTimeoutModal
      isOpen={isWarningOpen}
      secondsRemaining={secondsRemaining}
      onExtend={handleExtend}
      onLogout={handleLogoutNow}
    />
  );
}
