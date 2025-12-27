'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { 
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  ChartBarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid';

const tests = [
  {
    id: 1,
    name: 'Cardiovascular System Quiz',
    date: '2024-12-19',
    status: 'completed',
    score: 88,
    questions: 20,
    timeSpent: '32 min',
    topics: ['Cardiology', 'ECG'],
  },
  {
    id: 2,
    name: 'Pharmacology Mixed Topics',
    date: '2024-12-18',
    status: 'completed',
    score: 72,
    questions: 25,
    timeSpent: '41 min',
    topics: ['Drug Mechanisms', 'Side Effects'],
  },
  {
    id: 3,
    name: 'Neurology Practice Test',
    date: '2024-12-17',
    status: 'in-progress',
    score: null,
    questions: 30,
    progress: 15,
    topics: ['Neuroanatomy', 'CNS Disorders'],
  },
  {
    id: 4,
    name: 'General Pathology Review',
    date: '2024-12-15',
    status: 'completed',
    score: 91,
    questions: 40,
    timeSpent: '58 min',
    topics: ['Inflammation', 'Neoplasia'],
  },
  {
    id: 5,
    name: 'Biochemistry Fundamentals',
    date: '2024-12-14',
    status: 'completed',
    score: 76,
    questions: 20,
    timeSpent: '28 min',
    topics: ['Metabolism', 'Enzymes'],
  },
];

export default function Tests() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Tests</h1>
            <p className="text-neutral-600">View and manage your quiz history</p>
          </div>
          <Link href="/create-test" className="btn-primary">
            Create New Test
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <p className="text-sm text-neutral-600 mb-1">Total Tests</p>
            <p className="text-3xl font-bold text-neutral-900">127</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-secondary-green">91</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-600 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-secondary-blue">1</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-600 mb-1">Avg Score</p>
            <p className="text-3xl font-bold text-primary-600">82.4%</p>
          </div>
        </div>

        {/* Tests List */}
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Tests</h3>
          <div className="space-y-3">
            {tests.map((test) => (
              <div
                key={test.id}
                className="p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-300 hover:bg-neutral-50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-neutral-900">{test.name}</h4>
                      {test.status === 'completed' ? (
                        <span className="bg-secondary-green/10 text-secondary-green px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="bg-secondary-blue/10 text-secondary-blue px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <PlayIcon className="w-3 h-3" />
                          In Progress
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-neutral-600 mb-2">
                      <span>{test.date}</span>
                      <span>•</span>
                      <span>{test.questions} questions</span>
                      {test.timeSpent && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {test.timeSpent}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {test.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="bg-neutral-100 text-neutral-700 px-2 py-1 rounded text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    {test.status === 'in-progress' && test.progress && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-neutral-600 mb-1">
                          <span>Progress</span>
                          <span>{test.progress}/{test.questions}</span>
                        </div>
                        <div className="relative w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-secondary-blue transition-all"
                            style={{ width: `${(test.progress / test.questions) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {test.status === 'completed' && test.score !== null && (
                      <div className="text-right">
                        <p className="text-sm text-neutral-600 mb-1">Score</p>
                        <p className={`text-3xl font-bold ${
                          test.score >= 80 ? 'text-secondary-green' :
                          test.score >= 60 ? 'text-secondary-yellow' :
                          'text-secondary-pink'
                        }`}>
                          {test.score}%
                        </p>
                      </div>
                    )}
                    
                    <button className="btn-secondary flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {test.status === 'completed' ? 'Review' : 'Continue'}
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="mt-6 text-center">
            <button className="text-primary-600 hover:text-primary-700 font-medium">
              Load More Tests
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
