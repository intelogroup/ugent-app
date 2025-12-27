/**
 * Redis Cache Utility for UGent App
 * Implements multi-layer caching strategy for optimal performance
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client (using Upstash Redis for serverless compatibility)
// Alternative: Use ioredis for traditional Redis
const redis = process.env.REDIS_URL
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN || '',
    })
  : null;

// Cache key prefixes for organization
export const CachePrefix = {
  USER_PERFORMANCE: 'user:perf:',
  USER_ACTIVE_TEST: 'user:active-test:',
  USER_PROGRESS: 'user:progress:',
  QUESTION_POOL: 'questions:pool:',
  QUESTION_FULL: 'question:',
  SYSTEM_STATS: 'system:',
  LEADERBOARD: 'leaderboard:',
  TEST_QUESTIONS: 'test:questions:',
} as const;

// Cache TTL (Time To Live) in seconds
export const CacheTTL = {
  HOT: 300, // 5 minutes - frequently changing data
  WARM: 3600, // 1 hour - moderately changing data
  COLD: 86400, // 24 hours - rarely changing data
} as const;

/**
 * Generic cache get function
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) {
    console.warn('Redis not configured, cache miss');
    return null;
  }

  try {
    const value = await redis.get(key);
    return value as T | null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Generic cache set function
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = CacheTTL.WARM
): Promise<boolean> {
  if (!redis) {
    console.warn('Redis not configured, skipping cache set');
    return false;
  }

  try {
    if (ttl > 0) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

/**
 * Delete cache key(s)
 */
export async function cacheDel(keys: string | string[]): Promise<boolean> {
  if (!redis) return false;

  try {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    await redis.del(...keysArray);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  if (!redis) return 0;

  try {
    // Note: Upstash Redis may not support SCAN, implement carefully
    // For production, use a proper SCAN implementation
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Cache delete pattern error:', error);
    return 0;
  }
}

/**
 * Cache wrapper for database queries
 * Tries cache first, falls back to DB query, then caches result
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = CacheTTL.WARM
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute query
  const result = await queryFn();

  // Cache the result
  await cacheSet(key, result, ttl);

  return result;
}

// ============================================
// Specific Cache Functions for UGent App
// ============================================

/**
 * Cache user performance summary
 */
export async function cacheUserPerformance(userId: string, data: any) {
  const key = `${CachePrefix.USER_PERFORMANCE}${userId}`;
  await cacheSet(key, data, CacheTTL.HOT);
}

export async function getUserPerformanceCache(userId: string) {
  const key = `${CachePrefix.USER_PERFORMANCE}${userId}`;
  return await cacheGet(key);
}

export async function invalidateUserPerformance(userId: string) {
  const key = `${CachePrefix.USER_PERFORMANCE}${userId}`;
  await cacheDel(key);
}

/**
 * Cache question pool for test generation
 */
export async function cacheQuestionPool(
  systemId: string,
  topicId: string,
  difficulty: string,
  questionIds: string[]
) {
  const key = `${CachePrefix.QUESTION_POOL}${systemId}:${topicId}:${difficulty}`;
  await cacheSet(key, questionIds, CacheTTL.WARM);
}

export async function getQuestionPoolCache(
  systemId: string,
  topicId: string,
  difficulty: string
): Promise<string[] | null> {
  const key = `${CachePrefix.QUESTION_POOL}${systemId}:${topicId}:${difficulty}`;
  return await cacheGet<string[]>(key);
}

/**
 * Cache full question with options
 */
export async function cacheQuestion(questionId: string, question: any) {
  const key = `${CachePrefix.QUESTION_FULL}${questionId}`;
  await cacheSet(key, question, CacheTTL.COLD);
}

export async function getQuestionCache(questionId: string) {
  const key = `${CachePrefix.QUESTION_FULL}${questionId}`;
  return await cacheGet(key);
}

/**
 * Cache user progress
 */
export async function cacheUserProgress(userId: string, progress: any) {
  const key = `${CachePrefix.USER_PROGRESS}${userId}`;
  await cacheSet(key, progress, CacheTTL.WARM);
}

export async function getUserProgressCache(userId: string) {
  const key = `${CachePrefix.USER_PROGRESS}${userId}`;
  return await cacheGet(key);
}

/**
 * Cache leaderboard
 */
export async function cacheLeaderboard(type: string, data: any) {
  const key = `${CachePrefix.LEADERBOARD}${type}`;
  await cacheSet(key, data, CacheTTL.HOT);
}

export async function getLeaderboardCache(type: string) {
  const key = `${CachePrefix.LEADERBOARD}${type}`;
  return await cacheGet(key);
}

/**
 * Invalidate all user-related caches (on answer submission)
 */
export async function invalidateUserCaches(userId: string) {
  await cacheDel([
    `${CachePrefix.USER_PERFORMANCE}${userId}`,
    `${CachePrefix.USER_PROGRESS}${userId}`,
    `${CachePrefix.USER_ACTIVE_TEST}${userId}`,
  ]);
}

/**
 * Invalidate leaderboard caches
 */
export async function invalidateLeaderboards() {
  await cacheDelPattern(`${CachePrefix.LEADERBOARD}*`);
}

/**
 * Invalidate question pool caches (when new questions added)
 */
export async function invalidateQuestionPools(systemId?: string) {
  if (systemId) {
    await cacheDelPattern(`${CachePrefix.QUESTION_POOL}${systemId}:*`);
  } else {
    await cacheDelPattern(`${CachePrefix.QUESTION_POOL}*`);
  }
}

/**
 * Get cache statistics (useful for monitoring)
 */
export async function getCacheStats() {
  if (!redis) return null;

  try {
    const info = await redis.info();
    return info;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

export default {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  cachedQuery,
  CachePrefix,
  CacheTTL,
};
