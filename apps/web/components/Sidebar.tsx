'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Users,
  ShieldCheck,
  CheckCircle,
  FileText,
  PlusCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  role: 'trainee' | 'trainer' | 'admin';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const links = {
    trainee: [
      { href: '/trainee', label: 'My Dashboard', icon: LayoutDashboard },
      { href: '/trainee/courses', label: 'Course Catalog', icon: BookOpen },
      { href: '/trainee/certificates', label: 'Certificate Vault', icon: Award },
    ],
    trainer: [
      { href: '/trainer', label: 'Trainer Studio', icon: LayoutDashboard },
      { href: '/trainer/courses/new', label: 'Course Builder', icon: PlusCircle },
      { href: '/trainer/assessments/new', label: 'MCQ Authoring', icon: FileText },
    ],
    admin: [
      { href: '/admin/dashboard', label: 'Executive Analytics', icon: LayoutDashboard },
      { href: '/admin/users', label: 'User & Verification', icon: Users },
      { href: '/admin/courses', label: 'Course Moderation', icon: CheckCircle },
      { href: '/admin/audit-logs', label: 'Audit Log Stream', icon: ShieldCheck },
    ],
  };

  const activeLinks = links[role];

  return (
    <aside className="w-64 glass-card border-r border-slate-800 flex flex-col p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="px-3 py-2 mb-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <span className="text-[11px] uppercase font-bold tracking-wider text-blue-400 block">
          {role} portal
        </span>
        <span className="text-xs text-slate-300 font-medium">Capacity Connect Workspace</span>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {activeLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {role === 'trainer' && (
        <div className="p-3 rounded-xl bg-gradient-to-tr from-purple-900/30 to-indigo-900/30 border border-purple-500/20 mt-auto">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold mb-1">
            <Sparkles className="w-4 h-4 text-purple-400" /> AI Assistant Ready
          </div>
          <p className="text-[11px] text-slate-400">
            Generate course outlines & assessment drafts instantly with AI.
          </p>
        </div>
      )}
    </aside>
  );
}
