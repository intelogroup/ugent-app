import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function migrate() {
  const allQuestions: any[] = [];

  // 1. Parse questions-batch-*.ts
  const batchFiles = fs.readdirSync(process.cwd()).filter(f => f.startsWith("questions-batch-") && f.endsWith(".ts"));
  for (const file of batchFiles) {
    console.log(`Parsing ${file}...`);
    const content = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    const questions = parseBatchFile(content);
    console.log(`  Found ${questions.length} questions`);
    allQuestions.push(...questions);
  }

  // 2. Parse prisma/seed-questions.ts
  const seedQuestionsFile = path.join(process.cwd(), "prisma", "seed-questions.ts");
  if (fs.existsSync(seedQuestionsFile)) {
    console.log(`Parsing ${seedQuestionsFile}...`);
    const content = fs.readFileSync(seedQuestionsFile, "utf8");
    const questions = parseSeedQuestions(content);
    console.log(`  Found ${questions.length} questions`);
    allQuestions.push(...questions);
  }

  // 3. Parse prisma/seed-enhanced.ts
  const seedEnhancedFile = path.join(process.cwd(), "prisma", "seed-enhanced.ts");
  if (fs.existsSync(seedEnhancedFile)) {
    console.log(`Parsing ${seedEnhancedFile}...`);
    const content = fs.readFileSync(seedEnhancedFile, "utf8");
    const questions = parseSeedEnhanced(content);
    console.log(`  Found ${questions.length} questions`);
    allQuestions.push(...questions);
  }

  console.log(`Total questions to migrate: ${allQuestions.length}`);

  // 4. Upload to Convex in chunks
  const CHUNK_SIZE = 50;
  for (let i = 0; i < allQuestions.length; i += CHUNK_SIZE) {
    const chunk = allQuestions.slice(i, i + CHUNK_SIZE);
    console.log(`Uploading chunk ${i / CHUNK_SIZE + 1} (${chunk.length} questions)...`);
    try {
      // @ts-ignore
      await client.mutation("questions:bulkImport", { questions: chunk });
    } catch (error) {
      console.error(`Error uploading chunk ${i / CHUNK_SIZE + 1}:`, error);
    }
  }

  console.log("Migration complete!");
}

function parseBatchFile(content: string): any[] {
  const questions: any[] = [];
  
  const match = content.match(/const questions: QuestionData\[\] = (\[[\s\S]*\]);/);
  if (!match) return [];

  const arrayContent = match[1];
  
  // Refined regex to handle both single and double quotes
  const objectRegex = /\{\s*text:\s*['"]([\s\S]*?)['"],\s*explanation:\s*['"]([\s\S]*?)['"],\s*difficulty:\s*['"]([\s\S]*?)['"],\s*subject:\s*['"]([\s\S]*?)['"],\s*system:\s*['"]([\s\S]*?)['"],\s*topic:\s*['"]([\s\S]*?)['"],\s*answers:\s*(\[[\s\S]*?\]),?\s*\}/g;
  
  let m;
  while ((m = objectRegex.exec(arrayContent)) !== null) {
    const [_, text, explanation, difficulty, subject, system, topic, answersStr] = m;
    
    const answers: any[] = [];
    const answerRegex = /\{\s*text:\s*['"]([\s\S]*?)['"],\s*isCorrect:\s*(true|false)\s*\}/g;
    let am;
    while ((am = answerRegex.exec(answersStr)) !== null) {
      answers.push({ text: am[1], isCorrect: am[2] === "true" });
    }

    questions.push({
      text: cleanString(text),
      explanation: cleanString(explanation),
      difficulty,
      subject,
      system,
      options: answers.map(a => ({ ...a, text: cleanString(a.text) })),
      correctAnswer: cleanString(answers.find(a => a.isCorrect)?.text || ""),
    });
  }

  return questions;
}

function parseSeedQuestions(content: string): any[] {
  const questions: any[] = [];
  const createQuestionRegex = /createQuestion\(\{([\s\S]*?)\}\)/g;
  
  let m;
  while ((m = createQuestionRegex.exec(content)) !== null) {
    const objStr = m[1];
    
    const text = objStr.match(/text:\s*['"]([\s\S]*?)['"],/)?.[1] || "";
    const explanation = objStr.match(/explanation:\s*['"]([\s\S]*?)['"],/)?.[1] || "";
    const difficulty = objStr.match(/difficulty:\s*['"]([\s\S]*?)['"],/)?.[1] || "";
    
    const options: any[] = [];
    const optionsMatch = objStr.match(/options:\s*(\[[\s\S]*?\]),/);
    if (optionsMatch) {
      const optionsStr = optionsMatch[1];
      const optionRegex = /\{\s*text:\s*['"]([\s\S]*?)['"],\s*isCorrect:\s*(true|false)\s*\}/g;
      let om;
      while ((om = optionRegex.exec(optionsStr)) !== null) {
        options.push({ text: cleanString(om[1]), isCorrect: om[2] === "true" });
      }
    }

    questions.push({
      text: cleanString(text),
      explanation: cleanString(explanation),
      difficulty,
      options,
      correctAnswer: options.find(o => o.isCorrect)?.text || "",
    });
  }
  return questions;
}

function parseSeedEnhanced(content: string): any[] {
  const questions: any[] = [];
  
  const objectRegex = /\{\s*text:\s*['"]([\s\S]*?)['"],\s*difficulty:\s*['"]([\s\S]*?)['"]\s*as\s*DifficultyLevel,\s*explanation:\s*['"]([\s\S]*?)['"],\s*options:\s*(\[[\s\S]*?\]),?\s*\}/g;
  
  let m;
  while ((m = objectRegex.exec(content)) !== null) {
    const [_, text, difficulty, explanation, optionsStr] = m;
    
    const options: any[] = [];
    const optionRegex = /\{\s*text:\s*['"]([\s\S]*?)['"],\s*isCorrect:\s*(true|false)\s*\}/g;
    let om;
    while ((om = optionRegex.exec(optionsStr)) !== null) {
      options.push({ text: cleanString(om[1]), isCorrect: om[2] === "true" });
    }

    questions.push({
      text: cleanString(text),
      difficulty,
      explanation: cleanString(explanation),
      options,
      correctAnswer: options.find(o => o.isCorrect)?.text || "",
    });
  }
  return questions;
}

function cleanString(str: string): string {
  // Handle escaped quotes
  return str.replace(/\\'/g, "'").replace(/\\"/g, '"');
}


migrate().catch(console.error);
