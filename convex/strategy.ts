// @ts-nocheck
import { v } from "convex/values";
import { query } from "./_generated/server";

const DEMOGRAPHIC_RE = /^\d+-year-old|^(male|female|man|woman|boy|girl)\b/i;

function pickBestClue(clues: string[]): string | undefined {
  if (!clues?.length) return undefined;
  return clues.find((c) => c && !DEMOGRAPHIC_RE.test(c.trim())) ?? clues[0];
}

export const getDiseasePriorityList = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    topicTypeFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 30;

    // 2 DB reads total — no N+1
    const allDiseaseFreqs = await ctx.db
      .query("pattern_frequencies")
      .withIndex("by_type_name", (q) => q.eq("type", "DISEASE"))
      .collect();
    const diseases = allDiseaseFreqs
      .filter((p) => p.name !== "N/A" && p.name.trim().length > 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 500);

    const allPatterns = await ctx.db.query("extracted_patterns").collect();

    // Build: diseaseName → { topicType, clueFreq }
    type PatternMeta = { topicType?: string; clueFreq: Map<string, number> };
    const patternMap = new Map<string, PatternMeta>();
    for (const p of allPatterns) {
      if (!p.diseaseName || p.diseaseName === "N/A") continue;
      let meta = patternMap.get(p.diseaseName);
      if (!meta) {
        meta = { topicType: p.topicType ?? undefined, clueFreq: new Map() };
        patternMap.set(p.diseaseName, meta);
      }
      if (!meta.topicType && p.topicType) meta.topicType = p.topicType;
      for (const clue of p.highLeverageClues ?? []) {
        if (clue && !DEMOGRAPHIC_RE.test(clue.trim())) {
          meta.clueFreq.set(clue, (meta.clueFreq.get(clue) ?? 0) + 1);
        }
      }
    }

    const scored = [];
    for (const disease of diseases) {
      const meta = patternMap.get(disease.name);
      let topClue: string | undefined;
      if (meta?.clueFreq.size) {
        topClue = [...meta.clueFreq.entries()].sort((a, b) => b[1] - a[1])[0][0];
      }
      scored.push({
        diseaseName: disease.name,
        topicType: meta?.topicType,
        topClue,
        frequency: disease.count,
        userSuccessRate: 0,
        priorityScore: Math.round(disease.count * 10) / 10,
      });
    }

    const sorted = scored.sort((a, b) => b.priorityScore - a.priorityScore);
    const filtered = args.topicTypeFilter
      ? sorted.filter((r) => r.topicType === args.topicTypeFilter)
      : sorted;

    return filtered.slice(0, limit);
  },
});

export const getMostConfusableTopics = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allPatterns = await ctx.db.query("extracted_patterns").collect();

    const countMap = new Map<string, { discriminatorCount: number; topicType?: string }>();
    for (const p of allPatterns) {
      if (!p.diseaseName || p.diseaseName.trim() === "" || p.diseaseName === "N/A") continue;
      const existing = countMap.get(p.diseaseName);
      countMap.set(p.diseaseName, {
        discriminatorCount: (existing?.discriminatorCount ?? 0) + (p.discriminators?.length ?? 0),
        topicType: existing?.topicType ?? p.topicType ?? undefined,
      });
    }

    return Array.from(countMap.entries())
      .filter(([, v]) => v.discriminatorCount > 0)
      .sort((a, b) => b[1].discriminatorCount - a[1].discriminatorCount)
      .slice(0, args.limit ?? 10)
      .map(([diseaseName, data]) => ({
        diseaseName,
        discriminatorCount: data.discriminatorCount,
        topicType: data.topicType,
      }));
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

    const topicType = patterns.find((p) => p.topicType)?.topicType ?? undefined;

    return {
      diseaseName: args.diseaseName,
      topicType,
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
