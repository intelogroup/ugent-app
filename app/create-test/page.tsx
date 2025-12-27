'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  SparklesIcon,
  PlusCircleIcon,
  CheckIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';

interface Subject {
  id: string;
  name: string;
  questionCount: number;
}

interface Topic {
  id: string;
  name: string;
  questionCount: number;
}

interface System {
  id: string;
  name: string;
  questionCount: number;
  topics: Topic[];
}

export default function CreateTest() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [expandedSystems, setExpandedSystems] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [testMode, setTestMode] = useState<'tutor' | 'timed'>('tutor');
  const [questionMode, setQuestionMode] = useState<'standard' | 'custom' | 'practice'>('standard');
  const [useAI, setUseAI] = useState(true);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch subjects and systems from database
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [subjectsRes, systemsRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch('/api/systems')
        ]);

        const subjectsData = await subjectsRes.json();
        const systemsData = await systemsRes.json();

        setSubjects(subjectsData.subjects || []);
        setSystems(systemsData.systems || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setShowValidationErrors(false);
  };

  const toggleSystem = (id: string) => {
    setSelectedSystems(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setShowValidationErrors(false);
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]
    );
    setShowValidationErrors(false);
  };

  const toggleSystemExpanded = (systemId: string) => {
    setExpandedSystems(prev =>
      prev.includes(systemId) ? prev.filter(s => s !== systemId) : [...prev, systemId]
    );
  };

  const availableQuestionsSubjects = subjects
    .filter(s => selectedSubjects.includes(s.id))
    .reduce((sum, s) => sum + s.questionCount, 0);

  const availableQuestionsTopics = selectedTopics.length > 0
    ? systems
        .flatMap(sys => sys.topics)
        .filter(topic => selectedTopics.includes(topic.id))
        .reduce((sum, topic) => sum + topic.questionCount, 0)
    : 0;

  const availableQuestions = availableQuestionsSubjects + availableQuestionsTopics;
  const totalSelected = selectedSubjects.length + selectedTopics.length;

  // Require at least one subject, topic, or system to be selected
  const isSelectionValid = selectedSubjects.length > 0 || selectedTopics.length > 0 || selectedSystems.length > 0;
  const isQuestionCountValid = questionCount > 0 && (availableQuestions === 0 || questionCount <= availableQuestions);
  const isFormValid = isSelectionValid && isQuestionCountValid;

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setShowValidationErrors(true);
      return;
    }

    // Verify user is authenticated
    if (!user) {
      alert('You must be logged in to create a test.');
      router.push('/login');
      return;
    }

    setCreating(true);

    try {
      // Create test via API
      const response = await fetch('/api/tests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          subjects: selectedSubjects,
          topics: selectedTopics,
          systems: selectedSystems,
          questionCount,
          testMode: testMode.toUpperCase(),
          questionMode: questionMode.toUpperCase(),
          useAI,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create test');
      }

      const data = await response.json();
      const testId = data.test?.id;

      if (!testId) {
        throw new Error('Test ID not received from server');
      }

      // Redirect to quiz page with test ID
      router.push(`/quiz?testId=${testId}`);
    } catch (error) {
      console.error('Error creating test:', error);
      alert(error instanceof Error ? error.message : 'Failed to create test. Please try again.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
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
          {/* Header */}
          <div className="flex justify-between items-start gap-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create New Test</h1>
              <p className="text-base text-neutral-600">Customize your quiz with AI-powered recommendations</p>
            </div>
            <div className="ai-badge">
              <SparklesIcon className="w-4 h-4" />
              AI Active
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Subjects & Systems */}
            <div className="lg:col-span-2 space-y-8">
              {/* Subjects Section */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Select Subjects
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedSubjects([])}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {/* Error Message */}
                {showValidationErrors && !isSelectionValid && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>
                      Please select at least one subject, topic, or system to create a test
                    </span>
                  </div>
                )}

                {/* Subjects Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {subjects.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-neutral-500">
                      No subjects available in the database
                    </div>
                  ) : (
                    subjects.map((subject) => {
                      const isSelected = selectedSubjects.includes(subject.id);
                      const hasQuestions = subject.questionCount > 0;

                      return (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => hasQuestions && toggleSubject(subject.id)}
                          disabled={!hasQuestions}
                          className={`
                            relative p-4 rounded-lg border-2 text-left transition-all group
                            ${!hasQuestions
                              ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'border-primary-500 bg-primary-50'
                                : showValidationErrors && !isSelectionValid
                                  ? 'border-red-300 hover:border-red-400 bg-red-50'
                                  : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                              ${!hasQuestions
                                ? 'border-neutral-300 bg-neutral-100'
                                : isSelected
                                  ? 'bg-primary-500 border-primary-500'
                                  : 'border-neutral-300 group-hover:border-primary-400'
                              }
                            `}>
                              {isSelected && hasQuestions && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold ${!hasQuestions ? 'text-neutral-400' : 'text-neutral-900'}`}>
                                {subject.name}
                              </p>
                              <p className={`text-sm mt-0.5 ${!hasQuestions ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                {subject.questionCount} Question{subject.questionCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Topics Section */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Select Topics
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedTopics([])}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <p className="text-sm text-neutral-600 mb-4">Choose specific topics within systems (optional - select subjects or topics)</p>

                {/* Topics List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systems.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      No systems available in the database
                    </div>
                  ) : (
                    systems.map((system) => {
                      const isExpanded = expandedSystems.includes(system.id);
                      const systemTopicCount = system.topics.filter(t => selectedTopics.includes(t.id)).length;
                      const systemHasQuestions = system.questionCount > 0;

                      return (
                        <div key={system.id}>
                          <button
                            type="button"
                            onClick={() => toggleSystemExpanded(system.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left group
                              ${!systemHasQuestions
                                ? 'border-neutral-100 bg-neutral-50 opacity-50'
                                : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <ChevronDownIcon
                                className={`w-5 h-5 flex-shrink-0 transition-transform ${
                                  !systemHasQuestions ? 'text-neutral-400' : 'text-neutral-600'
                                } ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold ${!systemHasQuestions ? 'text-neutral-400' : 'text-neutral-900'}`}>
                                  {system.name}
                                </p>
                                <p className={`text-xs mt-0.5 ${!systemHasQuestions ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                  {systemTopicCount > 0 ? `${systemTopicCount} topic${systemTopicCount !== 1 ? 's' : ''} selected` : `${system.topics.length} topics available`}
                                </p>
                              </div>
                            </div>
                          </button>

                          {/* Topics Sub-list */}
                          {isExpanded && (
                            <div className="mt-2 ml-4 pl-4 border-l-2 border-primary-200 space-y-2">
                              {system.topics.map((topic) => {
                                const isSelected = selectedTopics.includes(topic.id);
                                const hasQuestions = topic.questionCount > 0;

                                return (
                                  <button
                                    key={topic.id}
                                    type="button"
                                    onClick={() => hasQuestions && toggleTopic(topic.id)}
                                    disabled={!hasQuestions}
                                    className={`
                                      w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all group
                                      ${!hasQuestions
                                        ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                                        : isSelected
                                          ? 'border-primary-500 bg-primary-50'
                                          : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                                      }
                                    `}
                                  >
                                    <div className={`
                                      w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                                      ${!hasQuestions
                                        ? 'border-neutral-300 bg-neutral-100'
                                        : isSelected
                                          ? 'bg-primary-500 border-primary-500'
                                          : 'border-neutral-300 group-hover:border-primary-400'
                                      }
                                    `}>
                                      {isSelected && hasQuestions && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium text-sm ${!hasQuestions ? 'text-neutral-400' : 'text-neutral-900'}`}>
                                        {topic.name}
                                      </p>
                                      <p className={`text-xs mt-0.5 ${!hasQuestions ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                        {topic.questionCount} question{topic.questionCount !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Configuration */}
            <div className="space-y-6">
              {/* Test Settings Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Test Settings</h3>

                {/* Question Count */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => {
                      setQuestionCount(Number(e.target.value));
                      setShowValidationErrors(false);
                    }}
                    min="1"
                    max={availableQuestions || 100}
                    disabled={!isSelectionValid}
                    className={`w-full px-3 py-2 border-2 rounded-lg text-base font-semibold focus:outline-none transition-colors
                      ${!isSelectionValid
                        ? 'bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed'
                        : showValidationErrors && !isQuestionCountValid
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-neutral-200 focus:border-primary-500'
                      }
                    `}
                  />
                  {isSelectionValid && (
                    <p className="text-sm text-neutral-600 mt-2">
                      Available: <span className="font-semibold">{availableQuestions}</span>
                    </p>
                  )}
                  {!isSelectionValid && (
                    <p className="text-sm text-neutral-500 mt-2">
                      Select subjects/systems first
                    </p>
                  )}
                </div>

                {/* Test Mode */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Test Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTestMode('tutor')}
                      className={`
                        flex-1 p-3 rounded-lg text-center transition-all border-2
                        ${testMode === 'tutor'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm text-neutral-900">Tutor</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestMode('timed')}
                      className={`
                        flex-1 p-3 rounded-lg text-center transition-all border-2
                        ${testMode === 'timed'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm text-neutral-900">Timed Exam</p>
                    </button>
                  </div>
                </div>

                {/* Question Type */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Question Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestionMode('standard')}
                      className={`
                        flex-1 p-3 rounded-lg text-center transition-all border-2
                        ${questionMode === 'standard'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm text-neutral-900">Standard</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionMode('custom')}
                      className={`
                        flex-1 p-3 rounded-lg text-center transition-all border-2
                        ${questionMode === 'custom'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm text-neutral-900">Custom</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionMode('practice')}
                      className={`
                        flex-1 p-3 rounded-lg text-center transition-all border-2
                        ${questionMode === 'practice'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm text-neutral-900">Practice</p>
                    </button>
                  </div>
                </div>

                {/* AI Features Checkbox */}
                <div className="pt-5 border-t border-neutral-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-neutral-900 flex items-center gap-2">
                        AI-Adaptive Learning
                        <SparklesIcon className="w-4 h-4 text-primary-600" />
                      </p>
                      <p className="text-sm text-neutral-600 mt-0.5">Questions adapt to your performance</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border-2 border-primary-200 p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Test Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-700">Subjects</span>
                    <span className="font-semibold text-neutral-900 text-lg">{selectedSubjects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-700">Topics</span>
                    <span className="font-semibold text-neutral-900 text-lg">{selectedTopics.length}</span>
                  </div>
                  <div className="border-t-2 border-primary-200 pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-neutral-700">Total Selected</span>
                      <span className="font-semibold text-neutral-900 text-lg">{totalSelected}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-700">Available Q's:</span>
                      <span className="font-semibold text-neutral-900">{availableQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-700">Questions:</span>
                      <span className="font-semibold text-neutral-900">{questionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-700">Mode:</span>
                      <span className="font-semibold text-neutral-900">
                        {testMode === 'tutor' ? 'Tutor' : 'Exam'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-700">Type:</span>
                      <span className="font-semibold text-neutral-900">
                        {questionMode === 'standard' ? 'Standard' : questionMode === 'custom' ? 'Custom' : 'Practice'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-700">AI Features:</span>
                      <span className={`font-semibold ${useAI ? 'text-primary-600' : 'text-neutral-600'}`}>
                        {useAI ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <button
                type="submit"
                disabled={!isFormValid || creating}
                className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-base transition-all
                  ${isFormValid && !creating
                    ? 'btn-primary hover:shadow-lg active:scale-95'
                    : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                  }
                `}
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Test...
                  </>
                ) : (
                  <>
                    <PlusCircleIcon className="w-5 h-5" />
                    Create Test & Start
                  </>
                )}
              </button>
              {!isFormValid && (
                <p className="text-sm text-neutral-600 text-center bg-neutral-50 rounded-lg p-3">
                  {!isSelectionValid
                    ? selectedSubjects.length === 0 && selectedTopics.length === 0
                      ? '📚 Select at least one subject AND one topic'
                      : selectedSubjects.length === 0
                        ? '📚 Select at least one subject'
                        : '📋 Select at least one topic'
                    : !isQuestionCountValid
                      ? '🔢 Enter a valid question count'
                      : '✓ Ready to create'}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
