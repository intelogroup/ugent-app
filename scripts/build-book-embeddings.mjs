// Builds page-level embeddings for Pathoma + First Aid so clea-tools can do
// semantic search instead of literal word-overlap. Run once, and again
// whenever the source jsonl files change.
// Usage: OPENAI_API_KEY=... node scripts/build-book-embeddings.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;
const OUT_DIR = path.join(process.cwd(), 'data', '.embeddings');

const BOOKS = [
  { file: 'pathoma_text.jsonl', out: 'pathoma.json' },
  { file: 'firstaid_text.jsonl', out: 'firstaid.json' },
];

async function embedBook(client, { file, out }) {
  const lines = readFileSync(path.join(process.cwd(), 'data', file), 'utf8')
    .split('\n')
    .filter(Boolean);
  const pages = lines.map((line) => JSON.parse(line));

  const entries = [];
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const res = await client.embeddings.create({
      model: MODEL,
      input: batch.map((p) => p.text.slice(0, 8000)),
    });
    batch.forEach((p, j) => {
      entries.push({ page: p.page, text: p.text, embedding: res.data[j].embedding });
    });
    console.log(`${file}: embedded ${Math.min(i + BATCH_SIZE, pages.length)}/${pages.length}`);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, out), JSON.stringify({ model: MODEL, entries }));
  console.log(`wrote data/.embeddings/${out} (${entries.length} pages)`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }
  const client = new OpenAI();
  for (const book of BOOKS) {
    await embedBook(client, book);
  }
}

main();
