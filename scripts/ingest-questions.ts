#!/usr/bin/env npx ts-node
/**
 * Ingest USMLE questions into Convex.
 * Usage: npx ts-node scripts/ingest-questions.ts
 *
 * Paste questions into the QUESTIONS constant below, separated by ---NEXT-QUESTION---
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { readFileSync } from "fs";
import { join } from "path";

// Auto-load .env.local
try {
  const envPath = join(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim().replace(/^"|"$/g, "");
  }
} catch {}

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL env var");
  process.exit(1);
}

// ─── PASTE QUESTIONS BELOW ───────────────────────────────────────────────────
const QUESTIONS = `
A 34-year-old man with upper gastrointestinal bleeding is brought to the local emergency department by ambulance. He was found in front of a grocery store after customers called emergency medical services. The patient is unable to provide any information, but his medical records show a history of alcohol use disorder. After undergoing emergency evaluation and appropriate resuscitation, his condition stabilizes. Gastric lavage fluid initially contained blood but cleared quickly. Upper endoscopy shows a linear mucosal tear at the gastroesophageal junction. The process directly responsible for causing this patient's mucosal tear will most likely result in which of the following acid-base disturbances?

A. High anion gap metabolic acidosis
B. Metabolic alkalosis
C. Normal anion gap metabolic acidosis
D. Respiratory acidosis
E. Respiratory alkalosis

Correct Answer: B

Explanation: This patient has a Mallory-Weiss tear of the gastric mucosa near the gastroesophageal junction. Mallory-Weiss tears are caused by high intragastric pressure being transmitted to the esophagus through a tight lower esophageal sphincter. They are most commonly caused by repetitive retching and vomiting. Repetitive vomiting leads to metabolic alkalosis due to net loss of acidic gastric secretions.

(Choice A) Unlike methanol or ethylene glycol, acute ethanol intoxication does not usually cause high anion gap metabolic acidosis, but chronic alcohol use can cause ketoacidosis in malnourished patients. Ethanol abuse is a common predisposing factor for Mallory-Weiss tears; however, it is the repetitive vomiting and retching that directly cause the tears.
(Choice C) Normal anion gap metabolic acidosis is usually caused by loss of bicarbonate, which can occur with prolonged diarrhea. Recurrent vomiting causes metabolic alkalosis, not acidosis.
(Choices D and E) Respiratory acidosis usually occurs in patients with COPD or CNS depression. Respiratory alkalosis occurs with hyperventilation.

Educational objective: A Mallory-Weiss tear is a tear in the gastric mucosa near the gastroesophageal junction. It typically results from repetitive forceful vomiting, which can also cause metabolic alkalosis.

---NEXT-QUESTION---

A 45-year-old man with a history of alcohol use disorder, chronic hepatitis C, and HIV is brought to the emergency department due to altered mental status and abdominal distension. He is disoriented and unable to provide an adequate history. He is accompanied by a friend who reports that the patient has recently been drinking heavily. The patient's breath has a sweet, sulfurous odor. Physical examination shows gynecomastia, palmar erythema, and multiple spider angiomata. The abdomen is severely distended, and dilated periumbilical veins are noted. There is 3+ bilateral lower extremity edema. Genital examination shows testicular atrophy. Neurologic examination shows disorientation and asterixis. Abdominal imaging reveals splenomegaly. Development of this patient's gynecomastia most closely resembles the pathogenesis of which of the following additional findings in this patient?

A. Altered mental status
B. Dilated periumbilical veins
C. Lower extremity edema
D. Spider angiomata
E. Splenomegaly
F. Sweet, sulfurous breath odor

Correct Answer: D

Explanation: This patient has numerous clinical findings characteristic of liver cirrhosis. In patients with cirrhosis, gynecomastia arises from hyperestrinism: increased adrenal production of estrogen precursors, increased sex hormone-binding globulin leading to decreased free testosterone/estrogen ratio, and impaired estrogen metabolism by the liver. Spider angiomata are also due to estrogen-induced arteriolar dilation and are seen in other hyperestrogenic states (eg, pregnancy). The number and size of angiomata generally correlate with the severity of liver disease.

(Choices A and F) Altered mental status and fetor hepaticus are signs of poor hepatic function and accumulation of metabolic toxins (ammonia, dimethyl sulfide).
(Choices B and E) Portal hypertension causes dilated periumbilical veins (caput medusae) and splenomegaly.
(Choice C) Decreased albumin production leads to lower oncotic pressure and pedal edema.

Educational objective: In patients with cirrhosis, gynecomastia often occurs due to hyperestrinism, which can also promote the formation of spider angiomata.
`.trim();
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL!);

  const questionBlobs = QUESTIONS.split("---NEXT-QUESTION---")
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  console.log(`Ingesting ${questionBlobs.length} question(s)...`);

  // 1. Create ingestion record
  const ingestionId = await client.mutation(api.ingest.startIngestion, {
    rawText: QUESTIONS,
    totalCount: questionBlobs.length,
  });

  console.log(`Ingestion ID: ${ingestionId}`);

  // 2. Trigger AI extraction
  const result = await client.action(api.ai.extractIntelligence, {
    ingestionId,
    rawText: QUESTIONS,
  });

  console.log(`\nResults:`);
  console.log(`  Total:     ${result.totalCount}`);
  console.log(`  Processed: ${result.processedCount} (OpenAI called)`);
  console.log(`  Skipped:   ${result.skippedCount} (duplicates — no API cost)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
