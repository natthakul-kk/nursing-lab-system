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
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => void;
  login: (email: string) => Promise<boolean>;
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
    // 1. Instant local cache hydration for 0ms initial render
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem('cached_users');
        const savedUserId = localStorage.getItem('active_user_id');
        if (cachedStr) {
          const cachedUsers: User[] = JSON.parse(cachedStr);
          if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
            setAvailableUsers(cachedUsers);
            const found = cachedUsers.find((u) => u.id === savedUserId);
            if (found) {
              setCurrentUser(found);
            } else {
              const defaultUser = cachedUsers.find((u) => u.role === 'OFFICER') || cachedUsers[0];
              setCurrentUser(defaultUser);
            }
            setIsLoading(false); // Render immediately without waiting for network!
          }
        }
      } catch (e) {
        console.error('Error reading cached users', e);
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
          const found = users.find((u) => u.id === savedUserId);

          if (found) {
            setCurrentUser(found);
          } else if (users.length > 0) {
            // Default to Officer if not logged in
            const defaultUser = users.find((u) => u.role === 'OFFICER') || users[0];
            setCurrentUser(defaultUser);
            if (typeof window !== 'undefined') {
              localStorage.setItem('active_user_id', defaultUser.id);
            }
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

  const switchUserById = (userId: string) => {
    const user = availableUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_user_id', user.id);
      }
    }
  };

  const login = async (email: string): Promise<boolean> => {
    const user = availableUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (user) {
      setCurrentUser(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_user_id', user.id);
      }
      return true;
    }
    return false;
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
        setCurrentUser,
        switchUserById,
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
