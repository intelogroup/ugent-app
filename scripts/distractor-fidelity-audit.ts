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

async function main() {
  console.log("--- 'DON'T GET FOOLED' (DISCRIMINATOR) FIDELITY AUDIT ---");
  
  // 1. Fetch the top 3 most "Confusable" topics (those with most extracted traps)
  const confusable = await client.query(api.strategy.getMostConfusableTopics, { limit: 3 });
  
  if (confusable.length === 0) {
    console.log("No confusable topics found in DB.");
    return;
  }

  for (const topic of confusable) {
    console.log(`\nAuditing Topic: "${topic.diseaseName}" (${topic.discriminatorCount} traps extracted)`);
    
    // 2. Get the specific patterns and questions for this topic
    const data = await client.query(api.strategy.getQuestionsForDisease, { diseaseName: topic.diseaseName });
    
    // 3. Extract the discriminators we are currently surfacing
    const surfacedTraps = data.flatMap((d: any) => d.pattern.discriminators || []);
    
    // 4. Audit against raw data
    const auditPrompt = `
    You are a Senior Medical Board Examiner. I am building a "Don't Get Fooled" section to help students avoid common traps.
    
    CORE TOPIC: "${topic.diseaseName}"
    
    SURFACED TRAPS (Distractor vs Rule-out Fact):
    ${surfacedTraps.map((t: any, i: number) => `${i+1}. Distractor: "${t.distractor}" -> Rule-out Fact: "${t.ruleOutFact}"`).join("\n")}
    
    RAW EVIDENCE FROM EXPLANATIONS:
    ${data.map((d: any, i: number) => `Q${i+1} Explanation Snippet: ${d.question.explanation.slice(0, 1000)}`).join("\n\n")}
    
    TASK:
    1. Are these traps "Real"? Does the database actually provide evidence for these rule-out facts?
    2. Are the "Rule-out Facts" medically precise or are they just filler (like "See explanation")?
    3. Evaluation: Are we "finely expressing" the differences between ${topic.diseaseName} and its mimics?
    
    Return a Fidelity Score (1-10) and a critique of the "Trap" logic.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: auditPrompt }],
        temperature: 0,
      });

      console.log("--- AUDIT RESULT ---");
      console.log(response.choices[0].message.content);
      console.log("\n-------------------------------------------");
    } catch (err) {
      console.error(`Error auditing ${topic.diseaseName}:`, err);
    }
  }
}

main().catch(console.error);
