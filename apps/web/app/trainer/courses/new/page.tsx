'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Sparkles, BookOpen, PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CourseBuilderPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  useEffect(() => {
    api.get('/courses/categories')
      .then((res) => {
        const list = res?.data || res || [];
        setCategories(list);
        if (list.length > 0) setCategoryId(list[0].id);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        toast.error('Failed to load categories');
      });
  }, []);

  const handleAiDraft = async () => {
    if (!title.trim()) {
      toast.error('Please enter a course topic/title first for AI generation');
      return;
    }
    setIsAiDrafting(true);
    try {
      const res = await api.post('/ai/draft-course-outline', {
        topic: title,
        targetAudience: 'Enterprise Software Engineers',
        difficulty,
      });
      toast.success('AI successfully drafted course outline in DRAFT status!');
      if (res.course) {
        setDescription(res.course.description || '');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI Drafting failed');
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/courses', {
        title,
        description,
        categoryId,
        difficulty,
        durationMinutes: Number(durationMinutes),
      });
      toast.success('Course created in DRAFT status! Submitted for moderation.');
      router.push('/trainer');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <Link
        href="/trainer"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Trainer Studio
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Author New Course Module
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build structured capacity modules and submit for administrative review.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAiDraft}
          disabled={isAiDrafting}
          className="px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-600/30 transition-all flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          {isAiDrafting ? 'AI Drafting...' : 'AI One-Click Outline'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 border border-slate-800 space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
            Course Title / Topic
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cloud-Native Microservices Architecture with NestJS"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              Category Domain
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              Target Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              Duration (Minutes)
            </label>
            <input
              type="number"
              required
              min={30}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
            Course Description & Learning Outcomes
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed overview of syllabus modules, skills covered, and industrial takeaways..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          {isSubmitting ? 'Saving Course Draft...' : 'Create Course Module (Save Draft)'}
        </button>
      </form>
    </div>
  );
}
