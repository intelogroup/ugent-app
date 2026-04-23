import { v } from "convex/values";
import { mutation } from "./_generated/server";

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

      if (newDiscriminators.length !== originalCount) {
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

export const verifyStrategySync = mutation({
  handler: async (ctx) => {
    return { status: "ok" };
  }
});
