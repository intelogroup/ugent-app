import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/progress/system/:systemId
 *
 * Gets detailed progress for a specific medical system
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ systemId: string }> }
) {
  try {
    const { systemId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId || !systemId) {
      return NextResponse.json(
        { error: 'User ID and System ID required' },
        { status: 400 }
      );
    }

    // Get system details
    const system = await prisma.system.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      );
    }

    // Get all answers for questions in this system
    const answers = await prisma.answer.findMany({
      where: {
        userId,
        question: {
          systemId,
        },
      },
      include: {
        question: {
          include: {
            topic: true,
          },
        },
        questionScore: true,
      },
    });

    if (answers.length === 0) {
      return NextResponse.json(
        {
          system: system.name,
          systemId,
          masteryLevel: 0,
          questionsAttempted: 0,
          correctAnswers: 0,
          accuracy: 0,
          topics: [],
        },
        { status: 200 }
      );
    }

    // Calculate overall stats for system
    const correctAnswers = answers.filter((a) => a.isCorrect === true).length;
    const totalAttempted = answers.length;
    const accuracy = (correctAnswers / totalAttempted) * 100;
    const masteryLevel = Math.round(accuracy);

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
            points: 0,
          });
        }

        const topicData = topicMap.get(topicId);
        topicData.questionsAttempted += 1;
        if (answer.isCorrect) topicData.correctAnswers += 1;
        topicData.points += answer.questionScore?.totalPoints || 0;
      }
    });

    const topics = Array.from(topicMap.values())
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
        points: topic.points,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    // Get difficulty breakdown
    const difficultyMap = new Map<string, any>();
    answers.forEach((answer) => {
      const difficulty = answer.question.difficulty;
      if (!difficultyMap.has(difficulty)) {
        difficultyMap.set(difficulty, {
          questionsAttempted: 0,
          correctAnswers: 0,
        });
      }

      const diffData = difficultyMap.get(difficulty);
      diffData.questionsAttempted += 1;
      if (answer.isCorrect) diffData.correctAnswers += 1;
    });

    const byDifficulty: any = {};
    difficultyMap.forEach((data, difficulty) => {
      byDifficulty[difficulty] = {
        questionsAttempted: data.questionsAttempted,
        correctAnswers: data.correctAnswers,
        accuracy: parseFloat(
          ((data.correctAnswers / data.questionsAttempted) * 100).toFixed(1)
        ),
      };
    });

    return NextResponse.json(
      {
        system: system.name,
        systemId,
        masteryLevel,
        questionsAttempted: totalAttempted,
        correctAnswers,
        accuracy: parseFloat(accuracy.toFixed(1)),
        totalPoints: answers.reduce((sum, a) => sum + (a.questionScore?.totalPoints || 0), 0),
        topics,
        byDifficulty,
        lastActivityAt: answers.length > 0 ? new Date(Math.max(...answers.map(a => new Date(a.answeredAt || 0).getTime()))) : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching system progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system progress' },
      { status: 500 }
    );
  }
}
