import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new test session
 */
export const createTest = mutation({
  args: {
    userId: v.id("users"),
    subjects: v.array(v.string()),
    topics: v.array(v.string()),
    systems: v.array(v.string()),
    questionCount: v.number(),
    mode: v.union(v.literal("TUTOR"), v.literal("TIMED")),
    questionMode: v.union(v.literal("STANDARD"), v.literal("CUSTOM"), v.literal("PRACTICE")),
    difficulty: v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"), v.literal("MIXED")),
    timeLimit: v.optional(v.number()),
    useAI: v.boolean(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, subjects, topics, systems, questionCount, mode, questionMode, difficulty, timeLimit, useAI, title } = args;

    // Build question filter
    // In Convex, we have to be careful with complex filters.
    // We'll fetch questions matching the criteria and then randomize.
    
    let allMatchingQuestions: any[] = [];
    
    // This is a simplified version. In a real app with many questions, 
    // we'd want a more efficient way to sample.
    if (subjects.length > 0) {
      for (const subjectId of subjects) {
        const questions = await ctx.db
          .query("questions")
          .withIndex("by_subject", (q) => q.eq("subjectId", subjectId as Id<"subjects">))
          .collect();
        allMatchingQuestions = [...allMatchingQuestions, ...questions];
      }
    } else if (topics.length > 0) {
      for (const topicId of topics) {
        const questions = await ctx.db
          .query("questions")
          .withIndex("by_topic", (q) => q.eq("topicId", topicId as Id<"topics">))
          .collect();
        allMatchingQuestions = [...allMatchingQuestions, ...questions];
      }
    } else if (systems.length > 0) {
      for (const systemId of systems) {
        const questions = await ctx.db
          .query("questions")
          .withIndex("by_system", (q) => q.eq("systemId", systemId as Id<"systems">))
          .collect();
        allMatchingQuestions = [...allMatchingQuestions, ...questions];
      }
    } else {
      // Fallback: get some questions
      allMatchingQuestions = await ctx.db.query("questions").take(100);
    }

    // Filter by difficulty if not MIXED
    if (difficulty !== "MIXED") {
      allMatchingQuestions = allMatchingQuestions.filter(q => q.difficulty === difficulty);
    }

    // De-duplicate by ID
    const uniqueQuestions = Array.from(new Map(allMatchingQuestions.map(q => [q._id, q])).values());

    if (uniqueQuestions.length < questionCount) {
       // We'll take what we have, or let the caller handle it.
       // The original code returned 400 if not enough questions.
       // Since this is a mutation, we can throw an error.
       throw new Error(`Only ${uniqueQuestions.length} questions available matching criteria (need ${questionCount})`);
    }

    // Randomize and select
    const selectedQuestions = uniqueQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount);

    // Create test record
    const testId = await ctx.db.insert("tests", {
      userId,
      title,
      mode,
      questionMode,
      useAI,
      totalQuestions: selectedQuestions.length,
      timeLimit,
      selectedSubjects: subjects,
      selectedTopics: topics,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalSkipped: 0,
      answeredCount: 0,
      skippedCount: 0,
      unansweredCount: selectedQuestions.length,
      status: "ACTIVE",
      statusUpdatedAt: Date.now(),
      lastActivityAt: Date.now(),
      attemptNumber: 1,
      maxAttempts: 1,
      applyIncompletePenalty: false,
      incompletePenalty: 0,
      scoreIncompleteAs: "SKIPPED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Associate questions with test
    for (let i = 0; i < selectedQuestions.length; i++) {
      await ctx.db.insert("test_questions", {
        testId,
        questionId: selectedQuestions[i]._id,
        displayOrder: i + 1,
      });
    }

    // Create initial test session
    const sessionId = await ctx.db.insert("test_sessions", {
      userId,
      testId,
      sessionNumber: 1,
      startedAt: Date.now(),
      totalEventCount: 0,
      focusLostCount: 0,
      focusRestoredCount: 0,
      disconnectCount: 0,
      canResume: true,
      resumeAttempts: 0,
      maxResumeAttempts: 5,
      questionsAnswered: 0,
      correctAnswersCount: 0,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { testId, sessionId, questions: selectedQuestions };
  },
});

/**
 * Get test by ID with its questions
 */
export const getTestById = query({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const test = await ctx.db.get(args.testId);
    if (!test) return null;

    const testQuestions = await ctx.db
      .query("test_questions")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .collect();

    const questions = await Promise.all(
      testQuestions.map(async (tq) => {
        const question = await ctx.db.get(tq.questionId);
        return {
          ...question,
          displayOrder: tq.displayOrder,
        };
      })
    );

    // Sort by display order
    questions.sort((a, b) => a.displayOrder - b.displayOrder);

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .collect();

    const sessions = await ctx.db
      .query("test_sessions")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .order("desc")
      .collect();

    return {
      ...test,
      questions,
      answers,
      sessions,
    };
  },
});

/**
 * Submit an answer
 */
export const submitAnswer = mutation({
  args: {
    userId: v.id("users"),
    testId: v.id("tests"),
    questionId: v.id("questions"),
    selectedOptionIndex: v.optional(v.number()),
    timeSpent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, testId, questionId, selectedOptionIndex, timeSpent } = args;

    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) {
      throw new Error("Test not found or unauthorized");
    }

    const question = await ctx.db.get(questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    // Determine correctness
    let isCorrect = false;
    let status: any = "SKIPPED";

    if (selectedOptionIndex !== undefined) {
      const option = question.options[selectedOptionIndex];
      isCorrect = option?.isCorrect || false;
      status = isCorrect ? "CORRECT" : "INCORRECT";
    }

    // Check if answer already exists
    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_test_question", (q) => q.eq("testId", testId).eq("questionId", questionId))
      .unique();

    let answerId;
    if (existingAnswer) {
      answerId = existingAnswer._id;
      await ctx.db.patch(answerId, {
        selectedOptionIndex,
        status,
        isCorrect,
        timeSpent,
        answeredAt: Date.now(),
        updatedAt: Date.now(),
        lastModified: Date.now(),
      });
    } else {
      answerId = await ctx.db.insert("answers", {
        userId,
        testId,
        questionId,
        selectedOptionIndex,
        status,
        isCorrect,
        timeSpent,
        answeredAt: Date.now(),
        markedForReview: false,
        attemptCount: 1,
        lastModified: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update test metrics
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_test", (q) => q.eq("testId", testId))
      .collect();

    const totalCorrect = answers.filter(a => a.status === "CORRECT").length;
    const totalIncorrect = answers.filter(a => a.status === "INCORRECT").length;
    const totalSkipped = answers.filter(a => a.status === "SKIPPED").length;
    const answeredCount = answers.filter(a => a.status === "CORRECT" || a.status === "INCORRECT").length;

    await ctx.db.patch(testId, {
      totalCorrect,
      totalIncorrect,
      totalSkipped,
      answeredCount,
      skippedCount: totalSkipped,
      unansweredCount: test.totalQuestions - answeredCount - totalSkipped,
      lastActivityAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update question global metrics
    await ctx.db.patch(questionId, {
      totalAttempts: (question.totalAttempts || 0) + 1,
      correctAttempts: (question.correctAttempts || 0) + (isCorrect ? 1 : 0),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      answerId,
      isCorrect,
      status,
    };
  },
});

/**
 * Update test status
 */
export const updateTestStatus = mutation({
  args: {
    testId: v.id("tests"),
    status: v.union(
      v.literal("ACTIVE"), 
      v.literal("PAUSED"), 
      v.literal("RESUMED"), 
      v.literal("COMPLETED"), 
      v.literal("ABANDONED"), 
      v.literal("TIMEOUT"), 
      v.literal("INCOMPLETE")
    ),
    abandonReason: v.optional(v.union(
      v.literal("USER_QUIT"), 
      v.literal("NETWORK_ERROR"), 
      v.literal("BROWSER_CRASH"), 
      v.literal("AUTO_TIMEOUT"), 
      v.literal("SYSTEM_ERROR")
    )),
  },
  handler: async (ctx, args) => {
    const { testId, status, abandonReason } = args;

    const test = await ctx.db.get(testId);
    if (!test) throw new Error("Test not found");

    const patch: any = {
      status,
      statusUpdatedAt: Date.now(),
      updatedAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    if (status === "COMPLETED") {
      patch.completedAt = Date.now();
      // Calculate final score if not already set
      if (test.totalQuestions > 0) {
        patch.score = (test.totalCorrect / test.totalQuestions) * 100;
      }
    }

    if (status === "PAUSED") {
      patch.pausedAt = Date.now();
    }

    if (status === "RESUMED") {
      patch.resumedAt = Date.now();
    }

    if (abandonReason) {
      patch.abandonReason = abandonReason;
    }

    await ctx.db.patch(testId, patch);
    return { success: true };
  },
});

/**
 * Pause a test session
 */
export const pauseSession = mutation({
  args: {
    testId: v.id("tests"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
    currentQuestion: v.optional(v.number()),
    questionsAnswered: v.optional(v.number()),
    questionsSkipped: v.optional(v.number()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { testId, userId, reason, currentQuestion, questionsAnswered, questionsSkipped, deviceType, browser } = args;

    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) {
      throw new Error("Test not found or unauthorized");
    }

    // Update test status
    await ctx.db.patch(testId, {
      status: "PAUSED",
      pausedAt: Date.now(),
      abandonReason: (reason as any) || "USER_QUIT",
      answeredCount: questionsAnswered ?? test.answeredCount,
      skippedCount: questionsSkipped ?? test.skippedCount,
      lastActivityAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create a new session for this pause
    const sessions = await ctx.db
      .query("test_sessions")
      .withIndex("by_test", (q) => q.eq("testId", testId))
      .collect();

    const sessionNumber = sessions.length + 1;
    const resumeDeadline = Date.now() + 15 * 60 * 1000; // 15 minutes

    const sessionId = await ctx.db.insert("test_sessions", {
      userId,
      testId,
      sessionNumber,
      startedAt: test.startedAt || Date.now(),
      pausedAt: Date.now(),
      canResume: true,
      resumeDeadline,
      maxResumeAttempts: 3,
      resumeAttempts: 0,
      questionsAnswered: questionsAnswered ?? 0,
      correctAnswersCount: test.totalCorrect,
      totalEventCount: 0,
      focusLostCount: 0,
      focusRestoredCount: 0,
      disconnectCount: 0,
      deviceType,
      browser,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create status event
    await ctx.db.insert("status_events", {
      sessionId,
      eventType: "PAUSED",
      reason: reason || "USER_ACTION",
      questionIndex: currentQuestion,
      questionsAnswered,
      questionsSkipped,
      createdAt: Date.now(),
    });

    return {
      success: true,
      test: {
        id: testId,
        status: "PAUSED",
        pausedAt: Date.now(),
        resumeDeadline: new Date(resumeDeadline).toISOString(),
      },
    };
  },
});

/**
 * Check resume status and optionally resume
 */
export const resumeSession = mutation({
  args: {
    testId: v.id("tests"),
    userId: v.id("users"),
    action: v.union(v.literal("CHECK"), v.literal("RESUME")),
  },
  handler: async (ctx, args) => {
    const { testId, userId, action } = args;

    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) {
      throw new Error("Test not found or unauthorized");
    }

    if (test.status !== "PAUSED") {
      return {
        canResume: false,
        reason: test.status === "COMPLETED" ? "test_completed" : "not_paused",
        message: "This quiz cannot be resumed.",
        recommendedAction: "REVIEW",
      };
    }

    // Get latest session
    const lastSession = await ctx.db
      .query("test_sessions")
      .withIndex("by_test", (q) => q.eq("testId", testId))
      .order("desc")
      .first();

    if (lastSession?.resumeDeadline && Date.now() > lastSession.resumeDeadline) {
      return {
        canResume: false,
        reason: "resume_deadline_expired",
        message: "The resume deadline has passed.",
        recommendedAction: "RESTART",
      };
    }

    if (lastSession && lastSession.resumeAttempts >= lastSession.maxResumeAttempts) {
      return {
        canResume: false,
        reason: "max_attempts_exceeded",
        message: "Maximum resume attempts exceeded.",
        recommendedAction: "RESTART",
      };
    }

    if (action === "RESUME") {
      const sessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await ctx.db.patch(testId, {
        status: "RESUMED",
        sessionToken,
        resumedAt: Date.now(),
        attemptNumber: test.attemptNumber + 1,
        lastActivityAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (lastSession) {
        await ctx.db.patch(lastSession._id, {
          resumedAt: Date.now(),
          resumeAttempts: lastSession.resumeAttempts + 1,
          updatedAt: Date.now(),
        });

        await ctx.db.insert("status_events", {
          sessionId: lastSession._id,
          eventType: "RESUMED",
          attemptNumber: lastSession.resumeAttempts + 1,
          createdAt: Date.now(),
        });
      }

      const answers = await ctx.db
        .query("answers")
        .withIndex("by_test", (q) => q.eq("testId", testId))
        .collect();

      return {
        canResume: true,
        test: {
          id: testId,
          status: "RESUMED",
          sessionToken,
          questionsAnswered: test.answeredCount,
          questionsSkipped: test.skippedCount,
          resumeAttempt: (lastSession?.resumeAttempts || 0) + 1,
          resumeDeadline: lastSession?.resumeDeadline,
        },
        questions: answers.map((a, i) => ({
          index: i,
          id: a.questionId,
          userAnswer: a.selectedOptionIndex,
          status: a.status,
        })),
      };
    }

    return {
      canResume: true,
      reason: "quiz_paused",
      test: {
        id: testId,
        status: test.status,
        resumeAttempt: lastSession?.resumeAttempts || 0,
        maxResumeAttempts: lastSession?.maxResumeAttempts || 3,
        resumeDeadline: lastSession?.resumeDeadline,
      },
    };
  },
});

/**
 * Complete a test session
 */
export const completeSession = mutation({
  args: {
    testId: v.id("tests"),
    userId: v.id("users"),
    durationMs: v.optional(v.number()),
    clientIP: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { testId, userId, durationMs, clientIP, userAgent } = args;

    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) {
      throw new Error("Test not found or unauthorized");
    }

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_test", (q) => q.eq("testId", testId))
      .collect();

    const totalQuestions = test.totalQuestions;
    const correctAnswers = answers.filter(a => a.isCorrect === true).length;
    const incorrectAnswers = answers.filter(a => a.isCorrect === false).length;
    const skipped = answers.filter(a => a.status === "SKIPPED").length;
    
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const finalScore = accuracy;

    // Update test
    await ctx.db.patch(testId, {
      status: "COMPLETED",
      completedAt: Date.now(),
      score: finalScore,
      totalCorrect: correctAnswers,
      totalIncorrect: incorrectAnswers,
      totalSkipped: skipped,
      updatedAt: Date.now(),
    });

    // Update leaderboard
    const leaderboardEntry = await ctx.db
      .query("leaderboard")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (leaderboardEntry) {
      const allTests = await ctx.db
        .query("tests")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      const completedTests = allTests.filter(t => t.status === "COMPLETED" || t._id === testId);
      const totalCorrectAll = completedTests.reduce((sum, t) => sum + (t._id === testId ? correctAnswers : t.totalCorrect), 0);
      const totalQuestionsAll = completedTests.reduce((sum, t) => sum + t.totalQuestions, 0);
      const avgScore = completedTests.length > 0 
        ? completedTests.reduce((sum, t) => sum + (t._id === testId ? finalScore : (t.score || 0)), 0) / completedTests.length
        : finalScore;

      await ctx.db.patch(leaderboardEntry._id, {
        totalTests: completedTests.length,
        averageScore: avgScore,
        totalQuestionsAnswered: totalQuestionsAll,
        totalCorrectAnswers: totalCorrectAll,
        overallSuccessRate: totalQuestionsAll > 0 ? (totalCorrectAll / totalQuestionsAll) * 100 : 0,
        lastActivityDate: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("leaderboard", {
        userId,
        totalTests: 1,
        averageScore: finalScore,
        totalQuestionsAnswered: totalQuestions,
        totalCorrectAnswers: correctAnswers,
        overallSuccessRate: accuracy,
        streakDays: 1,
        lastActivityDate: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update performance summary (Frequency Engine)
    const summary = await ctx.db
      .query("performance_summaries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const allCompletedTests = await ctx.db
      .query("tests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const completed = allCompletedTests.filter(t => t.status === "COMPLETED" || t._id === testId);
    const totalQ = completed.reduce((sum, t) => sum + t.totalQuestions, 0);
    const totalC = completed.reduce((sum, t) => sum + (t._id === testId ? correctAnswers : t.totalCorrect), 0);
    const avgS = completed.length > 0 
      ? completed.reduce((sum, t) => sum + (t._id === testId ? finalScore : (t.score || 0)), 0) / completed.length
      : finalScore;

    if (summary) {
      await ctx.db.patch(summary._id, {
        overallAccuracy: totalQ > 0 ? (totalC / totalQ) * 100 : 0,
        averageScore: avgS,
        successRate: totalQ > 0 ? (totalC / totalQ) * 100 : 0,
        totalQuestionsAnswered: totalQ,
        totalCorrectAnswers: totalC,
        testsCompleted: completed.length,
        totalStudyTime: (summary.totalStudyTime || 0) + (durationMs || 0) / 1000,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("performance_summaries", {
        userId,
        overallAccuracy: accuracy,
        averageScore: finalScore,
        successRate: accuracy,
        estimatedReadiness: accuracy, // Initial estimate
        timePerQuestion: (durationMs || 0) / (totalQuestions || 1) / 1000,
        totalQuestionsAnswered: totalQuestions,
        totalCorrectAnswers: correctAnswers,
        testsCompleted: 1,
        totalStudyTime: (durationMs || 0) / 1000,
        activeDaysCount: 1,
        currentStreak: 1,
        longestStreak: 1,
        dailyGoalMetDays: 0,
        monthlyGrowthRate: 0,
        weeklyGrowthRate: 0,
        updatedAt: Date.now(),
      });
    }

    // Create user interaction
    await ctx.db.insert("user_interactions", {
      userId,
      actionType: "test_completed",
      entityType: "test",
      entityId: testId,
      testId,
      durationMs,
      metadata: JSON.stringify({
        finalScore,
        correctAnswers,
        totalQuestions,
        accuracy,
      }),
      clientIP,
      userAgent,
      createdAt: Date.now(),
    });

    return {
      success: true,
      testResult: {
        testId,
        finalScore: parseFloat(finalScore.toFixed(1)),
        correctAnswers,
        totalQuestions,
        accuracy: parseFloat(accuracy.toFixed(1)),
        completedAt: Date.now(),
      },
    };
  },
});

/**
 * List tests for a user
 */
export const listTests = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, status, limit = 10, offset = 0 } = args;

    let testsQuery = ctx.db
      .query("tests")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const allTests = await testsQuery.order("desc").collect();

    let filteredTests = allTests;
    if (status === "completed") {
      filteredTests = allTests.filter((t) => t.status === "COMPLETED");
    } else if (status === "in_progress") {
      filteredTests = allTests.filter((t) => t.status !== "COMPLETED");
    }

    const total = filteredTests.length;
    const paginatedTests = filteredTests.slice(offset, offset + limit);

    return {
      tests: paginatedTests,
      total,
    };
  },
});

