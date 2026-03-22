import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const startIngestion = mutation({
  args: {
    rawText: v.string(),
    totalCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ingestions", {
      rawText: args.rawText,
      status: "pending",
      processedCount: 0,
      totalCount: args.totalCount,
      createdAt: Date.now(),
    });
  },
});

export const updateIngestionStatus = mutation({
  args: {
    ingestionId: v.id("ingestions"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    processedCount: v.optional(v.number()),
    totalCount: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ingestionId, ...updates } = args;
    await ctx.db.patch(ingestionId, updates);
  },
});

export const saveExtractedIntelligence = mutation({
  args: {
    ingestionId: v.id("ingestions"),
    data: v.object({
      // Base Question Data
      questionText: v.string(),
      correctAnswer: v.string(),
      options: v.array(v.object({
        text: v.string(),
        isCorrect: v.boolean(),
      })),
      explanation: v.string(),
      educationalObjective: v.optional(v.string()),
      subject: v.string(),
      system: v.string(),

      // Intelligence Layer
      diseaseName: v.string(),
      mechanism: v.string(),
      highLeverageClues: v.array(v.string()),
      discriminators: v.array(v.object({
        distractor: v.string(),
        ruleOutFact: v.string(),
      })),
      nextBestStep: v.optional(v.string()),
      clinicalContext: v.object({
        age: v.optional(v.string()),
        gender: v.optional(v.string()),
        physiologyState: v.optional(v.string()),
        onsetPattern: v.optional(v.string()),
      }),
      keySymptoms: v.array(v.string()),
      prerequisites: v.array(v.string()),
      tableData: v.optional(v.array(v.any())),
    }),
  },
  handler: async (ctx, args) => {
    const { ingestionId, data } = args;

    // 1. Save Question
    const questionId = await ctx.db.insert("questions", {
      text: data.questionText,
      correctAnswer: data.correctAnswer,
      options: data.options,
      explanation: data.explanation,
      educationalObjective: data.educationalObjective,
      subject: data.subject,
      system: data.system,
      ingestionId: ingestionId,
    });

    // 2. Save Pattern
    await ctx.db.insert("extracted_patterns", {
      questionId,
      diseaseName: data.diseaseName,
      mechanism: data.mechanism,
      highLeverageClues: data.highLeverageClues,
      discriminators: data.discriminators,
      nextBestStep: data.nextBestStep,
      clinicalContext: data.clinicalContext,
      keySymptoms: data.keySymptoms,
      prerequisites: data.prerequisites,
      tableData: data.tableData,
    });

    // 3. Aggregate Pattern Frequencies
    const timestamp = Date.now();

    const updateFrequency = async (type: string, name: string) => {
      if (!name) return;
      const existing = await ctx.db
        .query("pattern_frequencies")
        .withIndex("by_type_name", (q) => q.eq("type", type).eq("name", name))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + 1,
          lastSeenAt: timestamp,
        });
      } else {
        await ctx.db.insert("pattern_frequencies", {
          type,
          name,
          count: 1,
          lastSeenAt: timestamp,
        });
      }
    };

    // DISEASE
    await updateFrequency("DISEASE", data.diseaseName);

    // CLUE
    for (const clue of data.highLeverageClues) {
      await updateFrequency("CLUE", clue);
    }

    // SUBJECT & SYSTEM
    await updateFrequency("SUBJECT", data.subject);
    await updateFrequency("SYSTEM", data.system);

    // CONTEXT
    if (data.clinicalContext.age) await updateFrequency("CONTEXT", `Age: ${data.clinicalContext.age}`);
    if (data.clinicalContext.gender) await updateFrequency("CONTEXT", `Gender: ${data.clinicalContext.gender}`);
    if (data.clinicalContext.physiologyState) await updateFrequency("CONTEXT", `Physiology: ${data.clinicalContext.physiologyState}`);
    if (data.clinicalContext.onsetPattern) await updateFrequency("CONTEXT", `Onset: ${data.clinicalContext.onsetPattern}`);

    // 4. Update Knowledge Dependencies
    for (const prereq of data.prerequisites) {
      const existing = await ctx.db
        .query("knowledge_dependencies")
        .withIndex("by_from_to", (q) => q.eq("from", prereq).eq("to", data.diseaseName))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          strength: existing.strength + 1,
        });
      } else {
        await ctx.db.insert("knowledge_dependencies", {
          from: prereq,
          to: data.diseaseName,
          strength: 1,
        });
      }
    }

    // 5. Progress Ingestion
    const ingestion = await ctx.db.get(ingestionId);
    if (ingestion) {
      await ctx.db.patch(ingestionId, {
        processedCount: ingestion.processedCount + 1,
        status: ingestion.processedCount + 1 === ingestion.totalCount ? "completed" : "processing",
      });
    }

    return questionId;
  },
});
