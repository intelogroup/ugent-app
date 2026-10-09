// Adds course / size / geography findings per disease from fixed vocabularies (lib/hub/context-vocab.ts)
// into data/context-findings.jsonl. app/api/hub merges it over data/findings.jsonl. Resumable.
//
//   node scripts/extract-context-findings.mjs --limit 10      first 10 diseases, prints results
//   node scripts/extract-context-findings.mjs                 all diseases in findings.jsonl
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const IN_FILE = path.join(process.cwd(), 'data', 'findings.jsonl');
const OUT_FILE = path.join(process.cwd(), 'data', 'context-findings.jsonl');
// ponytail: copy of CONTEXT_VOCAB in lib/hub/context-vocab.ts (TS, cannot import from .mjs); keep the two in step
const VOCAB = {
  course: ['Onset over minutes to hours', 'Onset over days', 'Course over weeks', 'Course over months', 'Course over years', 'Episodic or relapsing', 'Congenital or lifelong'],
  size: ['Solitary small lesion under 2 cm', 'Mass 2 to 5 cm', 'Large mass over 5 cm', 'Multiple lesions or nodules', 'Enlarged organ', 'Shrunken organ'],
  geography: ['Southwestern United States', 'Ohio and Mississippi river valleys', 'Northeastern United States', 'Central or South America', 'Sub-Saharan Africa', 'Southeast Asia', 'Mediterranean', 'Tropics and subtropics', 'Travel to an endemic area', 'Rural or farm exposure', 'Cave or bat exposure'],
};
const WEIGHTS = ['pathognomonic', 'classic', 'common'];
const BATCH = 10;
const CONCURRENCY = 4;
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const KEY = process.env.OPENAI_API_KEY;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SYSTEM = `For each disease, pick the case-context values that apply from FIXED lists. Return JSON only:
{"items":[{"disease":"<exact name>","findings":[{"type":"course|size|geography","label":"<exact list value>","weight":"pathognomonic|classic|common"}]}]}
Lists:
${Object.entries(VOCAB).map(([t, v]) => `- ${t}: ${v.join(' | ')}`).join('\n')}
Rules:
- Use ONLY values copied exactly from the lists. Omit a type entirely when it does not characterize the disease (most diseases have no size or geography value).
- course = typical tempo of onset or illness. Pick 1 or 2. size = typical lesion/mass/organ size if the disease is defined by one. geography = only for diseases with a real geographic or exposure restriction (endemic fungi, parasites, vector-borne, etc).
- weight: pathognomonic only when the value nearly defines the disease (e.g. Southwestern United States for coccidioidomycosis); classic = expected; common = nonspecific.`;

async function callLLM(names) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: opt('model') || 'gpt-4o', temperature: 0.1, max_tokens: 4096, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: names.join('\n') }],
    }),
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 200)}`);
  return JSON.parse((await r.json()).choices[0].message.content);
}

/** Keeps only vocabulary-exact findings; dedupes by label. */
export function validate(items, names) {
  const ok = new Set(names);
  const out = [];
  for (const it of items || []) {
    if (!ok.has(it.disease)) continue;
    const seen = new Set();
    const findings = [];
    for (const f of it.findings || []) {
      if (!VOCAB[f.type]?.includes(f.label) || seen.has(f.label)) continue;
      seen.add(f.label);
      findings.push({ id: slug(f.label), label: f.label, type: f.type, systems: ['systemic'], weight: WEIGHTS.includes(f.weight) ? f.weight : 'common', sourceHashes: [], source: 'knowledge' });
    }
    out.push({ disease: it.disease, findings });
  }
  return out;
}

async function main() {
  if (!KEY) throw new Error('OPENAI_API_KEY missing');
  let names = fs.readFileSync(IN_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).disease);
  const done = new Set(fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).disease) : []);
  names = names.filter((n) => !done.has(n));
  if (opt('limit')) names = names.slice(0, Number(opt('limit')));
  const batches = [];
  for (let i = 0; i < names.length; i += BATCH) batches.push(names.slice(i, i + BATCH));
  let next = 0, written = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < batches.length) {
      const b = batches[next++];
      try {
        const rows = validate((await callLLM(b)).items, b);
        // diseases the model skipped get an empty row so a resume does not retry them forever
        for (const n of b) if (!rows.some((r) => r.disease === n)) rows.push({ disease: n, findings: [] });
        fs.appendFileSync(OUT_FILE, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
        written += rows.length;
        console.log(`batch ok (${written}/${names.length})`);
      } catch (e) { console.error('batch failed:', String(e.message).slice(0, 160)); }
    }
  }));
}
if (import.meta.url === `file://${process.argv[1]}`) main();
