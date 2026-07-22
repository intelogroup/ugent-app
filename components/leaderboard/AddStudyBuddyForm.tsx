'use client';

import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { addStudyBuddy } from '@/lib/leaderboard';

interface AddStudyBuddyFormProps {
  onAdded: () => void;
}

export default function AddStudyBuddyForm({ onAdded }: AddStudyBuddyFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [averageScore, setAverageScore] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const score = Number.parseFloat(averageScore);
    addStudyBuddy({
      name: trimmed,
      averageScore: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0,
      testsCompleted: 0,
    });

    setName('');
    setAverageScore('');
    setIsOpen(false);
    onAdded();
  };

  return (
    <div className="card">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <PlusIcon className="w-4 h-4" />
          Add study buddy (local)
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Add study buddy</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Stored on this device only — for comparing progress offline.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alex M."
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Average score (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={averageScore}
              onChange={(event) => setAverageScore(event.target.value)}
              placeholder="72"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary">
              Add buddy
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
