#!/usr/bin/env node
/**
 * qbank-clue-clean.mjs
 *
 * Deterministic cleanup of fluff in the enriched question bank's high-leverage
 * clues (and, conservatively, discriminators). The enriched JSONL is the pipeline
 * source of truth feeding the Strategy Hub "Drill Cards" front face
 * (app/api/strategy/route.ts → questionBankClues → MemorizeTab clues.slice(0,3)).
 *
 * Removes per clue (in order):
 *   1. Placeholders / empty / ultra-short strings
 *   2. Pure demographic noise (e.g. "48-year-old man", "17-year-old boy") —
 *      tokens are only age/gender descriptors, no substantive clinical content.
 *      (demographics already live in enriched.clinicalContext)
 *   3. Name-restatements — the clue merely restates the disease/concept name.
 *   4. Low-specificity recycled phrases — a clue shared across >= 6 DISTINCT
 *      diseases in the whole bank (e.g. "hypotension and tachycardia").
 *      High-leverage means pathognomonic, not common.
 *
 * Conservatively prunes discriminators whose ruleOutFact is empty/placeholder/
 * ultra-short, or is a BARE dead cross-reference ("Same as above.", "See explanation.")
 * with no content after it. Facts that begin with a ref but continue with real
 * content ("Same as above; pain is not pleuritic") are KEPT. NEVER changes
 * textHash / id / questionText — arrays only. Always backs up first.
 *
 * Usage:
 *   node scripts/qbank-clue-clean.mjs             # backup + write + report
 *   node scripts/qbank-clue-clean.mjs --preview   # dry-run, no writes
 *   node scripts/qbank-clue-clean.mjs --no-discriminators
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[1], '../..');
const FILE = path.join(ROOT, 'data', 'medicospira-enriched.jsonl');
const BACKUP_DIR = path.join(ROOT, 'data', 'backups');

const PREVIEW = process.argv.includes('--preview');
const CLEAN_DISCRIMINATORS = !process.argv.includes('--no-discriminators');
const GENERIC_DISEASE_THRESHOLD = 6;

const stripAI = (s) => (s || '').trim().replace(/^AI-Generation\s*/i, '');
const norm = (s) =>
  stripAI(s).toLowerCase().replace(/\s+/g, ' ').trim().replace(/[\u00a0\u200b]/g, ' ');

const PLACEHOLDER = /^(n\/a|none|pending further analysis|pending|not applicable|tba|unknown|unspecified|null|)$/i;
const DEMO_TOKENS = new Set([
  'year', 'years', 'yr', 'yrs', 'yo', 'year-old', 'months', 'month', 'mo', 'wks', 'weeks', 'week', 'wk', 'days', 'day',
  'old', 'boy', 'girl', 'man', 'woman', 'male', 'female', 'newborn', 'infant', 'toddler',
  'child', 'adolescent', 'adult', 'elderly', 'teenager', 'geriatric', 'pediatric', 'baby', 'kid',
  'of', 'with', 'and', 'the', 'a', 'an', 'who', 'at', 'in', 'for', 'has', 'have', 'is', 'was',
  'presents', 'presented', 'presenting', 'comes', 'patient', 'history',
]);


function isDemographicNoise(clue) {
  const words = norm(clue).split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return false;
  const remaining = words.filter((w) => !/^\d+$/.test(w)).filter((w) => !DEMO_TOKENS.has(w));
  return remaining.length === 0;
}

function isPlaceholder(clue) {
  const n = norm(clue);
  return !n || n.length < 4 || PLACEHOLDER.test(n);
}

function isNameRestatement(clue, diseaseName) {
  const cn = norm(clue).replace(/[^a-z]/g, '');
  const dn = norm(diseaseName).replace(/[^a-z]/g, '');
  if (!dn || cn.length < 4) return false;
  return dn.includes(cn);
}
// ---- pass 1: collect global generic-frequency (distinct diseases per clue) ----
const lines = fs.readFileSync(FILE, 'utf-8').trim().split('\n').filter(Boolean);
const records = lines.map((l) => JSON.parse(l));
const clueDiseases = new Map();
for (const r of records) {
  const e = r.enriched;
  if (!e) continue;
  for (const c of e.highLeverageClues || []) {
    const k = norm(c);
    if (!k || k.length < 4 || PLACEHOLDER.test(k)) continue;
    if (!clueDiseases.has(k)) clueDiseases.set(k, new Set());
    clueDiseases.get(k).add(norm(e.diseaseName || ''));
  }
}
const isGeneric = (clue) => {
  const k = norm(clue);
  if (!k) return false;
  return (clueDiseases.get(k)?.size ?? 0) >= GENERIC_DISEASE_THRESHOLD;
};

const stats = { removed: { placeholder: 0, demographic: 0, restatement: 0, generic: 0, discEmpty: 0 }, kept: 0 };
const examples = { placeholder: [], demographic: [], restatement: [], generic: [], discEmpty: [] };
const MAX_EX = 6;
function pushEx(cat, disease, val) {
  if (examples[cat].length < MAX_EX) examples[cat].push({ disease, val });
}

const beforeClueTotal = records.reduce((a, r) => a + (r.enriched?.highLeverageClues?.length ?? 0), 0);
const beforeDiscTotal = records.reduce((a, r) => a + (r.enriched?.discriminators?.length ?? 0), 0);

for (const r of records) {
  const e = r.enriched;
  if (!e) continue;
  const disease = e.diseaseName || '';
  const cleaned = [];
  for (const raw of e.highLeverageClues || []) {
    const c = stripAI(raw);
    if (isPlaceholder(c)) { stats.removed.placeholder++; pushEx('placeholder', disease, c); continue; }
    if (isDemographicNoise(c)) { stats.removed.demographic++; pushEx('demographic', disease, c); continue; }
    if (isNameRestatement(c, disease)) { stats.removed.restatement++; pushEx('restatement', disease, c); continue; }
    if (isGeneric(c)) { stats.removed.generic++; pushEx('generic', disease, c); continue; }
    cleaned.push(raw);
    stats.kept++;
  }
  e.highLeverageClues = cleaned;

  if (CLEAN_DISCRIMINATORS && Array.isArray(e.discriminators)) {
    e.discriminators = e.discriminators.filter((d) => {
      const rf = norm(d?.ruleOutFact || '');
      // Bare dead cross-reference e.g. "Same as above." / "See explanation."
      // (a ref that has real content after it — "Same as above; pain is not pleuritic"
      //  — is KEPT; only the empty tail is dropped).
      const tail = rf.replace(/^(same as above|as above|see above|see (the )?explanation|ditto|refer to above|like above)[.;:\\s]*/i, '').trim();
      const ok = rf && rf.length >= 12 && !PLACEHOLDER.test(rf) && !(tail.length < 4);
      if (!ok) { stats.removed.discEmpty++; pushEx('discEmpty', disease, d?.distractor || ''); return false; }
      return true;
    });
  }
}

const afterClueTotal = records.reduce((a, r) => a + (r.enriched?.highLeverageClues?.length ?? 0), 0);
const afterDiscTotal = records.reduce((a, r) => a + (r.enriched?.discriminators?.length ?? 0), 0);
const cardsDropped = records.filter((r) => {
  const e = r.enriched;
  return e && (e.highLeverageClues?.length || 0) === 0 && (e.discriminators?.length || 0) === 0;
}).length;

// ---- report ----
console.log(`FILE : ${FILE}`);
console.log(`MODE : ${PREVIEW ? 'PREVIEW (dry-run, no writes)' : 'WRITE (backup + rewrite)'}`);
console.log(`Records : ${records.length}`);
console.log('\n=== CLUES ===');
console.log(`before : ${beforeClueTotal}`);
console.log(`after  : ${afterClueTotal}`);
console.log(`removed: placeholder=${stats.removed.placeholder} demographic=${stats.removed.demographic} restatement=${stats.removed.restatement} generic=${stats.removed.generic}`);
console.log(`kept   : ${stats.kept}`);
console.log(`records now with 0 clues+discriminators (dropped from drill deck): ${cardsDropped}`);
console.log('\n=== DISCRIMINATORS ===');
console.log(`before : ${beforeDiscTotal}`);
console.log(`after  : ${afterDiscTotal}`);
console.log(`removed: empty/placeholder/ultra-short=${stats.removed.discEmpty}${CLEAN_DISCRIMINATORS ? '' : ' (pass disabled)'}`);

const printEx = (cat, label) => {
  if (!examples[cat]?.length) return;
  console.log(`\n${label}:`);
  for (const { disease, val } of examples[cat]) console.log(`  • ${disease} => ${JSON.stringify(val)}`);
};
printEx('placeholder', 'Placeholder/clue examples removed');
printEx('demographic', 'Demographic-noise clues removed');
printEx('restatement', 'Name-restatement clues removed');
printEx('generic', 'Generic recycled clues removed');
printEx('discEmpty', 'Discriminators with empty/placeholder facts removed');

if (PREVIEW) {
  console.log('\n[PREVIEW MODE] — no files modified.');
} else {
  const changed = stats.removed.placeholder + stats.removed.demographic + stats.removed.restatement + stats.removed.generic + stats.removed.discEmpty;
  if (changed > 0) {
    const ts = Date.now();
    const backup = path.join(BACKUP_DIR, `medicospira-enriched-${ts}.jsonl`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.copyFileSync(FILE, backup);
    fs.writeFileSync(FILE, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`\nBackup  : ${backup}`);
    console.log(`Wrote   : ${FILE} (${afterClueTotal} clue items, ${afterDiscTotal} discriminator items)`);
  } else {
    console.log('\nNothing to change — file left untouched.');
  }
}
