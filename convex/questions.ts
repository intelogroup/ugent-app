// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const bulkImport = mutation({
  args: {
    questions: v.array(v.object({
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
      difficulty: v.optional(v.string()),
      systemId: v.optional(v.string()),
      topicId: v.optional(v.string()),
      subjectId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const question of args.questions) {
      const id = await ctx.db.insert("questions", {
        ...question,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const createQuestion = mutation({
  args: {
    text: v.string(),
    explanation: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"))),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    subjectId: v.optional(v.id("subjects")),
    options: v.array(v.object({
      text: v.string(),
      isCorrect: v.boolean(),
    })),
    correctAnswer: v.string(), // We need this for the questions table
  },
  handler: async (ctx, args) => {
    const { text, explanation, difficulty, systemId, topicId, subjectId, options, correctAnswer } = args;

    const questionId = await ctx.db.insert("questions", {
      text,
      explanation: explanation || "",
      difficulty: difficulty || "MEDIUM",
      systemId,
      topicId,
      subjectId,
      options,
      correctAnswer,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const question = await ctx.db.get(questionId);
    return question;
  },
});

export const getQuestions = query({
  args: {
    limit: v.optional(v.number()),
    subjectId: v.optional(v.id("subjects")),
    topicId: v.optional(v.id("topics")),
    systemId: v.optional(v.id("systems")),
    difficulty: v.optional(v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"))),
  },
  handler: async (ctx, args) => {
    let qQuery = ctx.db.query("questions");

    if (args.subjectId) {
      qQuery = qQuery.withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId));
    } else if (args.topicId) {
      qQuery = qQuery.withIndex("by_topic", (q) => q.eq("topicId", args.topicId));
    } else if (args.systemId) {
      qQuery = qQuery.withIndex("by_system", (q) => q.eq("systemId", args.systemId));
    } else if (args.difficulty) {
      qQuery = qQuery.withIndex("by_difficulty", (q) => q.eq("difficulty", args.difficulty));
    }

    // Apply remaining filters using filter()
    let results = qQuery;
    
    if (args.subjectId && (args.topicId || args.systemId || args.difficulty)) {
       results = results.filter(q => 
        (!args.topicId || q.eq(q.field("topicId"), args.topicId)) &&
        (!args.systemId || q.eq(q.field("systemId"), args.systemId)) &&
        (!args.difficulty || q.eq(q.field("difficulty"), args.difficulty))
       );
    } else if (args.topicId && (args.systemId || args.difficulty)) {
       results = results.filter(q => 
        (!args.systemId || q.eq(q.field("systemId"), args.systemId)) &&
        (!args.difficulty || q.eq(q.field("difficulty"), args.difficulty))
       );
    } else if (args.systemId && args.difficulty) {
       results = results.filter(q => q.eq(q.field("difficulty"), args.difficulty));
    }

    return await results.order("desc").take(args.limit || 50);
  },
});

export const patchSystemAndTopic = mutation({
  args: {
    questionId: v.id("questions"),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    subjectId: v.optional(v.id("subjects")),
  },
  handler: async (ctx, args) => {
    const { questionId, ...updates } = args;
    await ctx.db.patch(questionId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const seedSystem = mutation({
  args: { name: v.string(), description: v.optional(v.string()), displayOrder: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("systems").withIndex("by_name", q => q.eq("name", args.name)).first();
    if (existing) return existing._id;
    return await ctx.db.insert("systems", { ...args, questionCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
  }
});

export const seedTopic = mutation({
  args: { name: v.string(), systemId: v.id("systems"), description: v.optional(v.string()), displayOrder: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("topics").withIndex("by_system", q => q.eq("systemId", args.systemId)).filter(q => q.eq(q.field("name"), args.name)).first();
    if (existing) return existing._id;
    return await ctx.db.insert("topics", { ...args, questionCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
  }
});

export const seedSubject = mutation({
  args: { name: v.string(), description: v.optional(v.string()), displayOrder: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("subjects").withIndex("by_name", q => q.eq("name", args.name)).first();
    if (existing) return existing._id;
    return await ctx.db.insert("subjects", { ...args, questionCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
  }
});

export const getQuestionById = query({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) return null;
    
    // Include system and topic details if they exist
    const system = question.systemId ? await ctx.db.get(question.systemId) : null;
    const topic = question.topicId ? await ctx.db.get(question.topicId) : null;
    
    return {
      ...question,
      system,
      topic,
    };
  },
});

export const getQuestionExplanationById = query({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) return null;

    return {
      _id: question._id,
      explanation: question.explanation,
    };
  },
});

export const getQuestionTextById = query({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) return null;

    return {
      _id: question._id,
      text: question.text,
    };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    return questions.length;
  },
});

export const getQuestionsByIds = query({
  args: {
    ids: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.ids.map(async (id) => await ctx.db.get(id))
    );
  },
});

export const updateQuestionMetrics = mutation({
  args: {
    questionId: v.id("questions"),
    isCorrect: v.boolean(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return;

    const totalAttempts = (question.totalAttempts || 0) + 1;
    const correctAttempts = (question.correctAttempts || 0) + (args.isCorrect ? 1 : 0);
    const successRate = (correctAttempts / totalAttempts) * 100;

    // Calculate new average time (rolling average)
    const currentAvgTime = question.avgTimeSpent || 0;
    const currentTotalAttempts = question.totalAttempts || 0;
    const newAvgTime = Math.round(
      (currentAvgTime * currentTotalAttempts + args.timeSpent) / totalAttempts
    );

    await ctx.db.patch(args.questionId, {
      totalAttempts,
      correctAttempts,
      successRate,
      avgTimeSpent: newAvgTime,
      updatedAt: Date.now(),
    });
  },
});

export const getAdaptiveQuestions = query({
  args: {
    userId: v.id("users"),
    systemId: v.id("systems"),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get user's success rate in this system
    const userProgress = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("systemId"), args.systemId))
      .unique();

    const successRate = userProgress?.successRate || 50;

    // Select difficulty based on performance
    let difficulty: "EASY" | "MEDIUM" | "HARD";
    if (successRate < 40) {
      difficulty = "EASY";
    } else if (successRate < 70) {
      difficulty = "MEDIUM";
    } else {
      difficulty = "HARD";
    }

    // Get questions with target difficulty
    return await ctx.db
      .query("questions")
      .withIndex("by_system", (q) => q.eq("systemId", args.systemId))
      .filter((q) => q.eq(q.field("difficulty"), difficulty))
      .take(args.count || 20);
  },
});

export const getWeakAreasForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find topics where user has low success rate
    const weakProgress = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.lt(q.field("successRate"), 60),
          q.gte(q.field("totalQuestionsAttempted"), 5)
        )
      )
      .order("asc")
      .take(5);

    if (weakProgress.length === 0) {
      // No weak areas, return general questions
      return await ctx.db.query("questions").take(args.limit || 30);
    }

    // Get questions from weak topics/systems
    const limitPerArea = Math.ceil((args.limit || 30) / weakProgress.length);
    const allQuestions = [];

    for (const progress of weakProgress) {
      let qQuery = ctx.db.query("questions");
      if (progress.topicId) {
        qQuery = qQuery.withIndex("by_topic", (q) => q.eq("topicId", progress.topicId!));
      } else if (progress.systemId) {
        qQuery = qQuery.withIndex("by_system", (q) => q.eq("systemId", progress.systemId!));
      } else {
        continue;
      }
      
      const areaQuestions = await qQuery.take(limitPerArea);
      allQuestions.push(...areaQuestions);
    }

    return allQuestions.slice(0, args.limit || 30);
  },
});

export const searchQuestions = query({
  args: {
    searchTerm: v.string(),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    difficulty: v.optional(v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, systemId, topicId, difficulty, limit = 50 } = args;

    let qQuery = ctx.db.query("questions");
    
    // Convex doesn't have native full-text search in basic queries yet, 
    // but we can filter or use search indexes if defined.
    // For now, we'll use a basic filter on the results.
    // Optimization: If we have many questions, this should use a search index.
    
    if (systemId) {
      qQuery = qQuery.withIndex("by_system", (q) => q.eq("systemId", systemId));
    } else if (topicId) {
      qQuery = qQuery.withIndex("by_topic", (q) => q.eq("topicId", topicId));
    } else if (difficulty) {
      qQuery = qQuery.withIndex("by_difficulty", (q) => q.eq("difficulty", difficulty));
    }

    const questions = await qQuery.collect();
    
    const filtered = questions.filter(q => 
      q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.explanation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.slice(0, limit);
  },
});

export const getQuestionStats = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    const successRate = question.successRate || 0;

    return {
      totalAttempts: question.totalAttempts || 0,
      correctAttempts: question.correctAttempts || 0,
      successRate: successRate,
      avgTimeSpent: question.avgTimeSpent || 0,
      difficulty: question.difficulty,
      performanceCategory:
        successRate > 80
          ? "Easy for users"
          : successRate > 50
          ? "Moderate"
          : "Challenging",
    };
  },
});

export const listSubjects = query({
  args: {},
  handler: async (ctx) => {
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_display_order")
      .collect();

    return subjects.map((subject) => ({
      _id: subject._id,
      name: subject.name,
      questionCount: subject.questionCount,
    }));
  },
});

export const listSystemsWithTopics = query({
  args: {},
  handler: async (ctx) => {
    const systems = await ctx.db
      .query("systems")
      .withIndex("by_display_order")
      .collect();

    return await Promise.all(
      systems.map(async (system) => {
        const topics = await ctx.db
          .query("topics")
          .withIndex("by_system", (q) => q.eq("systemId", system._id))
          .collect();
        
        // Sort topics by display order manually since we filtered by systemId
        topics.sort((a, b) => a.displayOrder - b.displayOrder);
        
        return {
          _id: system._id,
          name: system.name,
          questionCount: system.questionCount,
          topics: topics.map((topic) => ({
            _id: topic._id,
            name: topic.name,
            questionCount: topic.questionCount,
          })),
        };
      })
    );
  },
});

export const listTopicsBySystem = query({
  args: { systemId: v.id("systems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topics")
      .withIndex("by_system", (q) => q.eq("systemId", args.systemId))
      .collect();
  },
});
