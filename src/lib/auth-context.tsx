'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'ADMIN' | 'OFFICER' | 'APPROVER' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  studentId?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];

  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isApprover: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Instant local cache hydration for authenticated session
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem('cached_users');
        const savedUserId = localStorage.getItem('active_user_id');
        const cachedCurrentUserStr = localStorage.getItem('cached_current_user');

        if (cachedCurrentUserStr) {
          try {
            setCurrentUser(JSON.parse(cachedCurrentUserStr));
          } catch (e) {}
        }

        if (cachedStr) {
          const cachedUsers: User[] = JSON.parse(cachedStr);
          if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
            setAvailableUsers(cachedUsers);
            if (savedUserId) {
              const found = cachedUsers.find((u) => u.id === savedUserId);
              if (found) setCurrentUser(found);
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
          if (savedUserId) {
            const found = users.find((u) => u.id === savedUserId);
            if (found) {
              setCurrentUser(found);
              if (typeof window !== 'undefined') {
                localStorage.setItem('cached_current_user', JSON.stringify(found));
              }
            } else {
              // Saved user was deleted or invalid
              setCurrentUser(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('active_user_id');
                localStorage.removeItem('cached_current_user');
              }
            }
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

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
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
        localStorage.setItem('active_user_id', user.id);
        localStorage.setItem('cached_current_user', JSON.stringify(user));
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

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active_user_id');
      localStorage.removeItem('cached_current_user');
    }
    router.push('/login');
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isOfficer = currentUser?.role === 'OFFICER' || isAdmin;
  const isApprover = currentUser?.role === 'APPROVER' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        login,
        logout,
        updateUser,
        refreshUsers,
        isLoading,
        isAdmin,
        isOfficer,
        isApprover,
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
