import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function extractEducationalObjective(rawText: string): string | null {
  const idx = rawText.indexOf("Educational objective:");
  if (idx < 0) return null;
  let after = rawText.slice(idx + "Educational objective:".length).trim();
  const endIdx = after.indexOf("\n\n");
  if (endIdx >= 0) after = after.slice(0, endIdx);
  const stopIdx = Math.min(
    ...[after.indexOf("\nCorrect"), after.indexOf("\nFeedback"), after.indexOf("\nblock time")].filter(i => i >= 0)
  );
  if (stopIdx >= 0) after = after.slice(0, stopIdx);
  after = after.trim();
  return after.length > 20 ? after : null;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("Fetching questions with raw text...");
  const data = await client.query(api.research.getAllQuestionsWithRawText, { limit: 2000 });
  console.log(`Loaded ${data.length} questions\n`);

  let backfilled = 0;
  let noMatch = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row.questionId) continue; // skip ingestions that never produced a question
    if (row.educationalObjective && row.educationalObjective.trim().length >= 10) continue;
    if (!row.rawText) continue;

    const obj = extractEducationalObjective(row.rawText);
    if (!obj) { noMatch++; continue; }

    try {
      await client.mutation(api.questions.patchQuestionFields, {
        questionId: row.questionId,
        educationalObjective: obj,
      });
      backfilled++;
      console.log(`[${i + 1}/${data.length}] Backfilled: ${obj.slice(0, 60)}...`);
    } catch (err) {
      console.error(`  Error on ${row.questionId}:`, err);
    }
    await delay(50);
  }

  console.log(`\n=== Done ===`);
  console.log(`Backfilled: ${backfilled}`);
  console.log(`No match (no raw text or no objective in raw): ${noMatch}`);
}

main().catch(console.error);
