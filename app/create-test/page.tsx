'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircleIcon, CheckIcon } from '@heroicons/react/24/solid';

interface Filters {
  subjects: string[];
  systems: string[];
  total: number;
}

export default function CreateTest() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);

  useEffect(() => {
    fetch('/api/quiz-data?mode=filters')
      .then((res) => res.json())
      .then(setFilters);
  }, []);

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const toggleSystem = (name: string) => {
    setSelectedSystems((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedSubjects.length === 1) params.set('subject', selectedSubjects[0]);
    if (selectedSystems.length === 1) params.set('system', selectedSystems[0]);
    params.set('limit', String(questionCount));
    router.push(`/quiz?${params.toString()}`);
  };

  if (!filters) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E7490] mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading question bank...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleCreateTest} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create New Test</h1>
            <p className="text-base text-neutral-600">{filters.total} questions in the bank — filter by subject or system, or leave blank for a mixed quiz</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">Subject</h2>
                  <button type="button" onClick={() => setSelectedSubjects([])} className="text-xs text-[#0E7490] hover:text-[#155E75] font-semibold hover:bg-[#ECFEFF] px-3 py-1 rounded-lg transition-colors">
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filters.subjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`relative p-3.5 rounded-xl border text-left transition-all group ${
                          isSelected ? 'border-[#0E7490] bg-[#ECFEFF]' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#0E7490] border-[#0E7490]' : 'border-neutral-300 group-hover:border-neutral-400'}`}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                          </div>
                          <p className="font-semibold text-xs text-neutral-900">{subject}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">System</h2>
                  <button type="button" onClick={() => setSelectedSystems([])} className="text-xs text-[#0E7490] hover:text-[#155E75] font-semibold hover:bg-[#ECFEFF] px-3 py-1 rounded-lg transition-colors">
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filters.systems.map((system) => {
                    const isSelected = selectedSystems.includes(system);
                    return (
                      <button
                        key={system}
                        type="button"
                        onClick={() => toggleSystem(system)}
                        className={`relative p-3.5 rounded-xl border text-left transition-all group ${
                          isSelected ? 'border-[#0E7490] bg-[#ECFEFF]' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#0E7490] border-[#0E7490]' : 'border-neutral-300 group-hover:border-neutral-400'}`}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                          </div>
                          <p className="font-semibold text-xs text-neutral-900">{system}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-neutral-900 mb-4">Test Settings</h3>
                <div className="mb-5">
                  <label className="block text-xs font-medium text-neutral-700 mb-2">Number of Questions</label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0E7490] transition-colors"
                  />
                </div>
              </div>

              <div className="bg-[#ECFEFF] rounded-2xl border border-[#0E7490]/20 p-6">
                <h3 className="text-base font-bold text-neutral-900 mb-3">Test Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Subject:</span>
                    <span className="font-semibold text-neutral-900">{selectedSubjects.length === 1 ? selectedSubjects[0] : selectedSubjects.length > 1 ? 'Multiple (pick one)' : 'Mixed'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">System:</span>
                    <span className="font-semibold text-neutral-900">{selectedSystems.length === 1 ? selectedSystems[0] : selectedSystems.length > 1 ? 'Multiple (pick one)' : 'Mixed'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Questions:</span>
                    <span className="font-semibold text-neutral-900">{questionCount}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={selectedSubjects.length > 1 || selectedSystems.length > 1}
                className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-base transition-all ${
                  selectedSubjects.length > 1 || selectedSystems.length > 1 ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' : 'btn-primary hover:shadow-lg active:scale-95'
                }`}
              >
                <PlusCircleIcon className="w-5 h-5" />
                Create Test & Start
              </button>
              {(selectedSubjects.length > 1 || selectedSystems.length > 1) && (
                <p className="text-sm text-neutral-600 text-center bg-neutral-50 rounded-lg p-3">
                  Pick a single subject and/or system to filter by
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
