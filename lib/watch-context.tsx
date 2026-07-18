'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const STORAGE_KEY = 'clea-watch-enabled';

export type ActivitySnapshot = {
  page: 'quiz';
  questionNumber: number;
  totalQuestions: number;
  subject: string | null;
  system: string | null;
  difficulty: string;
  isAnswered: boolean;
  correctSoFar: number;
  totalAnsweredSoFar: number;
};

type WatchContextValue = {
  watchEnabled: boolean;
  toggleWatch: () => void;
  activity: ActivitySnapshot | null;
  setActivity: (activity: ActivitySnapshot | null) => void;
};

const WatchContext = createContext<WatchContextValue>({
  watchEnabled: false,
  toggleWatch: () => {},
  activity: null,
  setActivity: () => {},
});

export function WatchProvider({ children }: { children: ReactNode }) {
  const [watchEnabled, setWatchEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [activity, setActivity] = useState<ActivitySnapshot | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(watchEnabled));
  }, [watchEnabled]);

  const toggleWatch = () => setWatchEnabled((enabled) => !enabled);

  return (
    <WatchContext.Provider value={{ watchEnabled, toggleWatch, activity, setActivity }}>
      {children}
    </WatchContext.Provider>
  );
}

export function useWatch() {
  return useContext(WatchContext);
}

export function buildQuizSnapshot(
  question: { subject: string; system: string; difficulty: string },
  questionNumber: number,
  totalQuestions: number,
  isAnswered: boolean,
  correctSoFar: number,
  totalAnsweredSoFar: number
): ActivitySnapshot {
  return {
    page: 'quiz',
    questionNumber,
    totalQuestions,
    subject: question.subject,
    system: question.system,
    difficulty: question.difficulty,
    isAnswered,
    correctSoFar,
    totalAnsweredSoFar,
  };
}

export function buildWatchReply(baseReply: string, activity: ActivitySnapshot | null): string {
  if (!activity) return baseReply;
  const subjectLabel = activity.subject ? ` (${activity.subject})` : '';
  return `${baseReply} I can see you're on question ${activity.questionNumber} of ${activity.totalQuestions}${subjectLabel} — once my full tutoring is live, I'll use that directly.`;
}
