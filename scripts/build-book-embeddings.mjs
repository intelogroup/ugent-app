// Builds paragraph-chunk embeddings for Pathoma + First Aid so clea-tools can
// do semantic search instead of literal word-overlap. Run once, and again
// whenever the source jsonl files change.
// Usage: OPENAI_API_KEY=... node scripts/build-book-embeddings.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;
const OUT_DIR = path.join(process.cwd(), 'data', '.embeddings');

const BOOKS = [
  { file: 'pathoma_text.jsonl', out: 'pathoma.json', outline: true, max: 300 },
  { file: 'firstaid_text.jsonl', out: 'firstaid.json', outline: false, max: 500 },
];

// ponytail: scanned-page OCR leaves junk lines from decorative page
// headers/logos (e.g. "•\ns*\n/\n*\nFUNDAMENTALS"). Drop lines that are
// mostly non-alphanumeric or too short to be real words before chunking,
// so embeddings aren't spent on noise. Keeps blank lines (paragraph breaks).
function stripOcrNoise(text) {
  return text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      const words = t.match(/[A-Za-z]{2,}/g) || [];
      const alnumRatio = (t.match(/[A-Za-z0-9]/g) || []).length / t.length;
      if (words.length === 0 && t.length < 6) return false;
      if (alnumRatio < 0.4) return false;
      return true;
    })
    .join('\n');
}

// ponytail: pathoma separates topics with outline markers (I. II. III. / A. B.
// C.) on single newlines, not blank lines — the blank-line splitter treated
// whole multi-topic sections (e.g. 5 different brain tumors on one page) as
// one paragraph, diluting niche facts like "psammoma bodies" again even after
// chunking. Insert a paragraph break before each outline marker so the
// blank-line splitter below can also cut along outline boundaries.
function splitOutlineMarkers(text) {
  return text.replace(/\n(?=(?:[IVXLC]{1,4}|[A-Z]|\d{1,2})\.\s)/g, '\n\n');
}

// ponytail: whole-page embeddings diluted niche one-liners into the page's
// dominant topic. Split each page into paragraph chunks instead — smaller
// unit means a specific fact's embedding isn't drowned out by the rest of
// the page. min/max keep chunks from being too fragmentary or too diluted.
// max=500 for First Aid (dense MECHANISM/CLINICAL USE/ADVERSE EFFECTS drug
// tables need a smaller ceiling than whole-page to avoid merging 2-3 drugs
// into one chunk); max=300 for pathoma once outline markers are also split,
// since its bullets are shorter than FA's paragraphs.
function chunkText(text, { min = 150, max = 500 } = {}) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';
  for (const p of paras) {
    const candidate = buf ? buf + '\n\n' + p : p;
    if (candidate.length >= max && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = candidate;
    }
  }
  if (buf) chunks.push(buf);
  if (chunks.length > 1 && chunks[chunks.length - 1].length < min) {
    const last = chunks.pop();
    chunks[chunks.length - 1] += '\n\n' + last;
  }
  return chunks;
}

async function embedBook(client, { file, out, outline, max }) {
  const lines = readFileSync(path.join(process.cwd(), 'data', file), 'utf8')
    .split('\n')
    .filter(Boolean);
  const pages = lines.map((line) => JSON.parse(line));

  const chunked = pages.flatMap((p) => {
    let text = stripOcrNoise(p.text);
    if (outline) text = splitOutlineMarkers(text);
    return chunkText(text, { max }).map((chunk, chunkIndex) => ({
      page: p.page,
      chunkIndex,
      text: chunk,
    }));
  });

  const entries = [];
  for (let i = 0; i < chunked.length; i += BATCH_SIZE) {
    const batch = chunked.slice(i, i + BATCH_SIZE);
    const res = await client.embeddings.create({
      model: MODEL,
      input: batch.map((c) => c.text.slice(0, 8000)),
    });
    batch.forEach((c, j) => {
      entries.push({ page: c.page, chunkIndex: c.chunkIndex, text: c.text, embedding: res.data[j].embedding });
    });
    console.log(`${file}: embedded ${Math.min(i + BATCH_SIZE, chunked.length)}/${chunked.length} chunks`);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, out), JSON.stringify({ model: MODEL, entries }));
  console.log(`wrote data/.embeddings/${out} (${entries.length} chunks from ${pages.length} pages)`);
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
