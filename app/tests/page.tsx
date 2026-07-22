'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { getQuizAttempts, QuizAttempt } from '@/lib/quizAttempts';

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  return mins < 1 ? '<1 min' : `${mins} min`;
}

export default function Tests() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    getQuizAttempts().then((a) => setAttempts([...a].reverse()));
  }, []);

  const avgScore =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.correct / a.total, 0) / attempts.length) * 100)
      : 0;

  return (
    <DashboardLayout>
      <div className="workspace-page">
        <header className="workspace-header">
          <div>
            <p className="workspace-eyebrow">Performance</p>
            <h1 className="workspace-title">My tests</h1>
            <p className="workspace-subtitle">A clean record of completed question sets and scores.</p>
          </div>
          <Link href="/create-test" className="btn-primary whitespace-nowrap">
            New test
          </Link>
        </header>

        <section className="glass-panel mb-5 grid grid-cols-3 overflow-hidden rounded-[22px]">
          <div className="px-3 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Completed</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{attempts.length}</p>
          </div>
          <div className="border-l border-white/80 px-3 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Average</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#0E7490]">{avgScore}%</p>
          </div>
          <div className="border-l border-white/80 px-3 py-4 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Questions answered</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{attempts.reduce((sum, attempt) => sum + attempt.total, 0)}</p>
          </div>
        </section>

        <section className="glass-panel overflow-hidden rounded-[22px]">
          <div className="flex items-center justify-between border-b border-white/80 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-neutral-900">Recent tests</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Newest attempts first</p>
            </div>
            {attempts.length > 0 && <span className="text-xs font-semibold text-neutral-400">{attempts.length} total</span>}
          </div>
          {attempts.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm font-semibold text-neutral-800">No completed tests yet</p>
              <p className="mx-auto mb-5 mt-1 max-w-sm text-xs leading-5 text-neutral-500">Your score history will appear here after your first question set.</p>
              <Link href="/create-test" className="btn-primary inline-flex">Build your first test</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/80">
              {attempts.map((test) => {
                const score = test.total > 0 ? Math.round((test.correct / test.total) * 100) : 0;
                return (
                  <div
                    key={test.timestamp}
                    className="group grid gap-3 px-5 py-4 transition-colors hover:bg-white/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-neutral-900">{test.subject || test.system || 'Mixed'} test</h3>
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Complete</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {new Date(test.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="mx-2 text-neutral-300">/</span>{test.total} questions
                        <span className="mx-2 text-neutral-300">/</span>{formatDuration(test.timeSpentSeconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200/70">
                        <div className="h-full rounded-full bg-[#0E7490]" style={{ width: `${score}%` }} />
                      </div>
                      <p className="w-12 text-right text-xl font-bold tracking-tight text-neutral-900">{score}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
