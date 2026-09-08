'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'ADMIN' | 'OFFICER' | 'APPROVER' | 'TEACHER' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  studentId?: string | null;
  phone?: string | null;
}

// Session timeout constants
export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours (120 minutes)
export const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes warning countdown
export const SESSION_LIFETIME_NORMAL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_LIFETIME_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];

  login: (email: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string | React.MouseEvent | unknown) => void;
  extendSession: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isApprover: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function checkSessionActive(): boolean {
  if (typeof window === 'undefined') return true;
  const expiresAtStr = localStorage.getItem('session_expires_at');
  const lastActiveStr = localStorage.getItem('session_last_active');

  const now = Date.now();

  // 1. Check absolute session expiration
  if (expiresAtStr) {
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!isNaN(expiresAt) && now > expiresAt) {
      return false;
    }
  }

  // 2. Check idle inactivity expiration (2 hours)
  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && now - lastActive > IDLE_TIMEOUT_MS) {
      return false;
    }
  }

  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearSessionStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active_user_id');
      localStorage.removeItem('cached_current_user');
      localStorage.removeItem('session_expires_at');
      localStorage.removeItem('session_last_active');
      localStorage.removeItem('session_remember_me');
    }
  };

  const logout = (reason?: string | React.MouseEvent | unknown) => {
    setCurrentUser(null);
    clearSessionStorage();
    if (typeof reason === 'string' && reason === 'timeout') {
      router.push('/login?reason=timeout');
    } else {
      router.push('/login');
    }
  };

  const extendSession = () => {
    if (typeof window !== 'undefined' && currentUser) {
      localStorage.setItem('session_last_active', Date.now().toString());
    }
  };

  useEffect(() => {
    // 1. Instant local cache hydration for authenticated session with expiration check
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem('cached_users');
        const savedUserId = localStorage.getItem('active_user_id');
        const cachedCurrentUserStr = localStorage.getItem('cached_current_user');

        const sessionValid = checkSessionActive();

        if (!sessionValid) {
          console.log('[AUTH SESSION] Session expired, clearing credentials.');
          clearSessionStorage();
          setCurrentUser(null);
        } else {
          if (cachedCurrentUserStr) {
            try {
              setCurrentUser(JSON.parse(cachedCurrentUserStr));
              // Touch last active on hydration
              localStorage.setItem('session_last_active', Date.now().toString());
            } catch (e) {}
          }

          if (cachedStr) {
            const cachedUsers: User[] = JSON.parse(cachedStr);
            if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
              setAvailableUsers(cachedUsers);
              if (savedUserId && !cachedCurrentUserStr) {
                const found = cachedUsers.find((u) => u.id === savedUserId);
                if (found) setCurrentUser(found);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error reading cached users', e);
      } finally {
        setIsLoading(false);
      }
    }

    // 2. Fetch fresh data in background (SWR pattern)
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const users: User[] = await res.json();
          setAvailableUsers(users);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cached_users', JSON.stringify(users));
          }

          const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('active_user_id') : null;
          const sessionValid = checkSessionActive();

          if (savedUserId && sessionValid) {
            const found = users.find((u) => u.id === savedUserId);
            if (found) {
              setCurrentUser(found);
              if (typeof window !== 'undefined') {
                localStorage.setItem('cached_current_user', JSON.stringify(found));
              }
            } else {
              // Saved user was deleted or invalid
              setCurrentUser(null);
              clearSessionStorage();
            }
          } else if (!sessionValid) {
            setCurrentUser(null);
            clearSessionStorage();
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, []);

  const login = async (
    email: string,
    password?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
      }

      const user: User = data.user;
      setCurrentUser(user);

      if (typeof window !== 'undefined') {
        const now = Date.now();
        const lifetime = rememberMe ? SESSION_LIFETIME_REMEMBER_MS : SESSION_LIFETIME_NORMAL_MS;
        const expiresAt = now + lifetime;

        localStorage.setItem('active_user_id', user.id);
        localStorage.setItem('cached_current_user', JSON.stringify(user));
        localStorage.setItem('session_expires_at', expiresAt.toString());
        localStorage.setItem('session_last_active', now.toString());
        localStorage.setItem('session_remember_me', rememberMe ? 'true' : 'false');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Login request failed', err);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users: User[] = await res.json();
        setAvailableUsers(users);
        if (currentUser) {
          const updated = users.find((u) => u.id === currentUser.id);
          if (updated) {
            setCurrentUser(updated);
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_current_user', JSON.stringify(updated));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh users', err);
    }
  };

  const updateUser = async (updatedData: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        const updated: User = await res.json();
        setCurrentUser(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_current_user', JSON.stringify(updated));
        }
        setAvailableUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update user', err);
      return false;
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isOfficer = currentUser?.role === 'OFFICER' || isAdmin;
  const isApprover = currentUser?.role === 'APPROVER' || isAdmin;
  const isTeacher =
    currentUser?.role === 'TEACHER' ||
    currentUser?.role === 'APPROVER' ||
    isAdmin ||
    Boolean(currentUser?.email?.includes('teacher')) ||
    Boolean(currentUser?.name?.startsWith('อ.')) ||
    Boolean(currentUser?.name?.startsWith('ผศ.')) ||
    Boolean(currentUser?.name?.startsWith('รศ.')) ||
    Boolean(currentUser?.name?.startsWith('ดร.')) ||
    Boolean(currentUser?.name?.startsWith('ศ.')) ||
    Boolean(currentUser?.department?.includes('อาจารย์'));

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        login,
        logout,
        extendSession,
        updateUser,
        refreshUsers,
        setCurrentUser,
        isLoading,
        isAdmin,
        isOfficer,
        isApprover,
        isTeacher,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
