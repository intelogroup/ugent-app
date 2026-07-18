'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { getQuizAttempts, getCompletedCurriculumBlocks, QuizAttempt } from '@/lib/quizAttempts';

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
  const { user } = useAuth();
  const userName = user?.firstName || user?.email?.split('@')[0] || 'there';

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [blocksCompleted, setBlocksCompleted] = useState(0);

  useEffect(() => {
    setAttempts(getQuizAttempts());
    setBlocksCompleted(getCompletedCurriculumBlocks().length);
  }, []);

  const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
  const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const performanceData = buildPerformanceData(attempts);
  const subjectPerformance = buildSubjectBreakdown(attempts);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-neutral-900">Good morning, {userName}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-neutral-900">{avgScore}%</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Tests Done</p>
            <p className="text-2xl font-bold text-neutral-900">{attempts.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Curriculum Blocks</p>
            <p className="text-2xl font-bold text-neutral-900">{blocksCompleted}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Questions</p>
            <p className="text-2xl font-bold text-neutral-900">{totalQuestions}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link href="/create-test" className="btn-primary text-center">Start New Test</Link>
          <Link href="/tests" className="btn-secondary text-center">View History</Link>
        </div>

        {/* Recent Activity — mobile only */}
        <div className="md:hidden card">
          <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-3">Recent</h3>
          {performanceData.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-neutral-500 mb-3">No tests yet</p>
              <Link href="/create-test" className="btn-primary text-sm py-2 px-4">Start your first test →</Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {performanceData.slice(-5).map((d, index) => (
                <div key={`${d.date}-${index}`} className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-700">{d.date}</span>
                  <span className="text-sm font-semibold text-neutral-900">{d.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charts — desktop only */}
        <div className="hidden md:grid grid-cols-2 gap-6">
          {/* Performance Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Performance Trend</h3>
                <p className="text-sm text-neutral-500">Score per test, most recent 7</p>
              </div>
            </div>
            {performanceData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-neutral-500">
                No tests yet — take a quiz to see your trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2563EB"
                    strokeWidth={3}
                    fill="url(#colorScore)"
                    name="Your Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subject Performance */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Subject Breakdown</h3>
                <p className="text-sm text-neutral-500">Performance by category</p>
              </div>
            </div>
            {subjectPerformance.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-neutral-500">
                No tests yet — take a quiz to see your breakdown
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={subjectPerformance}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {subjectPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {subjectPerformance.map((subject) => (
                    <div key={subject.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-sm text-neutral-700">{subject.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-900">{subject.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
