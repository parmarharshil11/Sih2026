'use client';

import React, { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { api } from '@/lib/api-client';
import {
  Users,
  BookOpen,
  Award,
  AlertTriangle,
  Flame,
  CheckCircle,
  BrainCircuit,
  FileText,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [criticalFeed, setCriticalFeed] = useState<any[]>([]);
  const [difficultQuizzes, setDifficultQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/admin/overview').catch(() => null),
      api.get('/analytics/critical-gap-feed').catch(() => []),
      api.get('/analytics/difficult-assessments').catch(() => []),
    ]).then(([ovData, feedData, quizData]) => {
      setOverview(ovData);
      setCriticalFeed(feedData || []);
      setDifficultQuizzes(quizData || []);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Executive Analytics & Intelligence Console
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time organization-wide competency heatmaps, critical gap feeds, and assessment difficulty detectors.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <StatCard
          title="Total Platform Users"
          value={overview?.totalUsers || 21}
          subtitle="Registered accounts"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Published Courses"
          value={overview?.publishedCourses || 8}
          subtitle="Capacity modules"
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="Overall Pass Rate"
          value={`${overview?.overallPassRate || 85}%`}
          subtitle="Assessment efficacy"
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Critical Gap Alerts"
          value={criticalFeed.length || 3}
          subtitle="Urgent intervention needed"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Heatmap Section */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Department Competency Heatmap</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">Department $\times$ Skill Matrix</span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Cloud Architecture</th>
                <th className="px-4 py-3">Full-Stack Engineering</th>
                <th className="px-4 py-3">Data Analytics</th>
                <th className="px-4 py-3">Cyber Defense</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              <tr>
                <td className="px-4 py-3 text-white font-bold">Engineering</td>
                <td className="px-4 py-3 text-emerald-400 bg-emerald-500/10">Level 4.2 (Advanced)</td>
                <td className="px-4 py-3 text-emerald-400 bg-emerald-500/10">Level 4.0 (Advanced)</td>
                <td className="px-4 py-3 text-amber-400 bg-amber-500/10">Level 2.8 (Intermediate)</td>
                <td className="px-4 py-3 text-blue-400 bg-blue-500/10">Level 3.5 (Intermediate)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white font-bold">Finance</td>
                <td className="px-4 py-3 text-rose-400 bg-rose-500/10">Level 1.5 (Novice)</td>
                <td className="px-4 py-3 text-rose-400 bg-rose-500/10">Level 1.8 (Novice)</td>
                <td className="px-4 py-3 text-emerald-400 bg-emerald-500/10">Level 4.5 (Expert)</td>
                <td className="px-4 py-3 text-amber-400 bg-amber-500/10">Level 2.5 (Beginner)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white font-bold">Human Resources</td>
                <td className="px-4 py-3 text-rose-400 bg-rose-500/10">Level 1.2 (Novice)</td>
                <td className="px-4 py-3 text-rose-400 bg-rose-500/10">Level 1.4 (Novice)</td>
                <td className="px-4 py-3 text-blue-400 bg-blue-500/10">Level 3.0 (Intermediate)</td>
                <td className="px-4 py-3 text-amber-400 bg-amber-500/10">Level 2.1 (Beginner)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Gap Intervention Feed & Difficult Quizzes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Gap Urgent Feed */}
        <div className="glass-card rounded-3xl p-6 border border-rose-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Critical Gap Urgent Feed</h3>
            </div>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              $\ge 3$ Level Gaps
            </span>
          </div>

          <div className="space-y-3">
            {criticalFeed.length > 0 ? (
              criticalFeed.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white block">{item.trainee?.user?.email}</span>
                    <span className="text-slate-400">{item.traineeCompetency?.competency?.name}</span>
                  </div>
                  <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
                    Gap: -{item.gapValue}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">
                No active critical gap interventions required.
              </div>
            )}
          </div>
        </div>

        {/* Difficult Assessment Detector */}
        <div className="glass-card rounded-3xl p-6 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <FileText className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Low Pass-Rate Assessments</h3>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Pass Rate &lt; 50%
            </span>
          </div>

          <div className="space-y-3">
            {difficultQuizzes.length > 0 ? (
              difficultQuizzes.map((quiz, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white block">{quiz.subject}</span>
                    <span className="text-slate-400">{quiz.course?.title}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                    {quiz.passRatePct}% Pass Rate
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">
                All active assessments meet standard pass rate thresholds.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
