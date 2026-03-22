'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  FlagIcon,
  LightBulbIcon,
  PauseIcon,
  PlayIcon
} from '@heroicons/react/24/solid';

interface AnswerOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  _id: Id<"questions">;
  text: string;
  explanation: string;
  difficulty?: string;
  options: AnswerOption[];
}

interface TestQuestion extends Question {
  displayOrder: number;
}

interface QuizState {
  currentQuestionIndex: number;
  selectedAnswerIndex: number | null;
  isSubmitted: boolean;
  flaggedQuestions: Set<string>;
  questionStartTime: number;
  answerResults: Map<string, {
    isCorrect: boolean;
    explanation?: string;
  }>;
}

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId') as Id<"tests"> | null;
  
  const user = useQuery(api.users.getCurrentUser);
  const testData = useQuery(api.tests.getTestById, testId ? { testId } : "skip");
  const submitAnswerMutation = useMutation(api.tests.submitAnswer);
  const completeSessionMutation = useMutation(api.tests.completeSession);
  const updateTestStatusMutation = useMutation(api.tests.updateTestStatus);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    selectedAnswerIndex: null,
    isSubmitted: false,
    flaggedQuestions: new Set(),
    questionStartTime: Date.now(),
    answerResults: new Map(),
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<number>(0);

  // Load saved progress from localStorage
  useEffect(() => {
    if (!testId) return;

    const savedState = localStorage.getItem(`quiz-state-${testId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setQuizState({
          ...parsed,
          flaggedQuestions: new Set(parsed.flaggedQuestions),
          answerResults: new Map(parsed.answerResults),
        });
      } catch (err) {
        console.error('[QUIZ] Failed to load saved state:', err);
      }
    }
  }, [testId]);

  // Save progress to localStorage
  useEffect(() => {
    if (!testId) return;

    const stateToSave = {
      ...quizState,
      flaggedQuestions: Array.from(quizState.flaggedQuestions),
      answerResults: Array.from(quizState.answerResults.entries()),
    };

    localStorage.setItem(`quiz-state-${testId}`, JSON.stringify(stateToSave));
  }, [quizState, testId]);

  // Timer for total elapsed time
  useEffect(() => {
    if (isPaused || !testData) return;

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      questionTimerRef.current += 1;
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, testData]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const questions = testData?.questions || [];
  const currentQuestion = questions[quizState.currentQuestionIndex];

  // Submit answer
  const handleSubmit = async () => {
    if (quizState.selectedAnswerIndex === null || !testId || !user || !currentQuestion) return;

    try {
      const result = await submitAnswerMutation({
        userId: user._id,
        testId,
        questionId: currentQuestion._id,
        selectedOptionIndex: quizState.selectedAnswerIndex,
        timeSpent: questionTimerRef.current,
      });

      // Store result
      setQuizState(prev => ({
        ...prev,
        isSubmitted: true,
        answerResults: new Map(prev.answerResults).set(currentQuestion._id, {
          isCorrect: result.isCorrect || false,
          explanation: currentQuestion.explanation,
        }),
      }));
    } catch (err) {
      console.error('Failed to submit answer:', err);
      alert('Failed to submit answer. Please try again.');
    }
  };

  // Navigate to next question
  const handleNext = () => {
    if (quizState.currentQuestionIndex < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedAnswerIndex: null,
        isSubmitted: false,
        questionStartTime: Date.now(),
      }));
      questionTimerRef.current = 0;
    } else {
      // Last question - complete the test
      handleCompleteTest();
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
        selectedAnswerIndex: null,
        isSubmitted: false,
        questionStartTime: Date.now(),
      }));
      questionTimerRef.current = 0;
    }
  };

  // Toggle flag
  const handleToggleFlag = () => {
    if (!currentQuestion) return;

    setQuizState(prev => {
      const newFlags = new Set(prev.flaggedQuestions);
      if (newFlags.has(currentQuestion._id)) {
        newFlags.delete(currentQuestion._id);
      } else {
        newFlags.add(currentQuestion._id);
      }
      return { ...prev, flaggedQuestions: newFlags };
    });
  };

  // Complete test
  const handleCompleteTest = async () => {
    if (!testId || !user) return;

    try {
      await completeSessionMutation({
        testId,
        userId: user._id,
        durationMs: elapsedTime * 1000,
      });

      // Clear saved state
      localStorage.removeItem(`quiz-state-${testId}`);

      // Redirect to results (assuming results page exists and uses testId)
      router.push(`/tests`); // Or a specific results page if implemented
    } catch (err) {
      console.error('Failed to complete test:', err);
      alert('Failed to complete test. Please try again.');
    }
  };

  // Loading state
  if (testData === undefined || user === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading quiz...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (!testData || !testId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <XCircleIcon className="w-12 h-12 text-secondary-pink mx-auto mb-4" />
            <p className="text-neutral-900 font-semibold mb-2">
              Test not found or no test ID provided
            </p>
            <button
              onClick={() => router.push('/create-test')}
              className="btn-primary mt-4"
            >
              Create New Test
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-neutral-900 font-semibold mb-2">No questions available</p>
            <button
              onClick={() => router.push('/tests')}
              className="btn-primary mt-4"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentAnswer = currentQuestion ? quizState.answerResults.get(currentQuestion._id) : null;
  const isFlagged = currentQuestion ? quizState.flaggedQuestions.has(currentQuestion._id) : false;
  const isLastQuestion = quizState.currentQuestionIndex === questions.length - 1;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Quiz Header */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                {testData?.title || 'Quiz Session'}
              </h1>
              <p className="text-sm text-neutral-500">
                Question {quizState.currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {testData?.questionMode === 'PRACTICE' && (
                <div className="ai-badge">
                  <SparklesIcon className="w-4 h-4" />
                  AI Active
                </div>
              )}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="btn-secondary flex items-center gap-2 px-3 py-2"
              >
                {isPaused ? (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <PauseIcon className="w-4 h-4" />
                    Pause
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((quizState.currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Time Spent</p>
                <p className="text-sm font-semibold text-neutral-900">{formatTime(elapsedTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-secondary-green" />
              <div>
                <p className="text-xs text-neutral-500">Correct</p>
                <p className="text-sm font-semibold text-neutral-900">{testData?.totalCorrect || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircleIcon className="w-5 h-5 text-secondary-pink" />
              <div>
                <p className="text-xs text-neutral-500">Incorrect</p>
                <p className="text-sm font-semibold text-neutral-900">{testData?.totalIncorrect || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs font-semibold">
                    {currentQuestion.difficulty?.toUpperCase() || "MEDIUM"}
                  </span>
                </div>
                <p className="text-lg text-neutral-900 leading-relaxed">
                  {currentQuestion.text}
                </p>
              </div>
              <button
                onClick={handleToggleFlag}
                className={`ml-4 p-2 rounded-lg transition-colors ${
                  isFlagged ? 'bg-secondary-yellow text-neutral-900' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
              >
                <FlagIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = quizState.selectedAnswerIndex === index;
                const showCorrect = quizState.isSubmitted && option.isCorrect;
                const showIncorrect = quizState.isSubmitted && isSelected && !option.isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => !quizState.isSubmitted && setQuizState(prev => ({ ...prev, selectedAnswerIndex: index }))}
                    disabled={quizState.isSubmitted}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${quizState.isSubmitted
                        ? showCorrect
                          ? 'border-secondary-green bg-secondary-green/10'
                          : showIncorrect
                          ? 'border-secondary-pink bg-secondary-pink/10'
                          : 'border-neutral-200 bg-neutral-50'
                        : isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                        ${quizState.isSubmitted
                          ? showCorrect
                            ? 'bg-secondary-green text-white'
                            : showIncorrect
                            ? 'bg-secondary-pink text-white'
                            : 'bg-neutral-200 text-neutral-700'
                          : isSelected
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-700'
                        }
                      `}>
                        {quizState.isSubmitted ? (
                          showCorrect ? <CheckCircleIcon className="w-5 h-5" /> :
                          showIncorrect ? <XCircleIcon className="w-5 h-5" /> :
                          String.fromCharCode(65 + index)
                        ) : String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 text-neutral-900">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            {!quizState.isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={quizState.selectedAnswerIndex === null}
                className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <div className="mt-6 space-y-4">
                {/* Result Banner */}
                <div className={`p-4 rounded-lg ${
                  currentAnswer?.isCorrect
                    ? 'bg-secondary-green/10 border-2 border-secondary-green'
                    : 'bg-secondary-pink/10 border-2 border-secondary-pink'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {currentAnswer?.isCorrect ? (
                      <>
                        <CheckCircleIcon className="w-6 h-6 text-secondary-green" />
                        <h3 className="font-semibold text-secondary-green">
                          Correct!
                        </h3>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="w-6 h-6 text-secondary-pink" />
                        <h3 className="font-semibold text-secondary-pink">Incorrect</h3>
                      </>
                    )}
                  </div>
                  {currentQuestion.explanation && (
                    <p className="text-neutral-700 mb-3">{currentQuestion.explanation}</p>
                  )}

                  {/* AI Insight - only in PRACTICE mode */}
                  {testData?.questionMode === 'PRACTICE' && (
                    <div className="bg-gradient-to-r from-primary-500/10 to-secondary-purple/10 border border-primary-500/20 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <LightBulbIcon className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-primary-600 mb-1">AI INSIGHT</p>
                          <p className="text-sm text-neutral-700">
                            Keep practicing questions like this to improve your understanding.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    onClick={handlePrevious}
                    disabled={quizState.currentQuestionIndex === 0}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isLastQuestion ? 'Complete Quiz' : 'Next Question'}
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card max-w-md">
              <div className="text-center">
                <PauseIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Quiz Paused</h2>
                <p className="text-neutral-600 mb-6">
                  Your progress has been saved. Click resume to continue.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/tests')}
                    className="btn-secondary flex-1"
                  >
                    Exit Quiz
                  </button>
                  <button
                    onClick={() => setIsPaused(false)}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Resume
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Summary Card */}
        {testData?.questionMode === 'PRACTICE' && !isPaused && (
          <div className="card bg-gradient-to-br from-primary-50 to-white border border-primary-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">AI is adapting to your performance</h3>
                <p className="text-sm text-neutral-600">
                  Based on your answers, the next questions will focus on areas where you need more practice.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading quiz...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <QuizContent />
    </Suspense>
  );
}
