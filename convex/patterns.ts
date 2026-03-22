import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const savePattern = mutation({
  args: {
    questionId: v.id("questions"),
    diseaseName: v.string(),
    clues: v.array(v.string()),
    distractors: v.array(v.string()),
    clinicalContext: v.object({
      ageRange: v.optional(v.string()),
      geography: v.optional(v.string()),
      typicalProfessions: v.optional(v.string()),
      onsetPattern: v.optional(v.string()),
    }),
    keySymptoms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { questionId, ...patternData } = args;

    // Check if pattern already exists for this question
    const existing = await ctx.db
      .query("extracted_patterns")
      .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
      .unique();

    const timestamp = Date.now();

    // Map the incoming clinicalContext to the schema's clinicalContext
    const clinicalContext = {
      age: patternData.clinicalContext.ageRange,
      gender: undefined, // Not provided in this version
      physiologyState: undefined, // Not provided in this version
      onsetPattern: patternData.clinicalContext.onsetPattern,
    };

    // We use the same table but some fields might be slightly different
    // Mechanism and discriminators are missing from this simpler AI extraction, 
    // so we'll provide defaults.
    if (existing) {
      await ctx.db.patch(existing._id, {
        diseaseName: patternData.diseaseName,
        highLeverageClues: patternData.clues,
        // We preserve existing mechanism/discriminators if they exist
        clinicalContext: {
          ...existing.clinicalContext,
          age: clinicalContext.age || existing.clinicalContext.age,
          onsetPattern: clinicalContext.onsetPattern || existing.clinicalContext.onsetPattern,
        },
        keySymptoms: patternData.keySymptoms,
        updatedAt: timestamp,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("extracted_patterns", {
        questionId,
        diseaseName: patternData.diseaseName,
        mechanism: "Pending further analysis", // Default
        highLeverageClues: patternData.clues,
        discriminators: patternData.distractors.map(d => ({ distractor: d, ruleOutFact: "See explanation" })),
        clinicalContext,
        keySymptoms: patternData.keySymptoms,
        prerequisites: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  },
});

export const updateFrequencies = mutation({
  args: {
    frequencies: v.array(v.object({
      type: v.string(),
      name: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    for (const freq of args.frequencies) {
      if (!freq.name) continue;

      const existing = await ctx.db
        .query("pattern_frequencies")
        .withIndex("by_type_name", (q) => q.eq("type", freq.type).eq("name", freq.name))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + 1,
          lastSeenAt: timestamp,
        });
      } else {
        await ctx.db.insert("pattern_frequencies", {
          type: freq.type,
          name: freq.name,
          count: 1,
          lastSeenAt: timestamp,
        });
      }
    }
  },
});

export const getTopPatterns = query({
  args: {
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pattern_frequencies")
      .withIndex("by_type_name", (q) => q.eq("type", args.type))
      .order("desc")
      .take(args.limit || 20);
  },
});
