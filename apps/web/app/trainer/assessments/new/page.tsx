'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { FileText, PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AssessmentAuthoringPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('post_test');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [passScorePct, setPassScorePct] = useState(70);

  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('single_mcq');
  const [difficulty, setDifficulty] = useState('beginner');
  const [points, setPoints] = useState(1);

  const [options, setOptions] = useState([
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/courses?limit=50').then((res) => {
      const list = res?.data || res || [];
      setCourses(list);
      if (list.length > 0) setCourseId(list[0].id);
    }).catch(() => {});
  }, []);

  const handleAddOption = () => {
    setOptions([...options, { optionText: '', isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].optionText = text;
    setOptions(updated);
  };

  const handleCorrectToggle = (index: number) => {
    const updated = options.map((opt, idx) => ({
      ...opt,
      isCorrect: questionType === 'single_mcq' || questionType === 'true_false' ? idx === index : idx === index ? !opt.isCorrect : opt.isCorrect,
    }));
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Create Assessment
      const assessment = await api.post('/assessments', {
        courseId: courseId || undefined,
        subject,
        type,
        timeLimitMinutes: Number(timeLimitMinutes),
        passScorePct: Number(passScorePct),
      });

      // 2. Add Initial Question
      await api.post(`/assessments/${assessment.id}/questions`, {
        questionType,
        questionText,
        difficulty,
        points: Number(points),
        options,
      });

      toast.success('Assessment and Question Bank created successfully!');
      router.push('/trainer');
    } catch (err: any) {
      toast.error(err.message || 'Failed to author assessment');
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

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          MCQ Question Bank Authoring
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create server-graded pre/post test assessments and configure options with secure answer key validation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 border border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
          1. Assessment Metadata
        </h3>

        {courses.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              Linked Course (Optional)
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- No specific course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              Subject Title
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Microservices Architecture Final Test"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              Assessment Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="pre_test">Pre-Test (Baseline)</option>
              <option value="post_test">Post-Test (Evaluation)</option>
              <option value="module_quiz">Module Quiz</option>
              <option value="final">Final Exam</option>
            </select>
          </div>
        </div>

        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 pt-4">
          2. Question Bank Entry
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
            Question Prompt
          </label>
          <input
            type="text"
            required
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="e.g. Which protocol is used for synchronous microservices gRPC communication?"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Options Builder */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Options (Toggle Checkbox for Correct Answer)
          </label>

          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={opt.isCorrect}
                onChange={() => handleCorrectToggle(idx)}
                className="w-5 h-5 rounded accent-blue-600 bg-slate-900 border-slate-700 cursor-pointer"
                title="Mark as correct answer"
              />
              <input
                type="text"
                required
                value={opt.optionText}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1} text...`}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-blue-500"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddOption}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 pt-1 block"
          >
            + Add Option Choice
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-6"
        >
          <FileText className="w-5 h-5" />
          {isSubmitting ? 'Saving Assessment...' : 'Save Assessment & Publish Question'}
        </button>
      </form>
    </div>
  );
}
