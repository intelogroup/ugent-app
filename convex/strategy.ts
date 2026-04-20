// @ts-nocheck
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDiseasePriorityList = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 30;

    // Get all disease frequencies
    const diseaseFreqs = await ctx.db
      .query("pattern_frequencies")
      .withIndex("by_count")
      .order("desc")
      .take(500);
    const diseases = diseaseFreqs.filter((p) => p.type === "DISEASE");

    // Get user progress rows
    const progressRows = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Build topicId/systemId → successRate map
    const progressMap = new Map<string, number>();
    for (const row of progressRows) {
      if (row.topicId) progressMap.set(row.topicId, row.successRate);
      if (row.systemId) progressMap.set(row.systemId, row.successRate);
    }

    // Score each disease
    const scored = [];
    for (const disease of diseases) {
      // Get one extracted_pattern for this disease to resolve questionId → topicId
      const pattern = await ctx.db
        .query("extracted_patterns")
        .withIndex("by_diseaseName", (q) => q.eq("diseaseName", disease.name))
        .first();

      let userSuccessRate = 0;
      if (pattern) {
        const question = await ctx.db.get(pattern.questionId);
        if (question) {
          const key = question.topicId ?? question.systemId;
          if (key) userSuccessRate = progressMap.get(key) ?? 0;
        }
      }

      const priorityScore = disease.count * (1 - userSuccessRate / 100);
      scored.push({
        diseaseName: disease.name,
        frequency: disease.count,
        userSuccessRate,
        priorityScore: Math.round(priorityScore * 10) / 10,
      });
    }

    return scored
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, limit);
  },
});

export const getDiseaseProfile = query({
  args: { diseaseName: v.string() },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("extracted_patterns")
      .withIndex("by_diseaseName", (q) => q.eq("diseaseName", args.diseaseName))
      .collect();

    if (patterns.length === 0) return null;

    const cluesSet = new Set<string>();
    const symptomsSet = new Set<string>();
    const mechanismsSet = new Set<string>();
    const prerequisitesSet = new Set<string>();
    const discriminators: { distractor: string; ruleOutFact: string }[] = [];
    const clinicalContexts: object[] = [];

    for (const p of patterns) {
      p.highLeverageClues.forEach((c) => cluesSet.add(c));
      p.keySymptoms.forEach((s) => symptomsSet.add(s));
      if (p.mechanism && p.mechanism !== "Pending further analysis") {
        mechanismsSet.add(p.mechanism);
      }
      p.prerequisites.forEach((r) => prerequisitesSet.add(r));
      p.discriminators.forEach((d) => discriminators.push(d));
      if (p.clinicalContext && Object.values(p.clinicalContext).some(Boolean)) {
        clinicalContexts.push(p.clinicalContext);
      }
    }

    return {
      diseaseName: args.diseaseName,
      questionCount: patterns.length,
      mechanisms: Array.from(mechanismsSet),
      clues: Array.from(cluesSet),
      keySymptoms: Array.from(symptomsSet),
      discriminators,
      prerequisites: Array.from(prerequisitesSet),
      clinicalContexts,
    };
  },
});

export const getQuestionsForDisease = query({
  args: { diseaseName: v.string() },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("extracted_patterns")
      .withIndex("by_diseaseName", (q) => q.eq("diseaseName", args.diseaseName))
      .collect();

    const results = [];
    for (const pattern of patterns) {
      const question = await ctx.db.get(pattern.questionId);
      if (!question) continue;
      results.push({ pattern, question });
    }
    return results;
  },
});
