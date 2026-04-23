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

export const patchDiseaseName = mutation({
  args: {
    patternId: v.id("extracted_patterns"),
    diseaseName: v.string(),
    topicType: v.optional(v.union(
      v.literal("DISEASE"), v.literal("PATHOGEN"), v.literal("PRINCIPLE"),
      v.literal("DRUG"), v.literal("SYNDROME"), v.literal("CONCEPT"),
    )),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const normalizedName = args.diseaseName.trim();
    
    await ctx.db.patch(args.patternId, {
      diseaseName: normalizedName,
      topicType: args.topicType,
      updatedAt: timestamp,
    });

    // Upsert DISEASE frequency with normalization
    if (normalizedName) {
      const existing = await ctx.db
        .query("pattern_frequencies")
        .withIndex("by_type_name", (q) => q.eq("type", "DISEASE").eq("name", normalizedName))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { count: existing.count + 1, lastSeenAt: timestamp });
      } else {
        await ctx.db.insert("pattern_frequencies", { type: "DISEASE", name: normalizedName, count: 1, lastSeenAt: timestamp });
      }
    }

    // Upsert TOPIC_TYPE frequency
    if (args.topicType) {
      const existing = await ctx.db
        .query("pattern_frequencies")
        .withIndex("by_type_name", (q) => q.eq("type", "TOPIC_TYPE").eq("name", args.topicType!))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { count: existing.count + 1, lastSeenAt: timestamp });
      } else {
        await ctx.db.insert("pattern_frequencies", { type: "TOPIC_TYPE", name: args.topicType!, count: 1, lastSeenAt: timestamp });
      }
    }
  },
});

export const clearFrequenciesBatch = mutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("pattern_frequencies").take(args.limit);
    for (const f of all) {
      await ctx.db.delete(f._id);
    }
    return all.length;
  },
});

export const insertFrequenciesBatch = mutation({
  args: {
    items: v.array(v.object({
      type: v.string(),
      name: v.string(),
      count: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    for (const item of args.items) {
      await ctx.db.insert("pattern_frequencies", {
        ...item,
        lastSeenAt: timestamp,
      });
    }
  },
});

export const recalculateAllFrequencies = mutation({
  args: {},
  handler: async (ctx) => {
    const timestamp = Date.now();
    
    // 1. Clear existing frequencies
    const allFrequencies = await ctx.db.query("pattern_frequencies").collect();
    for (const freq of allFrequencies) {
      await ctx.db.delete(freq._id);
    }

    // 2. Collect all data
    const allPatterns = await ctx.db.query("extracted_patterns").collect();
    const allQuestions = await ctx.db.query("questions").collect();
    const allSystems = await ctx.db.query("systems").collect();
    const allSubjects = await ctx.db.query("subjects").collect();

    const freqMap = new Map<string, number>(); // key: "type:name"

    const increment = (type: string, name: string) => {
      if (!name || name === "N/A" || name === "Pending further analysis") return;
      const key = `${type}:${name.trim()}`;
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    };

    // 3. Process Patterns
    for (const p of allPatterns) {
      increment("DISEASE", p.diseaseName);
      if (p.topicType) increment("TOPIC_TYPE", p.topicType);
      for (const clue of p.highLeverageClues) increment("CLUE", clue);
      
      if (p.clinicalContext.age) increment("CONTEXT", `Age: ${p.clinicalContext.age}`);
      if (p.clinicalContext.gender) increment("CONTEXT", `Gender: ${p.clinicalContext.gender}`);
      if (p.clinicalContext.physiologyState) increment("CONTEXT", `Physiology: ${p.clinicalContext.physiologyState}`);
      if (p.clinicalContext.onsetPattern) increment("CONTEXT", `Onset: ${p.clinicalContext.onsetPattern}`);
    }

    // 4. Process Questions (for System/Subject frequencies)
    const systemMap = new Map(allSystems.map(s => [s._id, s.name]));
    const subjectMap = new Map(allSubjects.map(s => [s._id, s.name]));

    for (const q of allQuestions) {
      if (q.systemId && systemMap.has(q.systemId)) {
        increment("SYSTEM", systemMap.get(q.systemId)!);
      } else if (q.system) {
        increment("SYSTEM", q.system);
      }

      if (q.subjectId && subjectMap.has(q.subjectId)) {
        increment("SUBJECT", subjectMap.get(q.subjectId)!);
      } else if (q.subject) {
        increment("SUBJECT", q.subject);
      }
    }

    // 5. Save new frequencies
    for (const [key, count] of freqMap.entries()) {
      const [type, name] = key.split(":");
      await ctx.db.insert("pattern_frequencies", {
        type,
        name,
        count,
        lastSeenAt: timestamp,
      });
    }

    return { totalFrequencies: freqMap.size };
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
