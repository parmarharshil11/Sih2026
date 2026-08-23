'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Award, QrCode, ExternalLink, Calendar, BookOpen } from 'lucide-react';

export default function CertificateVaultPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/certificates/me')
      .then((res) => setCertificates(res || []))
      .catch(() => setCertificates([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Verifiable Certificate Vault
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Your officially issued capacity building accomplishments backed by cryptographic verification tokens.
        </p>
      </div>

      {isLoading ? (
        <div className="glass-card p-12 rounded-3xl text-center text-slate-400">
          Loading certificate vault...
        </div>
      ) : certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="glass-card glass-card-hover rounded-3xl p-6 border border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {cert.certificateNumber}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white leading-snug">{cert.course?.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Trainer: {cert.trainer?.user?.email}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/certificates/verify/${cert.verificationToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Public Verification Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-12 text-center text-slate-400">
          No certificates issued yet. Complete a course and pass its final assessment to earn your certificate!
        </div>
      )}
    </div>
  );
}
