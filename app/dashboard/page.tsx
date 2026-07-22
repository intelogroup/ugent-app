'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getQuizAttempts, getCompletedCurriculumBlocks, QuizAttempt } from '@/lib/quizAttempts';
import Avatar from '@/components/Avatar';
import {
  ChevronDownIcon,
  ChartPieIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  FaceSmileIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

const CHART_COLORS = ['var(--color-primary-600)', 'var(--color-neutral-700)', 'var(--color-neutral-500)', 'var(--color-neutral-300)'];

function buildPerformanceData(attempts: QuizAttempt[]) {
  return attempts.slice(-7).map((a) => ({
    date: new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
    score: a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
  }));
}

function buildSubjectBreakdown(attempts: QuizAttempt[]) {
  const bySubject = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const key = a.subject || a.system || 'Mixed';
    const entry = bySubject.get(key) || { correct: 0, total: 0 };
    entry.correct += a.correct;
    entry.total += a.total;
    bySubject.set(key, entry);
  }
  return Array.from(bySubject.entries()).map(([name, { correct, total }], i) => ({
    name,
    value: total > 0 ? Math.round((correct / total) * 100) : 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

export default function Home() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [blocksCompleted, setBlocksCompleted] = useState(0);

  useEffect(() => {
    getQuizAttempts().then(setAttempts);
    setBlocksCompleted(getCompletedCurriculumBlocks().length);
  }, []);

  const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
  const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const performanceData = buildPerformanceData(attempts);
  const subjectPerformance = buildSubjectBreakdown(attempts);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Good morning!</h1>
            <p className="text-sm text-neutral-500 mt-1">A brief presentation of essential study metrics and progress</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analytics" className="btn-secondary flex items-center gap-2">
              <ChartPieIcon className="w-4 h-4 text-neutral-500" />
              <span>Full Analytics</span>
            </Link>
            <Link href="/create-test" className="btn-primary flex items-center gap-2">
              <PlusCircleIcon className="w-4 h-4 text-white" />
              <span>Start Test</span>
            </Link>
          </div>
        </div>

        {/* Quick Action Banner Cards (Survey Overview Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/create-test"
            className="card p-5 hover:border-[#0E7490]/40 transition-all flex items-center justify-between group bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0E7490] text-white flex items-center justify-center shadow-md shadow-[#0E7490]/20">
                <Squares2X2Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-[#0E7490] transition-colors">
                  Start new test
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Explore question bank</p>
              </div>
            </div>
            <span className="text-neutral-400 group-hover:text-[#0E7490] transition-colors text-sm font-semibold">→</span>
          </Link>

          <Link
            href="/strategy"
            className="card p-5 hover:border-amber-400/50 transition-all flex items-center justify-between group bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <DocumentTextIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors">
                  Start with AI Clues
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Discriminator drill mode</p>
              </div>
            </div>
            <span className="text-neutral-400 group-hover:text-amber-600 transition-colors text-sm font-semibold">→</span>
          </Link>

          <Link
            href="/curriculum"
            className="card p-5 hover:border-emerald-400/50 transition-all flex items-center justify-between group bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <ChartPieIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-emerald-600 transition-colors">
                  Curriculum Plan
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Data-driven schedule</p>
              </div>
            </div>
            <span className="text-neutral-400 group-hover:text-emerald-600 transition-colors text-sm font-semibold">→</span>
          </Link>
        </div>

        {/* Statistics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Statistics</h2>
              <p className="text-xs text-neutral-400">Track, analyze, and publish your study metrics</p>
            </div>
            <Link href="/analytics" className="text-xs font-semibold text-[#0E7490] hover:underline">
              View analytics →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card 1 */}
            <div className="stat-card space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium text-neutral-500">Average Accuracy</span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  +2.5%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-neutral-900">{avgScore}%</span>
                <svg className="w-16 h-7 text-emerald-500" viewBox="0 0 60 25" fill="none">
                  <path d="M2 20 Q 15 18, 30 10 T 58 4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="stat-card space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium text-neutral-500">Tests Completed</span>
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  -23.1%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-neutral-900">{attempts.length}</span>
                <svg className="w-16 h-7 text-rose-500" viewBox="0 0 60 25" fill="none">
                  <path d="M2 5 Q 15 8, 30 18 T 58 22" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="stat-card space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium text-neutral-500">Questions Solved</span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  +16.2%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-neutral-900">{totalQuestions}</span>
                <svg className="w-16 h-7 text-emerald-500" viewBox="0 0 60 25" fill="none">
                  <path d="M2 18 Q 20 16, 35 12 T 58 5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="stat-card space-y-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium text-neutral-500">Curriculum Blocks</span>
                <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Active
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-neutral-900">{blocksCompleted}</span>
                <span className="text-xs text-neutral-400">of 57 blocks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Active Learning */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Recent Performance Trend</h3>
                <p className="text-xs text-neutral-400">Score per completed test session</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0E7490]"></span> Accuracy %
              </div>
            </div>

            {performanceData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                <p className="text-sm font-medium text-neutral-600">No test data available yet</p>
                <p className="text-xs text-neutral-400 mt-1 mb-4">Complete your first practice block to generate trend analysis.</p>
                <Link href="/create-test" className="btn-primary">Take Practice Quiz</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E7490" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0E7490" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#0E7490"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Study Workspaces Card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">Recent System Focus</h3>
              <span className="text-xs font-medium text-neutral-400">USMLE Step 1</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>Renal & Urinary Systems</span>
                  <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">High Yield</span>
                </div>
                <p className="text-[11px] text-neutral-400">Nephritic vs Nephrotic syndrome discriminators</p>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#0E7490] h-full w-[82%] rounded-full"></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>Cardiovascular System</span>
                  <span className="text-[11px] font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">Organ Systems</span>
                </div>
                <p className="text-[11px] text-neutral-400">Valvular heart lesions & murmur mechanics</p>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#0E7490] h-full w-[64%] rounded-full"></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>Endocrine Physiology</span>
                  <span className="text-[11px] font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">In Progress</span>
                </div>
                <p className="text-[11px] text-neutral-400">Thyroid axis, MEN syndromes & adrenal pathology</p>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[45%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
