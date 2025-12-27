import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/insights/recommendations
 *
 * Gets AI-generated learning recommendations based on user performance
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

    // Get user's learning pattern
    const learningPattern = await prisma.learningPattern.findUnique({
      where: { userId },
    });

    if (!learningPattern) {
      return NextResponse.json(
        { error: 'No learning data available yet' },
        { status: 404 }
      );
    }

    // Get performance summary
    const performanceSummary = await prisma.performanceSummary.findUnique({
      where: { userId },
    });

    // Get all topics with user performance
    const topicPerformance = performanceSummary?.topicPerformance as any || {};

    // Analyze weak areas
    const weakTopics = Object.entries(topicPerformance)
      .sort((a: any, b: any) => a[1].accuracy - b[1].accuracy)
      .slice(0, 5)
      .map(([topic, data]: [string, any]) => ({
        topic,
        accuracy: data.accuracy,
        questionsAnswered: data.questionsAnswered,
        priority: calculatePriority(data.accuracy, data.questionsAnswered),
      }));

    // Build recommendations
    const recommendations = weakTopics.map((weak, index) => {
      const accuracy = weak.accuracy || 0;
      let suggestedQuestions = 50;
      let estimatedTime = 45;

      // Scale based on accuracy
      if (accuracy < 50) {
        suggestedQuestions = 80;
        estimatedTime = 60;
      } else if (accuracy < 70) {
        suggestedQuestions = 60;
        estimatedTime = 50;
      }

      return {
        priority: index + 1,
        type: 'focus_area',
        topic: weak.topic,
        reason: `Lowest accuracy (${accuracy.toFixed(1)}%)`,
        currentAccuracy: parseFloat(accuracy.toFixed(1)),
        targetAccuracy: 85,
        suggestedQuestions,
        estimatedTime,
        difficulty: determineDifficulty(accuracy),
        action: `Study ${weak.topic} to improve your score`,
      };
    });

    // Add study pattern recommendation if available
    if (learningPattern.peakPerformanceTime) {
      recommendations.push({
        priority: recommendations.length + 1,
        type: 'study_time',
        topic: 'Optimal Study Schedule',
        reason: 'Based on your learning patterns',
        currentAccuracy: 0,
        targetAccuracy: 0,
        suggestedQuestions: 0,
        estimatedTime: 0,
        difficulty: 'CUSTOM',
        action: `Your peak performance is around ${learningPattern.peakPerformanceTime}`,
      });
    }

    return NextResponse.json(
      {
        recommendations: recommendations.slice(0, 10),
        summary: {
          totalRecommendations: recommendations.length,
          topWeakArea: weakTopics[0]?.topic || 'N/A',
          estimatedTotalStudyTime: recommendations.reduce((sum: number, r) => sum + r.estimatedTime, 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function calculatePriority(accuracy: number, questionsAnswered: number): number {
  // Weight by both accuracy (lower = higher priority) and attempt count
  if (questionsAnswered < 5) return 1; // Haven't attempted much
  if (accuracy < 50) return 1; // Very weak
  if (accuracy < 70) return 2;
  return 3;
}

function determineDifficulty(accuracy: number): string {
  if (accuracy < 50) return 'EASY'; // Start easy
  if (accuracy < 70) return 'MEDIUM';
  return 'HARD';
}
