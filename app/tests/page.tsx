'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { getQuizAttempts, QuizAttempt } from '@/lib/quizAttempts';

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  return mins < 1 ? '<1 min' : `${mins} min`;
}

export default function Tests() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    getQuizAttempts().then((a) => setAttempts([...a].reverse()));
  }, []);

  const avgScore =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.correct / a.total, 0) / attempts.length) * 100)
      : 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Tests</h1>
            <p className="text-neutral-600">Your quiz history</p>
          </div>
          <Link href="/create-test" className="btn-primary">
            Create New Test
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <p className="text-sm text-neutral-600 mb-1">Total Tests</p>
            <p className="text-3xl font-bold text-neutral-900">{attempts.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-600 mb-1">Avg Score</p>
            <p className="text-3xl font-bold text-primary-600">{avgScore}%</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Tests</h3>
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500 mb-4">No tests yet</p>
              <Link href="/create-test" className="btn-primary">Start your first test →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((test) => {
                const score = test.total > 0 ? Math.round((test.correct / test.total) * 100) : 0;
                return (
                  <div
                    key={test.timestamp}
                    className="p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-300 hover:bg-neutral-50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-neutral-900">{test.subject || test.system || 'Mixed'} Quiz</h4>
                          <span className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <CheckCircleIcon className="w-3 h-3" />
                            Completed
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-600">
                          <span>{new Date(test.timestamp).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{test.total} questions</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {formatDuration(test.timeSpentSeconds)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-600 mb-1">Score</p>
                        <p className={`text-3xl font-bold ${score >= 80 ? 'text-neutral-900' : score >= 60 ? 'text-neutral-700' : 'text-neutral-500'}`}>
                          {score}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
