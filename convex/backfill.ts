// @ts-nocheck
import { v } from "convex/values";
import { internalQuery, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// --- Step 1: Query — fetch questions needing backfill + hierarchy ---

function truncate(s: string | undefined, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "..." : s;
}

export const getBackfillCandidates = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const questions = await ctx.db.query("questions").order("desc").take(args.limit ?? 2500);

    const systems = await ctx.db.query("systems").collect();
    const subjects = await ctx.db.query("subjects").collect();
    const allTopics = await ctx.db.query("topics").collect();

    const candidates = [];
    for (const q of questions) {
      // Skip already fully categorized questions
      if (q.systemId && q.topicId && q.subjectId && q.difficulty) continue;

      const pattern = await ctx.db
        .query("extracted_patterns")
        .withIndex("by_questionId", (idx) => idx.eq("questionId", q._id))
        .first();

      candidates.push({
        questionId: q._id,
        text: truncate(q.text, 300),
        diseaseName: pattern?.diseaseName ?? q.subject ?? "Unknown",
        topicType: pattern?.topicType ?? "DISEASE",
        mechanism: truncate(pattern?.mechanism, 200),
        keySymptoms: pattern?.keySymptoms?.slice(0, 5) ?? [],
        clinicalAge: pattern?.clinicalContext?.age ?? "",
        clinicalGender: pattern?.clinicalContext?.gender ?? "",
        hasSystemId: !!q.systemId,
        hasTopicId: !!q.topicId,
        hasSubjectId: !!q.subjectId,
        hasDifficulty: !!q.difficulty,
      });
    }

    return {
      candidates,
      systems: systems.map(s => ({ id: s._id, name: s.name })),
      subjects: subjects.map(s => ({ id: s._id, name: s.name })),
      existingTopics: allTopics.map(t => ({ id: t._id, name: t.name, systemId: t.systemId })),
    };
  },
});

// --- Step 2: Save classifications ---

export const saveClassifications = internalMutation({
  args: {
    classifications: v.array(v.object({
      questionId: v.string(),
      systemName: v.string(),
      subjectName: v.string(),
      topicName: v.string(),
      difficulty: v.string(),
    })),
    systemMap: v.array(v.object({ id: v.string(), name: v.string() })),
    subjectMap: v.array(v.object({ id: v.string(), name: v.string() })),
    existingTopicMap: v.array(v.object({ id: v.string(), name: v.string(), systemId: v.string() })),
  },
  handler: async (ctx, args) => {
    const { classifications, systemMap, subjectMap, existingTopicMap } = args;
    let saved = 0;
    let errors = 0;
    let topicsCreated = 0;
    const timestamp = Date.now();

    // Build lookup maps
    const systemByName = new Map<string, string>();
    for (const s of systemMap) systemByName.set(s.name.toLowerCase().trim(), s.id);

    // Fallback mapping: AI sometimes returns names not in our predefined list
    const systemFallback: Record<string, string> = {
      "dermatology": "Immunology",
      "integumentary": "Immunology",
      "skin": "Immunology",
      "ophthalmology": "Neurology",
      "eye": "Neurology",
      "ear": "Neurology",
      "oncology": "Hematology & Oncology",
      "hematology": "Hematology & Oncology",
      "hematology-oncology": "Hematology & Oncology",
      "nervous system": "Neurology",
      "public health": "Neurology",
      "epidemiology": "Neurology",
      "mixed": "Neurology",
      "general": "Neurology",
      "general principles": "Neurology",
      "none": "Neurology",
      "multisystem": "Neurology",
      "genetics": "Hematology & Oncology",
      "genetic": "Endocrine",
      "genetic mechanisms": "Endocrine",
      "central dogma": "Endocrine",
      "cell biology": "Endocrine",
      "population genetics": "Hematology & Oncology",
      "research methods": "Neurology",
      "pharmacology": "Cardiovascular",
      "metabolism": "Endocrine",
      "hepatic": "Gastrointestinal",
      "neonatology": "Reproductive",
      "retina": "Neurology",
      "patient care": "Neurology",
      "sensory": "Neurology",
      "genitourinary": "Renal",
      "nephrology": "Renal",
      "urology": "Renal",
      "surgery": "Neurology",
      "exercise": "Respiratory",
      "molecular": "Endocrine",
    };

    const subjectByName = new Map<string, string>();
    for (const s of subjectMap) subjectByName.set(s.name.toLowerCase().trim(), s.id);

    const subjectFallback: Record<string, string> = {
      "dermatology": "Pathology",
      "ophthalmology": "Pathology",
      "biostatistics": "Biostatistics & Epidemiology",
      "epidemiology": "Biostatistics & Epidemiology",
      "statistics": "Biostatistics & Epidemiology",
      "genetics": "Pathology",
      "nephrology": "Pathology",
      "respiratory physiology": "Physiology",
      "patient education": "Behavioral Science",
      "research methods": "Behavioral Science",
      "oncology pharmacology": "Pharmacology",
      "hematology-oncology": "Pathology",
      "cell biology": "Biochemistry",
      "genetic mechanisms": "Biochemistry",
      "exercise physiology": "Physiology",
      "molecular biology": "Biochemistry",
      "surgery": "Pathology",
      "urology": "Pathology",
      "anatomy and physiology": "Anatomy",
    };

    const resolveSystemId = (name: string): string | undefined => {
      const normalized = name.toLowerCase().trim();
      return systemByName.get(normalized)
        || (systemFallback[normalized] ? systemByName.get(systemFallback[normalized].toLowerCase()) : undefined);
    };

    const resolveSubjectId = (name: string): string | undefined => {
      const normalized = name.toLowerCase().trim();
      return subjectByName.get(normalized)
        || (subjectFallback[normalized] ? subjectByName.get(subjectFallback[normalized].toLowerCase()) : undefined);
    };

    const topicByName = new Map<string, { id: string; systemId: string }>();
    for (const t of existingTopicMap) {
      const key = t.name.toLowerCase().trim();
      if (!topicByName.has(key)) topicByName.set(key, { id: t.id, systemId: t.systemId });
    }

    for (const c of classifications) {
      try {
        const systemId = resolveSystemId(c.systemName);
        const subjectId = resolveSubjectId(c.subjectName);

        if (!systemId) { errors++; continue; }
        if (!subjectId) { errors++; continue; }

        // Find or create topic
        let topicId = topicByName.get(c.topicName.toLowerCase().trim())?.id;
        if (!topicId) {
          const newTopicId = await ctx.db.insert("topics", {
            name: c.topicName.trim(),
            systemId,
            displayOrder: 999,
            questionCount: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          topicId = newTopicId;
          topicByName.set(c.topicName.toLowerCase().trim(), { id: topicId, systemId });
          topicsCreated++;
        }

        // Validate question exists
        const existing = await ctx.db.get(c.questionId);
        if (!existing) { errors++; continue; }

        const validDifficulty = ["EASY", "MEDIUM", "HARD"].includes(c.difficulty)
          ? c.difficulty as "EASY" | "MEDIUM" | "HARD"
          : "MEDIUM";

        await ctx.db.patch(c.questionId, {
          systemId,
          topicId,
          subjectId,
          difficulty: validDifficulty,
          updatedAt: timestamp,
        });

        saved++;
      } catch (error) {
        console.error(`Error saving ${c.questionId}: ${error}`);
        errors++;
      }
    }

    return { saved, errors, topicsCreated };
  },
});

// --- Public trigger: kicks off backfill as a scheduled action (fire-and-forget) ---

export const triggerBackfill = mutation({
  args: { batchSize: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.backfill_actions.classifyQuestions, {
      batchSize: args.batchSize ?? 25,
      dryRun: args.dryRun ?? false,
    });
    return { triggered: true };
  },
});

// --- Step 3: Recalculate questionCount on hierarchy tables ---

export const recalculateQuestionCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const timestamp = Date.now();

    const systemCounts = new Map<string, number>();
    const topicCounts = new Map<string, number>();
    const subjectCounts = new Map<string, number>();

    for (const q of questions) {
      if (q.systemId) systemCounts.set(q.systemId, (systemCounts.get(q.systemId) ?? 0) + 1);
      if (q.topicId) topicCounts.set(q.topicId, (topicCounts.get(q.topicId) ?? 0) + 1);
      if (q.subjectId) subjectCounts.set(q.subjectId, (subjectCounts.get(q.subjectId) ?? 0) + 1);
    }

    const allSystems = await ctx.db.query("systems").collect();
    let systemsUpdated = 0;
    for (const s of allSystems) {
      const count = systemCounts.get(s._id) ?? 0;
      if (s.questionCount !== count) {
        await ctx.db.patch(s._id, { questionCount: count, updatedAt: timestamp });
        systemsUpdated++;
      }
    }

    const allTopics = await ctx.db.query("topics").collect();
    let topicsUpdated = 0;
    for (const t of allTopics) {
      const count = topicCounts.get(t._id) ?? 0;
      if (t.questionCount !== count) {
        await ctx.db.patch(t._id, { questionCount: count, updatedAt: timestamp });
        topicsUpdated++;
      }
    }

    const allSubjects = await ctx.db.query("subjects").collect();
    let subjectsUpdated = 0;
    for (const su of allSubjects) {
      const count = subjectCounts.get(su._id) ?? 0;
      if (su.questionCount !== count) {
        await ctx.db.patch(su._id, { questionCount: count, updatedAt: timestamp });
        subjectsUpdated++;
      }
    }

    return {
      questions: questions.length,
      withSystemId: systemCounts.size,
      withTopicId: topicCounts.size,
      withSubjectId: subjectCounts.size,
      systemsUpdated,
      topicsUpdated,
      subjectsUpdated,
    };
  },
});
