'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  LightBulbIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';

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
  { name: 'Cardiovascular', value: 85, color: '#3B82F6' }, // Blue-500
  { name: 'Neurology', value: 72, color: '#06B6D4' }, // Cyan-500
  { name: 'Pharmacology', value: 68, color: '#F59E0B' }, // Amber-500
  { name: 'Pathology', value: 90, color: '#10B981' }, // Emerald-500
  { name: 'Biochemistry', value: 75, color: '#EC4899' }, // Pink-500
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome back, {userName}!</h1>
            <p className="text-neutral-600">Here's your AI-powered study insights for today</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white p-1">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-full"
                style={{ transform: 'scale(1.5)', objectPosition: 'center 10%' }}
              >
                <source src="/man-asian-avatar-720p.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="ai-badge">
              <SparklesIcon className="w-4 h-4" />
              AI Active
            </div>
          </div>
        </div>

        {/* AI Insights Banner */}
        <div className="bg-primary-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <LightBulbIcon className="w-6 h-6" />
              <h3 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>AI Recommendation</h3>
            </div>
            <p className="text-lg mb-6 max-w-2xl">
              Based on your recent performance, focus on <strong>Pharmacology</strong> and <strong>Neurology</strong> topics. 
              Your cardiovascular knowledge is excellent! 🎉
            </p>
            <div className="flex gap-4">
              <button className="bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold hover:bg-neutral-50 transition-colors shadow-sm">
                Start Recommended Quiz
              </button>
              <button className="bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-800 transition-colors">
                View Full Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Overall Score */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-secondary-green bg-secondary-green/10 px-2 py-1 rounded-full">
                +5.2%
              </span>
            </div>
            <p className="text-sm text-neutral-600 mb-1">Overall Score</p>
            <h2 className="text-3xl font-bold text-neutral-900">82.4%</h2>
            <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
              <ArrowTrendingUpIcon className="w-4 h-4 text-secondary-green" />
              <span>Improving steadily</span>
            </div>
          </div>

          {/* Study Streak */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary-yellow rounded-lg flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-neutral-900" />
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-1">Study Streak</p>
            <h2 className="text-3xl font-bold text-neutral-900">12 Days</h2>
            <div className="mt-3 text-xs text-neutral-500">
              Keep it up! 🔥
            </div>
          </div>

          {/* Questions Answered */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary-blue rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-1">Questions This Week</p>
            <h2 className="text-3xl font-bold text-neutral-900">247</h2>
            <div className="mt-3 text-xs text-neutral-500">
              42 more than last week
            </div>
          </div>

          {/* Study Time */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary-pink rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-1">Study Time Today</p>
            <h2 className="text-3xl font-bold text-neutral-900">2.5h</h2>
            <div className="mt-3 text-xs text-neutral-500">
              Target: 3.0h per day
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Performance Trend</h3>
                <p className="text-sm text-neutral-500">Last 7 days with AI predictions</p>
              </div>
              <div className="ai-badge text-xs">
                <SparklesIcon className="w-3 h-3" />
                AI Forecast
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

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-4 p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 hover:bg-primary-50/50 transition-all group">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                <BoltIcon className="w-6 h-6 text-primary-600 group-hover:text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-neutral-900">Quick Quiz</p>
                <p className="text-xs text-neutral-500">10 random questions</p>
              </div>
            </button>

            <button className="flex items-center gap-4 p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 hover:bg-primary-50/50 transition-all group">
              <div className="w-12 h-12 bg-secondary-yellow/30 rounded-lg flex items-center justify-center group-hover:bg-secondary-yellow transition-colors">
                <SparklesIcon className="w-6 h-6 text-neutral-700 group-hover:text-neutral-900" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-neutral-900">AI-Generated Test</p>
                <p className="text-xs text-neutral-500">Personalized for you</p>
              </div>
            </button>

            <button className="flex items-center gap-4 p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 hover:bg-primary-50/50 transition-all group">
              <div className="w-12 h-12 bg-secondary-blue/30 rounded-lg flex items-center justify-center group-hover:bg-secondary-blue transition-colors">
                <ArrowTrendingUpIcon className="w-6 h-6 text-secondary-blue group-hover:text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-neutral-900">Review Weak Areas</p>
                <p className="text-xs text-neutral-500">Focus on improvements</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'Completed quiz', subject: 'Cardiovascular System', score: 88, time: '2 hours ago', color: 'bg-secondary-green' },
              { action: 'Started test', subject: 'Pharmacology Basics', score: null, time: '5 hours ago', color: 'bg-secondary-blue' },
              { action: 'Reviewed notes', subject: 'Neurology', score: null, time: '1 day ago', color: 'bg-secondary-yellow' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${activity.color}`} />
                  <div>
                    <p className="font-medium text-neutral-900">{activity.action}</p>
                    <p className="text-sm text-neutral-500">{activity.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  {activity.score && (
                    <p className="font-semibold text-neutral-900">{activity.score}%</p>
                  )}
                  <p className="text-xs text-neutral-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
