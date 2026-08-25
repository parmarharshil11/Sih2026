'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ShieldCheck, User, LogOut, QrCode, BookOpen, Layers, Award, LayoutDashboard, Loader2, Moon, Sun } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { QRScannerModal } from './QRScannerModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export function Navbar() {
  const { user, isLoggingOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('auth') === 'true') {
      setIsAuthOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <header className="sticky top-0 z-40 glass-nav w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Capacity Connect
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-blue-400 -mt-1">
                Enterprise LMS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              Overview
            </Link>
            <Link href="/trainee/courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Courses
            </Link>
            <button
              onClick={() => setIsQROpen(true)}
              className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-emerald-400" /> Verify Cert
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.roles.includes('admin') && (
                  <Link
                    href="/admin/dashboard"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
                  </Link>
                )}
                {user.roles.includes('trainer') && (
                  <Link
                    href="/trainer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Trainer Studio
                  </Link>
                )}
                <Link
                  href="/trainee"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" /> Portal
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsLogoutOpen(true)}
                  disabled={isLoggingOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                  title="Log Out"
                >
                  {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <QRScannerModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />
      <LogoutConfirmModal isOpen={isLogoutOpen} onClose={() => setIsLogoutOpen(false)} />
    </>
  );
}
