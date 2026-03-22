import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get analytics for a specific user
 */
export const getUserAnalytics = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get test statistics
    const tests = await ctx.db
      .query("tests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Calculate metrics
    const totalTests = tests.length;
    const completedTests = tests.filter((t) => t.status === "COMPLETED").length;
    const totalQuestionsAnswered = tests.reduce((sum, t) => sum + t.answeredCount, 0);
    const totalCorrectAnswers = tests.reduce((sum, t) => sum + t.totalCorrect, 0);
    const overallSuccessRate = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered) * 100 : 0;
    const averageScore = completedTests > 0 ? tests.reduce((sum, t) => sum + (t.score || 0), 0) / completedTests : 0;

    // Get progress by system (including populated subject/system/topic if needed)
    // In Convex, we might need to manually fetch them since there's no "include"
    const progressRecords = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const progressWithDetails = await Promise.all(
      progressRecords.map(async (p) => {
        const system = p.systemId ? await ctx.db.get(p.systemId) : null;
        const topic = p.topicId ? await ctx.db.get(p.topicId) : null;
        const subject = p.subjectId ? await ctx.db.get(p.subjectId) : null;
        return { ...p, system, topic, subject };
      })
    );

    // Get recent interactions
    const recentInteractions = await ctx.db
      .query("user_interactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    // Get most reviewed questions (grouping answers by questionId)
    // Note: Convex doesn't have a direct groupBy yet, so we fetch and manual group
    // For large datasets this could be optimized, but for user-level answers it should be fine.
    const userAnswers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const questionCounts: Record<string, number> = {};
    userAnswers.forEach((a) => {
      const qId = a.questionId.toString();
      questionCounts[qId] = (questionCounts[qId] || 0) + 1;
    });

    const mostReviewedQuestions = Object.entries(questionCounts)
      .map(([questionId, count]) => ({ questionId, _count: { id: count } }))
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      statistics: {
        totalTests,
        completedTests,
        totalQuestionsAnswered,
        totalCorrectAnswers,
        overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
      },
      progress: progressWithDetails,
      recentInteractions,
      mostReviewedQuestions,
    };
  },
});
