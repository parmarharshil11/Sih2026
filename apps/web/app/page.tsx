'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Industrial Capacity Building & LMS Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-[1.1] mb-6">
          Automate Competency Growth with{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            AI-Driven Learning
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mb-10 leading-relaxed font-normal">
          Bridge workforce skill gaps automatically. Match trainees with expert trainers, author
          interactive assessments, and issue cryptographically verifiable QR certificates.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
          >
            Launch Platform Portal <ArrowRight className="w-5 h-5" />
          </button>
          <Link
            href="/trainee/courses"
            className="px-8 py-4 rounded-2xl font-semibold bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 text-base"
          >
            Explore Catalog
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-24 w-full text-left">
          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800">
            <div className="p-3 w-fit rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Competency Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated skill gap matrix computation comparing target vs actual proficiency levels.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800">
            <div className="p-3 w-fit rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Matching</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Algorithmic trainer-to-trainee pairing based on skill gaps, expertise, and schedule.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800">
            <div className="p-3 w-fit rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pre/Post Test Efficacy</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Server-graded MCQ assessments measuring exact learning score delta improvements.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800">
            <div className="p-3 w-fit rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Verifiable QR Certs</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cryptographically signed digital credentials verifiable without authentication.
            </p>
          </div>
        </div>

        {/* Live Interactive Preview */}
        <div className="mt-24 w-full glass-card rounded-3xl p-8 border border-slate-800 text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 mb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Live Interactive Intelligence
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">Enterprise Analytics Matrix</h2>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 transition-all"
            >
              Access Full Console
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase">Skill Gap Priority Distribution</span>
              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-rose-400">Critical Gap ($\ge 3$ levels)</span>
                    <span className="text-slate-300">18%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-[18%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-400">High Priority (2 levels)</span>
                    <span className="text-slate-300">42%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[42%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-emerald-400">On Track / Mastered</span>
                    <span className="text-slate-300">40%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[40%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase">Top Matched Competency Units</span>
              <ul className="space-y-2.5 mt-4 text-xs font-medium">
                <li className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                  <span className="text-slate-200">Cloud Microservices Architecture</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">94.5% Match</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                  <span className="text-slate-200">Financial Risk Predictive Analytics</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">91.2% Match</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                  <span className="text-slate-200">Enterprise Cyber Defense Auditing</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">88.7% Match</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Verification Engine</span>
                <p className="text-xs text-slate-300 mt-2">
                  Validate any issued certificate using its public cryptographic verification token.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-emerald-400 flex items-center justify-between">
                <span>CC-20260823-0001</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 Capacity Connect Platform. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/" className="hover:text-slate-300">Terms of Service</Link>
            <Link href="/" className="hover:text-slate-300">Security Architecture</Link>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
