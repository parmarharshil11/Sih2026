'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, Award, HelpCircle } from 'lucide-react';

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [attemptData, setAttemptData] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (assessmentId) {
      api
        .post(`/assessments/${assessmentId}/start`)
        .then((res) => {
          setAttemptData(res);
        })
        .catch((err) => {
          toast.error(err.message || 'Failed to start assessment attempt');
        })
        .finally(() => setIsLoading(false));
    }
  }, [assessmentId]);

  const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMulti) {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((o) => o !== optionId)
            : [...current, optionId],
        };
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!attemptData) return;
    setIsSubmitting(true);

    const answersPayload = Object.entries(selectedAnswers).map(([qId, optIds]) => ({
      questionId: qId,
      selectedOptionIds: optIds,
    }));

    try {
      const res = await api.post(
        `/assessments/${assessmentId}/attempts/${attemptData.attemptId}/submit`,
        { answers: answersPayload }
      );
      setResult(res);
      toast.success('Assessment submitted and graded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center text-slate-400">
        Initializing assessment questions...
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
        <div
          className={`glass-card rounded-3xl p-8 border text-center ${
            result.passed ? 'border-emerald-500/30' : 'border-rose-500/30'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
              result.passed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {result.passed ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${
              result.passed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {result.passed ? 'PASSED ASSESSMENT' : 'FAILED - RETAKE REQUIRED'}
          </span>

          <h2 className="text-3xl font-extrabold text-white mb-2">Final Score: {result.scorePct}%</h2>
          <p className="text-xs text-slate-400 mb-6">
            Earned {result.earnedPoints} out of {result.totalPoints} points (Pass Mark: {result.passScorePct}%)
          </p>

          <button
            onClick={() => router.push('/trainee')}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!attemptData || !attemptData.questions || attemptData.questions.length === 0) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center text-slate-400">
        No questions available for this assessment.
      </div>
    );
  }

  const currentQ = attemptData.questions[currentIdx];
  const isMulti = currentQ.questionType === 'multi_mcq';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Assessment Header */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          <span>
            Question {currentIdx + 1} of {attemptData.totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{attemptData.timeLimitMinutes ?? 30} mins remaining</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            {currentQ.questionType.replace('_', ' ')}
          </span>
          <span className="text-xs font-semibold text-slate-400">{currentQ.points} Points</span>
        </div>

        <h3 className="text-xl font-bold text-white leading-snug">{currentQ.questionText}</h3>

        <div className="space-y-3 pt-2">
          {currentQ.options?.map((opt: any) => {
            const isSelected = selectedAnswers[currentQ.id]?.includes(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(currentQ.id, opt.id, isMulti)}
                className={`w-full text-left p-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>{opt.optionText}</span>
                {isSelected && <CheckCircle className="w-4 h-4 text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-all"
        >
          Previous Question
        </button>

        {currentIdx === attemptData.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
          >
            {isSubmitting ? 'Grading Answers...' : 'Submit Final Attempt'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx((i) => Math.min(attemptData.questions.length - 1, i + 1))}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
