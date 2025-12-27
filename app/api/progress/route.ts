import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/progress
 *
 * Gets overall user progress and mastery levels across all systems and topics
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

    // Get all user answers with question data
    const answers = await prisma.answer.findMany({
      where: { userId },
      include: {
        question: {
          include: {
            system: true,
            topic: true,
          },
        },
        questionScore: true,
      },
    });

    if (answers.length === 0) {
      return NextResponse.json(
        {
          overall: {
            masteryLevel: 0,
            questionsAttempted: 0,
            correctAnswers: 0,
            successRate: 0,
          },
          bySystems: [],
          byTopics: [],
        },
        { status: 200 }
      );
    }

    // Calculate overall statistics
    const correctAnswers = answers.filter((a) => a.isCorrect === true).length;
    const totalAttempted = answers.length;
    const successRate = (correctAnswers / totalAttempted) * 100;

    // Determine mastery level (0-100)
    const masteryLevel = Math.round(successRate);

    // Group by system
    const systemMap = new Map<string, any>();
    answers.forEach((answer) => {
      if (answer.question.system) {
        const systemId = answer.question.system.id;
        if (!systemMap.has(systemId)) {
          systemMap.set(systemId, {
            systemId,
            systemName: answer.question.system.name,
            questionsAttempted: 0,
            correctAnswers: 0,
            lastAttempt: null,
          });
        }

        const systemData = systemMap.get(systemId);
        systemData.questionsAttempted += 1;
        if (answer.isCorrect) systemData.correctAnswers += 1;
        systemData.lastAttempt = answer.answeredAt;
      }
    });

    const bySystems = Array.from(systemMap.values()).map((system) => ({
      system: system.systemName,
      systemId: system.systemId,
      masteryLevel: Math.round(
        (system.correctAnswers / system.questionsAttempted) * 100
      ),
      questionsAttempted: system.questionsAttempted,
      correctAnswers: system.correctAnswers,
      lastAttempt: system.lastAttempt,
    }));

    // Group by topic
    const topicMap = new Map<string, any>();
    answers.forEach((answer) => {
      if (answer.question.topic) {
        const topicId = answer.question.topic.id;
        if (!topicMap.has(topicId)) {
          topicMap.set(topicId, {
            topicId,
            topicName: answer.question.topic.name,
            questionsAttempted: 0,
            correctAnswers: 0,
            totalPoints: 0,
          });
        }

        const topicData = topicMap.get(topicId);
        topicData.questionsAttempted += 1;
        if (answer.isCorrect) topicData.correctAnswers += 1;
        topicData.totalPoints += answer.questionScore?.totalPoints || 0;
      }
    });

    const byTopics = Array.from(topicMap.values())
      .map((topic) => ({
        topic: topic.topicName,
        topicId: topic.topicId,
        masteryLevel: Math.round(
          (topic.correctAnswers / topic.questionsAttempted) * 100
        ),
        questionsAttempted: topic.questionsAttempted,
        correctAnswers: topic.correctAnswers,
        accuracy: parseFloat(
          ((topic.correctAnswers / topic.questionsAttempted) * 100).toFixed(1)
        ),
        points: topic.totalPoints,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    return NextResponse.json(
      {
        overall: {
          masteryLevel,
          questionsAttempted: totalAttempted,
          correctAnswers,
          successRate: parseFloat(successRate.toFixed(1)),
          avgPointsPerQuestion: Math.round(
            answers.reduce((sum, a) => sum + (a.questionScore?.totalPoints || 0), 0) / totalAttempted
          ),
        },
        bySystems: bySystems.sort((a, b) => b.masteryLevel - a.masteryLevel),
        byTopics: byTopics.slice(0, 50), // Top 50 topics
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
