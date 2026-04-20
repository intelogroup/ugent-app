import * as fs from "fs";
import * as path from "path";
import { PDFParse } from "pdf-parse";

const PDF_PATH = path.join(process.cwd(), "First Aid Q&A for the USMLE Step 1 3rd Edition.pdf");
const OUTPUT_PATH = path.join(process.cwd(), "scripts/output/firstaid-questions.json");

const CHAPTER_MAP: Record<string, { system: string; subject: string }> = {
  "Behavioral Science": { system: "General Principles", subject: "Behavioral Science" },
  "Biochemistry": { system: "General Principles", subject: "Biochemistry" },
  "Embryology": { system: "General Principles", subject: "Embryology" },
  "Microbiology": { system: "Microbiology", subject: "Microbiology" },
  "Immunology": { system: "Immunology", subject: "Immunology" },
  "Pathology": { system: "General Principles", subject: "Pathology" },
  "Pharmacology": { system: "Pharmacology", subject: "Pharmacology" },
  "Cardiovascular": { system: "Cardiovascular", subject: "Cardiovascular" },
  "Endocrine": { system: "Endocrine", subject: "Endocrine" },
  "Gastrointestinal": { system: "Gastrointestinal", subject: "Gastrointestinal" },
  "Hematology-Oncology": { system: "Hematology-Oncology", subject: "Hematology-Oncology" },
  "Musculoskeletal": { system: "Musculoskeletal", subject: "Musculoskeletal" },
  "Neurology": { system: "Neurology", subject: "Neurology" },
  "Psychiatry": { system: "Psychiatry", subject: "Psychiatry" },
  "Renal": { system: "Renal", subject: "Renal" },
  "Reproductive": { system: "Reproductive", subject: "Reproductive" },
  "Respiratory": { system: "Respiratory", subject: "Respiratory" },
  "Test Block": { system: "Mixed", subject: "Mixed" },
  "Test Block 1": { system: "Mixed", subject: "Mixed" },
  "Test Block 2": { system: "Mixed", subject: "Mixed" },
  "Test Block 3": { system: "Mixed", subject: "Mixed" },
  "Test Block 4": { system: "Mixed", subject: "Mixed" },
  "Test Block 5": { system: "Mixed", subject: "Mixed" },
  "Test Block 6": { system: "Mixed", subject: "Mixed" },
  "Test Block 7": { system: "Mixed", subject: "Mixed" },
};

// PDF page ranges per chapter (1-indexed PDF pages)
// Calibrated from full-PDF scan of chapter headers.
// Each range covers BOTH the Questions and Answers sections for that chapter.
const CHAPTER_PAGE_RANGES: Array<{ name: string; startPage: number; endPage: number }> = [
  { name: "Behavioral Science",  startPage: 18,  endPage: 31   },
  { name: "Biochemistry",        startPage: 32,  endPage: 67   },
  { name: "Embryology",          startPage: 68,  endPage: 85   },
  { name: "Microbiology",        startPage: 86,  endPage: 115  },
  { name: "Immunology",          startPage: 116, endPage: 137  },
  { name: "Pathology",           startPage: 138, endPage: 155  },
  { name: "Pharmacology",        startPage: 156, endPage: 173  },
  { name: "Cardiovascular",      startPage: 176, endPage: 211  },
  { name: "Endocrine",           startPage: 212, endPage: 247  },
  { name: "Gastrointestinal",    startPage: 250, endPage: 285  },
  { name: "Hematology-Oncology", startPage: 286, endPage: 321  },
  { name: "Musculoskeletal",     startPage: 322, endPage: 353  },
  { name: "Neurology",           startPage: 354, endPage: 377  },
  { name: "Psychiatry",          startPage: 378, endPage: 393  },
  { name: "Renal",               startPage: 394, endPage: 429  },
  { name: "Reproductive",        startPage: 430, endPage: 465  },
  { name: "Respiratory",         startPage: 466, endPage: 499  },
  // Test blocks: each restarts numbering at 1, processed as separate chapters
  { name: "Test Block 1",        startPage: 504, endPage: 541  },
  { name: "Test Block 2",        startPage: 542, endPage: 580  },
  { name: "Test Block 3",        startPage: 578, endPage: 616  },
  { name: "Test Block 4",        startPage: 614, endPage: 650  },
  { name: "Test Block 5",        startPage: 648, endPage: 686  },
  { name: "Test Block 6",        startPage: 684, endPage: 722  },
  { name: "Test Block 7",        startPage: 720, endPage: 760  },
];

interface ParsedQuestion {
  blob: string;
  chapter: string;
  system: string;
  subject: string;
  hasImage: boolean;
  questionNumber: number;
}

// Parse text into numbered items, classified as either question or answer
// Question items contain "(A)" "(B)" option markers
// Answer items contain "The correct answer is" or "correct answer is"
function parseQAndA(text: string): {
  questionsMap: Map<number, string>;
  answersMap: Map<number, string>;
} {
  const questionsMap = new Map<number, string>();
  const answersMap = new Map<number, string>();

  const lines = text.split("\n");

  let currentNum: number | null = null;
  let currentLines: string[] = [];
  let isAnswer: boolean = false;

  const saveCurrentItem = () => {
    if (currentNum === null || currentLines.length === 0) return;
    const joined = currentLines.join("\n").trim();
    if (joined.length < 30) return;

    if (isAnswer) {
      // Only save if not already stored (keep first occurrence — column order)
      if (!answersMap.has(currentNum)) {
        answersMap.set(currentNum, joined);
      }
    } else {
      if (!questionsMap.has(currentNum)) {
        questionsMap.set(currentNum, joined);
      }
    }
  };

  for (const line of lines) {
    // Match numbered item start: "1." "2." "99." at start of line
    const match = line.match(/^\s*(\d{1,3})\.\s+(\S.{2,})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 300) {
        const rest = match[2];
        // Determine if this item is an answer by its opening text
        const startsAsAnswer =
          /^The correct answer is/i.test(rest) ||
          /^correct answer is/i.test(rest);

        saveCurrentItem();
        currentNum = num;
        currentLines = [line.trim()];
        isAnswer = startsAsAnswer;
        continue;
      }
    }

    if (currentNum !== null) {
      currentLines.push(line);
    }
  }

  saveCurrentItem();
  return { questionsMap, answersMap };
}

function formatBlob(
  chapter: string,
  system: string,
  subject: string,
  questionText: string,
  answerText: string
): string {
  return `[CHAPTER: ${chapter} | SYSTEM: ${system} | SUBJECT: ${subject}]

${questionText.trim()}

ANSWER EXPLANATION:
${answerText.trim()}`;
}

async function main() {
  console.log("Reading PDF...");
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: pdfBuffer });

  const allQuestions: ParsedQuestion[] = [];

  for (const chapter of CHAPTER_PAGE_RANGES) {
    const { name, startPage, endPage } = chapter;
    const mapping = CHAPTER_MAP[name] ?? { system: "Mixed", subject: "Mixed" };

    console.log(`\nProcessing: ${name} (pages ${startPage}-${endPage})...`);

    const pages: number[] = [];
    for (let p = startPage; p <= endPage; p++) pages.push(p);

    let result: { text: string };
    try {
      result = await parser.getText({ partial: pages });
    } catch (err) {
      console.log(`  ERROR: ${err}`);
      continue;
    }

    const { questionsMap, answersMap } = parseQAndA(result.text);
    console.log(`  Found ${questionsMap.size} questions, ${answersMap.size} answers`);

    if (questionsMap.size === 0 || answersMap.size === 0) {
      console.log(`  WARNING: Empty maps — skipping`);
      continue;
    }

    let paired = 0;
    let missingAnswer = 0;

    for (const [num, questionText] of questionsMap) {
      const answerText = answersMap.get(num);
      if (!answerText) {
        missingAnswer++;
        continue;
      }

      const blob = formatBlob(name, mapping.system, mapping.subject, questionText, answerText);
      const hasImage =
        blob.includes("Reproduced, with permission") ||
        blob.includes("figure below") ||
        blob.includes("shown in the image") ||
        blob.includes("pedigree") ||
        blob.includes("image below");

      allQuestions.push({
        blob,
        chapter: name,
        system: mapping.system,
        subject: mapping.subject,
        hasImage,
        questionNumber: num,
      });
      paired++;
    }

    if (missingAnswer > 0) {
      console.log(`  Missing answers for ${missingAnswer} questions — expand page range`);
    }
    console.log(`  Paired: ${paired}`);
  }

  await parser.destroy();

  console.log(`\n\nTotal parsed: ${allQuestions.length} questions`);
  console.log(`With images/tables: ${allQuestions.filter((q) => q.hasImage).length}`);

  // Sort by chapter order + question number
  allQuestions.sort((a, b) => {
    const aIdx = CHAPTER_PAGE_RANGES.findIndex((c) => c.name === a.chapter);
    const bIdx = CHAPTER_PAGE_RANGES.findIndex((c) => c.name === b.chapter);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.questionNumber - b.questionNumber;
  });

  // Deduplicate by (chapter, questionNumber)
  const seen = new Set<string>();
  const deduped = allQuestions.filter((q) => {
    const key = `${q.chapter}-${q.questionNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`After dedup: ${deduped.length}`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2));
  console.log(`\nOutput: ${OUTPUT_PATH}`);

  // Show samples
  if (deduped.length > 0) {
    const sample = deduped.find((q) => q.chapter === "Behavioral Science" && q.questionNumber === 1);
    if (sample) {
      console.log("\n--- SAMPLE Q1 (Behavioral Science) ---");
      console.log(sample.blob.slice(0, 800));
    }
    const ansSample = deduped.find((q) => q.chapter === "Behavioral Science" && q.questionNumber === 2);
    if (ansSample) {
      console.log("\n--- SAMPLE Q2 answer section ---");
      const idx = ansSample.blob.indexOf("ANSWER EXPLANATION:");
      console.log(ansSample.blob.slice(idx, idx + 500));
    }
  }
}

main().catch(console.error);
