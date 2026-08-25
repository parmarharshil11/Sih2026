'use client';

import React from 'react';
import { Modal } from './Modal';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmModal({ isOpen, onClose }: LogoutConfirmModalProps) {
  const { logout, isLoggingOut } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign Out">
      <div className="space-y-6">
        <p className="text-slate-300 text-sm">
          Are you sure you want to sign out of Capacity Connect?
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-xl font-semibold text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-xl font-semibold text-sm bg-rose-600 text-white hover:bg-rose-500 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
