// One-off: upsert data/classified-questions.jsonl into the `questions` table.
// Run after applying supabase/migrations/20260721200000_create_questions.sql.
// Usage: node scripts/migrate-questions-to-supabase.mjs
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'classified-questions.jsonl'), 'utf8');
const byId = new Map();
for (const line of raw.split('\n').filter(Boolean)) {
  const q = JSON.parse(line);
  if (!q.options?.length) continue;
  byId.set(q.textHash, {
    id: q.textHash,
    text: q.text,
    correct_answer: q.correctAnswer,
    options: q.options,
    explanation: q.explanation,
    subject: q.subject,
    system: q.system,
    difficulty: q.difficulty,
  });
}
const rows = [...byId.values()];

const BATCH = 200;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id' });
  if (error) throw error;
  console.log(`upserted ${i + batch.length}/${rows.length}`);
}

console.log('done');
