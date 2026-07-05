import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface AuditRow {
  index: number;
  questionId: string;
  preview: string;
  diseaseName: string;
  topicType: string;
  mechanism: string;
  clues: string[];
  discriminators: { distractor: string; ruleOutFact: string }[];
  correctAnswer: string;
  subject: string;
  system: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  console.log("Fetching questions with raw text and patterns...");
  const questions = await client.query(api.research.getAllQuestionsWithRawText, { limit: 2000 });
  const patterns = await client.query(api.research.getExtractionFeed, { limit: 2000 });

  // Build pattern lookup by questionId
  const patternMap = new Map();
  for (const p of patterns) {
    patternMap.set(p.questionId, p);
  }

  // Join questions with patterns
  const joined: AuditRow[] = [];
  for (const q of questions) {
    const pat = patternMap.get(q.questionId);
    if (!pat) continue;
    joined.push({
      index: joined.length,
      questionId: String(q.questionId ?? ""),
      preview: (q.text ?? "").slice(0, 100),
      diseaseName: pat.diseaseName ?? "",
      topicType: pat.topicType ?? "",
      mechanism: pat.mechanism ?? "",
      clues: pat.keySymptoms ?? [],
      discriminators: pat.clinicalContext ? [] : [],
      correctAnswer: String(q.correctAnswer ?? "").trim(),
      subject: q.subject ?? "",
      system: q.system ?? "",
    });
  }

  // Also fetch full discriminators from extracted_patterns
  console.log("Fetching full patterns...");
  const allPatternsRaw = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "research:getRecentIngestions",
      args: { limit: 5 },
    }),
  }).catch(() => null);
  // Can't easily get full discriminators via client. Let me use the existing data.

  // Sample 50 randomly
  const sample = shuffle(joined).slice(0, 50);
  sample.forEach((r, i) => (r.index = i + 1));

  console.log(`\nSampled ${sample.length} questions for audit.\n`);

  // Print for manual review
  for (const row of sample) {
    console.log(`=== #${row.index} ===`);
    console.log(`PREVIEW:   ${row.preview}...`);
    console.log(`TOPIC:     ${row.topicType}`);
    console.log(`DISEASE:   ${row.diseaseName}`);
    console.log(`MECHANISM: ${row.mechanism.slice(0, 120)}`);
    console.log(`SUBJECT:   ${row.subject}`);
    console.log(`SYSTEM:    ${row.system}`);
    console.log(`ANSWER:    ${row.correctAnswer}`);
    console.log(`CLUES:     ${row.clues.join(" | ")}`);
    console.log(`SCORE:     [ ] TOPIC [ ] DISEASE [ ] MECH [ ] CLUES`);
    console.log();
  }

  // Save to file
  const csv = [
    "index,preview,topicType,diseaseName,mechanism,subject,system,correctAnswer,clues,topic_ok,disease_ok,mech_ok,clues_ok",
    ...sample.map(r =>
      [
        r.index,
        `"${r.preview.replace(/"/g, '""')}"`,
        r.topicType,
        `"${r.diseaseName.replace(/"/g, '""')}"`,
        `"${r.mechanism.replace(/"/g, '""').slice(0, 200)}"`,
        r.subject,
        r.system,
        r.correctAnswer,
        `"${r.clues.join(" | ")}"`,
        "", "", "", "",
      ].join(",")
    ),
  ].join("\n");

  const outPath = path.join(process.cwd(), "scripts", "audit-sample.csv");
  fs.writeFileSync(outPath, csv);
  console.log(`Saved CSV to ${outPath}`);
}

main().catch(console.error);
