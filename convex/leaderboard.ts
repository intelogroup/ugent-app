import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get global leaderboard rankings
 */
export const getGlobalLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;

    const rankings = await ctx.db
      .query("leaderboard")
      .withIndex("by_average_score")
      .order("desc")
      .collect();

    // Since we need to calculate ranks and filter by offset/limit, we fetch all first.
    // In a very large app, we'd use a more sophisticated ranking system.
    const total = rankings.length;
    
    const paginatedRankings = rankings.slice(offset, offset + limit);

    const rankingsWithUserData = await Promise.all(
      paginatedRankings.map(async (entry, index) => {
        const user = await ctx.db.get(entry.userId);
        return {
          rank: offset + index + 1,
          userId: entry.userId,
          userName: user?.name || "Anonymous",
          userEmail: user?.email,
          avatar: user?.avatar,
          averageScore: entry.averageScore,
          totalCorrectAnswers: entry.totalCorrectAnswers,
          testsCompleted: entry.totalTests,
          streak: entry.streakDays,
          percentile: calculatePercentile(offset + index + 1, total),
        };
      })
    );

    return {
      leaderboard: rankingsWithUserData,
      pagination: {
        total,
        limit,
        offset,
        returned: rankingsWithUserData.length,
      },
      updatedAt: Date.now(),
    };
  },
});

/**
 * Get current user's rank and nearby competitors
 */
export const getMyRank = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    
    // Get all rankings to calculate relative positions
    const allRankings = await ctx.db
      .query("leaderboard")
      .withIndex("by_average_score")
      .order("desc")
      .collect();

    const totalUsers = allRankings.length;
    const userIndex = allRankings.findIndex((r) => r.userId === userId);
    
    if (userIndex === -1) {
       const user = await ctx.db.get(userId);
       return {
          userRank: {
            rank: totalUsers + 1,
            userId,
            userName: user?.name || "Anonymous",
            averageScore: 0,
            totalPoints: 0,
            testsCompleted: 0,
            currentStreak: 0,
            percentile: 0,
            pointsToNextRank: 0,
          },
          nearbyCompetitors: [],
          stats: {
            totalUsers,
            averageScore: calculateGlobalAverage(allRankings),
            averageTestsCompleted: calculateAverageTests(allRankings),
          }
       };
    }

    const userEntry = allRankings[userIndex];
    const user = await ctx.db.get(userId);
    const userRank = userIndex + 1;
    const percentile = calculatePercentile(userRank, totalUsers);

    // Get nearby competitors
    const start = Math.max(0, userIndex - 5);
    const end = Math.min(allRankings.length, userIndex + 6);
    const nearby = allRankings.slice(start, end).filter(r => r.userId !== userId);

    const competitorsWithRanks = await Promise.all(
      nearby.map(async (competitor) => {
        const compIndex = allRankings.findIndex(r => r._id === competitor._id);
        const compUser = await ctx.db.get(competitor.userId);
        return {
          rank: compIndex + 1,
          userName: compUser?.name || "Anonymous",
          averageScore: competitor.averageScore,
          totalPoints: competitor.totalCorrectAnswers * 20,
          difference: competitor.averageScore - userEntry.averageScore,
        };
      })
    );

    // Points to next rank
    const nextRankEntry = userIndex > 0 ? allRankings[userIndex - 1] : null;
    const pointsToNextRank = nextRankEntry
      ? Math.max(0, (nextRankEntry.totalCorrectAnswers - userEntry.totalCorrectAnswers) * 20)
      : 0;

    return {
      userRank: {
        rank: userRank,
        userId,
        userName: user?.name || "Anonymous",
        averageScore: userEntry.averageScore,
        totalPoints: userEntry.totalCorrectAnswers * 20,
        testsCompleted: userEntry.totalTests,
        currentStreak: userEntry.streakDays,
        percentile,
        pointsToNextRank,
      },
      nearbyCompetitors: competitorsWithRanks,
      stats: {
        totalUsers,
        averageScore: calculateGlobalAverage(allRankings),
        averageTestsCompleted: calculateAverageTests(allRankings),
      },
    };
  },
});

function calculatePercentile(rank: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat((((total - rank + 1) / total) * 100).toFixed(1));
}

function calculateGlobalAverage(rankings: any[]): number {
  if (rankings.length === 0) return 0;
  const sum = rankings.reduce((acc, r) => acc + r.averageScore, 0);
  return parseFloat((sum / rankings.length).toFixed(2));
}

function calculateAverageTests(rankings: any[]): number {
  if (rankings.length === 0) return 0;
  const sum = rankings.reduce((acc, r) => acc + r.totalTests, 0);
  return Math.round(sum / rankings.length);
}
