'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import AddStudyBuddyForm from '@/components/leaderboard/AddStudyBuddyForm';
import Avatar from '@/components/Avatar';
import { useLocalLeaderboard } from '@/lib/leaderboard';
import { TrophyIcon } from '@heroicons/react/24/outline';

type LeaderboardTab = 'all' | 'weekly';

export default function LeaderboardPage() {
  const { leaderboard, refresh, user } = useLocalLeaderboard();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all');

  const tabs: { id: LeaderboardTab; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'weekly', label: 'Weekly' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="w-8 h-8 text-neutral-400" />
              <h1 className="text-3xl font-bold text-neutral-900">Leaderboard</h1>
            </div>
            <p className="text-neutral-600">
              Local study group rankings — avatars and scores stay on this device.
            </p>
          </div>
          {user && <Avatar size="lg" />}
        </div>

        {leaderboard.currentUserRank && (
          <div className="stat-card flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Your rank</p>
              <p className="text-2xl font-bold text-neutral-900">
                #{leaderboard.currentUserRank}
                <span className="text-sm font-normal text-neutral-500 ml-2">
                  of {leaderboard.totalMembers}
                </span>
              </p>
            </div>
            <p className="text-sm text-neutral-500 hidden sm:block">
              Scores from your quiz history
            </p>
          </div>
        )}

        <div className="border-b border-neutral-200">
          <div className="flex gap-6" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'weekly' ? (
          <div className="card text-center py-10">
            <p className="text-neutral-600">Weekly rankings coming soon.</p>
            <p className="text-sm text-neutral-500 mt-1">
              For now, use All Time — powered by your local quiz attempts.
            </p>
          </div>
        ) : (
          <LeaderboardTable rows={leaderboard.rows} onChanged={refresh} />
        )}

        <AddStudyBuddyForm onAdded={refresh} />
      </div>
    </DashboardLayout>
  );
}
