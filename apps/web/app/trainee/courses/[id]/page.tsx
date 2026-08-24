'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Clock, BarChart, User, CheckCircle, BookOpen, Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [course, setCourse] = useState<any>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api
        .get(`/courses/${id}`)
        .then((res) => setCourse(res))
        .catch(() => toast.error('Failed to load course details'))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      await api.post('/courses/enrollments', { courseId: id });
      toast.success('Successfully enrolled in course!');
      router.push(`/trainee/courses/${id}/learn`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Enrollment failed');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center text-slate-400">
        Loading syllabus details...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center text-slate-400">
        Course not found.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <Link
        href="/trainee/courses"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Link>

      <div className="glass-card rounded-3xl p-8 border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
            {course.category?.name || 'Technology'}
          </span>
          <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/20">
            {course.difficulty}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
          {course.title}
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{course.description}</p>

        <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-800 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Duration: {Math.round(course.durationMinutes / 60)} Hours</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            <span>Trainer: {course.trainer?.user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Modules: {course.modules?.length || 0} Modules</span>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="px-8 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-sm"
          >
            <BookOpen className="w-4 h-4" />
            {isEnrolling ? 'Enrolling...' : 'Enroll in Course Now'}
          </button>
        </div>
      </div>

      {/* Modules Syllabus */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Course Syllabus & Curriculum</h2>
        <div className="space-y-3">
          {course.modules?.map((mod: any, idx: number) => (
            <div
              key={mod.id}
              className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">{mod.title}</h4>
                  <span className="text-xs text-slate-400">{mod.resources?.length || 0} Learning Resources</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500">Module {mod.sequenceOrder}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
