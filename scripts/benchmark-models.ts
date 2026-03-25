/**
 * Benchmark extraction quality across OpenAI models.
 * Usage: npx tsx scripts/benchmark-models.ts
 */

import { OpenAI } from "openai";
import { readFileSync } from "fs";
import { join } from "path";

// Auto-load .env.local
try {
  const lines = readFileSync(join(process.cwd(), ".env.local"), "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim().replace(/^"|"$/g, "");
  }
} catch {}

const MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "o3",           // strongest reasoning — comment out if not available on your key
  // "gpt-5",     // uncomment when available
];

const QUESTION = `
A 45-year-old man with a history of alcohol use disorder, chronic hepatitis C, and HIV is brought to the emergency department due to altered mental status and abdominal distension. Physical examination shows gynecomastia, palmar erythema, and multiple spider angiomata. The abdomen is severely distended, and dilated periumbilical veins are noted. There is 3+ bilateral lower extremity edema. Neurologic examination shows disorientation and asterixis. Abdominal imaging reveals splenomegaly.

Development of this patient's gynecomastia most closely resembles the pathogenesis of which of the following additional findings?

A. Altered mental status
B. Dilated periumbilical veins
C. Lower extremity edema
D. Spider angiomata
E. Splenomegaly
F. Sweet, sulfurous breath odor

Correct Answer: D

Explanation: Gynecomastia in cirrhosis arises from hyperestrinism. Spider angiomata are also due to estrogen-induced arteriolar dilation. Edema (Choice C) is from decreased albumin/oncotic pressure. Periumbilical veins and splenomegaly (B, E) are from portal hypertension. Altered mental status and fetor hepaticus (A, F) are from metabolic toxin accumulation.
`.trim();

const EXTRACTION_PROMPT = `
You are a world-class medical educator. Extract high-leverage USMLE intelligence from the question.

Return JSON with:
- diseaseName: primary diagnosis
- mechanism: core pathophysiology (the "why")
- highLeverageClues: array of specific terms/findings that point to the diagnosis
- clueTypes: for each clue, classify as "pathognomonic"|"demographic"|"combination"|"lab_value"
- discriminators: array of {distractor, ruleOutFact} — why each wrong answer fails
- clinicalContext: {age, gender, physiologyState, onsetPattern}
- keySymptoms: array of symptoms
- prerequisites: subjects/concepts needed to understand this question
- primarySubject: main medical subject (e.g. "Hepatology")
- prerequisiteSubjects: array of subjects needed as prior knowledge
`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    diseaseName: { type: "string" },
    mechanism: { type: "string" },
    highLeverageClues: { type: "array", items: { type: "string" } },
    clueTypes: { type: "array", items: { type: "string" } },
    discriminators: {
      type: "array",
      items: {
        type: "object",
        properties: { distractor: { type: "string" }, ruleOutFact: { type: "string" } },
        required: ["distractor", "ruleOutFact"],
      },
    },
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
    primarySubject: { type: "string" },
    prerequisiteSubjects: { type: "array", items: { type: "string" } },
  },
  required: ["diseaseName", "mechanism", "highLeverageClues", "clueTypes", "discriminators", "clinicalContext", "keySymptoms", "prerequisites", "primarySubject", "prerequisiteSubjects"],
};

async function runModel(openai: OpenAI, model: string) {
  const start = Date.now();
  try {
    const isReasoningModel = model.startsWith("o");
    const params: any = {
      model,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: QUESTION },
      ],
    };

    // Reasoning models don't support response_format with json_schema
    if (!isReasoningModel) {
      params.response_format = {
        type: "json_schema",
        json_schema: { name: "extraction", schema: JSON_SCHEMA },
      };
    } else {
      params.messages[0].content += "\n\nRespond ONLY with valid JSON matching the schema. No markdown, no explanation.";
    }

    const response = await openai.chat.completions.create(params);
    const elapsed = Date.now() - start;
    const content = response.choices[0].message.content ?? "";
    const result = JSON.parse(content);

    return { model, result, elapsed, tokens: response.usage, error: null };
  } catch (err: any) {
    return { model, result: null, elapsed: Date.now() - start, tokens: null, error: err.message };
  }
}

function score(result: any): number {
  // Simple quality score: penalize empty/missing fields, reward depth
  let s = 0;
  if (result.diseaseName?.length > 3) s += 10;
  if (result.mechanism?.length > 50) s += 20;
  s += Math.min(result.highLeverageClues?.length ?? 0, 5) * 5;  // up to 25
  s += Math.min(result.discriminators?.length ?? 0, 5) * 5;     // up to 25 (should have 5 distractors)
  s += Math.min(result.prerequisites?.length ?? 0, 4) * 3;      // up to 12
  s += Math.min(result.prerequisiteSubjects?.length ?? 0, 3) * 3; // up to 9 (NEW field)
  if (result.clinicalContext?.age) s += 3;
  if (result.clueTypes?.length > 0) s += 5;
  return s; // max ~109
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error("Missing OPENAI_API_KEY"); process.exit(1); }
  const openai = new OpenAI({ apiKey });

  console.log("=== USMLE EXTRACTION BENCHMARK ===\n");
  console.log(`Question: Liver cirrhosis / gynecomastia / spider angiomata (Correct: D)\n`);

  const results = await Promise.all(MODELS.map((m) => runModel(openai, m)));

  for (const { model, result, elapsed, tokens, error } of results) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`MODEL: ${model.toUpperCase()}  |  ${elapsed}ms  |  ${tokens?.total_tokens ?? "?"} tokens`);
    console.log(`${"─".repeat(60)}`);

    if (error) {
      console.log(`  ERROR: ${error}`);
      continue;
    }

    console.log(`  Disease:          ${result.diseaseName}`);
    console.log(`  Primary Subject:  ${result.primarySubject}`);
    console.log(`  Prereq Subjects:  ${result.prerequisiteSubjects?.join(", ")}`);
    console.log(`  Mechanism:        ${result.mechanism?.slice(0, 120)}...`);
    console.log(`  High-Lever Clues: ${result.highLeverageClues?.join(" | ")}`);
    console.log(`  Clue Types:       ${result.clueTypes?.join(", ")}`);
    console.log(`  Discriminators:`);
    for (const d of result.discriminators ?? []) {
      console.log(`    [${d.distractor}] → ${d.ruleOutFact}`);
    }
    console.log(`  Prerequisites:    ${result.prerequisites?.join(", ")}`);
    console.log(`\n  QUALITY SCORE: ${score(result)}/109`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  for (const { model, result, elapsed, tokens, error } of results) {
    const s = error ? "ERROR" : `${score(result)}/109`;
    const cost = tokens ? `~$${((tokens.prompt_tokens * 0.0000025) + (tokens.completion_tokens * 0.00001)).toFixed(4)}` : "?";
    console.log(`  ${model.padEnd(20)} score=${s}  time=${elapsed}ms  tokens=${tokens?.total_tokens ?? "?"}  cost=${cost}`);
  }
}

main().catch(console.error);
