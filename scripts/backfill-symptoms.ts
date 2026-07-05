import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";
import OpenAI from "openai";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const client = new ConvexHttpClient(CONVEX_URL);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const PROMPT = `You are a USMLE medical educator. Given a clinical question about a disease or syndrome, extract ONLY the key symptoms, clinical findings, and presentation details from the patient vignette. Return them as a flat array of strings.

Rules:
- List specific symptoms mentioned in the case (e.g. "chest pain", "fever", "hemoptysis")
- Include relevant physical exam findings (e.g. "bilateral wheezing", "jugular venous distension")
- Include lab/imaging findings only if they are the key differentiator
- Return 3-8 items
- Each item must be a single string, not an object
- NEVER include treatment steps, mechanisms, or educational objectives

Return JSON: { "keySymptoms": ["symptom1", "symptom2", ...] }`;

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const feed = await client.query(api.research.getExtractionFeed, { limit: 3000 });
  const clinical = feed.filter(f =>
    (f.topicType === "DISEASE" || f.topicType === "SYNDROME") &&
    (!f.keySymptoms || f.keySymptoms.length === 0)
  );
  console.log(`Found ${clinical.length} clinical patterns with empty keySymptoms`);

  let patched = 0;
  for (const record of clinical) {
    console.log(`\nProcessing: ${record.diseaseName} (${record._id.slice(-12)})`);

    let questionText = "";
    let explanation = "";
    try {
      const q = await client.query(api.questions.getQuestionById, { id: record.questionId });
      questionText = (q?.text || "").slice(0, 2000);
      explanation = (q?.explanation || "").slice(0, 1000);
    } catch (err) {
      console.log(`  Failed to fetch question — skipping`);
      continue;
    }

    const combined = `Question:\n${questionText}\n\nExplanation:\n${explanation}`;

    let symptoms: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await delay(1000 * attempt);
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: PROMPT },
            { role: "user", content: combined },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        });

        const result = JSON.parse(response.choices[0].message.content ?? "{}");
        const raw = result.keySymptoms;
        if (Array.isArray(raw)) {
          symptoms = raw.map((s: any) => {
            if (typeof s === "string") return s.trim();
            if (typeof s === "object" && s !== null) {
              return (s.symptom || s.name || s.text || JSON.stringify(s)).trim();
            }
            return String(s).trim();
          }).filter((s: string) => s.length > 0);
        }
        if (symptoms.length > 0) break;
      } catch (err) {
        const msg = String(err?.message ?? err);
        const retryable = msg.includes('429') || msg.includes('timeout') || msg.includes('500') || msg.includes('503');
        if (!retryable) break;
      }
    }

    if (symptoms.length === 0) {
      console.log(`  No symptoms extracted`);
      continue;
    }

    console.log(`  → ${symptoms.length} symptoms: ${symptoms.slice(0, 4).join(", ")}`);

    try {
      await client.mutation(api.ingest.fixExtractedPatterns, {
        patches: [{
          _id: record._id,
          keySymptoms: symptoms,
        }],
      });
      patched++;
    } catch (err) {
      console.error(`  Patch failed:`, err);
    }

    await delay(300);
  }

  console.log(`\nDone. Patched ${patched}/${clinical.length} records.`);
}

main().catch(console.error);
