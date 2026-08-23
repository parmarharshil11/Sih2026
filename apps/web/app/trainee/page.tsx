'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/StatCard';
import { CourseCard } from '@/components/CourseCard';
import { api } from '@/lib/api-client';
import { BookOpen, Award, TrendingUp, Users, ArrowRight, BrainCircuit, Sparkles } from 'lucide-react';

export default function TraineeDashboard() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/courses/me/enrollments').catch(() => []),
      api.get('/courses?limit=3').catch(() => ({ data: [] })),
    ]).then(([enrData, courseData]) => {
      setEnrollments(enrData || []);
      setCourses(courseData.data || []);
      setIsLoading(false);
    });
  }, []);

  const completedCount = enrollments.filter((e) => e.status === 'completed').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Trainee Learning Workspace
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor your skill gaps, active course progress, and certified accomplishments.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Active Enrollments"
          value={enrollments.length}
          subtitle="Courses in progress"
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Earned Certificates"
          value={completedCount}
          subtitle="Verifiable credentials"
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Competency Level"
          value="Level 3.5"
          subtitle="Average proficiency"
          icon={TrendingUp}
          color="purple"
          trend="+1.2 Improvement"
        />
      </div>

      {/* Skill Gap Analysis & AI AI Assistance Banner */}
      <div className="glass-card rounded-3xl p-6 border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
            <BrainCircuit className="w-4 h-4" /> Skill Gap Target
          </div>
          <h3 className="text-xl font-bold text-white">Cloud Architecture & Cyber Defense</h3>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Your current baseline is Level 2 (Novice). Completing recommended courses will bridge your gap to Level 4 (Advanced).
          </p>
        </div>
        <Link
          href="/trainee/courses"
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap"
        >
          View Recommendations <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Active Enrollments Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">My Active Courses</h2>
          <Link href="/trainee/courses" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
            View All Catalog →
          </Link>
        </div>

        {isLoading ? (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-sm">
            Loading course workspace...
          </div>
        ) : enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {enrollments.map((enr) => (
              <CourseCard
                key={enr.id}
                id={enr.course.id}
                title={enr.course.title}
                category={enr.course.category?.name || 'Technology'}
                difficulty={enr.course.difficulty || 'beginner'}
                durationMinutes={enr.course.durationMinutes || 120}
                enrolled={true}
                status={enr.status}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-sm">
            You are not enrolled in any courses yet.{' '}
            <Link href="/trainee/courses" className="text-blue-400 underline font-semibold">
              Browse Course Catalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
