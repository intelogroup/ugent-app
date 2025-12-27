/**
 * COMPREHENSIVE DATABASE TEST SUITE
 *
 * Tests the database's ability to handle:
 * - Quiz points system (scoring, multipliers)
 * - Global leaderboard functionality
 * - AI insights generation
 * - Performance summary tracking
 * - Learning patterns analysis
 * - High-volume data ingestion (simulating multiple users)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: 'PASS', duration });
    console.log(`✅ PASS: ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', duration, error: errorMessage });
    console.log(`❌ FAIL: ${name} (${duration}ms)`);
    console.log(`   Error: ${errorMessage}`);
  }
}

async function reportResults() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Average Time: ${(totalTime / total).toFixed(2)}ms per test\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.name}`);
        console.log(`    ${r.error}`);
      });
  }
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

async function setupTestData() {
  console.log('\n📊 Setting up test data...\n');

  // Create test users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'test1@example.com' },
      update: {},
      create: {
        email: 'test1@example.com',
        name: 'Test User 1',
        password: 'hashed_password_1',
        role: 'STUDENT',
      },
    }),
    prisma.user.upsert({
      where: { email: 'test2@example.com' },
      update: {},
      create: {
        email: 'test2@example.com',
        name: 'Test User 2',
        password: 'hashed_password_2',
        role: 'STUDENT',
      },
    }),
    prisma.user.upsert({
      where: { email: 'test3@example.com' },
      update: {},
      create: {
        email: 'test3@example.com',
        name: 'Test User 3',
        password: 'hashed_password_3',
        role: 'STUDENT',
      },
    }),
  ]);

  // Create test systems and questions
  const system = await prisma.system.upsert({
    where: { name: 'Cardiovascular System' },
    update: {},
    create: {
      name: 'Cardiovascular System',
      displayOrder: 1,
      questionCount: 100,
    },
  });

  const topic = await prisma.topic.upsert({
    where: {
      systemId_name: {
        systemId: system.id,
        name: 'ECG Interpretation',
      },
    },
    update: {},
    create: {
      name: 'ECG Interpretation',
      systemId: system.id,
      displayOrder: 1,
    },
  });

  // Create test questions with different difficulties
  const questions = await Promise.all([
    ...Array(5)
      .fill(0)
      .map((_, i) =>
        prisma.question.create({
          data: {
            text: `Easy Question ${i + 1}: Basic ECG interpretation`,
            explanation: 'This is an easy question',
            difficulty: 'EASY',
            systemId: system.id,
            topicId: topic.id,
          },
        })
      ),
    ...Array(5)
      .fill(0)
      .map((_, i) =>
        prisma.question.create({
          data: {
            text: `Medium Question ${i + 1}: Intermediate ECG interpretation`,
            explanation: 'This is a medium question',
            difficulty: 'MEDIUM',
            systemId: system.id,
            topicId: topic.id,
          },
        })
      ),
    ...Array(5)
      .fill(0)
      .map((_, i) =>
        prisma.question.create({
          data: {
            text: `Hard Question ${i + 1}: Complex ECG interpretation`,
            explanation: 'This is a hard question',
            difficulty: 'HARD',
            systemId: system.id,
            topicId: topic.id,
          },
        })
      ),
  ]);

  // Create answer options for each question
  for (const question of questions) {
    await Promise.all([
      prisma.answerOption.create({
        data: {
          questionId: question.id,
          text: 'Option A',
          isCorrect: true,
          displayOrder: 1,
        },
      }),
      prisma.answerOption.create({
        data: {
          questionId: question.id,
          text: 'Option B',
          isCorrect: false,
          displayOrder: 2,
        },
      }),
      prisma.answerOption.create({
        data: {
          questionId: question.id,
          text: 'Option C',
          isCorrect: false,
          displayOrder: 3,
        },
      }),
      prisma.answerOption.create({
        data: {
          questionId: question.id,
          text: 'Option D',
          isCorrect: false,
          displayOrder: 4,
        },
      }),
    ]);
  }

  console.log('✅ Test data setup complete!\n');

  return { users, system, topic, questions };
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...\n');
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['test1@example.com', 'test2@example.com', 'test3@example.com'],
      },
    },
  });
  console.log('✅ Cleanup complete!\n');
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testQuizPointsSystem() {
  const { users, questions } = await setupTestData();
  const userId = users[0].id;

  await runTest('Create test for user', async () => {
    const test = await prisma.test.create({
      data: {
        userId,
        title: 'ECG Interpretation Quiz',
        totalQuestions: 5,
        mode: 'TUTOR',
        questionMode: 'STANDARD',
        selectedSubjects: [],
        selectedTopics: [],
      },
    });

    if (!test.id) throw new Error('Failed to create test');
  });

  await runTest('Submit correct answer and calculate points', async () => {
    const test = await prisma.test.findFirst({
      where: { userId },
    });

    if (!test) throw new Error('Test not found');

    const question = questions[0]; // Easy question
    const correctOption = await prisma.answerOption.findFirst({
      where: { questionId: question.id, isCorrect: true },
    });

    if (!correctOption) throw new Error('Correct option not found');

    const answer = await prisma.answer.create({
      data: {
        userId,
        testId: test.id,
        questionId: question.id,
        selectedOptionId: correctOption.id,
        status: 'CORRECT',
        isCorrect: true,
        timeSpent: 25, // 25 seconds for easy question (time limit: 60s)
        answeredAt: new Date(),
      },
    });

    // Calculate points
    const basePoints = 10; // Easy = 10 points
    const timeBonus = 1.5; // 25/60 = 42% speed = 50% bonus
    const streakMultiplier = 1.0; // First question, no streak
    const totalPoints = Math.round(basePoints * timeBonus * streakMultiplier);

    // Create question score
    const questionScore = await prisma.questionScore.create({
      data: {
        answerId: answer.id,
        basePoints,
        difficulty: 'EASY',
        timeBonus,
        streakMultiplier,
        totalPoints,
      },
    });

    if (questionScore.totalPoints < 10) {
      throw new Error('Points calculation failed');
    }
  });

  await runTest('Handle incorrect answer with penalty', async () => {
    const test = await prisma.test.findFirst({
      where: { userId },
    });

    if (!test) throw new Error('Test not found');

    const question = questions[10]; // Medium question
    const incorrectOption = await prisma.answerOption.findFirst({
      where: { questionId: question.id, isCorrect: false },
    });

    if (!incorrectOption) throw new Error('Incorrect option not found');

    const answer = await prisma.answer.create({
      data: {
        userId,
        testId: test.id,
        questionId: question.id,
        selectedOptionId: incorrectOption.id,
        status: 'INCORRECT',
        isCorrect: false,
        timeSpent: 45,
        answeredAt: new Date(),
      },
    });

    // Incorrect answer = 0 points
    const questionScore = await prisma.questionScore.create({
      data: {
        answerId: answer.id,
        basePoints: 0,
        difficulty: 'MEDIUM',
        timeBonus: 1.0,
        streakMultiplier: 1.0,
        totalPoints: 0,
      },
    });

    if (questionScore.totalPoints !== 0) {
      throw new Error('Incorrect answer should give 0 points');
    }
  });

  await runTest('Apply streak multiplier correctly', async () => {
    const test = await prisma.test.findFirst({
      where: { userId },
    });

    if (!test) throw new Error('Test not found');

    // Simulate streak with multiple correct answers
    for (let i = 0; i < 5; i++) {
      const question = questions[i + 2]; // Use different questions
      const correctOption = await prisma.answerOption.findFirst({
        where: { questionId: question.id, isCorrect: true },
      });

      if (!correctOption) throw new Error('Correct option not found');

      const answer = await prisma.answer.create({
        data: {
          userId,
          testId: test.id,
          questionId: question.id,
          selectedOptionId: correctOption.id,
          status: 'CORRECT',
          isCorrect: true,
          timeSpent: 30,
          answeredAt: new Date(),
        },
      });

      const streakMultiplier = 1.0 + (i * 0.05); // Gradually increase streak
      const questionScore = await prisma.questionScore.create({
        data: {
          answerId: answer.id,
          basePoints: 10,
          difficulty: 'EASY',
          timeBonus: 1.25,
          streakMultiplier,
          totalPoints: Math.round(10 * 1.25 * streakMultiplier),
        },
      });

      if (questionScore.totalPoints === 0) {
        throw new Error('Streak points calculation failed');
      }
    }
  });

  await cleanupTestData();
}

async function testGlobalLeaderboard() {
  const { users } = await setupTestData();

  await runTest('Create user leaderboard entries', async () => {
    for (const user of users) {
      const leaderboard = await prisma.userLeaderboard.create({
        data: {
          userId: user.id,
          totalTests: 10,
          averageScore: 78.5,
          totalQuestionsAnswered: 250,
          totalCorrectAnswers: 195,
          overallSuccessRate: 78,
          streakDays: 7,
          lastActivityDate: new Date(),
        },
      });

      if (!leaderboard.id) throw new Error('Failed to create leaderboard entry');
    }
  });

  await runTest('Calculate global rankings', async () => {
    const leaderboards = await prisma.userLeaderboard.findMany({
      orderBy: { averageScore: 'desc' },
    });

    // Assign ranks
    for (let i = 0; i < leaderboards.length; i++) {
      await prisma.userLeaderboard.update({
        where: { id: leaderboards[i].id },
        data: { rank: i + 1 },
      });
    }

    const topRanked = await prisma.userLeaderboard.findFirst({
      where: { rank: 1 },
    });

    if (!topRanked) throw new Error('Ranking failed');
  });

  await runTest('Query leaderboard with pagination', async () => {
    const top10 = await prisma.userLeaderboard.findMany({
      take: 10,
      orderBy: { averageScore: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    if (top10.length === 0) throw new Error('Failed to retrieve leaderboard');
  });

  await runTest('Update user rank on new test completion', async () => {
    const user = users[0];
    await prisma.userLeaderboard.update({
      where: { userId: user.id },
      data: {
        averageScore: 85.2, // Improved score
        totalTests: 11,
        totalQuestionsAnswered: 260,
        totalCorrectAnswers: 210,
        overallSuccessRate: 80.8,
        lastActivityDate: new Date(),
      },
    });

    const updated = await prisma.userLeaderboard.findUnique({
      where: { userId: user.id },
    });

    if (!updated || updated.averageScore !== 85.2) {
      throw new Error('Failed to update leaderboard');
    }
  });

  await cleanupTestData();
}

async function testAIInsights() {
  const { users, questions } = await setupTestData();
  const userId = users[0].id;

  await runTest('Create performance-based insight', async () => {
    const insight = await prisma.aiInsight.create({
      data: {
        userId,
        type: 'performance',
        title: 'Great improvement on ECG questions!',
        content: 'You got 8/10 correct! Your ECG interpretation improved by 15% compared to last week.',
        metadata: {
          improvement: 15,
          topic: 'ECG Interpretation',
          currentAccuracy: 85,
          previousAccuracy: 70,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    if (!insight.id) throw new Error('Failed to create insight');
  });

  await runTest('Create pattern-based insight', async () => {
    const insight = await prisma.aiInsight.create({
      data: {
        userId,
        type: 'pattern',
        title: 'Learning pattern detected',
        content: 'You are 20% more accurate on Cardiovascular topics before 10 AM. Schedule difficult topics in the morning!',
        metadata: {
          timeOfDay: '9 AM - 11 AM',
          system: 'Cardiovascular',
          improvement: 20,
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    if (!insight.id) throw new Error('Failed to create insight');
  });

  await runTest('Create weakness insight', async () => {
    const insight = await prisma.aiInsight.create({
      data: {
        userId,
        type: 'weakness',
        title: 'Areas needing focus (this week)',
        content: 'Your weakest areas: 1. Pharmacology (62%), 2. Neurology (68%)',
        metadata: {
          weakAreas: [
            { name: 'Pharmacology', accuracy: 62 },
            { name: 'Neurology', accuracy: 68 },
          ],
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    if (!insight.id) throw new Error('Failed to create insight');
  });

  await runTest('Create motivational insight', async () => {
    const insight = await prisma.aiInsight.create({
      data: {
        userId,
        type: 'motivation',
        title: 'Keep your streak going!',
        content: '🔥 12-day streak! Today\'s study will compound your knowledge.',
        metadata: {
          currentStreak: 12,
          milestone: 'half-way-to-30',
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      },
    });

    if (!insight.id) throw new Error('Failed to create insight');
  });

  await runTest('Mark insight as read', async () => {
    const insight = await prisma.aiInsight.findFirst({
      where: { userId },
    });

    if (!insight) throw new Error('Insight not found');

    const updated = await prisma.aiInsight.update({
      where: { id: insight.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (!updated.isRead) throw new Error('Failed to mark insight as read');
  });

  await runTest('Query unread insights', async () => {
    const unreadInsights = await prisma.aiInsight.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Should have some unread insights
    if (unreadInsights.length === 0) {
      throw new Error('No unread insights found');
    }
  });

  await cleanupTestData();
}

async function testPerformanceSummary() {
  const { users } = await setupTestData();
  const userId = users[0].id;

  await runTest('Create performance summary', async () => {
    const summary = await prisma.performanceSummary.create({
      data: {
        userId,
        overallAccuracy: 78.2,
        averageScore: 82.1,
        successRate: 78.2,
        estimatedReadiness: 68,
        timePerQuestion: 45,
        totalQuestionsAnswered: 2847,
        totalCorrectAnswers: 2225,
        testsCompleted: 87,
        totalStudyTime: 8640, // 144 hours in minutes
        activeDaysCount: 87,
        currentStreak: 12,
        longestStreak: 23,
        dailyGoalMetDays: 85,
        optimalStudyTime: '9 AM - 11 AM',
        bestDayOfWeek: 'Thursday',
        globalRank: 145,
        percentileRank: 99,
        monthlyGrowthRate: 5.2,
        weeklyGrowthRate: 1.2,
        projectedExamDate: new Date('2026-03-01'),
        projectedReadiness: 90,
        subjectMastery: {
          Cardiovascular: 95,
          Pathology: 92,
          Anatomy: 91,
          Pharmacology: 85,
        },
        topicPerformance: {
          'ECG Interpretation': { accuracy: 85, questions: 45 },
          'Drug Mechanisms': { accuracy: 78, questions: 38 },
        },
      },
    });

    if (!summary.id) throw new Error('Failed to create performance summary');
  });

  await runTest('Update performance summary with new metrics', async () => {
    const updated = await prisma.performanceSummary.update({
      where: { userId },
      data: {
        totalQuestionsAnswered: 2900,
        totalCorrectAnswers: 2280,
        currentStreak: 13,
        percentileRank: 99.2,
        monthlyGrowthRate: 5.5,
      },
    });

    if (updated.totalQuestionsAnswered !== 2900) {
      throw new Error('Failed to update performance summary');
    }
  });

  await runTest('Query performance summary with user info', async () => {
    const summary = await prisma.performanceSummary.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!summary) throw new Error('Failed to retrieve performance summary');
  });

  await cleanupTestData();
}

async function testLearningPatterns() {
  const { users } = await setupTestData();
  const userId = users[0].id;

  await runTest('Create learning pattern for user', async () => {
    const pattern = await prisma.learningPattern.create({
      data: {
        userId,
        peakPerformanceTime: '9 AM - 11 AM',
        bestStudyDay: 'Thursday',
        avgSessionDuration: 45,
        hardQAccuracy: 75,
        easyQAccuracy: 79,
        preferredDifficulty: 'mixed',
        errorPatterns: {
          'agonist_vs_antagonist': 15,
          'similar_drug_classes': 12,
        },
        commonMistakes: [
          {
            topic: 'Drug Mechanisms',
            frequency: 'high',
            hint: 'Use comparison tables',
          },
        ],
      },
    });

    if (!pattern.id) throw new Error('Failed to create learning pattern');
  });

  await runTest('Update learning patterns based on new data', async () => {
    const updated = await prisma.learningPattern.update({
      where: { userId },
      data: {
        hardQAccuracy: 78,
        easyQAccuracy: 82,
        avgSessionDuration: 48,
      },
    });

    if (updated.hardQAccuracy !== 78) {
      throw new Error('Failed to update learning pattern');
    }
  });

  await cleanupTestData();
}

async function testHighVolumeDataIngestion() {
  console.log('\n📊 Running high-volume data ingestion test...\n');

  await runTest('Create 100 test submissions rapidly', async () => {
    const user = await prisma.user.create({
      data: {
        email: `bulk-test-${Date.now()}@example.com`,
        name: 'Bulk Test User',
        password: 'hashed_password',
      },
    });

    const system = await prisma.system.create({
      data: {
        name: `System-${Date.now()}`,
        displayOrder: 1,
      },
    });

    const topic = await prisma.topic.create({
      data: {
        name: `Topic-${Date.now()}`,
        systemId: system.id,
        displayOrder: 1,
      },
    });

    // Create 100 questions
    const questions = await Promise.all(
      Array(100)
        .fill(0)
        .map((_, i) =>
          prisma.question.create({
            data: {
              text: `Question ${i}`,
              explanation: 'Explanation',
              difficulty: ['EASY', 'MEDIUM', 'HARD'][i % 3],
              systemId: system.id,
              topicId: topic.id,
            },
          })
        )
    );

    // Create 100 tests with answers
    for (let i = 0; i < 100; i++) {
      const test = await prisma.test.create({
        data: {
          userId: user.id,
          title: `Test ${i}`,
          totalQuestions: 1,
          selectedSubjects: [],
          selectedTopics: [],
        },
      });

      const question = questions[i];
      const options = await prisma.answerOption.findMany({
        where: { questionId: question.id },
      });

      if (options.length === 0) {
        // Create options if they don't exist
        await prisma.answerOption.create({
          data: {
            questionId: question.id,
            text: 'Correct Answer',
            isCorrect: true,
            displayOrder: 1,
          },
        });
      }

      const correctOption = await prisma.answerOption.findFirst({
        where: { questionId: question.id, isCorrect: true },
      });

      if (correctOption) {
        await prisma.answer.create({
          data: {
            userId: user.id,
            testId: test.id,
            questionId: question.id,
            selectedOptionId: correctOption.id,
            status: 'CORRECT',
            isCorrect: true,
            timeSpent: Math.floor(Math.random() * 120) + 10,
            answeredAt: new Date(),
          },
        });
      }
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });

  console.log('✅ High-volume test completed!\n');
}

async function testComplexQueries() {
  const { users } = await setupTestData();

  await runTest('Query user with all related data', async () => {
    const userWithData = await prisma.user.findUnique({
      where: { id: users[0].id },
      include: {
        tests: {
          include: {
            answers: {
              include: {
                question: true,
                selectedOption: true,
              },
            },
          },
        },
        aiInsights: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        performanceSummary: true,
        learningPattern: true,
      },
    });

    if (!userWithData) throw new Error('Failed to query user with relations');
  });

  await runTest('Aggregate user statistics', async () => {
    const stats = await prisma.answer.aggregate({
      where: { userId: users[0].id },
      _count: {
        id: true,
      },
      _avg: {
        timeSpent: true,
      },
    });

    if (typeof stats._count.id !== 'number') {
      throw new Error('Failed to aggregate statistics');
    }
  });

  await cleanupTestData();
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 DATABASE TEST SUITE - QUIZ & LEADERBOARD FEATURES');
  console.log('='.repeat(80));
  console.log('\nTesting database capabilities for:');
  console.log('  • Quiz points system with multipliers');
  console.log('  • Global leaderboard functionality');
  console.log('  • AI insights generation');
  console.log('  • Performance summary tracking');
  console.log('  • Learning patterns analysis');
  console.log('  • High-volume data ingestion\n');

  try {
    console.log('1️⃣  QUIZ POINTS SYSTEM TESTS');
    console.log('-'.repeat(80));
    await testQuizPointsSystem();

    console.log('\n2️⃣  GLOBAL LEADERBOARD TESTS');
    console.log('-'.repeat(80));
    await testGlobalLeaderboard();

    console.log('\n3️⃣  AI INSIGHTS TESTS');
    console.log('-'.repeat(80));
    await testAIInsights();

    console.log('\n4️⃣  PERFORMANCE SUMMARY TESTS');
    console.log('-'.repeat(80));
    await testPerformanceSummary();

    console.log('\n5️⃣  LEARNING PATTERNS TESTS');
    console.log('-'.repeat(80));
    await testLearningPatterns();

    console.log('\n6️⃣  HIGH-VOLUME INGESTION TEST');
    console.log('-'.repeat(80));
    await testHighVolumeDataIngestion();

    console.log('\n7️⃣  COMPLEX QUERY TESTS');
    console.log('-'.repeat(80));
    await testComplexQueries();

    await reportResults();

    process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
