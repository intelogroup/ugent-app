import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';

const BATCH_SIZE = 5;    // concurrent requests
const BLOB_FILE = path.join(process.cwd(), 'data', 'medicospira-blobs.jsonl');
const OUT_FILE = path.join(process.cwd(), 'data', 'medicospira-enriched.jsonl');

const EXTRACTION_PROMPT = `You are a world-class medical educator extracting high-leverage intelligence from USMLE questions.

You must return valid JSON with these fields — no other text:
{
  "questionText": "full question text",
  "correctAnswer": "the correct answer letter (A, B, C, D, E, F, or G)",
  "options": [{"text": "option text with letter prefix like 'A. option text'", "isCorrect": true/false}],
  "explanation": "full explanation",
  "educationalObjective": "summary learning point",
  "subject": "medical subject (e.g., Neurology, Cardiology)",
  "system": "body system (e.g., Nervous System, Cardiovascular)",
  "diseaseName": "the disease, pathogen, drug, concept, principle, or syndrome being tested",
  "topicType": "one of: DISEASE, PATHOGEN, PRINCIPLE, DRUG, SYNDROME, CONCEPT",
  "mechanism": "core pathophysiology or mechanism",
  "highLeverageClues": ["clue1", "clue2", ...],
  "discriminators": [{"distractor": "wrong answer", "ruleOutFact": "why it's wrong"}],
  "nextBestStep": "next diagnostic or management step",
  "clinicalContext": {"age": "", "gender": "", "physiologyState": "", "onsetPattern": ""},
  "keySymptoms": ["symptom1", ...],
  "prerequisites": ["prerequisite1", ...],
  "tableData": []
}

topicType classification:
- PATHOGEN: question is about a specific microorganism (bacteria, virus, fungus, parasite). diseaseName = organism name.
- PRINCIPLE: physiological principle, physical law, mechanism. diseaseName = the principle.
- DRUG: drug or drug class (mechanism, side effects, interactions). diseaseName = the drug.
- CONCEPT: biostatistics, epidemiology, ethics, study design as PRIMARY focus. diseaseName = the concept.
  IMPORTANT: Do NOT use CONCEPT just because question mentions "researchers", "study", "trial". If it asks about diagnosis/treatment/pathophysiology of a disease, use DISEASE.
- SYNDROME: recognizable syndrome (collection of signs/symptoms). diseaseName = syndrome name.
- DISEASE: a specific disease or diagnosis (default). diseaseName = the disease.

NEVER return empty or null diseaseName and topicType.

Analyze the question using this process:
1. Extract demographics, cardinal clues, and symptomatic noise from the stem.
2. Identify high-yield discriminators (distractors that are strategic traps, not filler).
3. Derive mechanism, prerequisites, and knowledge dependencies.
4. Classify the topicType and extract the diseaseName.`;

async function callLLM(blobText, useOpenRouter = false) {
  const url = useOpenRouter ? OR_URL : DEEPSEEK_URL;
  const model = useOpenRouter ? OR_MODEL : DEEPSEEK_MODEL;
  const key = useOpenRouter ? OR_KEY : DEEPSEEK_KEY;

  const body = {
    model,
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: blobText },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 4096,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  };
  if (useOpenRouter) {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'ugent-app';
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${useOpenRouter ? 'OpenRouter' : 'DeepSeek'} ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty response from ${useOpenRouter ? 'OpenRouter' : 'DeepSeek'}`);

  const raw = JSON.parse(content);

  // Normalize: map any field casing variations to expected schema
  const normalized = {
    questionText: raw.questionText || raw.questiontext || raw.question_text || raw.text || '',
    correctAnswer: raw.correctAnswer || raw.correctanswer || raw.correct_answer || '',
    options: raw.options || raw.Options || [],
    explanation: raw.explanation || raw.Explanation || '',
    educationalObjective: raw.educationalObjective || raw.educationalobjective || raw.educational_objective || raw.objective || '',
    subject: raw.subject || raw.Subject || '',
    system: raw.system || raw.System || '',
    diseaseName: raw.diseaseName || raw.diseasename || raw.disease_name || raw.Disease || '',
    topicType: raw.topicType || raw.topictype || raw.topic_type || raw.TopicType || '',
    mechanism: raw.mechanism || raw.Mechanism || '',
    highLeverageClues: raw.highLeverageClues || raw.highleverageclues || raw.clues || raw.highLeverageClue || [],
    discriminators: raw.discriminators || raw.Discriminators || [],
    nextBestStep: raw.nextBestStep || raw.nextbeststep || raw.next_best_step || '',
    clinicalContext: raw.clinicalContext || raw.clinicalcontext || raw.clinical_context || {},
    keySymptoms: raw.keySymptoms || raw.keysymptoms || raw.key_symptoms || raw.symptoms || [],
    prerequisites: raw.prerequisites || raw.Prerequisites || [],
    tableData: raw.tableData || raw.tabledata || [],
  };

  // Normalize topicType to valid enum values
  const validTopicTypes = ["DISEASE", "PATHOGEN", "PRINCIPLE", "DRUG", "SYNDROME", "CONCEPT"];
  if (normalized.topicType) {
    const upper = normalized.topicType.toUpperCase().trim();
    normalized.topicType = validTopicTypes.includes(upper) ? upper : "CONCEPT";
  }

  return normalized;
}

async function callDeepSeek(blobText) {
  return callLLM(blobText, false);
}

async function callOpenRouter(blobText) {
  return callLLM(blobText, true);
}

async function enrichWithFallback(blobText) {
  // Try DeepSeek
  try {
    return await callDeepSeek(blobText);
  } catch (err) {
    if (!err.message.includes('401') && !err.message.includes('invalid') && !err.message.includes('Authentication')) {
      throw err; // not an auth error, don't fall back
    }
    if (!OR_KEY) throw err;
    console.log(`  \u2192 DeepSeek failed, trying OpenRouter...`);
  }

  // OpenRouter with retry on 429
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await callOpenRouter(blobText);
    } catch (err2) {
      const is429 = err2.message.includes('429') || err2.message.includes('Rate limit');
      if (!is429) throw err2;
      if (attempt === 4) throw err2; // give up after 5 attempts
      const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      console.log(`  \u231B rate limited, retrying in ${Math.round(delay/1000)}s (attempt ${attempt+2}/5)...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function processBatch(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const blobText = item.text || item.qus_txt || '';
      const enriched = await enrichWithFallback(blobText);
      // Normalize disease name casing
      if (enriched.diseaseName) {
        enriched.diseaseName = enriched.diseaseName.trim().replace(/\b\w/g, c => c.toUpperCase());
      }
      // Compute textHash
      const normalized = blobText.toLowerCase().replace(/\s+/g, " ").trim();
      const textHash = createHash("sha256").update(normalized).digest("hex");
      
      console.log(`  ✓ ${enriched.diseaseName || '(no disease)'} | ${enriched.topicType || '-'}`);
      return {
        ...item,
        enriched,
        textHash,
        enrichedAt: Date.now(),
      };
    } catch (err) {
      console.log(`  ✗ Error: ${err.message.slice(0, 100)}`);
      return {
        ...item,
        enriched: null,
        textHash: null,
        error: err.message,
      };
    }
  }));
}

async function main() {
  if (!DEEPSEEK_KEY && !OR_KEY) {
    console.error('Neither DEEPSEEK_API_KEY nor OPENROUTER_API_KEY found in .env.local');
    process.exit(1);
  }
  if (!DEEPSEEK_KEY) console.log('[WARN] DEEPSEEK_API_KEY missing, will use OpenRouter directly');

  // Read existing enriched to resume if interrupted
  const seenHashes = new Set();
  if (fs.existsSync(OUT_FILE)) {
    const lines = fs.readFileSync(OUT_FILE, 'utf-8').trim().split('\n');
    for (const line of lines) {
      if (line) {
        try {
          const existing = JSON.parse(line);
          if (existing.textHash) seenHashes.add(existing.textHash);
        } catch {}
      }
    }
    console.log(`[RESUME] ${seenHashes.size} already enriched`);
  }

  const blobLines = fs.readFileSync(BLOB_FILE, 'utf-8').trim().split('\n');
  const blobs = blobLines.filter(Boolean).map(line => JSON.parse(line));
  console.log(`[LOAD] ${blobs.length} blobs`);

  const toProcess = blobs.filter(b => {
    const blobText = b.text || b.qus_txt || '';
    const normalized = blobText.toLowerCase().replace(/\s+/g, " ").trim();
    const hash = createHash("sha256").update(normalized).digest("hex");
    return !seenHashes.has(hash);
  });
  console.log(`[TODO] ${toProcess.length} remaining after resume check`);

  // Process in batches
  let enriched = [];
  if (fs.existsSync(OUT_FILE)) {
    enriched = fs.readFileSync(OUT_FILE, 'utf-8').trim().split('\n')
      .filter(Boolean).map(line => JSON.parse(line));
  }

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    console.log(`\n[BATCH ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(toProcess.length/BATCH_SIZE)}] (${i+1}-${Math.min(i+BATCH_SIZE, toProcess.length)} of ${toProcess.length})`);

    const results = await processBatch(batch);
    enriched.push(...results);

    // Append to output file
    const outLines = results.map(r => JSON.stringify(r));
    fs.appendFileSync(OUT_FILE, outLines.join('\n') + '\n');
    console.log(`[SAVED] ${enriched.length} total`);
  }

  // Summary
  const withDisease = enriched.filter(r => r.enriched?.diseaseName && r.enriched.diseaseName !== 'N/A' && r.enriched.diseaseName !== 'None');
  const withTopic = enriched.filter(r => r.enriched?.topicType);
  const errors = enriched.filter(r => r.error);
  console.log(`\n=== DONE ===`);
  console.log(`Total processed: ${enriched.length}`);
  console.log(`With diseaseName: ${withDisease.length}`);
  console.log(`With topicType: ${withTopic.length}`);
  console.log(`Errors: ${errors.length}`);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
