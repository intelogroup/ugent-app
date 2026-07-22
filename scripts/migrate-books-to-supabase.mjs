// One-off: upsert data/.embeddings/{pathoma,firstaid}.json into `book_pages`.
// Run after applying supabase/migrations/20260722130000_create_book_pages.sql.
// Usage: node scripts/migrate-books-to-supabase.mjs
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOKS = [
  { book: 'pathoma', file: 'pathoma.json' },
  { book: 'firstaid', file: 'firstaid.json' },
];

const BATCH = 100;

for (const { book, file } of BOOKS) {
  const { entries } = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', '.embeddings', file), 'utf8')
  );

  // ponytail: full regen, not incremental — chunk count/shape changes between
  // runs (e.g. max=1200 -> max=500), so stale chunk_index rows from a prior
  // run wouldn't get overwritten by upsert alone. Delete scoped to this book
  // only, not a blanket truncate, so a partial failure can't touch the other book.
  const { error: delError } = await supabase.from('book_pages').delete().eq('book', book);
  if (delError) throw delError;

  const rows = entries.map((e) => ({
    book,
    page: e.page,
    chunk_index: e.chunkIndex,
    text: e.text,
    embedding: e.embedding,
  }));

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('book_pages').upsert(batch, { onConflict: 'book,page,chunk_index' });
    if (error) throw error;
    console.log(`${book}: upserted ${i + batch.length}/${rows.length}`);
  }
}

console.log('done');
