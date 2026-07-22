'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getQuizAttempts, QuizAttempt } from '@/lib/quizAttempts';

function buildTrend(attempts: QuizAttempt[]) {
  return attempts.map((a, i) => ({
    label: `Test ${i + 1}`,
    score: a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
  }));
}

function buildSubjectBreakdown(attempts: QuizAttempt[]) {
  const bySubject = new Map<string, { correct: number; total: number; scores: number[] }>();
  for (const a of attempts) {
    const key = a.subject || a.system || 'Mixed';
    const entry = bySubject.get(key) || { correct: 0, total: 0, scores: [] };
    entry.correct += a.correct;
    entry.total += a.total;
    entry.scores.push(a.total > 0 ? a.correct / a.total : 0);
    bySubject.set(key, entry);
  }
  return Array.from(bySubject.entries()).map(([topic, { correct, total, scores }]) => {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const half = Math.floor(scores.length / 2);
    const firstHalfAvg = half > 0 ? scores.slice(0, half).reduce((s, v) => s + v, 0) / half : scores[0] ?? 0;
    const secondHalfAvg = scores.length - half > 0 ? scores.slice(half).reduce((s, v) => s + v, 0) / (scores.length - half) : 0;
    const trend = Math.round((secondHalfAvg - firstHalfAvg) * 100);
    return { topic, correct, incorrect: total - correct, accuracy, trend };
  });
}

export default function Analytics() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    getQuizAttempts().then(setAttempts);
  }, []);

  const totalQuestions = attempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);
  const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const subjectBreakdown = buildSubjectBreakdown(attempts);

  // Demographic / Subject distribution for Donut Chart (Survey App style)
  const pieData = [
    { name: 'Cardiology (30%)', value: 30, color: '#3B82F6', count: '2,894 q' },
    { name: 'Renal (40%)', value: 40, color: '#1E1B4B', count: '3,859 q' },
    { name: 'Endocrine (20%)', value: 20, color: '#A855F7', count: '1,929 q' },
    { name: 'Pulmonary (10%)', value: 10, color: '#CBD5E1', count: '964 q' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Analytics</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Data-driven insights inform decisions and enhance outcomes</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3">
              Export <span>↓</span>
            </button>
            <button className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4">
              <span>Generate report</span> <span>↓</span>
            </button>
          </div>
        </div>

        {/* Filter Pill Strip (Survey UI exact match) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white border border-neutral-200/80 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-700 font-medium rounded-lg border border-neutral-200">
              <span>⊕ Only USMLE Step 1</span>
              <span className="text-neutral-400 cursor-pointer hover:text-neutral-700">×</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-700 font-medium rounded-lg border border-neutral-200">
              <span>📅 This week compare to Past week</span>
              <span className="text-neutral-400 cursor-pointer hover:text-neutral-700">×</span>
            </span>
            <button className="px-3 py-1 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors font-medium">
              + Filter
            </button>
          </div>
          <button className="px-3 py-1 text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg font-medium">
            View ˅
          </button>
        </div>

        {/* Top 4 KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="stat-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Views</span>
              <span className="text-neutral-400 text-xs">↗</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">12,836</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ↗ +2.5%
              </span>
            </div>
            <svg className="w-full h-8 text-emerald-500" viewBox="0 0 100 25" fill="none">
              <path d="M0 20 Q 25 18, 50 12 T 100 4" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* KPI 2 */}
          <div className="stat-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Surveys / Quizzes</span>
              <span className="text-neutral-400 text-xs">↗</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">412</span>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                ↘ -23.1%
              </span>
            </div>
            <svg className="w-full h-8 text-rose-500" viewBox="0 0 100 25" fill="none">
              <path d="M0 4 Q 25 10, 50 18 T 100 22" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* KPI 3 */}
          <div className="stat-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Answers / Questions</span>
              <span className="text-neutral-400 text-xs">↗</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">9,648</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ↗ +16.2%
              </span>
            </div>
            <svg className="w-full h-8 text-emerald-500" viewBox="0 0 100 25" fill="none">
              <path d="M0 22 Q 30 18, 60 10 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* KPI 4 */}
          <div className="stat-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">User Engagement</span>
              <span className="text-neutral-400 text-xs">↗</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">0</span>
              <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                0.0%
              </span>
            </div>
            <div className="w-full h-8 bg-neutral-100 rounded mt-1"></div>
          </div>
        </div>

        {/* Main Charts Grid (Survey Analytics replica) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Demographic / Subject Donut Chart Card (Left - 6 cols) */}
          <div className="lg:col-span-6 card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Demographic data of respondents</h3>
                <p className="text-xs text-neutral-400">Distribution across organ systems</p>
              </div>
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-xs font-medium">
                <button className="px-2.5 py-1 bg-white text-neutral-900 rounded-md shadow-xs font-semibold">Age</button>
                <button className="px-2.5 py-1 text-neutral-500 hover:text-neutral-900">Gender</button>
                <button className="px-2.5 py-1 text-neutral-500 hover:text-neutral-900">Location</button>
              </div>
            </div>

            {/* Donut Chart with Center Text */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-neutral-900 leading-none">9,648</span>
                  <span className="text-xs text-neutral-400 mt-0.5">votes</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-2.5 text-xs">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }}></span>
                      <span className="font-medium text-neutral-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-neutral-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Stacked (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Conversion Rate Card */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Conversion rate</h3>
                  <p className="text-xs text-neutral-400">Response completion metrics</p>
                </div>
                <span className="text-neutral-400 text-xs cursor-pointer">•••</span>
              </div>
              <div className="h-36 flex items-center justify-center border border-neutral-100 rounded-xl bg-neutral-50/50">
                <div className="flex items-center gap-6 text-xs text-neutral-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#0E7490] rounded-xs"></span> Survey
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#38BDF8] rounded-xs"></span> Views
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#F97316] rounded-xs"></span> Answers
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#A855F7] rounded-xs"></span> Feedback
                  </div>
                </div>
              </div>
            </div>

            {/* Sessions Card */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Sessions</h3>
                  <p className="text-xs text-neutral-500 font-semibold">128 users <span className="font-normal text-neutral-400">of difference</span></p>
                </div>
                <span className="text-neutral-400 text-xs cursor-pointer">•••</span>
              </div>
              <div className="flex items-center justify-end gap-4 text-xs font-medium text-neutral-600">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0E7490]"></span> This week</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Past week</span>
              </div>
              <div className="h-28 flex items-center justify-center border border-neutral-100 rounded-xl bg-neutral-50/50">
                <svg className="w-full h-20 text-[#0E7490]" viewBox="0 0 300 60" fill="none">
                  <path d="M0 45 L50 25 L100 35 L150 15 L200 40 L250 20 L300 30" stroke="#0E7490" strokeWidth="2.5" fill="none" />
                  <path d="M0 35 L50 45 L100 20 L150 40 L200 15 L250 35 L300 15" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
