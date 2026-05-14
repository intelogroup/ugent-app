import { v } from "convex/values";
import { query } from "./_generated/server";

export const getSystemHubStats = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const patterns = await ctx.db.query("extracted_patterns").collect();
    const systems = await ctx.db.query("systems").collect();
    const topics = await ctx.db.query("topics").collect();
    const subjects = await ctx.db.query("subjects").collect();
    const frequencies = await ctx.db.query("pattern_frequencies").collect();

    let categorized = 0, withPattern = 0, withDifficulty = 0;
    let both = 0, catOnly = 0, patOnly = 0, neither = 0;
    const diffCounts = {};
    const missingFields = { systemId: 0, topicId: 0, subjectId: 0, difficulty: 0, explanation: 0, educationalObjective: 0 };

    const patternByQuestion = new Map();
    for (const p of patterns) {
      patternByQuestion.set(p.questionId, p);
    }

    for (const q of questions) {
      const hasCategories = !!(q.systemId || q.topicId || q.subjectId);
      const hasPattern = patternByQuestion.has(q._id);
      if (hasCategories) categorized++;
      if (hasPattern) withPattern++;
      if (hasCategories && hasPattern) both++;
      else if (hasCategories && !hasPattern) catOnly++;
      else if (!hasCategories && hasPattern) patOnly++;
      else neither++;

      if (q.difficulty) { withDifficulty++; diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1; }
      if (!q.systemId) missingFields.systemId++;
      if (!q.topicId) missingFields.topicId++;
      if (!q.subjectId) missingFields.subjectId++;
      if (!q.difficulty) missingFields.difficulty++;
      if (!q.explanation) missingFields.explanation++;
      if (!q.educationalObjective) missingFields.educationalObjective++;
    }

    // Top diseases from frequencies
    const topDiseases = frequencies
      .filter(f => f.type === "DISEASE")
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const topClues = frequencies
      .filter(f => f.type === "CLUE")
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      questions: questions.length,
      patterns: patterns.length,
      systems: systems.length,
      topics: topics.length,
      subjects: subjects.length,
      frequencies: frequencies.length,
      categorized,
      withPattern,
      withDifficulty,
      both,
      catOnly,
      patOnly,
      neither,
      diffCounts,
      missingFields,
      topDiseases,
      topClues,
    };
  },
});

export const getRecentIngestions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ingestions")
      .order("desc")
      .take(args.limit || 5);
  },
});

export const getTopPatterns = query({
  args: { type: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pattern_frequencies")
      .withIndex("by_type_name", (q) => q.eq("type", args.type))
      .order("desc") // Wait, by_type_name order is lexicographical on name.
      .collect();
  },
});

// Since by_type_name doesn't sort by count, let's use by_count and filter by type if needed
// or just collect and sort in memory if the list is small.
// For top 10, we can use by_count index if we want it globally, but usually it's per type.

export const getTopPatternsByCount = query({
  args: { type: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("pattern_frequencies")
      .withIndex("by_type_name", (q) => q.eq("type", args.type))
      .collect();

    return patterns
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit || 10);
  },
});

export const getKnowledgeDependencies = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knowledge_dependencies")
      .withIndex("by_strength")
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getAuditSample = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const questions = await ctx.db.query("questions").order("desc").take(2000);
    const results = [];
    for (const q of questions) {
      const pattern = q._id
        ? await ctx.db.query("extracted_patterns").withIndex("by_questionId", (qIdx) => qIdx.eq("questionId", q._id)).first()
        : null;
      if (!pattern) continue;
      results.push({
        questionId: q._id,
        text: q.text,
        correctAnswer: q.correctAnswer,
        subject: q.subject,
        system: q.system,
        explanation: q.explanation?.slice(0, 300),
        diseaseName: pattern.diseaseName,
        topicType: pattern.topicType,
        mechanism: pattern.mechanism,
        highLeverageClues: pattern.highLeverageClues,
        discriminators: pattern.discriminators,
        nextBestStep: pattern.nextBestStep,
        keySymptoms: pattern.keySymptoms,
        prerequisites: pattern.prerequisites,
      });
    }
    return results.slice(0, args.limit ?? results.length);
  },
});

export const getExtractionFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const extractions = await ctx.db
      .query("extracted_patterns")
      .order("desc")
      .take(args.limit || 10);
    
    const feed = [];
    for (const extraction of extractions) {
      feed.push({
        _id: extraction._id,
        questionId: extraction.questionId,
        diseaseName: extraction.diseaseName,
        topicType: extraction.topicType,
        mechanism: extraction.mechanism,
        keySymptoms: extraction.keySymptoms,
        clinicalContext: extraction.clinicalContext,
      });
    }
    return feed;
  },
});

export const getAllQuestionsWithRawText = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const ingestions = await ctx.db.query("ingestions").order("desc").take(args.limit ?? 2000);
    const results = [];
    for (const ing of ingestions) {
      // Find the linked question via textHash
      const question = await ctx.db
        .query("questions")
        .withIndex("by_textHash", (q) => q.eq("textHash", ing.textHash!))
        .first();
      results.push({
        questionId: question?._id,
        correctAnswer: question?.correctAnswer,
        educationalObjective: question?.educationalObjective,
        options: question?.options,
        textHash: ing.textHash,
        rawText: ing.rawText,
        ingestionId: ing._id,
        text: question?.text,
        subject: question?.subject,
        system: question?.system,
        explanation: question?.explanation,
        status: ing.status,
      });
    }
    return results;
  },
});
