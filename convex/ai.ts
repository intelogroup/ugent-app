"use node";
// @ts-nocheck
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { OpenAI } from "openai";
import { createHash } from "crypto";

function hashBlob(blob: string): string {
  // Normalize: lowercase + collapse whitespace, then SHA-256
  const normalized = blob.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

const EXTRACTION_PROMPT = `
You are a world-class medical educator and researcher. Your goal is to extract high-leverage medical intelligence from USMLE-style questions and explanations.

Perform a "Triple-Pass" distillation:

Pass 1: Clinical Fact Extraction (The "Stem" Pass)
- Extract demographics (Age, Gender), BMI, and Physiology state (e.g., "2nd Trimester Pregnancy").
- Identify the temporal pattern (Onset speed and duration).
- Identify "Cardinal Clues" (Pathognomonic terms, unique identifiers) vs "Symptomatic Noise".

Pass 2: Discriminator Analysis (The "Strategic Trap" Pass)
- Identify HIGH-YIELD STRATEGIC TRAPS: These are distractors that a student is likely to choose due to a specific clinical confusion (e.g., "Atenolol" for Pheo because it's a beta-blocker, even though it causes unopposed alpha).
- IGNORE NOISE: Do not extract "filler" distractors that are obviously wrong or physiologically unrelated (e.g., anatomy distractors like "Esophagus" for an endocrine question).
- For each Strategic Trap:
  - Extract the Primary Discriminator from the explanation.
  - Identify the specific clinical fact or logic that rules out the distractor.

CRITICAL: topicType Classification Decision Tree
Before naming the diseaseName, classify the question's PRIMARY FOCUS using this decision tree:

1. Is the question about a specific MICROORGANISM (bacteria, virus, fungus, parasite)?
   → topicType: "PATHOGEN"
   → diseaseName: the organism name (e.g., "Staphylococcus aureus", "Influenza virus")
   EXAMPLE: "A researcher studies a gram-negative diplococcus that ferments maltose..."
   CORRECT: topicType="PATHOGEN", diseaseName="Neisseria meningitidis"

2. Is the question about a PHYSIOLOGICAL PRINCIPLE, physical law, or mechanism of body function?
   → topicType: "PRINCIPLE"
   → diseaseName: the principle name (e.g., "Starling forces", "Countercurrent multiplication", "Frank-Starling mechanism")
   EXAMPLE: "Investigators measure pressure changes across the glomerular capillary wall..."
   CORRECT: topicType="PRINCIPLE", diseaseName="Glomerular filtration forces"
   WRONG: topicType="DISEASE", diseaseName="Glomerular disease"

3. Is the question about a DRUG or drug class (mechanism, side effects, interactions)?
   → topicType: "DRUG"
   → diseaseName: the drug or class (e.g., "Beta blockers", "ACE inhibitors")
   EXAMPLE: "A 65-year-old woman starts a new antihypertensive and develops cough..."
   CORRECT: topicType="DRUG", diseaseName="ACE inhibitors"

4. Is the question about BIOSTATS, EPIDEMIOLOGY, ETHICS, or STUDY DESIGN as the PRIMARY FOCUS?
   → topicType: "CONCEPT"
   → diseaseName: the concept (e.g., "Sensitivity", "Confounding bias", "Number needed to treat")
   EXAMPLE: "A new screening test has 95% sensitivity and 80% specificity..."
   CORRECT: topicType="CONCEPT", diseaseName="Positive predictive value"
   CRITICAL: Do NOT use CONCEPT just because the question mentions "researchers", "study", "trial", or "investigators". 
   If the question asks about diagnosis, treatment, or pathophysiology of a specific disease, use DISEASE or SYNDROME — even if it's framed as a research study.
   WRONG: topicType="CONCEPT" for "A 45-year-old woman participates in a clinical trial for breast cancer..." — this is about breast cancer (DISEASE).
   WRONG: topicType="CONCEPT" for "Researchers study the mechanism of myocardial infarction..." — this is about MI (DISEASE or PRINCIPLE).

5. Is the question about a recognizable SYNDROME (collection of signs/symptoms without a single etiology)?
   → topicType: "SYNDROME"
   → diseaseName: the syndrome (e.g., "Cushing syndrome", "Nephrotic syndrome", "SIADH")

6. Otherwise, it is a specific DISEASE or diagnosis:
   → topicType: "DISEASE"
   → diseaseName: the disease (e.g., "Tuberculosis", "Acute myocardial infarction")

NEVER return an empty diseaseName. If no specific disease, use the primary concept being tested.

Pass 3: Systematic Synthesis (The "Knowledge" Pass)
- Mechanism: Core pathophysiology (The "Why").
- Dependency Mapping: Prerequisites needed to understand the question.
- Noise Filtering: Ignore pedagogical filler.

Return the data according to the provided JSON schema.
`;

export const extractIntelligence = action({
  args: {
    ingestionId: v.id("ingestions"),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const { ingestionId, rawText } = args;

    // 1. Split text by delimiter
    const questionBlobs = rawText
      .split("---NEXT-QUESTION---")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    const totalCount = questionBlobs.length;

    // 2. Update status and totalCount
    await ctx.runMutation(api.ingest.updateIngestionStatus, {
      ingestionId,
      status: "processing",
      totalCount,
    });

    // 3. Process based on count
    let skippedCount = 0;
    let processedCount = 0;
    let failedCount = 0;

    if (totalCount <= 5) {
      for (const blob of questionBlobs) {
        try {
          const result = await ctx.runAction(internal.ai.extractSingleQuestion, { ingestionId, blob });
          if (result?.skipped) skippedCount++; else processedCount++;
        } catch (error) {
          console.error(`Failed to process question: ${error}`);
          failedCount++;
        }
      }
    } else {
      for (const blob of questionBlobs) {
        await ctx.scheduler.runAfter(0, internal.ai.extractSingleQuestion, { ingestionId, blob });
      }
    }

    // For small batches (sequential), set final status based on outcome
    // "skipped"   = all questions were duplicates (no new content, no errors)
    // "failed"    = at least one new question errored (new questions lost)
    // "completed" = at least one new question saved successfully
    if (totalCount <= 5) {
      const finalStatus = failedCount > 0 && processedCount === 0
        ? "failed"
        : processedCount === 0
        ? "skipped"
        : "completed";
      await ctx.runMutation(api.ingest.updateIngestionStatus, {
        ingestionId,
        status: finalStatus,
        skippedCount,
      });
    }

    return { totalCount, skippedCount, processedCount, failedCount };
  },
});

function refineTopicType(blob: string, topicType: string, diseaseName: string): string {
  const lower = blob.toLowerCase();
  const lowerName = diseaseName.toLowerCase();

  // Clinical states that should never be reclassified as PRINCIPLE
  const clinicalStateWords = [
    "overdose", "toxicity", "poisoning", "hyperthyroidism", "hypothyroidism",
    "hypercalcemia", "hypocalcemia", "hyperkalemia", "hypokalemia",
    "injury", "fracture", "hemorrhage", "infarction", "ischemia",
    "deficiency", "cancer", "carcinoma", "sarcoma", "tumor", "neoplasm",
    "infection", "sepsis", "abscess", "failure", "decompensation",
    "syndrome", "symptom",
  ];
  const isClinicalState = clinicalStateWords.some(w => lowerName.includes(w));

  // Disease-defining terms that strongly indicate a disease (not concept/principle)
  const diseaseDefiningWords = [
    "deficiency", "disease", "disorder", "syndrome", "cancer", "carcinoma",
    "sarcoma", "tumor", "neoplasm", "adenoma", "lymphoma", "leukemia",
    "melanoma", "glioma", "infarction", "infection", "pneumonia",
    "arthritis", "lupus", "sclerosis", "scleroderma", "myositis",
    "vasculitis", "nephritis", "hepatitis", "pancreatitis", "colitis",
    "gastritis", "meningitis", "encephalitis", "endocarditis",
    "osteomyelitis", "cellulitis", "abscess", "failure", "stenosis",
    "regurgitation", "prolapse", "aneurysm", "thrombosis", "embolism",
    "torsion", "intussusception", "volvulus", "perforation",
    "obstruction", "hemorrhage", "hematoma", "fracture",
    "hyperplasia", "metaplasia", "dysplasia", "atrophy", "hypertrophy",
    "hypoplasia", "aplasia", "agenesis",
  ];

  // Terms that indicate this is NOT a pathogen-focused question (even if bacteria are mentioned)
  const notPathogenWords = [
    "syndrome", "paraneoplastic", "abscess", "agammaglobulinemia",
    "immunodeficiency", "autoimmune", "hypersensitivity", "allergic",
    "torsion", "transfusion", "reaction", "event",
    "non-infectious", "chemical", "toxic",
    "idiopathic", "congenital", "hereditary", "inherited", "genetic",
    "metabolic", "endocrine", "neoplastic", "degenerative", "traumatic",
    "iatrogenic", "psychiatric", "inflammatory",
  ];
  const isNotPathogen = notPathogenWords.some(w => lowerName.includes(w));
  const hasDiseaseDefiningTerm = diseaseDefiningWords.some(w => lowerName.includes(w));

  const pathogenKeywords = [
    "bacterium", "bacteria", "virus", "viral", "fungus", "fungal", "parasite", "parasitic",
    "pathogen", "pathogenic", "organism", "microorganism", "protozoan", "virulence",
    "capsule", "endotoxin", "exotoxin", "gram-positive", "gram-negative",
    "cocci", "bacilli", "spore", "flagella", "pili", "biofilm",
    "staphylococcus", "streptococcus", "pneumoniae", "escherichia", "pseudomonas",
    "clostridium", "mycobacterium", "salmonella", "shigella", "vibrio",
    "which organism", "which pathogen", "most likely causative agent",
    "ebv", "hiv", "hpv", "cmv", "hsv", "rsv", "influenza virus",
  ];
  const principleKeywords = [
    "equation", "starling", "fick", "laplace", "poiseuille",
    "henderson-hasselbalch", "nernst", "goldman",
    "researchers are studying", "scientists are investigating",
    "in an experiment", "experimental",
    "which of the following explains", "what is the mechanism",
    "cardiac output", "stroke volume", "starling curve",
    "conductance", "conductivity", "action potential", "membrane potential",
    "resting potential", "equilibrium potential",
    "diffusion", "osmosis", "osmotic", "concentration gradient",
    "partial pressure", "compliance", "clearance",
  ];
  const conceptKeywords = [
    "sensitivity", "specificity", "ppv", "npv", "odds ratio",
    "relative risk", "p value", "confidence interval", "bias", "confounding",
    "type i error", "type ii error", "power", "study design", "cohort",
    "case-control", "rct", "randomized", "prevalence", "incidence",
    "mortality rate", "attributable risk", "number needed to treat",
    "likelihood ratio", "receiver operating", "roc",
    "epidemiologic", "epidemiology",
  ];

  const countHits = (keywords: string[]) =>
    keywords.filter(kw => lower.includes(kw)).length;

  const pathogenHits = countHits(pathogenKeywords);
  const principleHits = countHits(principleKeywords);
  const conceptHits = countHits(conceptKeywords);

  // Downgrade CONCEPT → DISEASE when disease name is clearly clinical
  if (topicType === "CONCEPT") {
    const strongDiseaseIndicator = hasDiseaseDefiningTerm || isClinicalState;
    const weakConcept = conceptHits < 3;
    if (strongDiseaseIndicator && weakConcept) return "DISEASE";
  }

  // Downgrade PATHOGEN → DISEASE when the condition is clearly not an infection topic
  if (topicType === "PATHOGEN") {
    if (hasDiseaseDefiningTerm && isNotPathogen && pathogenHits < 4) return "DISEASE";
  }

  // Only override if currently DISEASE or SYNDROME (mini's blind spots)
  if (topicType === "DISEASE" || topicType === "SYNDROME") {
    if (pathogenHits >= 2 && diseaseName.length < 40 && !isNotPathogen) return "PATHOGEN";
    if (principleHits >= 3 && !isClinicalState) return "PRINCIPLE";
  }
  if (topicType === "DISEASE" || topicType === "SYNDROME") {
    if (conceptHits >= 2) return "CONCEPT";
  }

  return topicType;
}

export const extractSingleQuestion = internalAction({
  args: {
    ingestionId: v.id("ingestions"),
    blob: v.string(),
  },
  handler: async (ctx, args) => {
    const { ingestionId, blob } = args;

    // Parse the ground-truth answer from the raw blob (regex, not AI deduction)
    const rawAnswerMatch = blob.match(/Correct Answer:\s*([A-F])/);
    const groundTruthAnswer = rawAnswerMatch ? rawAnswerMatch[1] : null;

    // Fast-path dedup: skip OpenAI call entirely if already processed
    const textHash = hashBlob(blob);
    const isDuplicate = await ctx.runQuery(api.ingest.isQuestionDuplicate, { textHash });
    if (isDuplicate) {
      console.log(`Skipping duplicate (hash: ${textHash.slice(0, 8)}...) — no OpenAI call made`);
      // Advance ingestion counter so status reflects completion correctly
      const ingestion = await ctx.runQuery(api.ingest.getIngestion, { ingestionId });
      if (ingestion) {
        const newCount = ingestion.processedCount + 1;
        await ctx.runMutation(api.ingest.updateIngestionStatus, {
          ingestionId,
          processedCount: newCount,
          status: newCount >= ingestion.totalCount ? "completed" : "processing",
        });
      }
      return { skipped: true };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment variables");
    }

    const openai = new OpenAI({ apiKey });
    const jsonSchema = {
      type: "object",
      properties: {
        questionText: { type: "string" },
        correctAnswer: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, isCorrect: { type: "boolean" } },
            required: ["text", "isCorrect"],
          },
        },
        explanation: { type: "string" },
        educationalObjective: { type: "string" },
        subject: { type: "string" },
        system: { type: "string" },
        diseaseName: { type: "string" },
        topicType: { type: "string", enum: ["DISEASE", "PATHOGEN", "PRINCIPLE", "DRUG", "SYNDROME", "CONCEPT"] },
        mechanism: { type: "string" },
        highLeverageClues: { type: "array", items: { type: "string" } },
        discriminators: {
          type: "array",
          items: {
            type: "object",
            properties: { distractor: { type: "string" }, ruleOutFact: { type: "string" } },
            required: ["distractor", "ruleOutFact"],
          },
        },
        nextBestStep: { type: "string" },
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
        tableData: { type: "array", items: {} },
      },
      required: [
        "questionText", "correctAnswer", "options", "explanation",
        "educationalObjective", "subject", "system", "diseaseName", "topicType",
        "mechanism", "highLeverageClues", "discriminators", "clinicalContext",
        "keySymptoms", "prerequisites",
      ],
    };

    const MAX_RETRIES = 3;
    const isRetryable = (err: any): boolean => {
      const msg = String(err?.message ?? err);
      // Rate limit, timeout, server overload — worth retrying
      if (msg.includes('429') || msg.includes('rate_limit')) return true;
      if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET')) return true;
      if (msg.includes('503') || msg.includes('500') || msg.includes('server_error')) return true;
      // Bad request, invalid API key, or JSON parse errors — don't retry
      return false;
    };

    let lastError: any;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry ${attempt}/${MAX_RETRIES - 1} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: EXTRACTION_PROMPT },
            { role: "user", content: blob },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "extracted_intelligence",
              schema: jsonSchema as any,
            },
          },
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("AI returned empty response");

        const result = JSON.parse(content);

        // Strip extra fields the AI might hallucinate (different models add different fields)
        const allowedFields = new Set([
          "questionText", "correctAnswer", "options", "explanation",
          "educationalObjective", "subject", "system", "diseaseName", "topicType",
          "mechanism", "highLeverageClues", "discriminators", "nextBestStep",
          "clinicalContext", "keySymptoms", "prerequisites", "tableData",
        ]);
        for (const key of Object.keys(result)) {
          if (!allowedFields.has(key)) delete result[key];
        }

        // Normalize string array fields: OpenAI sometimes returns objects like
        // [{symptom: "..."}, {clue: "..."}] instead of plain string arrays
        const STRING_ARRAY_FIELDS = ["keySymptoms", "highLeverageClues", "prerequisites"];
        for (const field of STRING_ARRAY_FIELDS) {
          const arr = result[field];
          if (!Array.isArray(arr)) { result[field] = []; continue; }
          result[field] = arr.map((item: any) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item !== null) {
              // Extract value from common property names
              return item.symptom || item.clue || item.name || item.text
                || item.topic || item.concept || item.prerequisite
                || Object.values(item).find((v: any) => typeof v === "string" && v.length > 2)
                || JSON.stringify(item);
            }
            return String(item);
          }).filter((s: string) => s.length > 0);
        }

        // Normalize discriminators: ensure each has distractor + ruleOutFact strings
        if (Array.isArray(result.discriminators)) {
          result.discriminators = result.discriminators.map((d: any) => {
            if (typeof d !== "object" || d === null) return { distractor: String(d), ruleOutFact: "" };
            return {
              distractor: typeof d.distractor === "string" ? d.distractor : String(d.distractor ?? d.name ?? ""),
              ruleOutFact: typeof d.ruleOutFact === "string" ? d.ruleOutFact : String(d.ruleOutFact ?? d.fact ?? ""),
            };
          }).filter((d: any) => d.distractor.length > 0);
        }

        // Refine topic type using keyword signals (safety net for edge cases)
        result.topicType = refineTopicType(blob, result.topicType, result.diseaseName);

        // Override correctAnswer and isCorrect flags with ground truth from raw blob
        // The AI sometimes "solves" the question instead of parsing the answer key (~23% error rate)
        if (groundTruthAnswer) {
          result.correctAnswer = groundTruthAnswer;
          if (result.options?.length) {
            result.options = result.options.map((o: any) => ({
              ...o,
              isCorrect: o.text?.trim().startsWith(groundTruthAnswer) ?? false,
            }));
          }
        } else if (!result.correctAnswer) {
          // Fallback: derive from the AI's isCorrect flag (only if no ground truth available)
          const correctOpt = result.options?.find((o: any) => o.isCorrect);
          result.correctAnswer = correctOpt?.text?.slice(0, 1) ?? "";
        }

        // Normalize disease name casing
        result.diseaseName = result.diseaseName?.trim().replace(/\b\w/g, (c: string) => c.toUpperCase());

        // Save the results
        await ctx.runMutation(api.ingest.saveExtractedIntelligence, {
          ingestionId,
          data: { ...result, textHash },
        });

        return { skipped: false };
      } catch (error) {
        lastError = error;
        const msg = String(error?.message ?? error);
        console.error(`extractSingleQuestion attempt ${attempt + 1}: ${msg}`);

        if (attempt < MAX_RETRIES - 1 && isRetryable(error)) {
          continue;
        }
        break;
      }
    }

    // Store the error on the ingestion record for visibility
    const errMsg = String(lastError?.message ?? lastError);
    await ctx.runMutation(api.ingest.updateIngestionStatus, {
      ingestionId,
      status: "failed",
      error: errMsg.slice(0, 500),
    });

    throw lastError;
  },
});
