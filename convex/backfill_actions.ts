// @ts-nocheck
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { OpenAI } from "openai";

const BATCH_SIZE = 25;

const CLASSIFICATION_PROMPT = `You are a medical education classification system. Your task is to classify USMLE-style medical questions into predefined hierarchies.

For each question, you will receive:
- questionText: the first 300 characters of the clinical vignette
- diseaseName: the primary disease/condition tested (already identified)
- topicType: the question type (DISEASE, PATHOGEN, PRINCIPLE, DRUG, SYNDROME, CONCEPT)
- mechanism: core pathophysiology
- keySymptoms: top symptoms
- clinicalAge: patient age
- clinicalGender: patient gender

Available SYSTEMS:
{{SYSTEMS}}

Available SUBJECTS:
{{SUBJECTS}}

EXISTING TOPICS (already mapped to systems):
{{TOPICS}}

Your tasks:

1. **Classify the system**: Which organ system does this disease primarily belong to? Choose ONE from the available systems list above. Map carefully:

   Standard mappings:
   - Diabetes → Endocrine
   - MI / Heart Failure / Aortic stenosis → Cardiovascular
   - Pneumonia / COPD / Asthma → Respiratory
   - Hepatitis / Cirrhosis / Pancreatitis → Gastrointestinal
   - Stroke / Seizure / Meningitis → Neurology
   - Depression / Schizophrenia / Anxiety → Psychiatry
   - CKD / AKI / Nephrotic syndrome → Renal
   - Osteoarthritis / Fracture / Gout → Musculoskeletal
   - Anemia / Leukemia / Lymphoma → Hematology & Oncology
   - HIV / Sepsis / Endocarditis → Infectious Disease
   - Pregnancy / Menopause / PCOS → Reproductive
   - Lupus / RA / Anaphylaxis → Immunology
   - Thyroid / Adrenal / Pituitary → Endocrine

   EDGE CASE mappings (for conditions that span multiple systems or are not single-organ):
   - Skin/Dermatology (acne, psoriasis, melanoma, basal cell carcinoma, atopic dermatitis, keloids, xeroderma pigmentosum, pityriasis, hypergranulation) → "Hematology & Oncology" if neoplastic, otherwise "Immunology"
   - Eye/Ophthalmology (cataracts, glaucoma, retinopathy, diabetic retinopathy) → "Neurology"
   - Ear conditions (cholesteatoma) → "Neurology"
   - Genetics/Inherited disorders (BRCA, Hardy-Weinberg, pleiotropy, DNA repair) → "Hematology & Oncology"
   - Biochemistry/Cell biology concepts (tRNA, mRNA, chromatin, DNA replication, wobble hypothesis, citrate, mitotic control) → "Endocrine"
   - Biostatistics/Epidemiology concepts (randomization, prevalence, lead-time bias, negative skew, statistical power, study design) → "Neurology"
   - Pharmacology principles (pharmacokinetics, drug metabolism, dose-response, anesthesia) → "Cardiovascular"
   - Urinary/Bladder disorders (urge incontinence) → "Renal"
   - Metabolic disorders (homocystinuria, urea cycle disorders, OTC deficiency) → "Endocrine"

2. **Classify the subject**: Which basic science discipline does this question PRIMARILY test? Choose ONE from the available subjects list above. Rules:
   - PATHOGEN questions → "Microbiology"
   - DRUG questions (side effects, interactions, mechanism of action) → "Pharmacology"
   - Biostats/epidemiology/study design questions → "Biostatistics & Epidemiology"
   - Psychiatric diseases/behavioral questions → "Behavioral Science"
   - Questions about disease mechanism, presentation, diagnosis → "Pathology"
   - Questions about normal body function, physiology → "Physiology"
   - Questions about anatomy, imaging → "Anatomy"
   - Questions about metabolic pathways, lab values, genetics → "Biochemistry"
   - Skin/Dermatology diseases → "Pathology"
   - Eye/Ophthalmology diseases → "Pathology"

3. **Classify the topic**: The specific disease/condition/concept name. Prefer EXACT match from existing topics list. If no match exists, provide a clean, concise title-case topic name (e.g., "Acute Pancreatitis", not "Acute pancreatitis diagnosed via CT scan").

4. **Assign difficulty**:
   - EASY: Classic textbook presentation, single disease, obvious buzzwords, no close mimics
   - MEDIUM: Requires differential diagnosis, multi-step reasoning, moderate complexity
   - HARD: Atypical presentation, rare disease, multi-system involvement, very close mimics, complex pathophysiology

Return a JSON object with a "classifications" array. Each entry must have: index, questionId, systemName, subjectName, topicName, difficulty.`;

export const classifyQuestions = action({
  args: { batchSize: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? BATCH_SIZE;
    const dryRun = args.dryRun ?? false;

    const { candidates, systems, subjects, existingTopics } = await ctx.runQuery(
      internal.backfill.getBackfillCandidates,
      { limit: 2500 }
    );

    console.log(`Found ${candidates.length} candidates needing backfill`);

    if (candidates.length === 0) {
      return { processed: 0, message: "No candidates need backfill" };
    }

    // Log what's missing
    const missingBreakdown = { systemId: 0, topicId: 0, subjectId: 0, difficulty: 0 };
    for (const c of candidates) {
      if (!c.hasSystemId) missingBreakdown.systemId++;
      if (!c.hasTopicId) missingBreakdown.topicId++;
      if (!c.hasSubjectId) missingBreakdown.subjectId++;
      if (!c.hasDifficulty) missingBreakdown.difficulty++;
    }
    console.log(`Missing breakdown:`, missingBreakdown);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not found");

    const openai = new OpenAI({ apiKey });

    const systemsList = systems.map(s => `  - ${s.name}`).join("\n");
    const subjectsList = subjects.map(s => `  - ${s.name}`).join("\n");
    // Only show a representative sample of topics to avoid token bloat (798 topics is ~15k tokens)
    const topicsSample = existingTopics.slice(0, 300).map(t => `  - ${t.name} (system: ${systems.find(s => s.id === t.systemId)?.name ?? "?"})`).join("\n");
    const topicsNote = existingTopics.length > 300
      ? `\n(Showing 300 of ${existingTopics.length} existing topics. If the disease/concept you need is not in this list, provide a clean topic name and it will be created.)`
      : "";

    const basePrompt = CLASSIFICATION_PROMPT
      .replace("{{SYSTEMS}}", systemsList)
      .replace("{{SUBJECTS}}", subjectsList)
      .replace("{{TOPICS}}", topicsSample + topicsNote);

    let totalProcessed = 0;
    let totalClassified = 0;
    let totalErrors = 0;

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(candidates.length / batchSize);

      console.log(`Batch ${batchNum}/${totalBatches}: ${batch.length} questions...`);

      const questionsJson = batch.map((c, idx) => ({
        index: idx,
        questionId: c.questionId,
        questionText: c.text,
        diseaseName: c.diseaseName,
        topicType: c.topicType,
        mechanism: c.mechanism,
        keySymptoms: c.keySymptoms,
        clinicalAge: c.clinicalAge,
        clinicalGender: c.clinicalGender,
      }));

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: basePrompt },
            {
              role: "user",
              content: `Classify these ${questionsJson.length} medical questions:\n\n${JSON.stringify(questionsJson, null, 2)}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "classifications",
              schema: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        questionId: { type: "string" },
                        systemName: { type: "string" },
                        subjectName: { type: "string" },
                        topicName: { type: "string" },
                        difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
                      },
                      required: ["index", "questionId", "systemName", "subjectName", "topicName", "difficulty"],
                    },
                  },
                },
                required: ["classifications"],
              },
            } as any,
          },
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Empty response from OpenAI");

        const result = JSON.parse(content);
        const classifications = result.classifications ?? [];

        if (!dryRun) {
          const saved = await ctx.runMutation(internal.backfill.saveClassifications, {
            classifications: classifications.map((c: any) => ({
              questionId: c.questionId,
              systemName: c.systemName,
              subjectName: c.subjectName,
              topicName: c.topicName,
              difficulty: c.difficulty,
            })),
            systemMap: systems.map(s => ({ id: s.id, name: s.name })),
            subjectMap: subjects.map(s => ({ id: s.id, name: s.name })),
            existingTopicMap: existingTopics.map(t => ({ id: t.id, name: t.name, systemId: t.systemId })),
          });

          totalClassified += saved.saved;
          totalErrors += saved.errors;
          console.log(`  Saved ${saved.saved}, errors: ${saved.errors}, topics created: ${saved.topicsCreated}`);
        } else {
          console.log(`  DRY RUN: ${classifications.length} classifications generated`);
          for (const c of classifications.slice(0, 3)) {
            console.log(`    ${c.diseaseName ?? "?"} → ${c.systemName}/${c.topicName}/${c.subjectName} [${c.difficulty}]`);
          }
        }

        totalProcessed += batch.length;
      } catch (error) {
        console.error(`Batch ${batchNum} failed: ${error}`);
        totalErrors += batch.length;
      }

      if (i + batchSize < candidates.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return {
      totalCandidates: candidates.length,
      processed: totalProcessed,
      classified: totalClassified,
      errors: totalErrors,
      dryRun,
    };
  },
});

// --- Public entry point ---

export const runFullBackfill = action({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    const classifyResult = await ctx.runAction(internal.backfill_actions.classifyQuestions, {
      batchSize: BATCH_SIZE,
      dryRun,
    });

    if (!dryRun) {
      const recalcResult = await ctx.runMutation(internal.backfill.recalculateQuestionCounts, {});
      return { ...classifyResult, recalculation: recalcResult };
    }

    return classifyResult;
  },
});
