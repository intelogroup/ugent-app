// One-off: upsert data/medicospira-enriched.jsonl into the `enriched_questions` table.
// Run after applying supabase/migrations/20260722120000_create_enriched_questions.sql.
// Usage: node scripts/migrate-enriched-to-supabase.mjs
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'medicospira-enriched.jsonl'), 'utf8');
const byId = new Map();
for (const line of raw.split('\n').filter(Boolean)) {
  const q = JSON.parse(line);
  const e = q.enriched;
  if (!e || !q.textHash) continue;
  byId.set(q.textHash, {
    id: q.textHash,
    question_text: e.questionText || q.text,
    correct_answer: e.correctAnswer,
    options: e.options,
    explanation: e.explanation,
    educational_objective: e.educationalObjective,
    subject: e.subject,
    system: e.system,
    disease_name: e.diseaseName,
    topic_type: e.topicType,
    mechanism: e.mechanism,
    high_leverage_clues: e.highLeverageClues,
    discriminators: e.discriminators,
    next_best_step: e.nextBestStep,
    clinical_context: e.clinicalContext,
    key_symptoms: e.keySymptoms,
    prerequisites: e.prerequisites,
    table_data: e.tableData,
  });
}
const rows = [...byId.values()];

const BATCH = 200;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('enriched_questions').upsert(batch, { onConflict: 'id' });
  if (error) throw error;
  console.log(`upserted ${i + batch.length}/${rows.length}`);
}

console.log('done');
