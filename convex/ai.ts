// @ts-nocheck
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { OpenAI } from "openai";
import { ExtractedIntelligenceSchema } from "../lib/zod-schemas";
import { zodToJsonSchema } from "zod-to-json-schema";

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
    if (totalCount <= 5) {
      // Process sequentially to keep it simple for small batches
      for (const blob of questionBlobs) {
        try {
          await ctx.runAction(internal.ai.extractSingleQuestion, {
            ingestionId,
            blob,
          });
        } catch (error) {
          console.error(`Failed to process question: ${error}`);
          // Continue with next question
        }
      }
    } else {
      // Schedule background tasks for each question
      for (const blob of questionBlobs) {
        await ctx.scheduler.runAction(internal.ai.extractSingleQuestion, {
          ingestionId,
          blob,
        });
      }
    }

    return { totalCount };
  },
});

export const extractSingleQuestion = internalAction({
  args: {
    ingestionId: v.id("ingestions"),
    blob: v.string(),
  },
  handler: async (ctx, args) => {
    const { ingestionId, blob } = args;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment variables");
    }

    const openai = new OpenAI({ apiKey });
    const jsonSchema = zodToJsonSchema(ExtractedIntelligenceSchema);

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
            strict: true,
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
        data: result,
      });

    } catch (error) {
      console.error(`Error in extractSingleQuestion: ${error}`);
      // Update ingestion with error if needed, or just let it fail for this one
      // Since it's a background task, we might want to log it to the ingestion record
      // but let's keep it simple for now as per requirements.
      throw error;
    }
  },
});
