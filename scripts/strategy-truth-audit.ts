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
  console.log("--- STRATEGY TRUTH VERIFICATION ---");
  
  // 1. Fetch top 5 items from Strategy Hub's perspective
  const hubData = await client.query(api.strategy.getDiseasePriorityList, { limit: 5 });
  
  // 2. Fetch the raw question & pattern data for those same 5 items to verify "Truth"
  console.log("\nVerifying Top 5 Topics against raw Question Bank...");
  
  const auditReport = [];

  for (const item of hubData) {
    const rawQuestions = await client.query(api.strategy.getQuestionsForDisease, { diseaseName: item.diseaseName });
    
    // 3. Ask OpenAI to audit if the "Surfaced Strategy" (item) accurately reflects these "Raw Questions"
    const auditPrompt = `
    You are an AI Auditor. I am surfacing a study strategy for a medical student.
    
    TOPIC BEING SURFACED: "${item.diseaseName}"
    SURFACED TOP CLUE: "${item.topClue}"
    SURFACED TYPE: "${item.topicType}"
    
    RAW DATA FROM DATABASE:
    ${rawQuestions.map((r: any, i: number) => `Q${i+1}: ${r.question.text}\nExplanation: ${r.question.explanation}`).join("\n\n")}
    
    TASK:
    Evaluate if our "Strategy Hub" is finely expressing the truth of the database.
    1. Does "${item.diseaseName}" actually represent the primary focal point of these questions?
    2. Is "${item.topClue}" truly a pathognomonic or high-leverage giveaway found in these questions?
    3. Is the classification "${item.topicType}" accurate?
    
    Return a brief "Fidelity Score" (1-10) and 2-3 sentences of critique.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: auditPrompt }],
        temperature: 0,
      });

      auditReport.push({
        topic: item.diseaseName,
        analysis: response.choices[0].message.content,
      });
    } catch (err) {
      console.error(`Error auditing ${item.diseaseName}:`, err);
    }
  }

  console.log("\n--- AUDIT RESULTS ---");
  auditReport.forEach(r => {
    console.log(`\nTopic: ${r.topic}`);
    console.log(r.analysis);
  });
}

main().catch(console.error);
