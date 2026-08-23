'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { ShieldCheck, AlertTriangle, Search, Award } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setIsVerifying(true);
    setResult(null);

    try {
      const data = await api.get(`/certificates/verify/${token.trim()}`);
      setResult(data);
      if (data.valid) {
        toast.success('Certificate is valid and verified!');
      } else {
        toast.error(data.message || 'Invalid certificate');
      }
    } catch (err: any) {
      toast.error('Failed to verify certificate token');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify Digital Certificate Token">
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
            Certificate Token / QR Code payload
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token UUID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isVerifying}
          className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4" />
          {isVerifying ? 'Verifying Token...' : 'Verify Authenticity'}
        </button>
      </form>

      {result && (
        <div className="mt-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 animate-in fade-in duration-200">
          {result.valid ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>OFFICIALLY VERIFIED CERTIFICATE</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                <p><span className="text-slate-500">Certificate No:</span> {result.certificateNumber}</p>
                <p><span className="text-slate-500">Trainee Email:</span> {result.trainee?.email}</p>
                <p><span className="text-slate-500">Course Title:</span> {result.course?.title}</p>
                <p><span className="text-slate-500">Trainer:</span> {result.trainer?.email}</p>
                <p><span className="text-slate-500">Issued On:</span> {new Date(result.issuedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>{result.message || 'Certificate verification failed.'}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
