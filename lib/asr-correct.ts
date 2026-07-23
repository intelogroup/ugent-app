import words from './asr-dictionary.json';
import commonEnglish from './common-english.json';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  let prev = new Uint8Array(n + 1);
  let curr = new Uint8Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function soundex(word: string): string {
  const first = word[0].toUpperCase();
  const rest = word.slice(1).toLowerCase().replace(/[^a-z]/g, '');
  let code = rest.replace(/[bfpv]/g, '1')
    .replace(/[cgjkqsxz]/g, '2')
    .replace(/[dt]/g, '3')
    .replace(/[l]/g, '4')
    .replace(/[mn]/g, '5')
    .replace(/[r]/g, '6')
    .replace(/[aeiouhwy]/g, '')
    .replace(/(\d)\1+/g, '$1');
  return first + code + '000'.slice(code.length);
}

const ALIASES: Record<string, string> = {
  // ponytail: phonetic aliases Soundex+Levenshtein can't bridge (distance > 2)
  'mucolo': 'mycology',
  'mucola': 'mycology',
  'mycologi': 'mycology',
  'splenomegali': 'splenomegaly',
  'splenomeg': 'splenomegaly',
  'pancytopenia': 'pancytopenia',  // exact — already present but placeholder
  'leukopenia': 'leukopenia',
  'neutropenia': 'neutropenia',
  // Whisper common patterns: initial p-drop (pseudomonas → seudomonas)
  'seudomonas': 'pseudomonas',
  'suedomonas': 'pseudomonas',
  // Whisper common patterns: missing medial consonant (strepococcus)
  'strepococcus': 'streptococcus',
  // Whisper common patterns: k→c (cephalexin → kephalexin)
  'kephalexin': 'cephalexin',
  'sephalexin': 'cephalexin',
  'kardiomyopathy': 'cardiomyopathy',
  // Whisper common patterns: single l for double, s for ll
  'halucination': 'hallucination',
  'halusination': 'hallucination',
  // Whisper common patterns: z/sk for sch/sc
  'skizophrenia': 'schizophrenia',
  'schitsofrenia': 'schizophrenia',
  // Whisper common patterns: extra s for singular
  'sjogrens': 'sjogren',
  'sjoegren': 'sjogren',
  // Whisper common patterns: -zol/-sol for -zole
  'flucanosol': 'fluconazole',
  'flucanozol': 'fluconazole',
  'voricanozol': 'voriconazole',
  // Whisper common patterns: dropped vowel in 3+ syllable drug
  'caspfungin': 'caspofungin',
  'caspofunjeen': 'caspofungin',
  // Whisper common patterns: -ius/-ious for -iosis
  'candidius': 'candidiasis',
  'aspergillius': 'aspergillosis',
  'histoplasmious': 'histoplasmosis',
  'sporotricious': 'sporotrichosis',
  // Whisper common patterns: -ia/-iam for -ium
  'mycobacteriam': 'mycobacterium',
  'clostridia': 'clostridium',
  // Whisper common patterns: devoicing / dropped initial
  'seudopseudohypoparathyroidism': 'pseudopseudohypoparathyroidism',
  // Whisper common patterns: single-word variants
  'neumocystosis': 'pneumocystosis',
  'ciproflaksin': 'ciprofloxacin',
  'haemophillus': 'haemophilus',
  'hemofilus': 'haemophilus',
  'mycobacyrium': 'mycobacterium',
  'addenovirus': 'adenovirus',
  'sytomegalovirus': 'cytomegalovirus',
  // Whisper common patterns: -kokus/-kocus for -coccus
  'streptokokus': 'streptococcus',
  // Whisper common patterns: -kokus/-kocus for -coccus (staphylococcus variant)
  'staphylokokus': 'staphylococcus',
  // Whisper common patterns: dropped medial syllables (coccidiomycosis)
  'coccidiomycosis': 'coccidioidomycosis',
  // Whisper common patterns: vowel shift + dropped medial
  'andocarditis': 'endocarditis',
  // real user Whisper output from chat session
  'coccidoidometrosis': 'coccidioidomycosis',
  'coccidoidomatosis': 'coccidioidomycosis',
  'recatseal': 'rickettsial',
  'mikoplasmaniem': 'mycoplasma',
  'photozoach': 'protozoa',
  'cystoids': 'cestodes',
  'trematoids': 'trematodes',
  'hairpaste': 'herpes',
  // real user Whisper output: "Oto-vie-wises" (quotes/hyphens stripped by
  // alphaKey), edit distance to orthomyxoviruses is 9/16 — too far for the
  // soundex+levenshtein pass, needs an explicit alias
  'otoviewises': 'orthomyxoviruses',
  // real user Whisper output: "Atoid arthritis" — dropped the "rheum" prefix
  'atoid': 'rheumatoid',
};

// ponytail: per-word corrector can't rejoin a term Whisper split across a
// space ("coccidoid geomycosis" → two tokens, neither near the single dict
// word "coccidioidomycosis"). Match adjacent token pairs here before the
// per-word pass. Keys are lowercased, alpha-only.
const MULTI_ALIASES: Record<string, string> = {
  'coccidoid geomycosis': 'coccidioidomycosis',
  'coccidoid homechis': 'coccidioidomycosis',
  'coccidoid mycosis': 'coccidioidomycosis',
  'cocci dioidomycosis': 'coccidioidomycosis',
  // real user Whisper output: "Prota virus" — dropped the "ro" in rotavirus
  'prota virus': 'rotavirus',
  // real user Whisper output: "Filla cocuso" — meant "staphylococcus"
  'filla cocuso': 'staphylococcus',
  // real user Whisper output: "Raja Lamblia" — meant "Giardia lamblia"
  'raja lamblia': 'giardia lamblia',
};
const MULTI_MAX_WORDS = 2;

// The "medical" dictionary was scraped from source text and picked up plain
// English along the way (page, pass, non, refused, shaving, lesions,
// serovars, ligands...). Those then act as false-positive correction targets
// for ordinary speech at dist 1-2 ("peace"->"phace", "nothing"->"nodding",
// "love"->"live", "servers"->"serovars"). Soundex should only fire on rare
// medical vocabulary, not everyday words, so gate on a broad common-English
// list (top ~10k words, common-english.json) — measured on the real asr-log,
// this protects the bulk of false positives while blocking zero genuine
// medical fixes. The scraped dict has no common word rare enough to be a real
// correction target, so guarding every common word is safe.
// STOPLIST_EXTRA covers what the 10k list misses: apostrophe-stripped
// contractions (alphaKey drops the ') and a few high-frequency stragglers.
const STOPLIST_EXTRA = [
  'ive', 'shes', 'hes', 'youre', 'theyre', 'weve', 'youve', 'im', 'dont',
  'cant', 'wont', 'isnt', 'arent', 'wasnt', 'werent', 'didnt', 'doesnt',
  'couldnt', 'wouldnt', 'shouldnt', 'thats', 'whats', 'lets', 'gonna', 'wanna',
  'mane', 'huh', 'hmm', 'nono', 'meant', 'grounded',
];
const ENGLISH_STOPLIST = new Set<string>([...commonEnglish, ...STOPLIST_EXTRA]);

const wordSet = new Set(words);
const soundexIndex = new Map<string, string[]>();
for (const w of words) {
  const code = soundex(w);
  let bucket = soundexIndex.get(code);
  if (!bucket) soundexIndex.set(code, bucket = []);
  bucket.push(w);
}

function correctWord(word: string): string {
  if (word.length < 3 || wordSet.has(word)) return word;

  // Dict is lowercase-only; Whisper capitalizes sentence-start words ("IKU",
  // "Recatseal") and sometimes wraps garbled terms in quotes/hyphens
  // ("Oto-vie-wises"). Every lookup below (alias, soundex, levenshtein) must
  // run against the alpha-only lowercased form, or stray punctuation corrupts
  // the soundex code (built off word[0]) and the match never happens.
  const lower = alphaKey(word);
  if (lower.length < 3) return word;
  if (ENGLISH_STOPLIST.has(lower)) return word;
  if (wordSet.has(lower)) return lower;

  const alias = ALIASES[word] ?? ALIASES[lower];
  if (alias) return alias;

  const code = soundex(lower);
  const candidates = soundexIndex.get(code);
  if (!candidates) return word;

  // ponytail: the dictionary is medical-only, so common English words absent
  // from it ("meant", "lets") would otherwise snap to a medical term 2 edits
  // away. Real Whisper corruptions of medical terms are long; require an exact
  // near-match (dist 1) for short words, allow dist 2 only for long ones.
  const maxDist = lower.length <= 6 ? 1 : 2;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(lower, c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (bestDist <= maxDist) return best!;
  // Single-candidate Soundex bucket has no ambiguity — relax to ratio 0.25.
  if (candidates.length === 1) {
    const ratio = bestDist / Math.max(lower.length, best!.length);
    if (ratio <= 0.25) return best!;
  }
  // Very long words (e.g. "paragoxydioidomycosis" -> "paracoccidioidomycosis",
  // dist 4/22) rarely soundex-collide with an unrelated same-length term, so a
  // tighter ratio is safe even in a multi-candidate bucket.
  if (lower.length >= 15) {
    const ratio = bestDist / Math.max(lower.length, best!.length);
    if (ratio <= 0.2) return best!;
  }
  return word;
}

const alphaKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export function correctText(text: string): string {
  const tokens = text.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    let matched = false;
    // Greedy: try longest multi-word alias first (only 2 today, but bounded).
    for (let n = MULTI_MAX_WORDS; n >= 2 && i + n <= tokens.length; n--) {
      const key = tokens.slice(i, i + n).map(alphaKey).join(' ');
      const alias = MULTI_ALIASES[key];
      if (alias) { out.push(alias); i += n; matched = true; break; }
    }
    if (matched) continue;

    // Generic space-split repair. Whisper's split signature is a dangling
    // fragment: the first token is not a real word on its own ("glomerulo",
    // "dermato", "retro"). When it isn't, try joining it with the next token
    // and accept only if the join resolves to a real dictionary word. Runs
    // before per-word correction so the join wins over mis-correcting the
    // fragment (e.g. "glomerulo" → "glomeruli"). Bridges any split term, not
    // just the hardcoded MULTI_ALIASES.
    const w = tokens[i];
    const wk = alphaKey(w);
    if (i + 1 < tokens.length && wk.length >= 3 && !wordSet.has(wk)) {
      const joined = wk + alphaKey(tokens[i + 1]);
      const fixed = correctWord(joined);
      if (wordSet.has(fixed)) {
        out.push(fixed); i += 2; continue;
      }
    }

    out.push(correctWord(w)); i++;
  }
  return out.join(' ');
}

const NOISE_BLOCK_RE = /\([^)]*\)|\[[^\]]*\]/g;
const KNOWN_NOISE = new Set([
  'blank audio', 'silence', 'music', 'applause', 'laugh', 'laughter',
  'cough', 'sigh', 'sighs', 'noise', 'background noise',
  'phone ringing', 'ringing', 'beep', 'tone',
  'shh', 'shhh', 'hmm', 'mmm', 'uh', 'um', 'ah',
]);

// Whisper-family models occasionally hallucinate foreign-script tokens on
// very short/ambiguous clips even with language=en forced ("你的安全",
// "Skvešen") — this app is English-only, so any non-Latin script letter
// means the whole transcript is noise, not real speech.
const NON_LATIN_LETTER_RE = /[Ͱ-῿⺀-꣟가-퟿豈-￯]/;

export function stripTranscriptNoise(text: string): string {
  text = text.replace(NOISE_BLOCK_RE, '').replace(/\s{2,}/g, ' ').trim();
  if (NON_LATIN_LETTER_RE.test(text)) return '';
  // Match case-insensitively and ignore surrounding punctuation, so "Shh.",
  // "SHH!" etc. are recognized as noise too — Whisper varies casing/punct.
  const key = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
  return KNOWN_NOISE.has(key) ? '' : text;
}
