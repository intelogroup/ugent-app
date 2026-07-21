'use client';

import { TrophyIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { removeStudyBuddy, type LeaderboardRow } from '@/lib/leaderboard';

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  onChanged: () => void;
}

export default function LeaderboardTable({ rows, onChanged }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="card text-center py-12">
        <TrophyIcon className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600">No leaderboard entries yet.</p>
        <p className="text-sm text-neutral-500 mt-1">Take a quiz or add a study buddy below.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3 w-16">
                Rank
              </th>
              <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">
                Student
              </th>
              <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">
                Avg Score
              </th>
              <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">
                Tests
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={row.isCurrentUser ? 'bg-primary-50/50' : 'hover:bg-neutral-50/80'}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      row.rank === 1
                        ? 'bg-amber-100 text-amber-700'
                        : row.rank === 2
                          ? 'bg-neutral-200 text-neutral-700'
                          : row.rank === 3
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={row.avatarSrc}
                      alt={row.avatarAlt}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {row.name}
                        {row.isCurrentUser && (
                          <span className="ml-2 text-xs font-normal text-primary-600">You</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-neutral-900">{row.averageScore}%</span>
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  <span className="text-sm text-neutral-600">{row.testsCompleted}</span>
                </td>
                <td className="px-2 py-3">
                  {!row.isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        removeStudyBuddy(row.id);
                        onChanged();
                      }}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                      title="Remove study buddy"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
