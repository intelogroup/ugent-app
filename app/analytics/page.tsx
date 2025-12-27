'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { 
  SparklesIcon, 
  TrophyIcon,
  ClockIcon,
  FireIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/solid';
import { 
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const weeklyProgress = [
  { week: 'Week 1', score: 62, timeSpent: 12 },
  { week: 'Week 2', score: 68, timeSpent: 15 },
  { week: 'Week 3', score: 72, timeSpent: 18 },
  { week: 'Week 4', score: 78, timeSpent: 20 },
  { week: 'Week 5', score: 82, timeSpent: 22 },
];

const subjectRadar = [
  { subject: 'Cardio', score: 85, fullMark: 100 },
  { subject: 'Neuro', score: 72, fullMark: 100 },
  { subject: 'Pharma', score: 68, fullMark: 100 },
  { subject: 'Pathology', score: 90, fullMark: 100 },
  { subject: 'Biochem', score: 75, fullMark: 100 },
  { subject: 'Anatomy', score: 80, fullMark: 100 },
];

const topicPerformance = [
  { topic: 'ECG Interpretation', correct: 45, incorrect: 12, improvement: +15 },
  { topic: 'Drug Mechanisms', correct: 38, incorrect: 18, improvement: -5 },
  { topic: 'Neuroanatomy', correct: 52, incorrect: 8, improvement: +22 },
  { topic: 'Acid-Base Balance', correct: 41, incorrect: 15, improvement: +8 },
  { topic: 'Hormone Pathways', correct: 36, incorrect: 20, improvement: +12 },
];

const aiPredictions = [
  { area: 'Cardiovascular', current: 85, predicted: 92, recommendation: 'On track for mastery' },
  { area: 'Pharmacology', current: 68, predicted: 78, recommendation: 'Focus on drug interactions' },
  { area: 'Neurology', current: 72, predicted: 85, recommendation: 'Review cranial nerves' },
];

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">AI Study Analytics</h1>
            <p className="text-neutral-600">Comprehensive insights into your learning progress</p>
          </div>
          <div className="ai-badge">
            <SparklesIcon className="w-4 h-4" />
            AI Analysis
          </div>
        </div>

        {/* AI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900">AI Performance Score</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900 mb-2">87/100</p>
            <p className="text-sm text-neutral-600">
              You're performing <strong>better than 78%</strong> of students at your level
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-secondary-green rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900">Growth Rate</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900 mb-2">+12.5%</p>
            <p className="text-sm text-neutral-600">
              Consistent improvement over the past 30 days
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-secondary-blue rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900">Estimated Readiness</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900 mb-2">68%</p>
            <p className="text-sm text-neutral-600">
              Projected exam date: <strong>March 2026</strong>
            </p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="card bg-primary-600 text-white border-none">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <LightBulbIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">AI-Generated Insights</h3>
              <div className="space-y-2 text-white/90">
                <p>• Your <strong>cardiovascular knowledge</strong> is exceptional (85%). Continue with regular practice.</p>
                <p>• <strong>Pharmacology</strong> needs attention. Focus on drug mechanisms and side effects.</p>
                <p>• You learn best in <strong>morning sessions</strong> (15% higher retention rate).</p>
                <p>• Your error pattern suggests confusion between <strong>similar drug classes</strong>. Use comparison tables.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Progress */}
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">5-Week Progress Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="week" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#5B51D6" 
                  strokeWidth={3}
                  name="Average Score (%)"
                  dot={{ fill: '#5B51D6', r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="timeSpent" 
                  stroke="#5B9FFF" 
                  strokeWidth={3}
                  name="Study Hours"
                  dot={{ fill: '#5B9FFF', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subject Radar */}
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Subject Mastery Radar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={subjectRadar}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} style={{ fontSize: '12px' }} />
                <Radar 
                  name="Your Score" 
                  dataKey="score" 
                  stroke="#5B51D6" 
                  fill="#5B51D6" 
                  fillOpacity={0.3} 
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Performance Table */}
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Topic Performance Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Topic</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Correct</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Incorrect</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Accuracy</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Trend</th>
                </tr>
              </thead>
              <tbody>
                {topicPerformance.map((topic, index) => {
                  const accuracy = Math.round((topic.correct / (topic.correct + topic.incorrect)) * 100);
                  const isImproving = topic.improvement > 0;
                  
                  return (
                    <tr key={index} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-4 px-4 font-medium text-neutral-900">{topic.topic}</td>
                      <td className="py-4 px-4">
                        <span className="bg-secondary-green/10 text-secondary-green px-3 py-1 rounded-full text-sm font-semibold">
                          {topic.correct}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-secondary-pink/10 text-secondary-pink px-3 py-1 rounded-full text-sm font-semibold">
                          {topic.incorrect}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-neutral-900">{accuracy}%</td>
                      <td className="py-4 px-4">
                        <div className={`flex items-center gap-1 ${isImproving ? 'text-secondary-green' : 'text-secondary-pink'}`}>
                          {isImproving ? (
                            <ArrowTrendingUpIcon className="w-4 h-4" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-4 h-4" />
                          )}
                          <span className="text-sm font-semibold">{Math.abs(topic.improvement)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Predictions */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-neutral-900">AI Performance Predictions</h3>
          </div>
          <div className="space-y-4">
            {aiPredictions.map((pred, index) => (
              <div key={index} className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-neutral-900">{pred.area}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600">
                      Current: <strong>{pred.current}%</strong>
                    </span>
                    <span className="text-sm text-primary-600">
                      Predicted: <strong>{pred.predicted}%</strong>
                    </span>
                  </div>
                </div>
                <div className="relative w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-2">
                  <div 
                    className="absolute top-0 left-0 h-full bg-neutral-400 transition-all"
                    style={{ width: `${pred.current}%` }}
                  />
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary-500 transition-all"
                    style={{ width: `${pred.predicted}%` }}
                  />
                </div>
                <p className="text-sm text-neutral-600">
                  <LightBulbIcon className="w-4 h-4 inline text-primary-600" /> {pred.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Study Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-secondary-yellow/20 border-2 border-secondary-yellow">
            <FireIcon className="w-8 h-8 text-neutral-900 mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-2">Maintain Streak</h3>
            <p className="text-sm text-neutral-700">
              You're on a 12-day streak! Study today to keep your momentum going.
            </p>
          </div>

          <div className="card bg-secondary-blue/20 border-2 border-secondary-blue">
            <ClockIcon className="w-8 h-8 text-secondary-blue mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-2">Optimal Time</h3>
            <p className="text-sm text-neutral-700">
              Your peak performance is between 9 AM - 11 AM. Schedule difficult topics then.
            </p>
          </div>

          <div className="card bg-secondary-green/20 border-2 border-secondary-green">
            <ChartBarIcon className="w-8 h-8 text-secondary-green mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-2">Next Milestone</h3>
            <p className="text-sm text-neutral-700">
              Complete 50 more questions to reach 80% overall mastery. You're almost there!
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
