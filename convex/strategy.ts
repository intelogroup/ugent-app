// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    // 1. Fetch user performance if available
    const questionStats = new Map<string, { total: number; correct: number }>();
    if (args.userId) {
      const userAnswers = await ctx.db
        .query("answers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      
      for (const ans of userAnswers) {
        const stats = questionStats.get(ans.questionId) || { total: 0, correct: 0 };
        stats.total++;
        if (ans.isCorrect) stats.correct++;
        questionStats.set(ans.questionId, stats);
      }
    }

    // 2. Fetch all frequencies
    const allDiseaseFreqs = await ctx.db
      .query("pattern_frequencies")
      .withIndex("by_type_name", (q) => q.eq("type", "DISEASE"))
      .collect();
    
    const diseases = allDiseaseFreqs
      .filter((p) => p.name !== "N/A" && p.name.trim().length > 2)
      .sort((a, b) => b.count - a.count);

    // 3. Map patterns to topics
    const allPatterns = await ctx.db.query("extracted_patterns").collect();
    
    type PatternMeta = { 
      topicType?: string; 
      clueFreq: Map<string, number>;
      questionIds: Set<string>;
    };
    const patternMap = new Map<string, PatternMeta>();
    for (const p of allPatterns) {
      if (!p.diseaseName || p.diseaseName === "N/A") continue;
      let meta = patternMap.get(p.diseaseName);
      if (!meta) {
        meta = { topicType: p.topicType ?? undefined, clueFreq: new Map(), questionIds: new Set() };
        patternMap.set(p.diseaseName, meta);
      }
      if (!meta.topicType && p.topicType) meta.topicType = p.topicType;
      meta.questionIds.add(p.questionId);
      for (const clue of p.highLeverageClues ?? []) {
        if (clue && !DEMOGRAPHIC_RE.test(clue.trim())) {
          meta.clueFreq.set(clue, (meta.clueFreq.get(clue) ?? 0) + 1);
        }
      }
    }

    // 4. Score and filter
    const scored = [];
    for (const disease of diseases) {
      const meta = patternMap.get(disease.name);
      
      // Calculate performance for this topic
      let totalAtt = 0;
      let totalCorr = 0;
      if (meta) {
        for (const qId of meta.questionIds) {
          const stats = questionStats.get(qId);
          if (stats) {
            totalAtt += stats.total;
            totalCorr += stats.correct;
          }
        }
      }
      const successRate = totalAtt > 0 ? (totalCorr / totalAtt) : undefined;
      
      // Calculate priority: Frequency * (1 - successRate)
      // If no attempts, assume 0% success for priority purposes (highest priority)
      const priorityFactor = successRate !== undefined ? (1 - successRate) : 1;
      const priorityScore = Math.round(disease.count * priorityFactor * 10) / 10;

      let topClue: string | undefined;
      if (meta?.clueFreq.size) {
        topClue = [...meta.clueFreq.entries()].sort((a, b) => b[1] - a[1])[0][0];
      }

      scored.push({
        diseaseName: disease.name,
        topicType: meta?.topicType || "CONCEPT", // Fallback for filtered view
        topClue,
        frequency: disease.count,
        userSuccessRate: successRate !== undefined ? Math.round(successRate * 100) : null,
        priorityScore,
      });
    }

    const filtered = args.topicTypeFilter
      ? scored.filter((r) => r.topicType === args.topicTypeFilter)
      : scored;

    const sorted = filtered.sort((a, b) => b.priorityScore - a.priorityScore);

    return sorted.slice(0, limit);
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
    const discriminatorMap = new Map<string, { ruleOutFact: string; count: number }>();
    const clinicalContexts: object[] = [];

    for (const p of patterns) {
      p.highLeverageClues.forEach((c) => cluesSet.add(c));
      p.keySymptoms.forEach((s) => symptomsSet.add(s));
      if (p.mechanism && p.mechanism !== "Pending further analysis") {
        mechanismsSet.add(p.mechanism);
      }
      p.prerequisites.forEach((r) => prerequisitesSet.add(r));
      
      for (const d of p.discriminators ?? []) {
        // Clean prefix like "A. ", "B. ", "1) "
        const cleanDistractor = d.distractor.replace(/^[A-Z][.\)]\s+|^[0-9][.\)]\s+/i, "").trim();
        if (!cleanDistractor) continue;
        
        const existing = discriminatorMap.get(cleanDistractor);
        if (existing) {
          existing.count++;
          // Keep the longest explanation as it's usually the most detailed
          if (d.ruleOutFact.length > existing.ruleOutFact.length) {
            existing.ruleOutFact = d.ruleOutFact;
          }
        } else {
          discriminatorMap.set(cleanDistractor, { ruleOutFact: d.ruleOutFact, count: 1 });
        }
      }

      if (p.clinicalContext && Object.values(p.clinicalContext).some(Boolean)) {
        clinicalContexts.push(p.clinicalContext);
      }
    }

    const discriminators = Array.from(discriminatorMap.entries())
      .map(([distractor, data]) => ({
        distractor,
        ruleOutFact: data.ruleOutFact,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

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

export const backFixDiscriminators = mutation({
  args: { 
    dryRun: v.boolean()
  },
  handler: async (ctx, args) => {
    const patterns = await ctx.db.query("extracted_patterns").collect();
    let updatedCount = 0;
    let skippedCount = 0;
    let removedCount = 0;

    const LOW_YIELD_KEYWORDS = [
      "Esophagus", "Trachea", "Pharynx", "Larynx", "Branchial pouch", "Branchial arch",
      "Surface ectoderm", "Neuroectoderm", "Mesoderm", "Endoderm"
    ];

    for (const p of patterns) {
      const originalCount = p.discriminators?.length ?? 0;
      const newDiscriminators = [];
      const seen = new Set<string>();

      for (const d of p.discriminators ?? []) {
        // 1. Clean prefix like "A. ", "B. ", "1) "
        const cleanDistractor = d.distractor.replace(/^[A-Z][.\)]\s+|^[0-9][.\)]\s+/i, "").trim();
        
        // 2. Skip if empty or low-yield keyword (anatomy noise)
        const isLowYield = LOW_YIELD_KEYWORDS.some(k => 
          cleanDistractor.toLowerCase().includes(k.toLowerCase())
        );
        
        if (!cleanDistractor || isLowYield) {
          removedCount++;
          continue;
        }

        // 3. Simple Deduplication
        if (!seen.has(cleanDistractor.toLowerCase())) {
          newDiscriminators.push({
            distractor: cleanDistractor,
            ruleOutFact: d.ruleOutFact.trim()
          });
          seen.add(cleanDistractor.toLowerCase());
        }
      }

      if (newDiscriminators.length !== (originalCount)) {
        if (!args.dryRun) {
          await ctx.db.patch(p._id, { 
            discriminators: newDiscriminators,
            updatedAt: Date.now()
          });
        }
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      totalPatterns: patterns.length,
      updatedPatterns: updatedCount,
      skippedPatterns: skippedCount,
      removedTotalDistractors: removedCount,
      dryRun: args.dryRun
    };
  }
});
