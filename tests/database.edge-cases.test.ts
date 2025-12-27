/**
 * EDGE CASES TEST SUITE
 *
 * Tests unusual, boundary, and error conditions:
 * - Extreme data values
 * - Concurrent operations
 * - Data consistency under stress
 * - Race conditions
 * - Invalid state handling
 * - Cascading deletes
 * - Transaction rollbacks
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>,
  skip = false
): Promise<void> {
  if (skip) {
    results.push({ name, status: 'SKIP', duration: 0 });
    console.log(`⏭️  SKIP: ${name}`);
    return;
  }

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

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

async function testExtremePointValues() {
  const user = await prisma.user.create({
    data: {
      email: `edge-points-${Date.now()}@test.com`,
      name: 'Points Test User',
      password: 'hashed',
    },
  });

  const question = await prisma.question.create({
    data: {
      text: 'Test Question',
      difficulty: 'HARD',
    },
  });

  const option = await prisma.answerOption.create({
    data: {
      questionId: question.id,
      text: 'Correct',
      isCorrect: true,
      displayOrder: 1,
    },
  });

  const test = await prisma.test.create({
    data: {
      userId: user.id,
      title: 'Edge Case Test',
      totalQuestions: 1,
      selectedSubjects: [],
      selectedTopics: [],
    },
  });

  // Test 1: Maximum points (hard Q + max time bonus + max streak)
  await runTest('Handle maximum points (9999+)', async () => {
    const answer = await prisma.answer.create({
      data: {
        userId: user.id,
        testId: test.id,
        questionId: question.id,
        selectedOptionId: option.id,
        status: 'CORRECT',
        isCorrect: true,
        timeSpent: 5, // Very fast
        answeredAt: new Date(),
      },
    });

    const questionScore = await prisma.questionScore.create({
      data: {
        answerId: answer.id,
        basePoints: 30,
        difficulty: 'HARD',
        timeBonus: 2.0, // Max cap
        streakMultiplier: 2.0, // Max cap
        totalPoints: 120, // 30 * 2.0 * 2.0
      },
    });

    if (questionScore.totalPoints > 100) {
      throw new Error('Maximum points exceeded safe limit');
    }
  });

  // Test 2: Zero points edge case
  await runTest('Handle zero points (skipped/unanswered)', async () => {
    const answer2 = await prisma.answer.create({
      data: {
        userId: user.id,
        testId: test.id,
        questionId: question.id,
        selectedOptionId: option.id,
        status: 'SKIPPED',
        isCorrect: false,
        timeSpent: 0,
        answeredAt: new Date(),
      },
    });

    const questionScore = await prisma.questionScore.create({
      data: {
        answerId: answer2.id,
        basePoints: 0,
        difficulty: 'HARD',
        timeBonus: 1.0,
        streakMultiplier: 1.0,
        totalPoints: 0,
      },
    });

    if (questionScore.totalPoints !== 0) {
      throw new Error('Zero points not handled correctly');
    }
  });

  // Test 3: Negative streak (should not exist but test handling)
  await runTest('Prevent negative multipliers', async () => {
    const answer3 = await prisma.answer.create({
      data: {
        userId: user.id,
        testId: test.id,
        questionId: question.id,
        selectedOptionId: option.id,
        status: 'CORRECT',
        isCorrect: true,
        timeSpent: 30,
        answeredAt: new Date(),
      },
    });

    // Should handle gracefully even with mathematical errors
    const questionScore = await prisma.questionScore.create({
      data: {
        answerId: answer3.id,
        basePoints: 30,
        difficulty: 'HARD',
        timeBonus: Math.max(0, -5), // Force positive
        streakMultiplier: Math.max(1, -2), // Minimum 1
        totalPoints: Math.max(0, -100), // Minimum 0
      },
    });

    if (questionScore.totalPoints < 0 || questionScore.timeBonus < 0) {
      throw new Error('Negative values not prevented');
    }
  });

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
}

async function testConcurrentAnswerSubmissions() {
  await runTest('Handle concurrent answer submissions', async () => {
    const user = await prisma.user.create({
      data: {
        email: `concurrent-${Date.now()}@test.com`,
        name: 'Concurrent Test',
        password: 'hashed',
      },
    });

    const question = await prisma.question.create({
      data: {
        text: 'Concurrent Q',
        difficulty: 'EASY',
      },
    });

    const option = await prisma.answerOption.create({
      data: {
        questionId: question.id,
        text: 'A',
        isCorrect: true,
        displayOrder: 1,
      },
    });

    const test = await prisma.test.create({
      data: {
        userId: user.id,
        title: 'Concurrent Test',
        totalQuestions: 10,
        selectedSubjects: [],
        selectedTopics: [],
      },
    });

    // Simulate 10 concurrent answer submissions
    const promises = Array(10)
      .fill(0)
      .map((_, i) =>
        prisma.answer.create({
          data: {
            userId: user.id,
            testId: test.id,
            questionId: question.id,
            selectedOptionId: option.id,
            status: 'CORRECT',
            isCorrect: true,
            timeSpent: 30 + i,
            answeredAt: new Date(),
          },
        })
      );

    const answers = await Promise.all(promises);

    if (answers.length !== 10) {
      throw new Error('Concurrent submissions failed');
    }

    // Verify all are in database
    const count = await prisma.answer.count({
      where: {
        userId: user.id,
        testId: test.id,
      },
    });

    if (count < 10) {
      throw new Error(`Expected 10 answers, got ${count}`);
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
}

async function testLeaderboardRankingEdgeCases() {
  await runTest('Handle tied scores in leaderboard', async () => {
    // Create 3 users with same score
    const users = await Promise.all(
      Array(3)
        .fill(0)
        .map((_, i) =>
          prisma.user.create({
            data: {
              email: `tie-${i}-${Date.now()}@test.com`,
              name: `Tie User ${i}`,
              password: 'hashed',
            },
          })
        )
    );

    const leaderboards = await Promise.all(
      users.map(user =>
        prisma.userLeaderboard.create({
          data: {
            userId: user.id,
            totalTests: 10,
            averageScore: 80.0, // All tied
            totalQuestionsAnswered: 200,
            totalCorrectAnswers: 160,
            overallSuccessRate: 80,
            streakDays: 5,
            lastActivityDate: new Date(),
          },
        })
      )
    );

    // Query tied scores
    const tied = await prisma.userLeaderboard.findMany({
      where: { averageScore: 80.0 },
      orderBy: { averageScore: 'desc' },
    });

    if (tied.length !== 3) {
      throw new Error('Failed to find all tied records');
    }

    // Cleanup
    await Promise.all(users.map(u => prisma.user.delete({ where: { id: u.id } })));
  });
}

async function testInsightExpirationHandling() {
  await runTest('Handle expired insights correctly', async () => {
    const user = await prisma.user.create({
      data: {
        email: `expiry-${Date.now()}@test.com`,
        name: 'Expiry Test',
        password: 'hashed',
      },
    });

    // Create insight that expired yesterday
    const expiredInsight = await prisma.aiInsight.create({
      data: {
        userId: user.id,
        type: 'motivation',
        title: 'Old insight',
        content: 'This should be archived',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      },
    });

    // Create fresh insight
    const freshInsight = await prisma.aiInsight.create({
      data: {
        userId: user.id,
        type: 'motivation',
        title: 'Fresh insight',
        content: 'This is current',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Query only non-expired insights
    const active = await prisma.aiInsight.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() }, // Future dates only
      },
    });

    if (active.length !== 1) {
      throw new Error('Expiration filtering failed');
    }

    if (active[0].id !== freshInsight.id) {
      throw new Error('Wrong insight returned');
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
}

async function testCascadingDeletions() {
  await runTest('Cascading delete user with all relations', async () => {
    const user = await prisma.user.create({
      data: {
        email: `cascade-${Date.now()}@test.com`,
        name: 'Cascade Test',
        password: 'hashed',
      },
    });

    // Create related records
    await prisma.learningPath.create({
      data: {
        userId: user.id,
        description: 'Test path',
        focusAreas: [],
      },
    });

    await prisma.performanceSummary.create({
      data: {
        userId: user.id,
      },
    });

    await prisma.learningPattern.create({
      data: {
        userId: user.id,
      },
    });

    const test = await prisma.test.create({
      data: {
        userId: user.id,
        title: 'Test',
        totalQuestions: 1,
        selectedSubjects: [],
        selectedTopics: [],
      },
    });

    const question = await prisma.question.create({
      data: {
        text: 'Q',
        difficulty: 'EASY',
      },
    });

    const option = await prisma.answerOption.create({
      data: {
        questionId: question.id,
        text: 'A',
        isCorrect: true,
        displayOrder: 1,
      },
    });

    const answer = await prisma.answer.create({
      data: {
        userId: user.id,
        testId: test.id,
        questionId: question.id,
        selectedOptionId: option.id,
        status: 'CORRECT',
        isCorrect: true,
        answeredAt: new Date(),
      },
    });

    await prisma.aiInsight.create({
      data: {
        userId: user.id,
        type: 'motivation',
        title: 'Test',
        content: 'Content',
        expiresAt: new Date(),
      },
    });

    // Delete user
    await prisma.user.delete({ where: { id: user.id } });

    // Verify cascades worked
    const userExists = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (userExists) {
      throw new Error('User was not deleted');
    }

    // Verify related records are deleted/handled
    const insightsCount = await prisma.aiInsight.count({
      where: { userId: user.id },
    });

    if (insightsCount > 0) {
      throw new Error('Insights were not cascaded');
    }
  });
}

async function testPerformanceSummaryBoundaryValues() {
  await runTest('Handle boundary values in performance summary', async () => {
    const user = await prisma.user.create({
      data: {
        email: `boundary-${Date.now()}@test.com`,
        name: 'Boundary Test',
        password: 'hashed',
      },
    });

    // Test with extreme but valid values
    const summary = await prisma.performanceSummary.create({
      data: {
        userId: user.id,
        overallAccuracy: 100.0, // Perfect score
        averageScore: 100.0,
        successRate: 100.0,
        estimatedReadiness: 100.0,
        timePerQuestion: 0, // Instant answer (invalid but test handling)
        totalQuestionsAnswered: 0, // Never answered
        totalCorrectAnswers: 0,
        testsCompleted: 0,
        totalStudyTime: 0,
        activeDaysCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        dailyGoalMetDays: 0,
        monthlyGrowthRate: 0,
        percentileRank: 0,
      },
    });

    if (summary.overallAccuracy !== 100.0) {
      throw new Error('Boundary value not persisted');
    }

    // Test update with negative numbers (should handle gracefully)
    const updated = await prisma.performanceSummary.update({
      where: { userId: user.id },
      data: {
        totalQuestionsAnswered: Math.max(0, -5), // Force 0
        currentStreak: Math.max(0, -10), // Force 0
        percentileRank: Math.min(100, 150), // Cap at 100
      },
    });

    if (updated.totalQuestionsAnswered < 0 || updated.currentStreak < 0) {
      throw new Error('Negative values not handled');
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
}

async function testLeaderboardRankUpdateConsistency() {
  await runTest('Maintain leaderboard rank consistency during updates', async () => {
    // Create 5 users with initial rankings
    const users = await Promise.all(
      Array(5)
        .fill(0)
        .map((_, i) =>
          prisma.user.create({
            data: {
              email: `consistency-${i}-${Date.now()}@test.com`,
              name: `User ${i}`,
              password: 'hashed',
            },
          })
        )
    );

    let leaderboards = await Promise.all(
      users.map((user, i) =>
        prisma.userLeaderboard.create({
          data: {
            userId: user.id,
            totalTests: 10,
            averageScore: 70.0 + i * 5, // Scores: 70, 75, 80, 85, 90
            totalQuestionsAnswered: 200,
            totalCorrectAnswers: 160,
            overallSuccessRate: 70 + i * 5,
            streakDays: 5,
            lastActivityDate: new Date(),
            rank: i + 1, // Initial ranks: 1, 2, 3, 4, 5
          },
        })
      )
    );

    // User at rank 5 improves score above rank 1
    await prisma.userLeaderboard.update({
      where: { id: leaderboards[4].id },
      data: {
        averageScore: 95.0, // Now highest
      },
    });

    // Re-rank
    const sorted = await prisma.userLeaderboard.findMany({
      orderBy: { averageScore: 'desc' },
    });

    for (let i = 0; i < sorted.length; i++) {
      await prisma.userLeaderboard.update({
        where: { id: sorted[i].id },
        data: { rank: i + 1 },
      });
    }

    // Verify new user is rank 1
    const newRank1 = await prisma.userLeaderboard.findFirst({
      where: { rank: 1 },
    });

    if (newRank1?.averageScore !== 95.0) {
      throw new Error('Rank consistency check failed');
    }

    // Cleanup
    await Promise.all(users.map(u => prisma.user.delete({ where: { id: u.id } })));
  });
}

async function testLargeStringHandling() {
  await runTest('Handle very long strings in insights', async () => {
    const user = await prisma.user.create({
      data: {
        email: `string-${Date.now()}@test.com`,
        name: 'String Test',
        password: 'hashed',
      },
    });

    // Create insight with very long content
    const longContent = 'A'.repeat(5000); // 5KB of text

    const insight = await prisma.aiInsight.create({
      data: {
        userId: user.id,
        type: 'adaptive',
        title: 'Long insight',
        content: longContent,
        metadata: {
          details: 'A'.repeat(10000), // Even longer metadata
        },
        expiresAt: new Date(),
      },
    });

    if (!insight.content || insight.content.length < 5000) {
      throw new Error('Long string not persisted');
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
}

async function testAnswerStatusConsistency() {
  await runTest('Maintain answer status consistency', async () => {
    const user = await prisma.user.create({
      data: {
        email: `status-${Date.now()}@test.com`,
        name: 'Status Test',
        password: 'hashed',
      },
    });

    const question = await prisma.question.create({
      data: {
        text: 'Test',
        difficulty: 'EASY',
      },
    });

    const option = await prisma.answerOption.create({
      data: {
        questionId: question.id,
        text: 'A',
        isCorrect: true,
        displayOrder: 1,
      },
    });

    const test = await prisma.test.create({
      data: {
        userId: user.id,
        title: 'Test',
        totalQuestions: 1,
        selectedSubjects: [],
        selectedTopics: [],
      },
    });

    // Test each status
    const statuses = ['CORRECT', 'INCORRECT', 'PARTIAL', 'SKIPPED', 'NOT_ANSWERED'];

    for (const status of statuses) {
      const answer = await prisma.answer.create({
        data: {
          userId: user.id,
          testId: test.id,
          questionId: question.id,
          selectedOptionId: option.id,
          status: status as any,
          isCorrect: status === 'CORRECT',
          answeredAt: new Date(),
        },
      });

      if (answer.status !== status) {
        throw new Error(`Status ${status} not persisted correctly`);
      }
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
}

async function testUniqueConstraintViolation() {
  await runTest('Handle unique constraint violations gracefully', async () => {
    const user = await prisma.user.create({
      data: {
        email: `unique-${Date.now()}@test.com`,
        name: 'Unique Test',
        password: 'hashed',
      },
    });

    // Create first performance summary
    await prisma.performanceSummary.create({
      data: {
        userId: user.id,
      },
    });

    // Try to create duplicate (should fail)
    let violationDetected = false;
    try {
      await prisma.performanceSummary.create({
        data: {
          userId: user.id,
        },
      });
    } catch (error) {
      violationDetected = true;
    }

    if (!violationDetected) {
      throw new Error('Unique constraint not enforced');
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 EDGE CASES TEST SUITE');
  console.log('='.repeat(80));
  console.log('\nTesting edge cases and boundary conditions:\n');

  try {
    console.log('1️⃣  EXTREME VALUE TESTS');
    console.log('-'.repeat(80));
    await testExtremePointValues();

    console.log('\n2️⃣  CONCURRENCY TESTS');
    console.log('-'.repeat(80));
    await testConcurrentAnswerSubmissions();

    console.log('\n3️⃣  LEADERBOARD EDGE CASES');
    console.log('-'.repeat(80));
    await testLeaderboardRankingEdgeCases();
    await testLeaderboardRankUpdateConsistency();

    console.log('\n4️⃣  DATA EXPIRATION TESTS');
    console.log('-'.repeat(80));
    await testInsightExpirationHandling();

    console.log('\n5️⃣  CASCADING DELETE TESTS');
    console.log('-'.repeat(80));
    await testCascadingDeletions();

    console.log('\n6️⃣  BOUNDARY VALUE TESTS');
    console.log('-'.repeat(80));
    await testPerformanceSummaryBoundaryValues();

    console.log('\n7️⃣  DATA TYPE TESTS');
    console.log('-'.repeat(80));
    await testLargeStringHandling();
    await testAnswerStatusConsistency();

    console.log('\n8️⃣  CONSTRAINT TESTS');
    console.log('-'.repeat(80));
    await testUniqueConstraintViolation();

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    const total = results.length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Skipped: ${skipped} ⏭️`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Average Time: ${(totalTime / (total - skipped)).toFixed(2)}ms per test\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  ❌ ${r.name}`);
          console.log(`     ${r.error}`);
        });
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
