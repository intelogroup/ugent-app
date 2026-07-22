'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getQuizAttempts, QuizAttempt } from '@/lib/quizAttempts';

function buildTrend(attempts: QuizAttempt[]) {
  return attempts.map((attempt, index) => ({
    label: `T${index + 1}`,
    score: attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0,
  }));
}

function buildSubjectBreakdown(attempts: QuizAttempt[]) {
  const bySubject = new Map<string, { correct: number; total: number; tests: number }>();
  for (const attempt of attempts) {
    const key = attempt.subject || attempt.system || 'Mixed';
    const entry = bySubject.get(key) || { correct: 0, total: 0, tests: 0 };
    entry.correct += attempt.correct;
    entry.total += attempt.total;
    entry.tests += 1;
    bySubject.set(key, entry);
  }

  return Array.from(bySubject.entries())
    .map(([topic, values]) => ({
      topic,
      tests: values.tests,
      total: values.total,
      accuracy: values.total > 0 ? Math.round((values.correct / values.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export default function Analytics() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    getQuizAttempts().then(setAttempts);
  }, []);

  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.correct, 0);
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const totalTimeMinutes = Math.round(attempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0) / 60);
  const trend = buildTrend(attempts);
  const subjectBreakdown = buildSubjectBreakdown(attempts);

  return (
    <DashboardLayout>
      <div className="workspace-page">
        <header className="workspace-header">
          <div>
            <p className="workspace-eyebrow">Performance</p>
            <h1 className="workspace-title">Analytics</h1>
            <p className="workspace-subtitle">Only the signals that help you choose what to study next.</p>
          </div>
          <Link href="/create-test" className="btn-primary whitespace-nowrap">New test</Link>
        </header>

        <section className="glass-panel mb-5 grid grid-cols-3 overflow-hidden rounded-[22px]">
          <div className="px-3 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Questions</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{totalQuestions.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-neutral-500">across {attempts.length} {attempts.length === 1 ? 'test' : 'tests'}</p>
          </div>
          <div className="border-l border-white/80 px-3 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Accuracy</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#0E7490]">{averageScore}%</p>
            <p className="mt-0.5 text-xs text-neutral-500">{totalCorrect.toLocaleString()} correct</p>
          </div>
          <div className="border-l border-white/80 px-3 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Study time</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{totalTimeMinutes}<span className="ml-1 text-sm font-semibold text-neutral-400">min</span></p>
            <p className="mt-0.5 text-xs text-neutral-500">recorded in tests</p>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <section className="glass-panel rounded-[22px] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-neutral-900">Score trend</h2>
                <p className="mt-0.5 text-xs text-neutral-500">Accuracy across completed tests</p>
              </div>
              {trend.length > 1 && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${trend[trend.length - 1].score >= trend[0].score ? 'bg-emerald-50/80 text-emerald-700' : 'bg-amber-50/80 text-amber-700'}`}>
                  {trend[trend.length - 1].score - trend[0].score >= 0 ? '+' : ''}{trend[trend.length - 1].score - trend[0].score} pts
                </span>
              )}
            </div>

            {trend.length === 0 ? (
              <div className="glass-quiet flex h-64 flex-col items-center justify-center rounded-2xl px-5 text-center">
                <p className="text-sm font-semibold text-neutral-800">Your trend starts with one test</p>
                <p className="mb-5 mt-1 max-w-sm text-xs leading-5 text-neutral-500">Complete a question set to create your baseline.</p>
                <Link href="/create-test" className="btn-secondary">Build a test</Link>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.8)', background: 'rgba(255,255,255,.88)', boxShadow: '0 12px 30px rgba(15,23,42,.10)', fontSize: 12 }} formatter={(value) => [`${value}%`, 'Score']} />
                    <Line type="monotone" dataKey="score" stroke="#0E7490" strokeWidth={2.5} dot={{ r: 3, fill: '#0E7490', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#0E7490', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="glass-panel overflow-hidden rounded-[22px]">
            <div className="border-b border-white/80 px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight text-neutral-900">Coverage</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Accuracy by selected focus</p>
            </div>
            {subjectBreakdown.length === 0 ? (
              <div className="px-5 py-16 text-center text-xs leading-5 text-neutral-500">Subject-level results will appear after your first test.</div>
            ) : (
              <div className="divide-y divide-white/80">
                {subjectBreakdown.map((item) => (
                  <div key={item.topic} className="px-5 py-3.5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-neutral-800">{item.topic}</p>
                        <p className="mt-0.5 text-[11px] text-neutral-400">{item.total} questions · {item.tests} {item.tests === 1 ? 'test' : 'tests'}</p>
                      </div>
                      <span className="text-sm font-bold text-neutral-900">{item.accuracy}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/70">
                      <div className="h-full rounded-full bg-[#0E7490]" style={{ width: `${item.accuracy}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
