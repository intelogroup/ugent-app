export interface QuizAttempt {
  timestamp: number;
  subject: string | null;
  system: string | null;
  total: number;
  correct: number;
  timeSpentSeconds: number;
}

export function getQuizAttempts(): QuizAttempt[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('quiz-attempts') || '[]');
  } catch {
    return [];
  }
}

export function getCompletedCurriculumBlocks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('curriculum-completed-blocks') || '[]');
  } catch {
    return [];
  }
}
