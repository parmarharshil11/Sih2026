'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/StatCard';
import { api } from '@/lib/api-client';
import { BookOpen, Users, PlusCircle, Sparkles, FileText, CheckCircle } from 'lucide-react';

export default function TrainerDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/courses?limit=10').catch(() => ({ data: [] })),
      api.get('/trainer/profile').catch(() => null),
    ])
      .then(([coursesRes, profileRes]) => {
        setCourses(coursesRes.data || []);
        setProfile(profileRes);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Trainer Studio Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Author courses, upload learning resources, build MCQ question banks, and monitor student metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/trainer/courses/new"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Build Course
          </Link>
          <Link
            href="/trainer/assessments/new"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Author Assessment
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Authored Courses"
          value={courses.length}
          subtitle="Capacity modules"
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="Active Students"
          value={courses.reduce((acc, course) => acc + (course._count?.enrollments || 0), 0)}
          subtitle="Enrolled trainees"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Average Rating"
          value={profile?.trainerRatingAvg ? `${profile.trainerRatingAvg.toFixed(1)} / 5.0` : 'N/A'}
          subtitle="Trainee satisfaction"
          icon={Sparkles}
          color="amber"
        />
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Authored Course Modules</h2>
        {isLoading ? (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400">
            Loading course portfolio...
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {course.status}
                    </span>
                    <span className="text-xs text-slate-400">{course.category?.name}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{course.title}</h4>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">{course._count?.modules || 2} Modules</span>
                  <span className="text-xs font-semibold text-emerald-400">{course._count?.enrollments || 12} Enrolled</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
