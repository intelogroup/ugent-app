// Builds data/finding-canon.json (raw finding id -> canonical id+label) from data/findings.jsonl.
// Stage 1: deterministic key (type + sorted stemmed tokens) merges word-order/plural variants.
// Stage 2: LLM merges true synonyms inside each type, chunked by key order. Applied at load time by lib/hub/canon.ts.
//
//   node scripts/canonicalize-findings.mjs --dry-run     stage 1 stats only, no API
//   node scripts/canonicalize-findings.mjs               full run (needs OPENAI_API_KEY)
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const IN_FILE = path.join(process.cwd(), 'data', 'findings.jsonl');
const OUT_FILE = path.join(process.cwd(), 'data', 'finding-canon.json');
const CHUNK = 250;
const KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini';
const DRY = process.argv.includes('--dry-run');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const STOP = new Set(['of', 'the', 'a', 'an', 'in', 'on', 'with', 'and', 'positive', 'present', 'finding', 'findings']);
const stem = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);
const keyOf = (type, label) =>
  type + ':' + label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((t) => t && !STOP.has(t)).map(stem).sort().join(' ');

// raw id -> {label,type,df}
const raw = new Map();
for (const l of fs.readFileSync(IN_FILE, 'utf-8').split('\n')) {
  if (!l) continue;
  const d = JSON.parse(l);
  for (const f of d.findings) {
    const r = raw.get(f.id) || { id: f.id, label: f.label, type: f.type, df: 0 };
    r.df++;
    raw.set(f.id, r);
  }
}

// Stage 1
const groups = new Map(); // key -> members
for (const r of raw.values()) {
  const k = keyOf(r.type, r.label);
  (groups.get(k) || groups.set(k, []).get(k)).push(r);
}
const reps = [...groups.entries()].map(([k, ms]) => {
  const best = ms.slice().sort((a, b) => b.df - a.df || a.label.length - b.label.length)[0];
  return { key: k, type: best.type, label: best.label, df: ms.reduce((s, m) => s + m.df, 0), members: ms };
});
console.log(`[STAGE1] ${raw.size} raw ids -> ${reps.length} keys`);
if (DRY) {
  const multi = reps.filter((r) => r.members.length > 1).sort((a, b) => b.members.length - a.members.length).slice(0, 8);
  for (const r of multi) console.log('  ', r.members.map((m) => m.label).join(' | '));
  process.exit(0);
}
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const PROMPT = `You merge synonym clinical findings for a differential-diagnosis tool.
You get a numbered list of findings of one type (sign, symptom, lab, imaging or path), sorted so near-duplicates sit close together.
Return JSON only: {"groups":[{"canonical":"...","members":[3,7]}]}
Rules:
- Group ONLY findings that mean the same thing for differential diagnosis (e.g. "Dyspnea on exertion" = "Exertional dyspnea"; "Elevated ALT" = "Raised alanine aminotransferase").
- NEVER merge findings that differ in a clinically meaningful way: direction (elevated vs decreased), specific marker (ALT vs AST, IgM vs IgG, anti-HBc vs anti-HBs), laterality, acute vs chronic, or a general finding vs its specific subtype (e.g. "Fever" vs "High-grade fever", "Anemia" vs "Microcytic anemia"). When unsure, do not merge.
- canonical: the clearest standard term, sentence case, keep acronyms. It may be one of the member labels.
- Only output groups with 2 or more members. Each number appears in at most one group.`;

async function llmGroups(items) {
  const body = {
    model: MODEL,
    messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: items.map((r, i) => `${i + 1}. ${r.label}`).join('\n') }],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 8000,
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body),
    });
    if (resp.ok) {
      const choice = (await resp.json()).choices[0];
      try { return JSON.parse(choice.message.content).groups || []; } catch (e) {
        // truncated/garbled output: retry on halves so each answer is small enough to finish
        if (items.length <= 30) { console.log(`  skip ${items.length} labels (unparseable)`); return []; }
        const mid = items.length >> 1;
        const a = await llmGroups(items.slice(0, mid));
        const b = await llmGroups(items.slice(mid));
        return [...a, ...b.map((g) => ({ ...g, members: (g.members || []).map((n) => Number(n) + mid) }))];
      }
    }
    if (resp.status !== 429 && resp.status < 500) throw new Error(`${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error('LLM retries exhausted');
}

// The LLM over-merges (subtype -> generic, opposite direction, unrelated). Keep a member only if it is a true
// synonym of the canonical: not more specific than it, no direction conflict, enough shared content tokens.
const toks = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((t) => t && !STOP.has(t)).map(stem));
const dir = (s) => {
  const up = /\b(elevated|increased|high|raised|hyper\w*)\b/i.test(s), down = /\b(low|decreased|reduced|hypo\w*|absent)\b/i.test(s);
  return up === down ? 0 : up ? 1 : -1;
};
function isSynonym(canonical, label) {
  const c = toks(canonical), m = toks(label);
  const inter = [...c].filter((t) => m.has(t)).length;
  const union = new Set([...c, ...m]).size;
  const moreSpecific = [...c].every((t) => m.has(t)) && m.size > c.size;
  const conflict = dir(canonical) * dir(label) === -1;
  return !moreSpecific && !conflict && inter / union > 0.34;
}

// Stage 2, per type, chunked by key order
const canonOf = new Map(); // rep key -> {id,label}
let merged = 0;
for (const type of ['sign', 'symptom', 'lab', 'imaging', 'path']) {
  const list = reps.filter((r) => r.type === type).sort((a, b) => a.key.localeCompare(b.key));
  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK);
    const used = new Set();
    for (const g of await llmGroups(chunk)) {
      const canonical = typeof g.canonical === 'string' ? g.canonical.trim() : '';
      const idxs = [...new Set((g.members || []).map((n) => Number(n) - 1))]
        .filter((n) => chunk[n] && !used.has(n) && isSynonym(canonical, chunk[n].label));
      if (idxs.length < 2 || !canonical || slug(canonical).length < 2) continue;
      idxs.forEach((n) => used.add(n));
      const id = slug(canonical);
      idxs.forEach((n) => canonOf.set(chunk[n].key, { id, label: canonical }));
      merged += idxs.length - 1;
    }
    console.log(`  [${type}] ${Math.min(i + CHUNK, list.length)}/${list.length}`);
  }
}

// Output: every raw id -> canonical (stage1 rep or stage2 group)
const out = {};
for (const r of reps) {
  const c = canonOf.get(r.key) || { id: slug(r.label), label: r.label };
  for (const m of r.members) if (m.id !== c.id || m.label !== c.label) out[m.id] = c;
}
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 1));
const finalIds = new Set(reps.map((r) => (canonOf.get(r.key) || { id: slug(r.label) }).id));
console.log(`[DONE] ${raw.size} raw -> ${reps.length} after stage1 -> ${finalIds.size} canonical (stage2 merged ${merged}); ${Object.keys(out).length} remaps -> ${OUT_FILE}`);
