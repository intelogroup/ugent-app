/**
 * Question Service - Optimized for Performance
 * Implements batching and efficient queries using Convex
 */

import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionFilters {
  systemId?: string;
  topicId?: string;
  subjectId?: string;
  difficulty?: DifficultyLevel;
  limit?: number;
}

/**
 * Get questions for test generation - OPTIMIZED
 * Uses efficient queries
 */
export async function getQuestionsForTest(
  filters: QuestionFilters
): Promise<any[]> {
  const {
    systemId,
    topicId,
    subjectId,
    difficulty,
    limit = 50,
  } = filters;

  // Query database using Convex
  const questions = await fetchQuery(api.questions.getQuestions, {
    systemId: systemId as Id<"systems"> | undefined,
    topicId: topicId as Id<"topics"> | undefined,
    subjectId: subjectId as Id<"subjects"> | undefined,
    difficulty: difficulty as "EASY" | "MEDIUM" | "HARD" | undefined,
    limit: limit * 2, // Get more for randomization
  });

  // Randomize and limit
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

/**
 * Get multiple questions by IDs - BATCH FETCH
 * More efficient than individual queries
 */
export async function getQuestionsByIds(ids: string[]): Promise<any[]> {
  // Fetch questions in a single query
  return await fetchQuery(api.questions.getQuestionsByIds, {
    ids: ids as Id<"questions">[],
  });
}

/**
 * Get question by ID
 */
export async function getQuestionById(id: string): Promise<any | null> {
  return await fetchQuery(api.questions.getQuestionById, {
    id: id as Id<"questions">,
  });
}

/**
 * Update question metrics - Convex Mutation
 * Don't block user flow for metrics update
 */
export async function updateQuestionMetrics(
  questionId: string,
  isCorrect: boolean,
  timeSpent: number
) {
  try {
    await fetchMutation(api.questions.updateQuestionMetrics, {
      questionId: questionId as Id<"questions">,
      isCorrect,
      timeSpent,
    });
  } catch (error) {
    console.error('Error updating question metrics:', error);
  }
}

/**
 * Get adaptive questions based on user performance
 * Selects questions at appropriate difficulty level
 */
export async function getAdaptiveQuestions(
  userId: string,
  systemId: string,
  count: number = 20
): Promise<any[]> {
  return await fetchQuery(api.questions.getAdaptiveQuestions, {
    userId: userId as Id<"users">,
    systemId: systemId as Id<"systems">,
    count,
  });
}

/**
 * Create question pool (background job)
 * Pre-generate shuffled question pools to avoid runtime randomization
 */
export async function generateQuestionPools() {
  console.log('✨ Question pools generation skipped (no caching)');
}

/**
 * Get weak areas for user (for targeted practice)
 */
export async function getWeakAreasForUser(
  userId: string,
  limit: number = 30
): Promise<any[]> {
  return await fetchQuery(api.questions.getWeakAreasForUser, {
    userId: userId as Id<"users">,
    limit,
  });
}

/**
 * Search questions (for admin/instructor)
 */
export async function searchQuestions(
  searchTerm: string,
  filters: QuestionFilters = {}
) {
  const { systemId, topicId, difficulty, limit = 50 } = filters;

  return await fetchQuery(api.questions.searchQuestions, {
    searchTerm,
    systemId: systemId as Id<"systems"> | undefined,
    topicId: topicId as Id<"topics"> | undefined,
    difficulty: difficulty as "EASY" | "MEDIUM" | "HARD" | undefined,
    limit,
  });
}

/**
 * Get question statistics (for analytics)
 */
export async function getQuestionStats(questionId: string) {
  return await fetchQuery(api.questions.getQuestionStats, {
    questionId: questionId as Id<"questions">,
  });
}

export default {
  getQuestionsForTest,
  getQuestionsByIds,
  getQuestionById,
  updateQuestionMetrics,
  getAdaptiveQuestions,
  generateQuestionPools,
  getWeakAreasForUser,
  searchQuestions,
  getQuestionStats,
};
