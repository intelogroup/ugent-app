'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  FlagIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/solid';

interface AnswerOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: AnswerOption[];
  correctAnswer: string;
  explanation: string;
  subject: string;
  system: string;
  difficulty: string;
}

interface QuizAttempt {
  timestamp: number;
  subject: string | null;
  system: string | null;
  total: number;
  correct: number;
  timeSpentSeconds: number;
}

function saveAttempt(attempt: QuizAttempt) {
  const key = 'quiz-attempts';
  const existing: QuizAttempt[] = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(attempt);
  localStorage.setItem(key, JSON.stringify(existing));
}

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject');
  const system = searchParams.get('system');
  const limit = searchParams.get('limit') || '20';

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (system) params.set('system', system);
    params.set('limit', limit);
    fetch(`/api/quiz-data?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions));
  }, [subject, system, limit]);

  useEffect(() => {
    if (isPaused || !questions) return;
    timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, questions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions?.[currentIndex];
  const isLastQuestion = questions ? currentIndex === questions.length - 1 : false;

  const handleSubmit = () => {
    if (selectedIndex === null || !currentQuestion) return;
    const isCorrect = currentQuestion.options[selectedIndex]?.isCorrect ?? false;
    if (isCorrect) setCorrectCount((c) => c + 1);
    setIsSubmitted(true);
  };

  const finishQuiz = () => {
    if (!questions) return;
    saveAttempt({
      timestamp: Date.now(),
      subject,
      system,
      total: questions.length,
      correct: correctCount,
      timeSpentSeconds: elapsedTime,
    });
    router.push('/dashboard');
  };

  const handleNext = () => {
    if (!questions) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setIsSubmitted(false);
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setSelectedIndex(null);
      setIsSubmitted(false);
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  if (!questions) {
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

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-neutral-900 font-semibold mb-2">No questions match this filter</p>
            <button onClick={() => router.push('/create-test')} className="btn-primary mt-4">
              Create New Test
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isFlagged = flagged.has(currentIndex);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                {subject || system || 'Mixed'} Quiz
              </h1>
              <p className="text-sm text-neutral-500">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <button onClick={() => setIsPaused(!isPaused)} className="btn-secondary flex items-center gap-2 px-3 py-2">
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

          <div className="relative w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Time Spent</p>
                <p className="text-sm font-semibold text-neutral-900">{formatTime(elapsedTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-neutral-700" />
              <div>
                <p className="text-xs text-neutral-500">Correct</p>
                <p className="text-sm font-semibold text-neutral-900">{correctCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircleIcon className="w-5 h-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">Incorrect</p>
                <p className="text-sm font-semibold text-neutral-900">{currentIndex + (isSubmitted ? 1 : 0) - correctCount}</p>
              </div>
            </div>
          </div>
        </div>

        {currentQuestion && (
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs font-semibold">
                    {currentQuestion.difficulty?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
                <p className="text-lg text-neutral-900 leading-relaxed">{currentQuestion.text}</p>
              </div>
              <button
                onClick={toggleFlag}
                className={`ml-4 p-2 rounded-lg transition-colors ${
                  isFlagged ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
              >
                <FlagIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedIndex === index;
                const showCorrect = isSubmitted && option.isCorrect;
                const showIncorrect = isSubmitted && isSelected && !option.isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => !isSubmitted && setSelectedIndex(index)}
                    disabled={isSubmitted}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSubmitted
                        ? showCorrect
                          ? 'border-neutral-900 bg-neutral-50'
                          : showIncorrect
                          ? 'border-neutral-300 bg-neutral-50'
                          : 'border-neutral-200 bg-neutral-50'
                        : isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                          isSubmitted
                            ? showCorrect
                              ? 'bg-neutral-900 text-white'
                              : showIncorrect
                              ? 'bg-neutral-300 text-neutral-700'
                              : 'bg-neutral-200 text-neutral-700'
                            : isSelected
                            ? 'bg-primary-500 text-white'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {isSubmitted ? (
                          showCorrect ? (
                            <CheckCircleIcon className="w-5 h-5" />
                          ) : showIncorrect ? (
                            <XCircleIcon className="w-5 h-5" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </div>
                      <span className="flex-1 text-neutral-900">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={selectedIndex === null}
                className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <div className="mt-6 space-y-4">
                <div
                  className={`p-4 rounded-lg ${
                    currentQuestion.options[selectedIndex!]?.isCorrect
                      ? 'bg-neutral-50 border-2 border-neutral-900'
                      : 'bg-neutral-50 border-2 border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {currentQuestion.options[selectedIndex!]?.isCorrect ? (
                      <>
                        <CheckCircleIcon className="w-6 h-6 text-neutral-900" />
                        <h3 className="font-semibold text-neutral-900">Correct!</h3>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="w-6 h-6 text-neutral-500" />
                        <h3 className="font-semibold text-neutral-500">Incorrect</h3>
                      </>
                    )}
                  </div>
                  {currentQuestion.explanation && (
                    <p className="text-neutral-700">{currentQuestion.explanation}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Previous
                  </button>
                  <button onClick={handleNext} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {isLastQuestion ? 'Complete Quiz' : 'Next Question'}
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isPaused && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card max-w-md">
              <div className="text-center">
                <PauseIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Quiz Paused</h2>
                <p className="text-neutral-600 mb-6">Progress in this session is kept until you leave.</p>
                <div className="flex gap-3">
                  <button onClick={() => router.push('/dashboard')} className="btn-secondary flex-1">
                    Exit Quiz
                  </button>
                  <button onClick={() => setIsPaused(false)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <PlayIcon className="w-4 h-4" />
                    Resume
                  </button>
                </div>
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
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading quiz...</p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
