import { v } from "convex/values";
import { query } from "./_generated/server";

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
        mechanism: extraction.mechanism,
        keySymptoms: extraction.keySymptoms,
        clinicalContext: extraction.clinicalContext,
      });
    }
    return feed;
  },
});
