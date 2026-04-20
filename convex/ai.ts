"use node";
// @ts-nocheck
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { OpenAI } from "openai";
import { createHash } from "crypto";

function hashBlob(blob: string): string {
  // Normalize: lowercase + collapse whitespace, then SHA-256
  const normalized = blob.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

const EXTRACTION_PROMPT = `
You are a world-class medical educator and researcher. Your goal is to extract high-leverage medical intelligence from USMLE-style questions and explanations.

Perform a "Triple-Pass" distillation:

Pass 1: Clinical Fact Extraction (The "Stem" Pass)
- Extract demographics (Age, Gender), BMI, and Physiology state (e.g., "2nd Trimester Pregnancy").
- Identify the temporal pattern (Onset speed and duration).
- Identify "Cardinal Clues" (Pathognomonic terms, unique identifiers) vs "Symptomatic Noise".

Pass 2: Discriminator Analysis (The "Distractor" Pass)
- For each distractor choice, extract the Primary Discriminator from the explanation.
- Identify the specific clinical fact or logic that rules out the distractor.
- Identify the PRIMARY FOCAL CONCEPT being tested. This is the central topic of the question.
  It is NOT limited to diseases. It can be any of:
  - A disease or diagnosis → topicType: "DISEASE" (e.g., "Tuberculosis", "Myocardial Infarction")
  - A pathogen or organism → topicType: "PATHOGEN" (e.g., "Staphylococcus aureus", "C. difficile")
  - A physiological principle → topicType: "PRINCIPLE" (e.g., "Pulmonary gas exchange", "Starling forces")
  - A drug or drug class → topicType: "DRUG" (e.g., "Beta blockers", "ACE inhibitors")
  - A clinical syndrome → topicType: "SYNDROME" (e.g., "Cushing syndrome", "SIADH")
  - A concept (biostats, ethics, epidemiology) → topicType: "CONCEPT" (e.g., "Type II error", "Sensitivity")
  NEVER return an empty diseaseName. If no specific disease, use the primary concept being tested.

Pass 3: Systematic Synthesis (The "Knowledge" Pass)
- Mechanism: Core pathophysiology (The "Why").
- Dependency Mapping: Prerequisites needed to understand the question.
- Noise Filtering: Ignore pedagogical filler.

Return the data according to the provided JSON schema.
`;

export const extractIntelligence = action({
  args: {
    ingestionId: v.id("ingestions"),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const { ingestionId, rawText } = args;

    // 1. Split text by delimiter
    const questionBlobs = rawText
      .split("---NEXT-QUESTION---")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    const totalCount = questionBlobs.length;

    // 2. Update status and totalCount
    await ctx.runMutation(api.ingest.updateIngestionStatus, {
      ingestionId,
      status: "processing",
      totalCount,
    });

    // 3. Process based on count
    let skippedCount = 0;
    let processedCount = 0;
    let failedCount = 0;

    if (totalCount <= 5) {
      for (const blob of questionBlobs) {
        try {
          const result = await ctx.runAction(internal.ai.extractSingleQuestion, { ingestionId, blob });
          if (result?.skipped) skippedCount++; else processedCount++;
        } catch (error) {
          console.error(`Failed to process question: ${error}`);
          failedCount++;
        }
      }
    } else {
      for (const blob of questionBlobs) {
        await ctx.scheduler.runAfter(0, internal.ai.extractSingleQuestion, { ingestionId, blob });
      }
    }

    // For small batches (sequential), set final status based on outcome
    // "skipped"   = all questions were duplicates (no new content, no errors)
    // "failed"    = at least one new question errored (new questions lost)
    // "completed" = at least one new question saved successfully
    if (totalCount <= 5) {
      const finalStatus = failedCount > 0 && processedCount === 0
        ? "failed"
        : processedCount === 0
        ? "skipped"
        : "completed";
      await ctx.runMutation(api.ingest.updateIngestionStatus, {
        ingestionId,
        status: finalStatus,
        skippedCount,
      });
    }

    return { totalCount, skippedCount, processedCount, failedCount };
  },
});

export const extractSingleQuestion = internalAction({
  args: {
    ingestionId: v.id("ingestions"),
    blob: v.string(),
  },
  handler: async (ctx, args) => {
    const { ingestionId, blob } = args;

    // Fast-path dedup: skip OpenAI call entirely if already processed
    const textHash = hashBlob(blob);
    const isDuplicate = await ctx.runQuery(api.ingest.isQuestionDuplicate, { textHash });
    if (isDuplicate) {
      console.log(`Skipping duplicate (hash: ${textHash.slice(0, 8)}...) — no OpenAI call made`);
      // Advance ingestion counter so status reflects completion correctly
      const ingestion = await ctx.runQuery(api.ingest.getIngestion, { ingestionId });
      if (ingestion) {
        const newCount = ingestion.processedCount + 1;
        await ctx.runMutation(api.ingest.updateIngestionStatus, {
          ingestionId,
          processedCount: newCount,
          status: newCount >= ingestion.totalCount ? "completed" : "processing",
        });
      }
      return { skipped: true };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment variables");
    }

    const openai = new OpenAI({ apiKey });
    const jsonSchema = {
      type: "object",
      properties: {
        questionText: { type: "string" },
        correctAnswer: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, isCorrect: { type: "boolean" } },
            required: ["text", "isCorrect"],
          },
        },
        explanation: { type: "string" },
        educationalObjective: { type: "string" },
        subject: { type: "string" },
        system: { type: "string" },
        diseaseName: { type: "string" },
        topicType: { type: "string", enum: ["DISEASE", "PATHOGEN", "PRINCIPLE", "DRUG", "SYNDROME", "CONCEPT"] },
        mechanism: { type: "string" },
        highLeverageClues: { type: "array", items: { type: "string" } },
        discriminators: {
          type: "array",
          items: {
            type: "object",
            properties: { distractor: { type: "string" }, ruleOutFact: { type: "string" } },
            required: ["distractor", "ruleOutFact"],
          },
        },
        nextBestStep: { type: "string" },
        clinicalContext: {
          type: "object",
          properties: {
            age: { type: "string" },
            gender: { type: "string" },
            physiologyState: { type: "string" },
            onsetPattern: { type: "string" },
          },
        },
        keySymptoms: { type: "array", items: { type: "string" } },
        prerequisites: { type: "array", items: { type: "string" } },
        tableData: { type: "array", items: {} },
      },
      required: [
        "questionText", "correctAnswer", "options", "explanation",
        "educationalObjective", "subject", "system", "diseaseName", "topicType",
        "mechanism", "highLeverageClues", "discriminators", "clinicalContext",
        "keySymptoms", "prerequisites",
      ],
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: blob },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "extracted_intelligence",
            schema: jsonSchema as any,
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("AI returned empty response");

      const result = JSON.parse(content);

      // Save the results
      await ctx.runMutation(api.ingest.saveExtractedIntelligence, {
        ingestionId,
        data: { ...result, textHash },
      });

      return { skipped: false };
    } catch (error) {
      console.error(`Error in extractSingleQuestion: ${error}`);
      throw error;
    }
  },
});
