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
import { useWatch, buildQuizSnapshot } from '@/lib/watch-context';
import {
  createQuizProgress,
  recordAnswer,
  countCorrect,
  countIncorrect,
  countAnswered,
} from '@/lib/quiz-lifecycle';

interface AnswerOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: AnswerOption[];
  explanation: string;
  subject: string;
  system: string;
  difficulty: string;
  images?: { url: string; caption?: string }[];
}

interface QuizAttempt {
  timestamp: number;
  subject: string | null;
  system: string | null;
  total: number;
  correct: number;
  timeSpentSeconds: number;
}

function postQuizActivity(body: { activity?: unknown; attempt?: QuizAttempt }): Promise<boolean> {
  return fetch('/api/quiz-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((res) => res.ok)
    .catch(() => false);
}

// Renders inside DashboardLayout so useWatch() resolves against the
// WatchProvider DashboardLayout mounts, not a disconnected instance above it.
function QuizActivitySync({
  questions,
  currentQuestion,
  currentIndex,
  isSubmitted,
  selectedIndex,
  correctCount,
  answeredCount,
}: {
  questions: Question[];
  currentQuestion: Question | undefined;
  currentIndex: number;
  isSubmitted: boolean;
  selectedIndex: number | null;
  correctCount: number;
  answeredCount: number;
}) {
  const { watchEnabled, setActivity } = useWatch();

  useEffect(() => {
    if (!currentQuestion) return;
    const snapshot = buildQuizSnapshot(
      currentQuestion,
      currentIndex + 1,
      questions.length,
      isSubmitted,
      selectedIndex !== null,
      isSubmitted ? (currentQuestion.options[selectedIndex!]?.isCorrect ?? null) : null,
      correctCount,
      answeredCount,
      selectedIndex
    );
    // Persisted to Supabase (quiz_live_activity) unconditionally so an
    // in-progress quiz is observable server-side; local Clea awareness
    // stays gated on watch mode.
    postQuizActivity({ activity: snapshot });
    if (!watchEnabled) return;
    setActivity(snapshot);
    return () => setActivity(null);
  }, [watchEnabled, questions, currentQuestion, currentIndex, isSubmitted, selectedIndex, correctCount, answeredCount, setActivity]);

  return null;
}

export function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject');
  const system = searchParams.get('system');
  const limit = searchParams.get('limit') || '20';

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [progress, setProgress] = useState(createQuizProgress());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
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

  const correctCount = countCorrect(progress);
  const incorrectCount = countIncorrect(progress);
  const answeredCount = countAnswered(progress);

  const handleSubmit = () => {
    if (selectedIndex === null || !currentQuestion) return;
    const isCorrect = currentQuestion.options[selectedIndex]?.isCorrect ?? false;
    setProgress((p) => recordAnswer(p, currentQuestion.id, isCorrect, selectedIndex));
    setIsSubmitted(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const finishQuiz = () => {
    if (!questions || isSaving) return;
    setIsSaving(true);
    const attempt = {
      timestamp: Date.now(),
      subject,
      system,
      total: countAnswered(progress),
      correct: countCorrect(progress),
      timeSpentSeconds: elapsedTime,
    };
    postQuizActivity({ attempt })
      .then((ok) => {
        if (!ok) {
          setAttemptError('Could not save this attempt. Your score may not be recorded.');
          setIsSaving(false);
          return;
        }
        router.push('/dashboard');
      })
      .catch(() => {
        setAttemptError('Could not save this attempt. Your score may not be recorded.');
        setIsSaving(false);
      });
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
      <QuizActivitySync
        questions={questions}
        currentQuestion={currentQuestion}
        currentIndex={currentIndex}
        isSubmitted={isSubmitted}
        selectedIndex={selectedIndex}
        correctCount={correctCount}
        answeredCount={answeredCount}
      />
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
                <p className="text-sm font-semibold text-neutral-900">{incorrectCount}</p>
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

                {(currentQuestion.images && currentQuestion.images.length > 0) && (
                  <div className="mt-4 space-y-3">
                    {currentQuestion.images.map((img, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50">
                        <img
                          src={img.url}
                          alt={img.caption || `Question image ${i + 1}`}
                          className="w-full max-h-80 object-contain"
                        />
                        {img.caption && (
                          <p className="px-3 py-2 text-xs text-neutral-500 border-t border-neutral-200">{img.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  <button onClick={handleNext} disabled={isSaving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isLastQuestion ? 'Complete Quiz' : 'Next Question'}
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
                {attemptError && (
                  <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3 mt-3">{attemptError}</p>
                )}
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
