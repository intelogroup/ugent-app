import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ChoicePct {
  letter: string;
  text: string;
  percentage: number;
}

function extractChoicePercentages(rawText: string): ChoicePct[] | null {
  const results: ChoicePct[] = [];
  // Match lines like: "A.Some text\n(23%)" or "A. Some text\n(23%)"
  const regex = /^([A-E])\.\s*(.+?)\n\((\d+)%\)/gm;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    results.push({
      letter: match[1],
      text: match[2].trim(),
      percentage: parseInt(match[3]),
    });
  }
  // Also try without dot: "ASome text\n(23%)"
  if (results.length === 0) {
    const regex2 = /^([A-E])([^.].+?)\n\((\d+)%\)/gm;
    while ((match = regex2.exec(rawText)) !== null) {
      results.push({
        letter: match[1],
        text: match[2].trim(),
        percentage: parseInt(match[3]),
      });
    }
  }
  return results.length >= 3 ? results : null; // need at least 3 choices
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("Fetching all questions with raw text...");
  const data = await client.query(api.research.getAllQuestionsWithRawText, { limit: 2000 });
  console.log(`Loaded ${data.length} questions\n`);

  let mined = 0;
  let noMatch = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row.questionId || !row.rawText) { noMatch++; continue; }

    const percentages = extractChoicePercentages(row.rawText);
    if (!percentages) { noMatch++; continue; }

    try {
      await client.mutation(api.questions.patchQuestionFields, {
        questionId: row.questionId,
        choicePercentages: percentages,
      });
      mined++;
      const dist = percentages.map(p => `${p.letter}=${p.percentage}%`).join(", ");
      if (i % 50 === 0) console.log(`[${i + 1}/${data.length}] ${mined} mined...`);
    } catch (err) {
      console.error(`  Error on ${row.questionId}:`, err);
    }
    await delay(30);
  }

  console.log(`\n=== Done ===`);
  console.log(`Mined choice percentages: ${mined}`);
  console.log(`No match: ${noMatch}`);
}

main().catch(console.error);
