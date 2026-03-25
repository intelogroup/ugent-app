'use client';

import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Line } from 'recharts';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

// Mock data - replace with real API calls
const performanceData = [
  { date: 'Mon', score: 65, aiPrediction: 68 },
  { date: 'Tue', score: 72, aiPrediction: 74 },
  { date: 'Wed', score: 68, aiPrediction: 71 },
  { date: 'Thu', score: 78, aiPrediction: 80 },
  { date: 'Fri', score: 82, aiPrediction: 84 },
  { date: 'Sat', score: 85, aiPrediction: 87 },
  { date: 'Sun', score: 88, aiPrediction: 90 },
];

const subjectPerformance = [
  { name: 'Cardiovascular', value: 85, color: 'var(--color-primary-600)' },
  { name: 'Neurology',      value: 72, color: 'var(--color-neutral-700)' },
  { name: 'Biochemistry',   value: 90, color: 'var(--color-neutral-500)' },
  { name: 'Pathology',      value: 68, color: 'var(--color-neutral-300)' },
];

export default function Home() {
  const { user } = useAuth();
  const userName = user?.firstName || user?.email?.split('@')[0] || 'there';

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
            <p className="text-2xl font-bold text-neutral-900">87%</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Tests Done</p>
            <p className="text-2xl font-bold text-neutral-900">24</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Streak</p>
            <p className="text-2xl font-bold text-neutral-900">12 days</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Questions</p>
            <p className="text-2xl font-bold text-neutral-900">1,247</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link href="/create-test" className="btn-primary text-center">Start New Test</Link>
          <Link href="/tests" className="btn-secondary text-center">Continue Last</Link>
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
              {performanceData.slice(-5).map((d) => (
                <div key={d.date} className="flex justify-between items-center py-2">
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
                <p className="text-sm text-neutral-500">Last 7 days with AI predictions</p>
              </div>
            </div>
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
                <Line
                  type="monotone"
                  dataKey="aiPrediction"
                  stroke="#B595FF"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="AI Prediction"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Subject Performance */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Subject Breakdown</h3>
                <p className="text-sm text-neutral-500">Performance by category</p>
              </div>
            </div>
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
