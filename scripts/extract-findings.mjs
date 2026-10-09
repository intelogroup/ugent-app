// Extracts typed, source-linked findings per disease from data/medicospira-enriched.jsonl
// into data/findings.jsonl (feeds the body hub, see lib/hub/). Resumable.
//
//   node scripts/extract-findings.mjs --dry-run            stats + first prompt, no API call
//   node scripts/extract-findings.mjs --limit 20           top 20 diseases by question count
//   node scripts/extract-findings.mjs --names "Asthma,Gout"
//   node scripts/extract-findings.mjs --types DISEASE,SYNDROME   (default: all topic types)
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const IN_FILE = path.join(process.cwd(), 'data', 'medicospira-enriched.jsonl');
const OUT_FILE = path.join(process.cwd(), 'data', 'findings.jsonl');
const SYSTEMS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'hub', 'systems.json'), 'utf-8'));
const FINDING_TYPES = ['sign', 'symptom', 'lab', 'imaging', 'path'];
const WEIGHTS = ['pathognomonic', 'classic', 'common'];
const CONCURRENCY = 5;
const MAX_ROWS_PER_DISEASE = 8;   // prompt size cap
const MAX_FINDINGS = 30;

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const PROVIDERS = {
  deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-v4-flash', key: process.env.DEEPSEEK_API_KEY },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', key: process.env.OPENAI_API_KEY },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash', key: process.env.OPENROUTER_API_KEY },
};
const PROVIDER = PROVIDERS[opt('provider') || (PROVIDERS.deepseek.key ? 'deepseek' : 'openai')];

// ponytail: copy of normalizeDiseaseName in lib/curriculum/disease-reference.ts (TS, unexported, cannot import from .mjs); export + share via tsx if the two drift
function normalizeDiseaseName(name) {
  let n = name;
  n = n.replace(/['']S\b/gi, 's').replace(/['']/g, '');
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ');
  n = n.replace(/^(Metastatic|Invasive|Active|Latent)\s+/i, '');
  n = n.replace(/^Malignant\s+(Melanoma|Neoplasm|Tumor|Lesion|Growth)\s*/i, '$1 ');
  n = n.replace(/\s+(Virus(\s+Infection)?|Infection|Disorder)$/i, '');
  n = n.replace(/\s+(Due To|Secondary To|Associated With|Caused By)\s+.*/i, '');
  n = n.replace(/\s+With\s+.*/i, '');
  n = n.replace(/^(Type\s+\d+\s+)(.+)$/i, '$2 $1').trim();
  return n.replace(/\s+/g, ' ').trim();
}

const JUNK_NAMES = /^(n\/a|none|unknown|not applicable|patients?|general|other)\b/i;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const asArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function loadGroups(types) {
  const groups = new Map();
  for (const line of fs.readFileSync(IN_FILE, 'utf-8').split('\n')) {
    if (!line) continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    const e = row.enriched;
    if (!e?.diseaseName || e.diseaseName === 'Unknown' || !row.textHash) continue;
    const topicType = e.topicType || 'DISEASE';
    if (types && !types.includes(topicType)) continue;
    const name = normalizeDiseaseName(e.diseaseName);
    if (name.length < 4 || /^[a-z]/.test(name) || JUNK_NAMES.test(name)) continue; // normalizer leftovers like "in patients"
    const g = groups.get(name) || { disease: name, topicType, rows: [] };
    g.rows.push({
      hash: row.textHash,
      symptoms: asArr(e.keySymptoms),
      clues: asArr(e.highLeverageClues),
      mechanism: e.mechanism || '',
      nextBestStep: e.nextBestStep || '',
    });
    groups.set(name, g);
  }
  return [...groups.values()].sort((a, b) => b.rows.length - a.rows.length);
}

const SYSTEM_PROMPT = `You extract clinical FINDINGS for one entity from USMLE question notes, plus the standard First Aid / Pathoma findings the notes happen to miss.
Return JSON only: {"findings":[{"label":"...","type":"...","systems":["..."],"weight":"...","src":["R1"],"known":false}]}
Rules:
- label: short canonical clinical term, sentence case (capitalize first letter only, keep acronyms), never contains the entity's own name or the word "disease" (e.g. "Fever", "Anti-smooth muscle antibody", "Elevated PSA", "Honey-colored crusts", "HBsAg positive"). Same finding in different entities must get the identical label.
- known: false when a notes row states the finding (then src is required). true when the finding is a standard high-yield textbook finding of this entity that no row states; then src is []. Aim for the complete classic picture: include the defining lab, imaging and path findings. Never put risk factors, comorbidities, treatments or unresponsiveness-style non-findings in.
- type: one of ${FINDING_TYPES.join(', ')}. sign = exam finding, symptom = patient complaint, lab = blood/urine/CSF/serology/test value, imaging = radiology/US/CT/MRI/endoscopy, path = histology/biopsy/cytology/micro stain or culture.
- systems: 1-3 values from this exact list: ${SYSTEMS.join(', ')}. Pick where the finding is observed or measured (PSA -> reproductive-male or renal-urinary; fever -> systemic).
- weight: ${WEIGHTS.join(' | ')}. pathognomonic = nearly diagnostic by itself; classic = expected in this entity; common = non-specific.
- src: ids (R1, R2...) of the notes rows that state the finding.
- Max ${MAX_FINDINGS} findings. Skip management, drugs and mechanisms unless the entity is a drug (then use adverse effects and tested toxicity signs as findings).`;

function buildUserPrompt(g) {
  const rows = g.rows.slice(0, MAX_ROWS_PER_DISEASE).map((r, i) => {
    const parts = [];
    if (r.symptoms.length) parts.push(`symptoms: ${r.symptoms.join('; ')}`);
    if (r.clues.length) parts.push(`clues: ${r.clues.join('; ')}`);
    if (r.mechanism) parts.push(`mechanism: ${r.mechanism}`);
    if (r.nextBestStep) parts.push(`next step: ${r.nextBestStep}`);
    return `R${i + 1}: ${parts.join(' | ')}`;
  });
  return `Entity: ${g.disease} (${g.topicType})\nNotes:\n${rows.join('\n')}`;
}

async function callLLM(userPrompt) {
  const resp = await fetch(PROVIDER.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PROVIDER.key}` },
    body: JSON.stringify({
      model: PROVIDER.model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  if (!resp.ok) throw new Error(`${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const content = (await resp.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error('empty response');
  return JSON.parse(content);
}

// Drops anything unsupported: bad enum, unknown system, no resolvable source row. Dedupes by label slug.
export function validate(raw, g) {
  const hashes = g.rows.slice(0, MAX_ROWS_PER_DISEASE).map((r) => r.hash);
  const seen = new Set();
  const findings = [];
  let dropped = 0;
  for (const f of asArr(raw?.findings)) {
    const label = typeof f?.label === 'string' ? f.label.trim() : '';
    const systems = asArr(f?.systems).filter((s) => SYSTEMS.includes(s));
    const src = asArr(f?.src)
      .map((s) => /^R(\d+)$/.exec(String(s))?.[1])
      .map((n) => hashes[Number(n) - 1])
      .filter(Boolean);
    const id = slug(label);
    const known = f?.known === true && !src.length;
    if (!id || seen.has(id) || !FINDING_TYPES.includes(f.type) || !WEIGHTS.includes(f.weight) || !systems.length || (!src.length && !known)) {
      dropped++;
      continue;
    }
    seen.add(id);
    findings.push({ id, label, type: f.type, systems, weight: f.weight, sourceHashes: [...new Set(src)], source: known ? 'knowledge' : 'notes' });
  }
  return { findings, dropped };
}

async function main() {
  const types = opt('types')?.split(',');
  let groups = loadGroups(types);
  const names = opt('names')?.split(',').map((n) => n.trim().toLowerCase());
  if (names) groups = groups.filter((g) => names.includes(g.disease.toLowerCase()));
  const limit = Number(opt('limit')) || undefined;

  // Subagent route: --export <dir> writes batch-NN.json (prompt + entities); agents write batch-NN.out.json
  // as {"results":[{"disease":"...","findings":[...]}]}; --import <dir> validates and upserts into findings.jsonl.
  if (opt('export')) {
    const dir = opt('export'); const per = Number(opt('per')) || 50;
    fs.mkdirSync(dir, { recursive: true });
    const pick = groups.slice(0, limit || groups.length);
    for (let i = 0; i < pick.length; i += per) {
      const n = String(i / per + 1).padStart(2, '0');
      const entities = pick.slice(i, i + per).map((g) => ({ disease: g.disease, topicType: g.topicType, prompt: buildUserPrompt(g) }));
      fs.writeFileSync(path.join(dir, `batch-${n}.json`), JSON.stringify({ instructions: SYSTEM_PROMPT, entities }, null, 1));
    }
    console.log(`[EXPORT] ${pick.length} entities -> ${Math.ceil(pick.length / per)} batches in ${dir}`);
    return;
  }
  if (opt('import')) {
    const dir = opt('import');
    const byName = new Map(groups.map((g) => [g.disease, g]));
    const store = new Map();
    if (fs.existsSync(OUT_FILE)) {
      for (const l of fs.readFileSync(OUT_FILE, 'utf-8').split('\n')) if (l) try { const r = JSON.parse(l); store.set(r.disease, r); } catch {}
    }
    let ok = 0, dropped = 0, unknown = 0;
    for (const fn of fs.readdirSync(dir).filter((f) => f.endsWith('.out.json')).sort()) {
      const out = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf-8'));
      for (const r of asArr(out.results)) {
        const g = byName.get(r.disease);
        if (!g) { unknown++; continue; }
        const v = validate(r, g);
        dropped += v.dropped;
        store.set(g.disease, { disease: g.disease, topicType: g.topicType, findings: v.findings });
        ok++;
      }
    }
    fs.writeFileSync(OUT_FILE, [...store.values()].map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`[IMPORT] ${ok} entities upserted, ${dropped} findings dropped, ${unknown} unknown names, ${store.size} total in file`);
    return;
  }

  const done = new Set();
  if (fs.existsSync(OUT_FILE)) {
    for (const l of fs.readFileSync(OUT_FILE, 'utf-8').split('\n')) {
      if (l) try { done.add(JSON.parse(l).disease); } catch {}
    }
  }
  let todo = groups.filter((g) => !done.has(g.disease));
  if (limit) todo = todo.slice(0, limit);

  console.log(`[LOAD] ${groups.length} entities, ${done.size} already extracted, ${todo.length} to do`);
  if (flag('dry-run')) {
    if (!todo.length) return;
    console.log('--- first prompt ---\n' + buildUserPrompt(todo[0]));
    const noSymptoms = groups.filter((g) => g.rows.every((r) => !r.symptoms.length && !r.clues.length)).length;
    console.log(`--- ${noSymptoms} entities have no symptoms or clues in any row (extraction will yield nothing) ---`);
    return;
  }
  if (!PROVIDER.key) { console.error('No DEEPSEEK_API_KEY or OPENAI_API_KEY in .env.local'); process.exit(1); }

  let ok = 0, failed = 0, droppedTotal = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const out = await Promise.all(batch.map(async (g) => {
      try {
        const { findings, dropped } = validate(await callLLM(buildUserPrompt(g)), g);
        droppedTotal += dropped;
        console.log(`  ok ${g.disease}: ${findings.length} findings (${dropped} dropped)`);
        return { disease: g.disease, topicType: g.topicType, findings };
      } catch (err) {
        failed++;
        console.log(`  FAIL ${g.disease}: ${err.message.slice(0, 120)}`);
        return null;
      }
    }));
    const lines = out.filter(Boolean);
    ok += lines.length;
    if (lines.length) fs.appendFileSync(OUT_FILE, lines.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
  console.log(`[DONE] ok ${ok}, failed ${failed}, findings dropped by validation ${droppedTotal}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
}
