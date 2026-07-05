import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function extractCorrectAnswerFromRaw(rawText: string): string | null {
  const match = rawText.match(/Correct Answer:\s*([A-F])/);
  if (match) return match[1];
  const match2 = rawText.match(/Correct Answer\s+([A-F])/);
  return match2 ? match2[1] : null;
}

async function main() {
  console.log("Fetching all questions with raw text...");
  const data = await client.query(api.research.getAllQuestionsWithRawText, { limit: 2000 });
  console.log(`Loaded ${data.length} questions\n`);

  let matched = 0;
  let mismatched = 0;
  let noRawAnswer = 0;
  const mismatches: any[] = [];

  for (const row of data) {
    if (!row.rawText) { noRawAnswer++; continue; }

    const rawAnswer = extractCorrectAnswerFromRaw(row.rawText);
    if (!rawAnswer) { noRawAnswer++; continue; }

    const aiAnswer = String(row.correctAnswer ?? "").trim().slice(0, 1).toUpperCase();
    const rawLetter = rawAnswer.toUpperCase();

    if (aiAnswer === rawLetter) {
      matched++;
    } else {
      mismatched++;
      mismatches.push({
        questionId: row.questionId,
        aiAnswer,
        rawAnswer: rawLetter,
        preview: row.text?.slice(0, 80),
      });
    }
  }

  console.log(`=== Results ===`);
  console.log(`Matched:      ${matched}`);
  console.log(`Mismatched:   ${mismatched}`);
  console.log(`No raw answer: ${noRawAnswer}`);
  console.log();
  if (mismatches.length > 0) {
    console.log(`=== Mismatches (${mismatches.length}) ===`);
    for (const m of mismatches.slice(0, 10)) {
      console.log(`  AI="${m.aiAnswer}" RAW="${m.rawAnswer}" | ${m.preview}...`);
    }
    if (mismatches.length > 10) console.log(`  ... and ${mismatches.length - 10} more`);
  }
  const accuracy = matched + mismatched > 0 ? (matched / (matched + mismatched) * 100).toFixed(1) : "N/A";
  console.log(`\nAccuracy: ${accuracy}%`);
}

main().catch(console.error);
