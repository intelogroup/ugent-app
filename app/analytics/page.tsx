'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const trend = buildTrend(attempts);
  const subjectBreakdown = buildSubjectBreakdown(attempts);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Analytics</h1>
          <p className="text-neutral-600">Performance derived from your quiz history</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-card">
            <p className="text-sm text-neutral-600 mb-1">Overall Accuracy</p>
            <p className="text-3xl font-bold text-neutral-900">{avgScore}%</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-neutral-600 mb-1">Tests Taken</p>
            <p className="text-3xl font-bold text-neutral-900">{attempts.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-neutral-600 mb-1">Questions Answered</p>
            <p className="text-3xl font-bold text-neutral-900">{totalQuestions}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Score Trend</h3>
          {trend.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-neutral-500">
              No tests yet — take a quiz to see your trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="score" stroke="#5B51D6" strokeWidth={3} dot={{ fill: '#5B51D6', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Subject Breakdown</h3>
          {subjectBreakdown.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">No data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-neutral-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Subject</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Correct</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Incorrect</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Accuracy</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectBreakdown.map((s) => (
                    <tr key={s.topic} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-4 px-4 font-medium text-neutral-900">{s.topic}</td>
                      <td className="py-4 px-4">
                        <span className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm font-semibold">{s.correct}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-neutral-50 text-neutral-500 px-3 py-1 rounded-full text-sm font-semibold">{s.incorrect}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-neutral-900">{s.accuracy}%</td>
                      <td className="py-4 px-4">
                        {s.trend === 0 ? (
                          <span className="text-sm text-neutral-400">—</span>
                        ) : (
                          <div className={`flex items-center gap-1 ${s.trend > 0 ? 'text-neutral-700' : 'text-neutral-500'}`}>
                            {s.trend > 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
                            <span className="text-sm font-semibold">{Math.abs(s.trend)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {attempts.length === 0 && (
          <div className="card bg-neutral-50 border-2 border-neutral-200 text-center py-8">
            <ChartBarIcon className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600">Take a quiz to start building your analytics</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
