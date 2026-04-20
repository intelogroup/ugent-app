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

const PROMPT = `You are a USMLE medical educator. Classify this medical concept into one category:
- DISEASE: disease or diagnosis (e.g., "Tuberculosis", "Myocardial Infarction")
- PATHOGEN: pathogen or organism (e.g., "Staphylococcus aureus", "C. difficile")
- PRINCIPLE: physiological principle (e.g., "Pulmonary gas exchange", "Starling forces")
- DRUG: drug or drug class (e.g., "Beta blockers", "ACE inhibitors")
- SYNDROME: clinical syndrome (e.g., "Cushing syndrome", "SIADH")
- CONCEPT: biostats, ethics, epidemiology (e.g., "Type II error", "Sensitivity")

Return JSON: { "topicType": "..." }`;

const VALID_TYPES = ["DISEASE", "PATHOGEN", "PRINCIPLE", "DRUG", "SYNDROME", "CONCEPT"];

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const feed = await client.query(api.research.getExtractionFeed, { limit: 1000 });
  const missingType = feed.filter((f: any) => f.diseaseName && f.diseaseName.trim() !== "" && !f.topicType);
  console.log(`Found ${missingType.length} records missing topicType`);

  let patched = 0;
  for (let i = 0; i < missingType.length; i++) {
    const record = missingType[i];
    const diseaseName = record.diseaseName;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: `Classify: ${diseaseName}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const result = JSON.parse(response.choices[0].message.content ?? "{}");
      const topicType = VALID_TYPES.includes(result.topicType) ? result.topicType : "CONCEPT";

      console.log(`  [${i+1}/${missingType.length}] "${diseaseName}" → ${topicType}`);

      await client.mutation(api.patterns.patchDiseaseName, {
        patternId: record._id,
        diseaseName,
        topicType: topicType as any,
      });

      patched++;
    } catch (err) {
      console.error(`  Error on ${record._id}:`, err);
    }

    await delay(100);
  }

  console.log(`\nDone. Patched ${patched}/${missingType.length} records.`);
}

main().catch(console.error);