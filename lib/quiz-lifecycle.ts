export interface QuizAnswerRecord {
  questionId: string;
  isCorrect: boolean;
  selectedIndex: number | null;
}

export interface QuizProgress {
  answersByQuestionId: Record<string, QuizAnswerRecord>;
  order: string[];
}

export function createQuizProgress(): QuizProgress {
  return { answersByQuestionId: {}, order: [] };
}

export function recordAnswer(
  progress: QuizProgress,
  questionId: string,
  isCorrect: boolean,
  selectedIndex: number | null,
): QuizProgress {
  const existing = progress.answersByQuestionId[questionId];
  const answersByQuestionId = { ...progress.answersByQuestionId, [questionId]: { questionId, isCorrect, selectedIndex } };
  const order = existing ? progress.order : [...progress.order, questionId];
  return { answersByQuestionId, order };
}

export function countCorrect(progress: QuizProgress): number {
  return progress.order.filter((id) => progress.answersByQuestionId[id].isCorrect).length;
}

export function countIncorrect(progress: QuizProgress): number {
  return progress.order.length - countCorrect(progress);
}

export function countAnswered(progress: QuizProgress): number {
  return progress.order.length;
}

export function isQuestionAnswered(progress: QuizProgress, questionId: string): boolean {
  return Boolean(progress.answersByQuestionId[questionId]);
}
