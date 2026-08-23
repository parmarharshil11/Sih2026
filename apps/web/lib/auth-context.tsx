'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api-client';

export interface UserSession {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage if present
    const savedUser = localStorage.getItem('user_session');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    // In our backend implementation, login returns message and sets cookies/tokens
    // Mock decoded roles for demo session management
    let roles = ['trainee'];
    if (email.includes('admin')) roles = ['admin'];
    else if (email.includes('trainer')) roles = ['trainer'];

    const session: UserSession = {
      id: res.userId || 'user-' + Date.now(),
      email,
      roles,
    };

    setUser(session);
    localStorage.setItem('user_session', JSON.stringify(session));
    if (res.accessToken) {
      localStorage.setItem('access_token', res.accessToken);
    }
  };

  const register = async (email: string, password: string, role: string) => {
    await api.post('/auth/register', { email, password, role });
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setUser(null);
    localStorage.removeItem('user_session');
    localStorage.removeItem('access_token');
  };

  const hasRole = (role: string) => {
    return !!user?.roles?.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
