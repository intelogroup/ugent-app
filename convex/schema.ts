import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(), // From AuthKit/WorkOS
    telegramId: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("trial"), v.literal("pro"), v.literal("expired"))),
    stripeCustomerId: v.optional(v.string()),
    role: v.optional(v.union(v.literal("STUDENT"), v.literal("ADMIN"), v.literal("INSTRUCTOR"))),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    subscriptionStatus: v.optional(v.union(
      v.literal("FREE"), 
      v.literal("ACTIVE"), 
      v.literal("PAST_DUE"), 
      v.literal("CANCELED"), 
      v.literal("TRIALING"), 
      v.literal("INCOMPLETE"), 
      v.literal("INCOMPLETE_EXPIRED"), 
      v.literal("UNPAID")
    )),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  threads: defineTable({
    userId: v.string(), // tokenIdentifier or user ID string
    title: v.optional(v.string()),
    platform: v.optional(v.string()),
    lastMessage: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),

  bookmarks: defineTable({
    userId: v.string(),
    messageId: v.id("messages"),
    threadId: v.id("threads"),
    question: v.string(),
    answer: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),

  // --- USMLE Pareto Ingestion Engine Tables ---

  ingestions: defineTable({
    rawText: v.string(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("skipped"), v.literal("failed")),
    processedCount: v.number(),
    skippedCount: v.optional(v.number()),
    totalCount: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  systems: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    icon: v.optional(v.string()),
    questionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_display_order", ["displayOrder"])
    .index("by_name", ["name"]),

  topics: defineTable({
    name: v.string(),
    systemId: v.id("systems"),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    questionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_system", ["systemId"])
    .index("by_display_order", ["displayOrder"]),

  subjects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    questionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_display_order", ["displayOrder"])
    .index("by_name", ["name"]),

  questions: defineTable({
    text: v.string(),
    correctAnswer: v.string(),
    options: v.array(v.object({
      text: v.string(),
      isCorrect: v.boolean(),
    })),
    explanation: v.string(),
    educationalObjective: v.optional(v.string()),
    subject: v.optional(v.string()),
    system: v.optional(v.string()),
    ingestionId: v.optional(v.id("ingestions")),
    difficulty: v.optional(v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"))),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    subjectId: v.optional(v.id("subjects")),
    totalAttempts: v.optional(v.number()),
    correctAttempts: v.optional(v.number()),
    successRate: v.optional(v.number()),
    avgTimeSpent: v.optional(v.number()),
    textHash: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_ingestionId", ["ingestionId"])
    .index("by_difficulty", ["difficulty"])
    .index("by_system", ["systemId"])
    .index("by_topic", ["topicId"])
    .index("by_subject", ["subjectId"])
    .index("by_textHash", ["textHash"]),

  extracted_patterns: defineTable({
    questionId: v.id("questions"),
    diseaseName: v.string(),
    mechanism: v.string(),
    highLeverageClues: v.array(v.string()),
    discriminators: v.array(v.object({
      distractor: v.string(),
      ruleOutFact: v.string(),
    })),
    nextBestStep: v.optional(v.string()),
    clinicalContext: v.object({
      age: v.optional(v.string()),
      gender: v.optional(v.string()),
      physiologyState: v.optional(v.string()),
      onsetPattern: v.optional(v.string()),
    }),
    keySymptoms: v.array(v.string()),
    prerequisites: v.array(v.string()),
    tableData: v.optional(v.array(v.any())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_questionId", ["questionId"])
    .index("by_diseaseName", ["diseaseName"]),

  pattern_frequencies: defineTable({
    type: v.string(), // "DISEASE" | "CLUE" | "SUBJECT" | "SYSTEM" | "CONTEXT"
    name: v.string(),
    count: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_type_name", ["type", "name"])
    .index("by_count", ["count"]),

  knowledge_dependencies: defineTable({
    from: v.string(),
    to: v.string(),
    strength: v.number(),
  })
    .index("by_from_to", ["from", "to"])
    .index("by_strength", ["strength"]),

  // --- Assessment & Tracking Tables (Parity with Prisma) ---

  tests: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    mode: v.union(v.literal("TUTOR"), v.literal("TIMED")),
    questionMode: v.union(v.literal("STANDARD"), v.literal("CUSTOM"), v.literal("PRACTICE")),
    useAI: v.boolean(),
    totalQuestions: v.number(),
    timeLimit: v.optional(v.number()),
    selectedSubjects: v.array(v.string()),
    selectedTopics: v.array(v.string()),
    score: v.optional(v.number()),
    totalCorrect: v.number(),
    totalIncorrect: v.number(),
    totalSkipped: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    status: v.union(
      v.literal("ACTIVE"), 
      v.literal("PAUSED"), 
      v.literal("RESUMED"), 
      v.literal("COMPLETED"), 
      v.literal("ABANDONED"), 
      v.literal("TIMEOUT"), 
      v.literal("INCOMPLETE")
    ),
    statusUpdatedAt: v.number(),
    sessionToken: v.optional(v.string()),
    lastActivityAt: v.number(),
    attemptNumber: v.number(),
    maxAttempts: v.number(),
    abandonReason: v.optional(v.union(
      v.literal("USER_QUIT"), 
      v.literal("NETWORK_ERROR"), 
      v.literal("BROWSER_CRASH"), 
      v.literal("AUTO_TIMEOUT"), 
      v.literal("SYSTEM_ERROR")
    )),
    scoreIncompleteAs: v.union(v.literal("SKIPPED"), v.literal("INCORRECT"), v.literal("PENDING")),
    applyIncompletePenalty: v.boolean(),
    incompletePenalty: v.number(),
    answeredCount: v.number(),
    skippedCount: v.number(),
    unansweredCount: v.number(),
    pausedAt: v.optional(v.number()),
    resumedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session_token", ["sessionToken"])
    .index("by_created_at", ["createdAt"]),

  test_questions: defineTable({
    testId: v.id("tests"),
    questionId: v.id("questions"),
    displayOrder: v.number(),
  })
    .index("by_test", ["testId"])
    .index("by_question", ["questionId"])
    .index("by_test_question", ["testId", "questionId"]),

  answers: defineTable({
    userId: v.id("users"),
    testId: v.id("tests"),
    questionId: v.id("questions"),
    selectedOptionIndex: v.optional(v.number()),
    status: v.union(
      v.literal("CORRECT"), 
      v.literal("INCORRECT"), 
      v.literal("PARTIAL"), 
      v.literal("SKIPPED"), 
      v.literal("NOT_ANSWERED"), 
      v.literal("UNANSWERED"), 
      v.literal("TIMEOUT"), 
      v.literal("INCOMPLETE"), 
      v.literal("MARKED_REVIEW")
    ),
    isCorrect: v.optional(v.boolean()),
    timeSpent: v.optional(v.number()),
    answeredAt: v.optional(v.number()),
    markedForReview: v.boolean(),
    attemptCount: v.number(),
    lastModified: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_test_question", ["testId", "questionId"])
    .index("by_user", ["userId"])
    .index("by_test", ["testId"])
    .index("by_status", ["status"]),

  user_interactions: defineTable({
    userId: v.id("users"),
    actionType: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    testId: v.optional(v.id("tests")),
    questionId: v.optional(v.id("questions")),
    answerId: v.optional(v.id("answers")),
    metadata: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    clientIP: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["actionType"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_test", ["testId"])
    .index("by_question", ["questionId"]),

  progress: defineTable({
    userId: v.id("users"),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    subjectId: v.optional(v.id("subjects")),
    masteryLevel: v.number(),
    totalQuestionsAttempted: v.number(),
    correctAnswers: v.number(),
    incorrectAnswers: v.number(),
    successRate: v.number(),
    firstAttemptAt: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_system", ["systemId"])
    .index("by_topic", ["topicId"])
    .index("by_subject", ["subjectId"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    questionId: v.optional(v.id("questions")),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    isPinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),

  test_sessions: defineTable({
    userId: v.id("users"),
    testId: v.id("tests"),
    sessionNumber: v.number(),
    sessionToken: v.optional(v.string()),
    startedAt: v.number(),
    pausedAt: v.optional(v.number()),
    resumedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    totalEventCount: v.number(),
    focusLostCount: v.number(),
    focusRestoredCount: v.number(),
    disconnectCount: v.number(),
    canResume: v.boolean(),
    resumeDeadline: v.optional(v.number()),
    resumeAttempts: v.number(),
    maxResumeAttempts: v.number(),
    averageResponseTime: v.optional(v.number()),
    questionsAnswered: v.number(),
    correctAnswersCount: v.number(),
    lastActivity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_test", ["testId"])
    .index("by_token", ["sessionToken"]),

  review_history: defineTable({
    userId: v.id("users"),
    answerId: v.id("answers"),
    reviewedAt: v.number(),
    confidence: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_answer", ["answerId"]),

  learning_paths: defineTable({
    userId: v.id("users"),
    description: v.optional(v.string()),
    focusAreas: v.array(v.string()),
    targetMasteryLevel: v.number(),
    startedAt: v.number(),
    targetCompletionDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  leaderboard: defineTable({
    userId: v.id("users"),
    totalTests: v.number(),
    averageScore: v.number(),
    totalQuestionsAnswered: v.number(),
    totalCorrectAnswers: v.number(),
    overallSuccessRate: v.number(),
    streakDays: v.number(),
    lastActivityDate: v.optional(v.number()),
    rank: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_average_score", ["averageScore"])
    .index("by_rank", ["rank"])
    .index("by_user", ["userId"]),

  achievements: defineTable({
    id: v.string(), // Unique string ID like 'first_test'
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    points: v.number(),
    category: v.union(v.literal("TEST"), v.literal("SCORE"), v.literal("STREAK"), v.literal("POINTS")),
    requirement: v.string(),
  }).index("by_achievement_id", ["id"]),

  user_achievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
  }).index("by_user_achievement", ["userId", "achievementId"])
    .index("by_user", ["userId"]),

  ai_insights: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),

  performance_summaries: defineTable({
    userId: v.id("users"),
    overallAccuracy: v.number(),
    averageScore: v.number(),
    successRate: v.number(),
    estimatedReadiness: v.number(),
    timePerQuestion: v.number(),
    totalQuestionsAnswered: v.number(),
    totalCorrectAnswers: v.number(),
    testsCompleted: v.number(),
    totalStudyTime: v.number(),
    activeDaysCount: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    dailyGoalMetDays: v.number(),
    optimalStudyTime: v.optional(v.string()),
    bestDayOfWeek: v.optional(v.string()),
    globalRank: v.optional(v.number()),
    percentileRank: v.optional(v.number()),
    friendsRank: v.optional(v.number()),
    monthlyGrowthRate: v.number(),
    weeklyGrowthRate: v.number(),
    projectedExamDate: v.optional(v.number()),
    projectedReadiness: v.optional(v.number()),
    subjectMastery: v.optional(v.any()),
    topicPerformance: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_global_rank", ["globalRank"]),

  learning_patterns: defineTable({
    userId: v.id("users"),
    peakPerformanceTime: v.optional(v.string()),
    bestStudyDay: v.optional(v.string()),
    avgSessionDuration: v.optional(v.number()),
    hardQAccuracy: v.number(),
    easyQAccuracy: v.number(),
    preferredDifficulty: v.optional(v.string()),
    errorPatterns: v.optional(v.any()),
    commonMistakes: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  question_scores: defineTable({
    answerId: v.id("answers"),
    basePoints: v.number(),
    difficulty: v.string(),
    timeBonus: v.number(),
    streakMultiplier: v.number(),
    totalPoints: v.number(),
    isFromIncomplete: v.boolean(),
    pointAdjustment: v.number(),
    adjustmentReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_answer", ["answerId"]),

  status_events: defineTable({
    sessionId: v.id("test_sessions"),
    eventType: v.string(),
    reason: v.optional(v.string()),
    questionIndex: v.optional(v.number()),
    questionsAnswered: v.optional(v.number()),
    questionsSkipped: v.optional(v.number()),
    questionsUnanswered: v.optional(v.number()),
    attemptNumber: v.optional(v.number()),
    timeSinceStart: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  test_policies: defineTable({
    resumeWindowMinutes: v.number(),
    maxResumeAttempts: v.number(),
    inactivityTimeoutMin: v.number(),
    scoreUnansweredAs: v.union(v.literal("SKIPPED"), v.literal("INCORRECT"), v.literal("PENDING")),
    applyIncompletePenalty: v.boolean(),
    incompletePenalty: v.number(),
    includeUnansweredInMastery: v.boolean(),
    trackAbandonmentRate: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    isRead: v.boolean(),
    relatedUserId: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    relatedEntityType: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "isRead", "createdAt"]),
});
