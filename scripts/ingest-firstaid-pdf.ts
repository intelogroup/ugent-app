import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL not set in .env.local");

const client = new ConvexHttpClient(CONVEX_URL);

const INPUT_PATH = path.join(process.cwd(), "scripts/output/firstaid-questions.json");
const BATCH_SIZE = 10;
const DELAY_MS = 600;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const questions = JSON.parse(fs.readFileSync(INPUT_PATH, "utf-8")) as Array<{
    blob: string;
    chapter: string;
    system: string;
    subject: string;
    hasImage: boolean;
    questionNumber: number;
  }>;

  console.log(`Loaded ${questions.length} questions from ${INPUT_PATH}`);

  const total = questions.length;
  const batchCount = Math.ceil(total / BATCH_SIZE);
  let ingested = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const rawText = batch.map((q) => q.blob).join("\n---NEXT-QUESTION---\n");
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const ingestionId = await client.mutation(api.ingest.startIngestion, {
        rawText,
        totalCount: batch.length,
      });
      ingested += batch.length;
      console.log(
        `Batch ${batchNum}/${batchCount}: ${batch.length} questions → ingestionId=${ingestionId} (total: ${ingested}/${total})`
      );
    } catch (err) {
      console.error(`Batch ${batchNum} FAILED:`, err);
    }

    if (i + BATCH_SIZE < total) {
      await delay(DELAY_MS);
    }
  }

  console.log(`\nAll batches sent. Triggering processing...`);
  try {
    await client.mutation(api.ingest.forceProcessPending, {});
    console.log("forceProcessPending called successfully.");
  } catch (err) {
    console.error("forceProcessPending failed:", err);
  }

  console.log(`\nDone. ${ingested} questions ingested across ${batchCount} batches.`);
}

main().catch(console.error);
