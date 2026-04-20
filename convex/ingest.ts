// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const getIngestion = query({
  args: { ingestionId: v.id("ingestions") },
  handler: async (ctx, { ingestionId }) => ctx.db.get(ingestionId),
});

export const isQuestionDuplicate = query({
  args: { textHash: v.string() },
  handler: async (ctx, { textHash }) => {
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_textHash", (q) => q.eq("textHash", textHash))
      .first();
    return existing !== null;
  },
});

export const startIngestion = mutation({
  args: {
    rawText: v.string(),
    totalCount: v.number(),
    textHash: v.optional(v.string()),
    source: v.optional(v.union(v.literal("MANUAL"), v.literal("FIRSTAID_PDF"), v.literal("API"))),
  },
  handler: async (ctx, args) => {
    // Block duplicates already in the pending/processing queue
    if (args.textHash) {
      const inQueue = await ctx.db
        .query("ingestions")
        .withIndex("by_textHash", (q) => q.eq("textHash", args.textHash!))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "processing"))
        )
        .first();
      if (inQueue) return null;
    }

    return await ctx.db.insert("ingestions", {
      rawText: args.rawText,
      textHash: args.textHash,
      status: "pending",
      processedCount: 0,
      totalCount: args.totalCount,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

export const updateIngestionStatus = mutation({
  args: {
    ingestionId: v.id("ingestions"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("skipped"), v.literal("failed")),
    processedCount: v.optional(v.number()),
    skippedCount: v.optional(v.number()),
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

      // Dedup
      textHash: v.string(),

      // Intelligence Layer
      diseaseName: v.string(),
      topicType: v.optional(v.union(
        v.literal("DISEASE"), v.literal("PATHOGEN"), v.literal("PRINCIPLE"),
        v.literal("DRUG"), v.literal("SYNDROME"), v.literal("CONCEPT"),
      )),
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

    // 1. Atomic dedup check — skip if this question was already processed
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_textHash", (q) => q.eq("textHash", data.textHash))
      .first();
    if (existing !== null) {
      console.log(`Duplicate skipped (hash: ${data.textHash.slice(0, 8)}...) — OpenAI call was avoided`);
      // Still advance the ingestion counter so status completes correctly
      const ingestion = await ctx.db.get(ingestionId);
      if (ingestion) {
        await ctx.db.patch(ingestionId, {
          processedCount: ingestion.processedCount + 1,
          status: ingestion.processedCount + 1 >= ingestion.totalCount ? "completed" : "processing",
        });
      }
      return existing._id;
    }

    // 2. Save Question
    const ingestion = await ctx.db.get(ingestionId);
    const questionId = await ctx.db.insert("questions", {
      text: data.questionText,
      correctAnswer: data.correctAnswer,
      options: data.options,
      explanation: data.explanation,
      educationalObjective: data.educationalObjective,
      subject: data.subject,
      system: data.system,
      ingestionId: ingestionId,
      textHash: data.textHash,
      source: ingestion?.source,
    });

    // 3. Save Pattern
    const timestamp = Date.now();
    await ctx.db.insert("extracted_patterns", {
      questionId,
      diseaseName: data.diseaseName,
      topicType: data.topicType,
      mechanism: data.mechanism,
      highLeverageClues: data.highLeverageClues,
      discriminators: data.discriminators,
      nextBestStep: data.nextBestStep,
      clinicalContext: data.clinicalContext,
      keySymptoms: data.keySymptoms,
      prerequisites: data.prerequisites,
      tableData: data.tableData,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // 3. Aggregate Pattern Frequencies

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

    // TOPIC_TYPE
    if (data.topicType) await updateFrequency("TOPIC_TYPE", data.topicType);

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
    const latestIngestion = await ctx.db.get(ingestionId);
    if (latestIngestion) {
      await ctx.db.patch(ingestionId, {
        processedCount: latestIngestion.processedCount + 1,
        status: latestIngestion.processedCount + 1 === latestIngestion.totalCount ? "completed" : "processing",
      });
    }

    return questionId;
  },
});

const BATCH_THRESHOLD = 10;

export const triggerBatchIfReady = mutation({
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("ingestions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .collect();

    if (pending.length < BATCH_THRESHOLD) {
      return { triggered: false, pendingCount: pending.length };
    }

    const batch = pending.slice(0, BATCH_THRESHOLD);
    for (const ingestion of batch) {
      await ctx.scheduler.runAfter(0, api.ai.extractIntelligence, {
        ingestionId: ingestion._id,
        rawText: ingestion.rawText,
      });
    }

    return { triggered: true, count: batch.length };
  },
});

export const forceProcessPending = mutation({
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("ingestions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .collect();

    for (const ingestion of pending) {
      await ctx.scheduler.runAfter(0, api.ai.extractIntelligence, {
        ingestionId: ingestion._id,
        rawText: ingestion.rawText,
      });
    }

    return { triggered: true, count: pending.length };
  },
});

export const purgeDuplicatePending = mutation({
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("ingestions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const seen = new Map<string, string>();
    let purged = 0;
    for (const ing of pending) {
      const key = ing.textHash ?? ing.rawText;
      if (seen.has(key)) {
        await ctx.db.delete(ing._id);
        purged++;
      } else {
        seen.set(key, ing._id);
      }
    }
    return { purged };
  },
});
