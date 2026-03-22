import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get user's earned achievements and available ones
 */
export const getUserAchievements = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;

    // Get user's performance data
    const leaderboardEntry = await ctx.db
      .query("leaderboard")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const summary = await ctx.db
      .query("performance_summaries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!leaderboardEntry) {
      return {
        unlockedAchievements: [],
        availableAchievements: generateAllAchievements({ totalTests: 0, averageScore: 0, totalCorrectAnswers: 0, streakDays: 0 }).filter(a => !a.unlocked),
        stats: {
          totalUnlocked: 0,
          totalAvailable: 11, // Total count of hardcoded achievements
          progressPoints: 0,
        },
        userProgress: {
          testsCompleted: 0,
          averageScore: 0,
          totalPoints: 0,
          currentStreak: 0,
        }
      };
    }

    // Get persisted unlocked achievements
    const persistedUnlocked = await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const persistedIds = new Set(persistedUnlocked.map(ua => ua.achievementId));

    // Calculate all achievements
    const stats = {
      totalTests: leaderboardEntry.totalTests,
      averageScore: leaderboardEntry.averageScore,
      totalCorrectAnswers: leaderboardEntry.totalCorrectAnswers,
      streakDays: leaderboardEntry.streakDays,
      longestStreak: summary?.longestStreak || 0,
    };

    const allAchievements = generateAllAchievements(stats);

    // Filter unlocked
    const unlockedAchievements = allAchievements.filter(a => a.unlocked).map(a => ({
        ...a,
        unlockedAt: new Date().toISOString(), // Fallback if not in DB
    }));

    return {
      unlockedAchievements,
      availableAchievements: allAchievements.filter(a => !a.unlocked),
      stats: {
        totalUnlocked: unlockedAchievements.length,
        totalAvailable: allAchievements.filter(a => !a.unlocked).length,
        progressPoints: unlockedAchievements.reduce((sum, a) => sum + a.points, 0),
      },
      userProgress: {
        testsCompleted: leaderboardEntry.totalTests,
        averageScore: parseFloat(leaderboardEntry.averageScore.toFixed(2)),
        totalPoints: leaderboardEntry.totalCorrectAnswers * 20,
        currentStreak: leaderboardEntry.streakDays || 0,
      },
    };
  },
});

/**
 * Manually unlock an achievement (mutation)
 */
export const unlockAchievement = mutation({
  args: {
    userId: v.id("users"),
    achievementId: v.string(), // The string ID like 'first_test'
  },
  handler: async (ctx, args) => {
    const { userId, achievementId } = args;

    // In a real app, we'd have an 'achievements' table with the definitions.
    // For now, we'll just store the fact that it's unlocked if we want persistence.
    // However, since they are mostly calculated on-the-fly, this might just be for 
    // achievements that CANNOT be calculated easily (like "Secret Achievement").
    
    // For the sake of the refactor, we'll just check if it's already unlocked in user_achievements
    // and insert if not. Note: we need the Id<"achievements"> for the user_achievements table,
    // which means we'd need to look it up.
    
    // Since we don't have a reliable way to populate the achievements table here 
    // without a separate setup script, let's just make this mutation a placeholder 
    // or assume we use the string ID if we were to change the schema.
    
    // BUT the schema I defined uses v.id("achievements").
    // Let's adjust the schema to use a string for achievementId if we want it simple,
    // or implement the lookup.
    
    // I'll stick to the current schema and try to find/create the achievement definition.
    let achievement = await ctx.db
      .query("achievements")
      .withIndex("by_achievement_id", (q) => q.eq("id", achievementId))
      .unique();
      
    if (!achievement) {
        // Create it on the fly if it's one of our known ones
        const known = generateAllAchievements({ totalTests: 100, averageScore: 100, totalCorrectAnswers: 1000, streakDays: 100 })
            .find(a => a.id === achievementId);
        
        if (known) {
            const id = await ctx.db.insert("achievements", {
                id: known.id,
                name: known.name,
                description: known.description,
                icon: known.icon,
                points: known.points,
                category: "TEST", // Default
                requirement: known.requirement,
            });
            achievement = { _id: id } as any;
        } else {
            throw new Error(`Unknown achievement: ${achievementId}`);
        }
    }

    const existing = await ctx.db
      .query("user_achievements")
      .withIndex("by_user_achievement", (q) => q.eq("userId", userId).eq("achievementId", achievement!._id))
      .unique();

    if (!existing) {
      await ctx.db.insert("user_achievements", {
        userId,
        achievementId: achievement!._id,
        unlockedAt: Date.now(),
      });
      return { unlocked: true };
    }

    return { unlocked: false, message: "Already unlocked" };
  },
});

function generateAllAchievements(stats: any) {
  return [
    {
      id: 'first_test',
      name: 'First Step',
      description: 'Complete your first test',
      icon: '🎯',
      points: 10,
      unlocked: stats.totalTests >= 1,
      requirement: 'testsCompleted >= 1',
    },
    {
      id: 'test_10',
      name: 'Test Warrior',
      description: 'Complete 10 tests',
      icon: '⚔️',
      points: 25,
      unlocked: stats.totalTests >= 10,
      requirement: 'testsCompleted >= 10',
    },
    {
      id: 'test_50',
      name: 'Test Master',
      description: 'Complete 50 tests',
      icon: '👑',
      points: 50,
      unlocked: stats.totalTests >= 50,
      requirement: 'testsCompleted >= 50',
    },
    {
      id: 'test_100',
      name: 'Legendary Tester',
      description: 'Complete 100 tests',
      icon: '🏆',
      points: 100,
      unlocked: stats.totalTests >= 100,
      requirement: 'testsCompleted >= 100',
    },
    {
      id: 'score_80',
      name: 'Highly Accurate',
      description: 'Maintain 80+ average score',
      icon: '✨',
      points: 30,
      unlocked: stats.averageScore >= 80,
      requirement: 'averageScore >= 80',
    },
    {
      id: 'score_90',
      name: 'Near Perfection',
      description: 'Maintain 90+ average score',
      icon: '💎',
      points: 75,
      unlocked: stats.averageScore >= 90,
      requirement: 'averageScore >= 90',
    },
    {
      id: 'streak_7',
      name: 'Streak Starter',
      description: 'Build a 7-day streak',
      icon: '🔥',
      points: 20,
      unlocked: (stats.streakDays || 0) >= 7,
      requirement: 'currentStreak >= 7',
    },
    {
      id: 'streak_30',
      name: 'Streak King',
      description: 'Build a 30-day streak',
      icon: '👑',
      points: 60,
      unlocked: (stats.longestStreak || 0) >= 30,
      requirement: 'longestStreak >= 30',
    },
    {
      id: 'points_1000',
      name: 'Point Collector',
      description: 'Earn 1000 points',
      icon: '💰',
      points: 25,
      unlocked: (stats.totalCorrectAnswers * 20) >= 1000,
      requirement: 'totalPoints >= 1000',
    },
    {
      id: 'points_5000',
      name: 'Points Tycoon',
      description: 'Earn 5000 points',
      icon: '💸',
      points: 50,
      unlocked: (stats.totalCorrectAnswers * 20) >= 5000,
      requirement: 'totalPoints >= 5000',
    },
  ];
}
