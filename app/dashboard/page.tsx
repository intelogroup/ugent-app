'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartPieIcon,
  DocumentTextIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getCompletedCurriculumBlocks,
  getQuizAttempts,
  QuizAttempt,
} from '@/lib/quizAttempts';

const systemFocus = [
  {
    name: 'Renal & Urinary Systems',
    detail: 'Nephritic vs nephrotic syndrome discriminators',
    progress: 82,
  },
  {
    name: 'Cardiovascular System',
    detail: 'Valvular lesions and murmur mechanics',
    progress: 64,
  },
  {
    name: 'Endocrine Physiology',
    detail: 'Thyroid axis, MEN syndromes and adrenal pathology',
    progress: 45,
  },
];

function buildPerformanceData(attempts: QuizAttempt[]) {
  return attempts.slice(-7).map((attempt) => ({
    date: new Date(attempt.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
    score: attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0,
  }));
}

export default function Home() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [blocksCompleted, setBlocksCompleted] = useState(0);

  useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (active) setBlocksCompleted(getCompletedCurriculumBlocks().length);
    });

    getQuizAttempts().then((nextAttempts) => {
      if (active) setAttempts(nextAttempts);
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.correct, 0);
  const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const performanceData = buildPerformanceData(attempts);
  const curriculumProgress = Math.min(Math.round((blocksCompleted / 57) * 100), 100);

  const metrics = [
    { label: 'Average accuracy', value: `${avgScore}%`, detail: 'Across all completed tests' },
    { label: 'Tests completed', value: attempts.length.toString(), detail: 'Practice sessions' },
    { label: 'Questions solved', value: totalQuestions.toLocaleString(), detail: 'Total question volume' },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1280px] space-y-6">
        <header>
          <h1 className="text-2xl! font-bold text-neutral-900">Good morning</h1>
          <p className="mt-1 text-sm text-neutral-500">Here is your study progress at a glance.</p>
        </header>

        <section aria-label="Study actions" className="grid gap-3 md:grid-cols-[1.35fr_1fr_1fr]">
          <Link
            href="/create-test"
            className="group flex min-h-20 items-center gap-4 rounded-xl bg-[#0E7490] px-5 py-4 text-white transition-colors hover:bg-[#155E75]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/14">
              <Squares2X2Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Start new test</span>
              <span className="mt-0.5 block text-xs text-cyan-50/80">Build a focused practice block</span>
            </span>
          </Link>

          <Link
            href="/strategy"
            className="group flex min-h-20 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-4 transition-colors hover:border-cyan-700/30 hover:bg-cyan-50/40"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-50 text-[#0E7490]">
              <DocumentTextIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900">AI Clues</span>
              <span className="mt-0.5 block text-xs text-neutral-400">Discriminator drills</span>
            </span>
          </Link>

          <Link
            href="/curriculum"
            className="group flex min-h-20 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-4 transition-colors hover:border-cyan-700/30 hover:bg-cyan-50/40"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-50 text-[#0E7490]">
              <ChartPieIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900">Curriculum</span>
              <span className="mt-0.5 block text-xs text-neutral-400">View your schedule</span>
            </span>
          </Link>
        </section>

        <section aria-labelledby="progress-heading">
          <div className="mb-3">
            <h2 id="progress-heading" className="text-base! font-semibold text-neutral-900">Your progress</h2>
            <p className="mt-0.5 text-xs text-neutral-400">Lifetime activity across tests and curriculum</p>
          </div>

          <div className="grid overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 gap-px sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-white px-5 py-4">
                <p className="text-xs font-medium text-neutral-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">{metric.value}</p>
                <p className="mt-1 text-[11px] text-neutral-400">{metric.detail}</p>
              </div>
            ))}

            <div className="bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-neutral-500">Curriculum blocks</p>
                <span className="text-[11px] font-medium text-neutral-400">{curriculumProgress}%</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-neutral-900">{blocksCompleted}<span className="ml-1 text-sm font-medium text-neutral-400">/ 57</span></p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-[#0E7490]" style={{ width: `${curriculumProgress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Study insights" className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base! font-semibold text-neutral-900">Performance trend</h2>
                <p className="mt-0.5 text-xs text-neutral-400">Accuracy across your seven most recent tests</p>
              </div>
              {performanceData.length > 0 && (
                <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">
                  <span className="h-2 w-2 rounded-full bg-[#0E7490]" />
                  Accuracy
                </div>
              )}
            </div>

            {performanceData.length === 0 ? (
              <div className="flex h-[220px] flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-neutral-700">Your performance trend will appear here</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">Complete a practice block to establish your first accuracy benchmark.</p>
                <Link href="/create-test" className="mt-4 rounded-lg bg-[#0E7490] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155E75]">
                  Create practice block
                </Link>
              </div>
            ) : (
              <div className="mt-4 h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0E7490" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#0E7490" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                    <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#0E7490" strokeWidth={2.25} fill="url(#scoreGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div>
              <h2 className="text-base! font-semibold text-neutral-900">Current focus</h2>
              <p className="mt-0.5 text-xs text-neutral-400">USMLE Step 1 systems</p>
            </div>

            <div className="mt-3 divide-y divide-neutral-100">
              {systemFocus.map((system) => (
                <div key={system.name} className="py-3.5 first:pt-2 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className="truncate text-sm font-medium text-neutral-800">{system.name}</p>
                    <span className="shrink-0 text-xs font-medium text-neutral-400">{system.progress}%</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-neutral-400">{system.detail}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-[#0E7490]" style={{ width: `${system.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
