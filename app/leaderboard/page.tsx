'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { TrophyIcon, FireIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';

// Mock data - replace with real API data
const topPerformers = [
  {
    id: '1',
    rank: 1,
    name: 'Sarah Johnson',
    country: '🇺🇸',
    school: 'Harvard Medical School',
    score: 2847,
    avatar: 'SJ',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    streak: 45,
    testsCompleted: 127
  },
  {
    id: '2',
    rank: 2,
    name: 'Michael Chen',
    country: '🇨🇦',
    school: 'Stanford Medical School',
    score: 2756,
    avatar: 'MC',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
    streak: 38,
    testsCompleted: 115
  },
  {
    id: '3',
    rank: 3,
    name: 'Emma Rodriguez',
    country: '🇲🇽',
    school: 'Johns Hopkins',
    score: 2698,
    avatar: 'ER',
    avatarUrl: 'https://i.pravatar.cc/150?img=9',
    streak: 42,
    testsCompleted: 108
  },
  {
    id: '4',
    rank: 4,
    name: 'James Wilson',
    country: '🇬🇧',
    school: 'Yale Medical School',
    score: 2645,
    avatar: 'JW',
    avatarUrl: 'https://i.pravatar.cc/150?img=14',
    streak: 35,
    testsCompleted: 102
  },
  {
    id: '5',
    rank: 5,
    name: 'Priya Patel',
    country: '🇮🇳',
    school: 'Columbia University',
    score: 2589,
    avatar: 'PP',
    avatarUrl: 'https://i.pravatar.cc/150?img=47',
    streak: 40,
    testsCompleted: 98
  }
];

const otherUsers = [
  { id: '6', rank: 6, name: 'Alex Thompson', country: '🇦🇺', school: 'NYU Medical', score: 2534, avatar: 'AT', avatarUrl: 'https://i.pravatar.cc/150?img=33' },
  { id: '7', rank: 7, name: 'Maria Garcia', country: '🇪🇸', school: 'Duke University', score: 2489, avatar: 'MG', avatarUrl: 'https://i.pravatar.cc/150?img=25' },
  { id: '8', rank: 8, name: 'David Kim', country: '🇰🇷', school: 'UCLA Medical', score: 2445, avatar: 'DK', avatarUrl: 'https://i.pravatar.cc/150?img=51' },
  { id: '9', rank: 9, name: 'Sophie Martin', country: '🇫🇷', school: 'Penn Medicine', score: 2398, avatar: 'SM', avatarUrl: 'https://i.pravatar.cc/150?img=16' },
  { id: '10', rank: 10, name: 'Ahmed Hassan', country: '🇪🇬', school: 'UCSF', score: 2356, avatar: 'AH', avatarUrl: 'https://i.pravatar.cc/150?img=60' },
  { id: '11', rank: 11, name: 'Lisa Anderson', country: '🇸🇪', school: 'Cornell Medical', score: 2312, avatar: 'LA', avatarUrl: 'https://i.pravatar.cc/150?img=20' },
  { id: '12', rank: 12, name: 'Carlos Santos', country: '🇧🇷', school: 'Brown University', score: 2267, avatar: 'CS', avatarUrl: 'https://i.pravatar.cc/150?img=68' },
  { id: '13', rank: 13, name: 'Yuki Tanaka', country: '🇯🇵', school: 'Northwestern', score: 2223, avatar: 'YT', avatarUrl: 'https://i.pravatar.cc/150?img=32' },
  { id: '14', rank: 14, name: 'Nina Kowalski', country: '🇵🇱', school: 'Emory University', score: 2189, avatar: 'NK', avatarUrl: 'https://i.pravatar.cc/150?img=28' },
  { id: '15', rank: 15, name: 'Ryan O\'Brien', country: '🇮🇪', school: 'Georgetown', score: 2145, avatar: 'RO', avatarUrl: 'https://i.pravatar.cc/150?img=59' }
];

const getRankColor = (rank: number) => {
  if (rank === 1) return 'from-yellow-400 to-yellow-600';
  if (rank === 2) return 'from-gray-300 to-gray-500';
  if (rank === 3) return 'from-amber-600 to-amber-800';
  return 'from-primary-500 to-primary-700';
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-1 sm:mb-2">Leaderboard</h1>
            <p className="text-sm sm:text-base text-neutral-600">Compete with students worldwide</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap ${
                timeframe === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap ${
                timeframe === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap ${
                timeframe === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Top 5 Podium */}
        <div className="relative overflow-hidden">
          {/* Podium Display */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-center gap-3 sm:gap-2 md:gap-4 mb-6 sm:mb-8 w-full">
            {/* 4th Place */}
            <div className="flex flex-row sm:flex-col items-center sm:items-center w-full sm:w-[120px] md:w-[140px] order-4 sm:order-1">
              <div className="relative mb-0 sm:mb-3 mr-3 sm:mr-0 flex-shrink-0">
                <img
                  src={topPerformers[3].avatarUrl}
                  alt={topPerformers[3].name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-neutral-200"
                />
                <div className="absolute -bottom-1 sm:left-1/2 sm:-translate-x-1/2 -right-1 sm:right-auto w-6 h-6 rounded-full bg-white border-2 border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-600">
                  4
                </div>
              </div>
              <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-neutral-200 w-full sm:w-full flex-1 sm:flex-initial min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm sm:text-base flex-shrink-0">{topPerformers[3].country}</span>
                  <h3 className="text-xs font-semibold text-neutral-900 truncate flex-1 min-w-0">
                    {topPerformers[3].name}
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mb-2 truncate">{topPerformers[3].school}</p>
                <div className="text-center sm:text-center">
                  <span className="text-sm sm:text-base font-bold text-neutral-900">{topPerformers[3].score}</span>
                  <span className="text-xs text-neutral-500 ml-1">pts</span>
                </div>
              </div>
            </div>

            {/* 2nd Place */}
            <div className="flex flex-row sm:flex-col items-center sm:items-center w-full sm:w-[140px] md:w-[160px] order-2 sm:order-2 sm:mb-5">
              <div className="relative mb-0 sm:mb-3 mr-3 sm:mr-0 flex-shrink-0">
                <img
                  src={topPerformers[1].avatarUrl}
                  alt={topPerformers[1].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-neutral-300 shadow-sm"
                />
                <div className="absolute -bottom-1 sm:left-1/2 sm:-translate-x-1/2 -right-1 sm:right-auto text-2xl">
                  🥈
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-neutral-300 w-full sm:w-full flex-1 sm:flex-initial min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                  <span className="text-base sm:text-lg flex-shrink-0">{topPerformers[1].country}</span>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 truncate flex-1 min-w-0">
                    {topPerformers[1].name}
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mb-2.5 truncate">{topPerformers[1].school}</p>
                <div className="text-center sm:text-center">
                  <span className="text-lg sm:text-xl font-bold text-neutral-900">{topPerformers[1].score}</span>
                  <span className="text-xs text-neutral-500 ml-1">pts</span>
                </div>
              </div>
            </div>

            {/* 1st Place (Winner) */}
            <div className="flex flex-row sm:flex-col items-center sm:items-center w-full sm:w-[150px] md:w-[180px] order-1 sm:order-3 sm:mb-10">
              <div className="relative mb-0 sm:mb-4 mr-3 sm:mr-0 flex-shrink-0">
                <img
                  src={topPerformers[0].avatarUrl}
                  alt={topPerformers[0].name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-yellow-400 shadow-md ring-2 ring-yellow-200"
                />
                <div className="absolute -bottom-2 sm:left-1/2 sm:-translate-x-1/2 -right-1 sm:right-auto text-2xl sm:text-3xl">
                  🥇
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-5 border-2 border-yellow-400 w-full sm:w-full flex-1 sm:flex-initial min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                  <span className="text-lg sm:text-xl flex-shrink-0">{topPerformers[0].country}</span>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate flex-1 min-w-0">
                    {topPerformers[0].name}
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mb-2 sm:mb-3 truncate">{topPerformers[0].school}</p>
                <div className="text-center mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl font-bold text-neutral-900">{topPerformers[0].score}</span>
                  <span className="text-xs sm:text-sm text-neutral-500 ml-1">pts</span>
                </div>
                <div className="flex justify-center gap-3 sm:gap-4 text-xs text-neutral-600">
                  <div className="flex items-center gap-1">
                    <FireIcon className="w-3.5 h-3.5 text-secondary-yellow" />
                    <span className="font-medium">{topPerformers[0].streak}d</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ChartBarIcon className="w-3.5 h-3.5 text-primary-600" />
                    <span className="font-medium">{topPerformers[0].testsCompleted}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-row sm:flex-col items-center sm:items-center w-full sm:w-[140px] md:w-[160px] order-3 sm:order-4 sm:mb-5">
              <div className="relative mb-0 sm:mb-3 mr-3 sm:mr-0 flex-shrink-0">
                <img
                  src={topPerformers[2].avatarUrl}
                  alt={topPerformers[2].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-600 shadow-sm"
                />
                <div className="absolute -bottom-1 sm:left-1/2 sm:-translate-x-1/2 -right-1 sm:right-auto text-2xl">
                  🥉
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-amber-600 w-full sm:w-full flex-1 sm:flex-initial min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                  <span className="text-base sm:text-lg flex-shrink-0">{topPerformers[2].country}</span>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 truncate flex-1 min-w-0">
                    {topPerformers[2].name}
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mb-2.5 truncate">{topPerformers[2].school}</p>
                <div className="text-center sm:text-center">
                  <span className="text-lg sm:text-xl font-bold text-neutral-900">{topPerformers[2].score}</span>
                  <span className="text-xs text-neutral-500 ml-1">pts</span>
                </div>
              </div>
            </div>

            {/* 5th Place */}
            <div className="flex flex-row sm:flex-col items-center sm:items-center w-full sm:w-[120px] md:w-[140px] order-5 sm:order-5">
              <div className="relative mb-0 sm:mb-3 mr-3 sm:mr-0 flex-shrink-0">
                <img
                  src={topPerformers[4].avatarUrl}
                  alt={topPerformers[4].name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-neutral-200"
                />
                <div className="absolute -bottom-1 sm:left-1/2 sm:-translate-x-1/2 -right-1 sm:right-auto w-6 h-6 rounded-full bg-white border-2 border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-600">
                  5
                </div>
              </div>
              <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-neutral-200 w-full sm:w-full flex-1 sm:flex-initial min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm sm:text-base flex-shrink-0">{topPerformers[4].country}</span>
                  <h3 className="text-xs font-semibold text-neutral-900 truncate flex-1 min-w-0">
                    {topPerformers[4].name}
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mb-2 truncate">{topPerformers[4].school}</p>
                <div className="text-center sm:text-center">
                  <span className="text-sm sm:text-base font-bold text-neutral-900">{topPerformers[4].score}</span>
                  <span className="text-xs text-neutral-500 ml-1">pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of Rankings */}
        <div className="card">
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-4 sm:mb-6">All Rankings</h2>
          <div className="space-y-2 sm:space-y-3">
            {otherUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-neutral-50 transition-colors border border-neutral-200"
              >
                {/* Rank */}
                <div className="w-8 sm:w-12 text-center flex-shrink-0">
                  <span className="text-sm sm:text-lg font-bold text-neutral-700">#{user.rank}</span>
                </div>

                {/* Avatar */}
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-neutral-200 flex-shrink-0"
                />

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <span className="text-base sm:text-xl flex-shrink-0">{user.country}</span>
                    <h3 className="text-sm sm:text-base font-semibold text-neutral-900 truncate">{user.name}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 truncate">{user.school}</p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base sm:text-xl font-bold text-primary-600">{user.score}</p>
                  <p className="text-xs text-neutral-500">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
