import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function extractCorrectAnswer(rawText: string): string | null {
  const m = rawText.match(/Correct Answer:\s*([A-F])/);
  return m ? m[1] : null;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("Fetching all questions with raw text...");
  const data = await client.query(api.research.getAllQuestionsWithRawText, { limit: 2000 });
  console.log(`Loaded ${data.length} questions\n`);

  let fixed = 0, skipped = 0, noAnswer = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row.questionId || !row.rawText) { noAnswer++; continue; }

    const groundTruth = extractCorrectAnswer(row.rawText);
    if (!groundTruth) { noAnswer++; continue; }

    const aiAnswer = String(row.correctAnswer ?? "").trim();
    // If AI got it right (first char matches), skip
    if (aiAnswer.startsWith(groundTruth)) { skipped++; continue; }

    // Fix options isCorrect flags
    const fixedOptions = row.options?.map((o: any) => ({
      text: o.text,
      isCorrect: o.text?.trim().startsWith(groundTruth) ?? false,
    }));

    try {
      await client.mutation(api.questions.fixCorrectAnswer, {
        questionId: row.questionId,
        correctAnswer: groundTruth,
        fixedOptions,
      });
      fixed++;
      if (fixed % 50 === 0) console.log(`[${i + 1}/${data.length}] Fixed ${fixed}...`);
    } catch (err) {
      console.error(`  Error on ${row.questionId}:`, err);
    }
    await delay(30);
  }

  console.log(`\n=== Done ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Already correct: ${skipped}`);
  console.log(`No answer: ${noAnswer}`);
}

main().catch(console.error);
