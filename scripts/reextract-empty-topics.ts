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

const PROMPT = `You are a USMLE medical educator. Given a question and explanation, identify:
1. diseaseName: The PRIMARY FOCAL CONCEPT being tested. Can be a disease, pathogen, physiological principle, drug, syndrome, or concept. NEVER leave empty.
2. topicType: One of DISEASE | PATHOGEN | PRINCIPLE | DRUG | SYNDROME | CONCEPT

Return JSON: { "diseaseName": "...", "topicType": "..." }`;

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const feed = await client.query(api.research.getExtractionFeed, { limit: 1000 });
  const blanks = feed.filter(f => !f.diseaseName || f.diseaseName.trim() === "");
  console.log(`Found ${blanks.length} blank diseaseName records`);

  let patched = 0;
  for (const record of blanks) {
    const questionSnippet = record.questionText?.slice(0, 600) ?? "";
    if (!questionSnippet) {
      console.log(`  Skipping ${record._id} — no question text`);
      continue;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: questionSnippet },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const result = JSON.parse(response.choices[0].message.content ?? "{}");
      const { diseaseName } = result;
      const VALID_TYPES = ["DISEASE", "PATHOGEN", "PRINCIPLE", "DRUG", "SYNDROME", "CONCEPT"];
      const topicType = VALID_TYPES.includes(result.topicType) ? result.topicType : "CONCEPT";

      if (!diseaseName) {
        console.log(`  No result for ${record._id}`);
        continue;
      }

      console.log(`  GPT returned: "${diseaseName}" [${result.topicType}] → using [${topicType}]`);
      await client.mutation(api.patterns.patchDiseaseName, {
        patternId: record._id,
        diseaseName,
        topicType: topicType as any,
      });

      console.log(`  Patched: "${diseaseName}" [${topicType}]`);
      patched++;
    } catch (err) {
      console.error(`  Error on ${record._id}:`, err);
    }

    await delay(200);
  }

  console.log(`\nDone. Patched ${patched}/${blanks.length} records.`);
}

main().catch(console.error);
