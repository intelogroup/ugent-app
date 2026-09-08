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
 *   4. Answer-reveals — the clue CONTAINS the disease/concept name (reverse of 3)
 *      e.g. "CT shows saddle pulmonary embolism" on the Pulmonary Embolism card.
 *      For drill cards the clue front-face must make the student reason, so a clue
 *      that names the answer is as useless as one that restates it. (Multi-token
 *      disease names match as a substring; single-token names match at word
 *      boundaries to avoid "shock" inside "shockwave".)
 *   5. Low-specificity recycled phrases — a clue shared across >= 6 DISTINCT
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

const MIN_CLUE_LEN = 15;


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

function isTooShort(clue) {
  return norm(clue).length < MIN_CLUE_LEN;
}

function splitSentences(text) {
  return (text || '').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>=MIN_CLUE_LEN);
}

function stripNamePrefix(cand, diseaseName) {
  // If a promotion candidate contains the disease/concept name (answer-reveal),
  // try removing the name plus a trailing " = " / ":" / "-" so the remainder is
  // still a substantive clue (e.g. "Sensitivity = TP/(TP+FN) = 75/100 (75%).").
  const cn = norm(cand);
  const dn = norm(diseaseName);
  if (!dn || !cn.includes(dn)) return cand;
  const re = new RegExp(`^${dn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:=\\-—–]+\\s*`, 'i');
  const stripped = cn.replace(re, '').trim();
  return stripped.length >= MIN_CLUE_LEN ? stripped : cand;
}

function getPromotionCandidates(e) {
  const pool = [];
  if (Array.isArray(e.keySymptoms)) pool.push(...e.keySymptoms);
  if (e.mechanism) pool.push(...splitSentences(e.mechanism));
  if (e.educationalObjective) pool.push(...splitSentences(e.educationalObjective));
  if (e.explanation) pool.push(...splitSentences(e.explanation));
  if (e.clinicalContext && typeof e.clinicalContext === 'object') {
    for (const v of Object.values(e.clinicalContext)) if (typeof v === 'string' && v.length>=MIN_CLUE_LEN) pool.push(v);
  }
  return pool;
}

function isNameRestatement(clue, diseaseName) {
  const cn = norm(clue).replace(/[^a-z]/g, '');
  const dn = norm(diseaseName).replace(/[^a-z]/g, '');
  if (!dn || cn.length < 4) return false;
  return dn.includes(cn);
}

function isAnswerReveal(clue, diseaseName) {
  const cn = norm(clue).replace(/[^a-z]/g, '');
  const dn = norm(diseaseName).replace(/[^a-z]/g, '');
  if (!dn || dn.length < 4 || cn.length < 4) return false;
  // multi-token disease name (had internal spaces): treat as a contiguous phrase
  if (/\s/.test(norm(diseaseName))) return cn.includes(dn);
  // single-token disease name: require whole-word match in the space-normalized
  // text ("septic shock" on the Shock card counts; "shock" inside "shockwave" does not)
  const spaced = norm(clue).toLowerCase();
  return new RegExp(`(^|\\W)${dn}(\\W|$)`).test(spaced);
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

const stats = { removed: { placeholder: 0, demographic: 0, restatement: 0, reveal: 0, generic: 0, tooShort: 0, discEmpty: 0 }, kept: 0, promoted: 0 };
const examples = { placeholder: [], demographic: [], restatement: [], reveal: [], generic: [], tooShort: [], promoted: [], discEmpty: [] };
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
  const seen = new Set();
  for (const raw of e.highLeverageClues || []) {
    const c = stripAI(raw);
    const k = norm(c);
    if (seen.has(k)) continue;
    if (isPlaceholder(c)) { stats.removed.placeholder++; pushEx('placeholder', disease, c); continue; }
    if (isDemographicNoise(c)) { stats.removed.demographic++; pushEx('demographic', disease, c); continue; }
    if (isTooShort(c)) { stats.removed.tooShort++; pushEx('tooShort', disease, c); continue; }
    if (isNameRestatement(c, disease)) { stats.removed.restatement++; pushEx('restatement', disease, c); continue; }
    if (isAnswerReveal(c, disease)) { stats.removed.reveal++; pushEx('reveal', disease, c); continue; }
    if (isGeneric(c)) { stats.removed.generic++; pushEx('generic', disease, c); continue; }
    seen.add(k);
    cleaned.push(raw);
    stats.kept++;
  }
  // ensure exactly 3 specific clues via deterministic promotion
  if (cleaned.length < 3) {
    const candidates = getPromotionCandidates(e);
    for (const cand of candidates) {
      if (cleaned.length >= 3) break;
      const cn = stripNamePrefix(stripAI(cand), disease);
      const k = norm(cn);
      if (!cn || seen.has(k)) continue;
      if (isPlaceholder(cn)) continue;
      if (isDemographicNoise(cn)) continue;
      if (isTooShort(cn)) continue;
      if (isNameRestatement(cn, disease)) continue;
      if (isAnswerReveal(cn, disease)) continue;
      if (isGeneric(cn)) continue;
      seen.add(k);
      cleaned.push(cn);
      stats.promoted++;
      pushEx('promoted', disease, cn);
    }
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
console.log(`removed: placeholder=${stats.removed.placeholder} demographic=${stats.removed.demographic} tooShort=${stats.removed.tooShort} restatement=${stats.removed.restatement} reveal=${stats.removed.reveal} generic=${stats.removed.generic} promoted=${stats.promoted}`);
console.log(`kept   : ${stats.kept}`);
console.log(`records now with 0 clues+discriminators (dropped from drill deck): ${cardsDropped}`);
const shortAfter = records.filter(r=> (r.enriched?.highLeverageClues?.length||0) <3).length;
console.log(`records with <3 clues after promotion: ${shortAfter}`);
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
printEx('tooShort', 'Too-short (<15) clues removed');
printEx('restatement', 'Name-restatement clues removed');
printEx('reveal', 'Answer-revealing clues removed');
printEx('generic', 'Generic recycled clues removed');
printEx('promoted', 'Promoted from keySymptoms/mechanism to reach 3 clues');
printEx('discEmpty', 'Discriminators with empty/placeholder facts removed');

if (PREVIEW) {
  console.log('\n[PREVIEW MODE] — no files modified.');
} else {
  const changed = stats.removed.placeholder + stats.removed.demographic + stats.removed.tooShort + stats.removed.restatement + stats.removed.reveal + stats.removed.generic + stats.promoted + stats.removed.discEmpty;
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
