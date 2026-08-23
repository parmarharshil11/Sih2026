'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Navbar } from '@/components/Navbar';
import { ShieldCheck, AlertTriangle, Calendar, User, BookOpen, Award, CheckCircle } from 'lucide-react';

export default function CertificateVerifyPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .get(`/certificates/verify/${token}`)
        .then((res) => setData(res))
        .catch(() => setData({ valid: false, message: 'Invalid verification link' }))
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 w-full">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-300">
              Verifying Certificate Authenticity...
            </span>
          </div>
        ) : data && data.valid ? (
          <div className="glass-card rounded-3xl p-8 sm:p-12 border border-emerald-500/30 w-full shadow-2xl shadow-emerald-500/10 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest border border-emerald-500/20 mb-3">
              Official Verifiable Digital Certificate
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Certificate of Capacity Accomplishment
            </h1>
            <p className="text-xs font-mono text-slate-400 mb-8">
              Serial No: <span className="text-emerald-400 font-bold">{data.certificateNumber}</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-3 sm:space-y-0">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">
                    Recipient Trainee
                  </span>
                  <span className="text-sm font-bold text-white">{data.trainee?.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-purple-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">
                    Certified Skill Course
                  </span>
                  <span className="text-sm font-bold text-white">{data.course?.title}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 sm:pt-0 sm:border-t-0 border-t border-slate-800">
                <Award className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">
                    Instructing Trainer
                  </span>
                  <span className="text-sm font-bold text-white">{data.trainer?.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 sm:pt-0 sm:border-t-0 border-t border-slate-800">
                <Calendar className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">
                    Official Issue Date
                  </span>
                  <span className="text-sm font-bold text-white">
                    {new Date(data.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle className="w-4 h-4" /> Cryptographically verified on the Capacity Connect Ledger
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-10 border border-rose-500/30 w-full text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Certificate Verification Failed</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {data?.message || 'The requested certificate verification token is invalid or does not exist.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
