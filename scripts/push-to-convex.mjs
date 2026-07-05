import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL not set");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);
const CONCURRENCY = 10;

function loadJSONL(file) {
  return fs.readFileSync(path.join("data", file), "utf8")
    .trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
}

function concurrencyPool(tasks, limit) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try { results[i] = await tasks[i](); }
      catch (e) { results[i] = { error: e.message || e }; }
    }
  }
  return Promise.all(Array.from({ length: limit }, worker)).then(() => results);
}

async function main() {
  console.log("=== Loading data files ===");
  const questions = loadJSONL("medicospira-questions.jsonl");
  const classified = loadJSONL("classified-questions.jsonl");
  const enriched = loadJSONL("medicospira-enriched.jsonl");

  const qByHash = new Map(questions.filter(q => q.textHash).map(q => [q.textHash, q]));
  const cByHash = new Map(classified.filter(c => c.textHash).map(c => [c.textHash, c]));
  const eByHash = new Map(enriched.filter(e => e.textHash && e.enriched).map(e => [e.textHash, e.enriched]));

  const merged = [];
  for (const q of questions) {
    const hash = q.textHash;
    if (!hash) continue;
    const c = cByHash.get(hash);
    const e = eByHash.get(hash);
    if (!c || !e) continue;
    merged.push({ q, c, e, hash });
  }

  console.log(`Questions: ${questions.length}`);
  console.log(`Classified: ${classified.length}`);
  console.log(`Enriched: ${enriched.length}`);
  console.log(`Merged (all 3 present): ${merged.length}`);

  if (merged.length === 0) {
    console.error("No questions to push");
    process.exit(1);
  }

  // Phase 1: Seed systems, subjects from classified
  console.log("\n=== Phase 1: Seed ref data ===");
  const sysNames = [...new Set(classified.map(c => c.system).filter(Boolean))].sort();
  const subjNames = [...new Set(classified.map(c => c.subject).filter(Boolean))].sort();

  const systemOps = sysNames.map(name => () =>
    client.mutation("questions:seedSystem", { name, displayOrder: sysNames.indexOf(name) + 1 })
      .then(id => ({ name, id }))
  );
  const systemResults = await concurrencyPool(systemOps, CONCURRENCY);
  const sysById = {};
  for (const r of systemResults) {
    if (r.id) sysById[r.name] = r.id;
    else if (r.error) console.error(`  System seed error: ${r.name} — ${r.error}`);
  }
  console.log(`  Systems seeded: ${Object.keys(sysById).length}`);

  const subjOps = subjNames.map(name => () =>
    client.mutation("questions:seedSubject", { name, displayOrder: subjNames.indexOf(name) + 1 })
      .then(id => ({ name, id }))
  );
  const subjResults = await concurrencyPool(subjOps, CONCURRENCY);
  const subjById = {};
  for (const r of subjResults) {
    if (r.id) subjById[r.name] = r.id;
    else if (r.error) console.error(`  Subject seed error: ${r.name} — ${r.error}`);
  }
  console.log(`  Subjects seeded: ${Object.keys(subjById).length}`);

  // Phase 2: Create ingestion record
  console.log("\n=== Phase 2: Create bulk ingestion record ===");
  const ingestionId = await client.mutation("ingest:startIngestion", {
    rawText: `Bulk import of ${merged.length} questions from local JSONL pipeline`,
    totalCount: merged.length,
    source: "API",
  });
  console.log(`  Ingestion ID: ${ingestionId}`);

  if (!ingestionId) {
    console.error("Failed to create ingestion record");
    process.exit(1);
  }

  // Phase 3: Import questions with enrichment
  console.log(`\n=== Phase 3: Import ${merged.length} questions (concurrency ${CONCURRENCY}) ===`);
  const importTasks = merged.map(({ q, c, e }) => () => {
    const data = {
      questionText: q.text,
      correctAnswer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
      educationalObjective: q.educationalObjective || e.educationalObjective || "",
      subject: c.subject || e.subject || "General",
      system: c.system || e.system || "General",
      textHash: q.textHash,
      diseaseName: e.diseaseName || "",
      topicType: e.topicType || undefined,
      mechanism: e.mechanism || "",
      highLeverageClues: e.highLeverageClues || [],
      discriminators: e.discriminators || [],
      nextBestStep: e.nextBestStep || undefined,
      clinicalContext: {
        age: e.clinicalContext?.age || "",
        gender: e.clinicalContext?.gender || "",
        physiologyState: e.clinicalContext?.physiologyState || "",
        onsetPattern: e.clinicalContext?.onsetPattern || "",
      },
      keySymptoms: e.keySymptoms || [],
      prerequisites: e.prerequisites || [],
      tableData: e.tableData || [],
    };
    return client.mutation("ingest:saveExtractedIntelligence", { ingestionId, data })
      .then(() => true)
      .catch(err => { throw new Error(`${q.textHash.slice(0,8)}... — ${err.message}`); });
  });

  const importResults = await concurrencyPool(importTasks, CONCURRENCY);
  const succeeded = importResults.filter(r => r === true).length;
  const importErrors = importResults.filter(r => r && r.error).length;
  console.log(`  Succeeded: ${succeeded}, Errors: ${importErrors}`);

  if (importErrors > 0) {
    for (const r of importResults) {
      if (r.error) console.error(`    Error: ${r.error}`);
    }
  }

  // Phase 4: Classify all questions
  console.log("\n=== Phase 4: Classify all ===");
  const classifyResult = await client.mutation("classify:classifyAll", { dryRun: false });
  console.log(`  Classified: ${classifyResult?.classified || "?"} / ${classifyResult?.total || "?"}`);

  // Phase 5: Recalculate question counts
  console.log("\n=== Phase 5: Recalculate counts ===");
  const recalcResult = await client.mutation("backfill:recalculateQuestionCounts", {});
  console.log(`  Done: ${JSON.stringify(recalcResult)}`);

  console.log("\n=== DONE ===");
  console.log(`Successfully pushed ${succeeded}/${merged.length} questions`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
