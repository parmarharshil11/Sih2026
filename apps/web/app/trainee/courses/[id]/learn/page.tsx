'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { CheckCircle, Play, FileText, ArrowLeft, Award, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [course, setCourse] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api
        .get(`/courses/${id}`)
        .then((res) => {
          setCourse(res);
          if (res.modules && res.modules.length > 0) {
            setActiveModule(res.modules[0]);
          }
        })
        .catch(() => toast.error('Failed to load course player'))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleMarkComplete = async (moduleId: string) => {
    try {
      // Find active enrollment ID
      const enrollments = await api.get('/courses/enrollments/me');
      const enr = enrollments.find((e: any) => e.courseId === id);

      if (enr) {
        await api.patch(`/courses/enrollments/${enr.id}/progress`, {
          moduleId,
          progressPct: 100,
        });
        toast.success('Module marked as completed!');
      }
    } catch (err: any) {
      toast.error('Failed to update module progress');
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center text-slate-400">
        Loading interactive player...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link
        href="/trainee"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Viewer */}
        <div className="flex-1 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-2">
              {activeModule ? activeModule.title : course?.title}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Capacity Building Module Player & Resource Desk
            </p>

            <div className="aspect-video w-full rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-8 text-center relative overflow-hidden">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <h4 className="text-base font-bold text-white">Interactive Video Lecture Stream</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {activeModule ? activeModule.title : 'Module streaming ready.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => activeModule && handleMarkComplete(activeModule.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-600/30 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Mark Module Complete
              </button>

              {course?.assessments?.length > 0 && (
                <Link
                  href={`/trainee/assessments/${course.assessments[0].id}/take`}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" /> Take Module Assessment
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Module List */}
        <div className="w-full lg:w-80 glass-card rounded-3xl p-5 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
            Course Modules ({course?.modules?.length || 0})
          </h3>

          <div className="space-y-2">
            {course?.modules?.map((mod: any, idx: number) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between ${
                  activeModule?.id === mod.id
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-1">{mod.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
