/**
 * Question Service - Optimized for Performance
 * Implements caching, batching, and efficient queries
 */

import { PrismaClient, DifficultyLevel } from '@prisma/client';
import {
  cachedQuery,
  cacheQuestionPool,
  getQuestionPoolCache,
  cacheQuestion,
  getQuestionCache,
  invalidateQuestionPools,
  CacheTTL,
} from '../cache';

const prisma = new PrismaClient();

export interface QuestionFilters {
  systemId?: string;
  topicId?: string;
  subjectId?: string;
  difficulty?: DifficultyLevel;
  limit?: number;
}

/**
 * Get questions for test generation - OPTIMIZED
 * Uses caching and efficient queries
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

  // Step 1: Try to get question IDs from cache
  if (systemId && topicId && difficulty) {
    const cacheKey = `${systemId}:${topicId}:${difficulty}`;
    const cachedIds = await getQuestionPoolCache(systemId, topicId, difficulty);

    if (cachedIds && cachedIds.length > 0) {
      // Cache hit! Fetch full questions
      const questions = await getQuestionsByIds(cachedIds.slice(0, limit));
      return questions;
    }
  }

  // Step 2: Cache miss - Query database
  const questions = await prisma.question.findMany({
    where: {
      ...(systemId && { systemId }),
      ...(topicId && { topicId }),
      ...(subjectId && { subjectId }),
      ...(difficulty && { difficulty }),
    },
    include: {
      options: {
        orderBy: { displayOrder: 'asc' },
      },
    },
    take: limit * 2, // Get more for randomization
  });

  // Step 3: Cache the question IDs for next time
  if (systemId && topicId && difficulty) {
    const questionIds = questions.map((q) => q.id);
    await cacheQuestionPool(systemId, topicId, difficulty, questionIds);
  }

  // Step 4: Randomize and limit
  const shuffled = questions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

/**
 * Get multiple questions by IDs - BATCH FETCH
 * More efficient than individual queries
 */
export async function getQuestionsByIds(ids: string[]): Promise<any[]> {
  // Try to get from cache first
  const cached: any[] = [];
  const uncachedIds: string[] = [];

  for (const id of ids) {
    const cachedQ = await getQuestionCache(id);
    if (cachedQ) {
      cached.push(cachedQ);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached questions in a single query
  if (uncachedIds.length > 0) {
    const questions = await prisma.question.findMany({
      where: {
        id: { in: uncachedIds },
      },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    // Cache each question
    for (const q of questions) {
      await cacheQuestion(q.id, q);
    }

    cached.push(...questions);
  }

  return cached;
}

/**
 * Get question by ID - WITH CACHING
 */
export async function getQuestionById(id: string): Promise<any | null> {
  return await cachedQuery(
    `question:full:${id}`,
    async () => {
      return await prisma.question.findUnique({
        where: { id },
        include: {
          options: {
            orderBy: { displayOrder: 'asc' },
          },
          system: true,
          topic: true,
        },
      });
    },
    CacheTTL.COLD // Questions rarely change
  );
}

/**
 * Update question metrics - ASYNC BATCH UPDATE
 * Don't block user flow for metrics update
 */
export async function updateQuestionMetrics(
  questionId: string,
  isCorrect: boolean,
  timeSpent: number
) {
  // In production, use a message queue (Redis Queue, Bull, etc.)
  // For now, just do async update
  setImmediate(async () => {
    try {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: {
          totalAttempts: true,
          correctAttempts: true,
          avgTimeSpent: true,
        },
      });

      if (!question) return;

      const newTotalAttempts = question.totalAttempts + 1;
      const newCorrectAttempts = question.correctAttempts + (isCorrect ? 1 : 0);
      const newSuccessRate =
        newTotalAttempts > 0 ? (newCorrectAttempts / newTotalAttempts) * 100 : 0;

      // Calculate new average time (rolling average)
      const newAvgTime = Math.round(
        (question.avgTimeSpent * question.totalAttempts + timeSpent) / newTotalAttempts
      );

      await prisma.question.update({
        where: { id: questionId },
        data: {
          totalAttempts: newTotalAttempts,
          correctAttempts: newCorrectAttempts,
          successRate: newSuccessRate,
          avgTimeSpent: newAvgTime,
        },
      });

      // Invalidate cache for this question
      await cacheQuestion(questionId, null as any); // Clear cache
    } catch (error) {
      console.error('Error updating question metrics:', error);
    }
  });
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
  // Get user's success rate in this system
  const userProgress = await prisma.progress.findFirst({
    where: { userId, systemId },
    select: { successRate: true },
  });

  const successRate = userProgress?.successRate || 50;

  // Select difficulty based on performance
  let difficulty: DifficultyLevel;
  if (successRate < 40) {
    difficulty = 'EASY';
  } else if (successRate < 70) {
    difficulty = 'MEDIUM';
  } else {
    difficulty = 'HARD';
  }

  // Get questions with target difficulty
  return await getQuestionsForTest({
    systemId,
    difficulty,
    limit: count,
  });
}

/**
 * Create question pool (background job)
 * Pre-generate shuffled question pools to avoid runtime randomization
 */
export async function generateQuestionPools() {
  console.log('🔄 Generating question pools...');

  const systems = await prisma.system.findMany({
    include: { topics: true },
  });

  const difficulties: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

  for (const system of systems) {
    for (const topic of system.topics) {
      for (const difficulty of difficulties) {
        const questions = await prisma.question.findMany({
          where: {
            systemId: system.id,
            topicId: topic.id,
            difficulty,
          },
          select: { id: true },
        });

        if (questions.length > 0) {
          // Shuffle and cache
          const shuffled = questions
            .map((q) => q.id)
            .sort(() => Math.random() - 0.5);

          await cacheQuestionPool(system.id, topic.id, difficulty, shuffled);
          console.log(
            `✅ Pool: ${system.name} > ${topic.name} > ${difficulty} (${shuffled.length} questions)`
          );
        }
      }
    }
  }

  console.log('✨ Question pools generated!');
}

/**
 * Get weak areas for user (for targeted practice)
 */
export async function getWeakAreasForUser(
  userId: string,
  limit: number = 30
): Promise<any[]> {
  // Find topics where user has low success rate
  const weakProgress = await prisma.progress.findMany({
    where: {
      userId,
      successRate: { lt: 60 }, // Less than 60%
      totalQuestionsAttempted: { gte: 5 }, // At least 5 attempts
    },
    orderBy: { successRate: 'asc' },
    take: 5,
    include: {
      topic: true,
      system: true,
    },
  });

  if (weakProgress.length === 0) {
    // No weak areas, return general questions
    return await getQuestionsForTest({ limit });
  }

  // Get questions from weak topics
  const allQuestions: any[] = [];

  for (const progress of weakProgress) {
    if (!progress.topicId || !progress.systemId) continue;

    const questions = await getQuestionsForTest({
      systemId: progress.systemId,
      topicId: progress.topicId,
      limit: Math.ceil(limit / weakProgress.length),
    });

    allQuestions.push(...questions);
  }

  return allQuestions.slice(0, limit);
}

/**
 * Search questions (for admin/instructor)
 */
export async function searchQuestions(
  searchTerm: string,
  filters: QuestionFilters = {}
) {
  const { systemId, topicId, difficulty, limit = 50 } = filters;

  return await prisma.question.findMany({
    where: {
      AND: [
        {
          OR: [
            { text: { contains: searchTerm, mode: 'insensitive' } },
            { explanation: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        ...(systemId ? [{ systemId }] : []),
        ...(topicId ? [{ topicId }] : []),
        ...(difficulty ? [{ difficulty }] : []),
      ],
    },
    include: {
      options: { orderBy: { displayOrder: 'asc' } },
      system: { select: { name: true } },
      topic: { select: { name: true } },
    },
    take: limit,
  });
}

/**
 * Get question statistics (for analytics)
 */
export async function getQuestionStats(questionId: string) {
  return await cachedQuery(
    `question:stats:${questionId}`,
    async () => {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: {
          totalAttempts: true,
          correctAttempts: true,
          successRate: true,
          avgTimeSpent: true,
          difficulty: true,
        },
      });

      if (!question) return null;

      return {
        ...question,
        difficulty: question.difficulty,
        performanceCategory:
          question.successRate > 80
            ? 'Easy for users'
            : question.successRate > 50
            ? 'Moderate'
            : 'Challenging',
      };
    },
    CacheTTL.WARM
  );
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
