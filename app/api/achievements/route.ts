import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/achievements
 *
 * Gets user's earned achievements and available badges
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user's performance data for achievement calculation
    const userLeaderboard = await prisma.userLeaderboard.findUnique({
      where: { userId },
    });

    if (!userLeaderboard) {
      return NextResponse.json(
        {
          unlockedAchievements: [],
          availableAchievements: getAvailableAchievements(null),
          progress: {
            testCount: 0,
            averageScore: 0,
            totalPoints: 0,
            streak: 0,
          },
        },
        { status: 200 }
      );
    }

    // Define achievements
    const allAchievements = generateAchievements(userLeaderboard);

    // Determine unlocked achievements
    const unlockedAchievements = allAchievements.filter((a) => a.unlocked);

    return NextResponse.json(
      {
        unlockedAchievements: unlockedAchievements.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlockedAt: a.unlockedAt,
          points: a.points,
        })),
        availableAchievements: allAchievements.filter((a) => !a.unlocked),
        stats: {
          totalUnlocked: unlockedAchievements.length,
          totalAvailable: allAchievements.filter((a) => !a.unlocked).length,
          progressPoints: unlockedAchievements.reduce((sum, a) => sum + a.points, 0),
        },
        userProgress: {
          testsCompleted: userLeaderboard.totalTests,
          averageScore: parseFloat(userLeaderboard.averageScore.toFixed(2)),
          totalPoints: userLeaderboard.totalCorrectAnswers * 20,
          currentStreak: userLeaderboard.streakDays || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

function generateAchievements(userLeaderboard: any) {
  const achievements = [
    // Test completion achievements
    {
      id: 'first_test',
      name: 'First Step',
      description: 'Complete your first test',
      icon: '🎯',
      points: 10,
      unlocked: userLeaderboard.totalTests >= 1,
      unlockedAt: userLeaderboard.totalTests >= 1 ? new Date() : null,
      requirement: 'testsCompleted >= 1',
    },
    {
      id: 'test_10',
      name: 'Test Warrior',
      description: 'Complete 10 tests',
      icon: '⚔️',
      points: 25,
      unlocked: userLeaderboard.totalTests >= 10,
      unlockedAt: userLeaderboard.totalTests >= 10 ? new Date() : null,
      requirement: 'testsCompleted >= 10',
    },
    {
      id: 'test_50',
      name: 'Test Master',
      description: 'Complete 50 tests',
      icon: '👑',
      points: 50,
      unlocked: userLeaderboard.totalTests >= 50,
      unlockedAt: userLeaderboard.totalTests >= 50 ? new Date() : null,
      requirement: 'testsCompleted >= 50',
    },
    {
      id: 'test_100',
      name: 'Legendary Tester',
      description: 'Complete 100 tests',
      icon: '🏆',
      points: 100,
      unlocked: userLeaderboard.totalTests >= 100,
      unlockedAt: userLeaderboard.totalTests >= 100 ? new Date() : null,
      requirement: 'testsCompleted >= 100',
    },

    // Score achievements
    {
      id: 'score_perfect',
      name: 'Perfect Score',
      description: 'Achieve a 100% accuracy on a test',
      icon: '🌟',
      points: 50,
      unlocked: false, // Would need to track individual test scores
      unlockedAt: null,
      requirement: 'One test with 100% accuracy',
    },
    {
      id: 'score_80',
      name: 'Highly Accurate',
      description: 'Maintain 80+ average score',
      icon: '✨',
      points: 30,
      unlocked: userLeaderboard.averageScore >= 80,
      unlockedAt: userLeaderboard.averageScore >= 80 ? new Date() : null,
      requirement: 'averageScore >= 80',
    },
    {
      id: 'score_90',
      name: 'Near Perfection',
      description: 'Maintain 90+ average score',
      icon: '💎',
      points: 75,
      unlocked: userLeaderboard.averageScore >= 90,
      unlockedAt: userLeaderboard.averageScore >= 90 ? new Date() : null,
      requirement: 'averageScore >= 90',
    },

    // Streak achievements
    {
      id: 'streak_7',
      name: 'Streak Starter',
      description: 'Build a 7-day streak',
      icon: '🔥',
      points: 20,
      unlocked: (userLeaderboard.currentStreak || 0) >= 7,
      unlockedAt: (userLeaderboard.currentStreak || 0) >= 7 ? new Date() : null,
      requirement: 'currentStreak >= 7',
    },
    {
      id: 'streak_30',
      name: 'Streak King',
      description: 'Build a 30-day streak',
      icon: '👑',
      points: 60,
      unlocked: (userLeaderboard.longestStreak || 0) >= 30,
      unlockedAt: (userLeaderboard.longestStreak || 0) >= 30 ? new Date() : null,
      requirement: 'longestStreak >= 30',
    },

    // Points achievements
    {
      id: 'points_1000',
      name: 'Point Collector',
      description: 'Earn 1000 points',
      icon: '💰',
      points: 25,
      unlocked: userLeaderboard.totalPoints >= 1000,
      unlockedAt: userLeaderboard.totalPoints >= 1000 ? new Date() : null,
      requirement: 'totalPoints >= 1000',
    },
    {
      id: 'points_5000',
      name: 'Points Tycoon',
      description: 'Earn 5000 points',
      icon: '💸',
      points: 50,
      unlocked: userLeaderboard.totalPoints >= 5000,
      unlockedAt: userLeaderboard.totalPoints >= 5000 ? new Date() : null,
      requirement: 'totalPoints >= 5000',
    },
  ];

  return achievements;
}

function getAvailableAchievements(userLeaderboard: any) {
  return generateAchievements(userLeaderboard).filter((a) => !a.unlocked);
}
