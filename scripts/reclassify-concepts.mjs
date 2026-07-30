// Reclassify the CONCEPT bucket in medicospira-enriched.jsonl.
// CONCEPT is the enrich pipeline's fallback default (deepseek-enrich.mjs:126), so it
// holds two kinds of rows: genuine biostats/epi/ethics CONCEPTs, and misclassified
// diseases/drugs/etc. This pass re-asks the LLM for topicType only and rewrites in place.
// Only rows whose current topicType === 'CONCEPT' are touched. Resumable: a row already
// moved off CONCEPT on a prior run is skipped.
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const BATCH_SIZE = 5;
const OUT_FILE = path.join(process.cwd(), 'data', 'medicospira-enriched.jsonl');
const VALID = ["DISEASE", "PATHOGEN", "PRINCIPLE", "DRUG", "SYNDROME", "CONCEPT"];

const PROMPT = `You are a USMLE content classifier. Given a question and its current diseaseName,
return ONLY valid JSON: {"topicType": "...", "diseaseName": "..."}.

topicType is EXACTLY one of: DISEASE, PATHOGEN, PRINCIPLE, DRUG, SYNDROME, CONCEPT.
- DISEASE: a specific disease/diagnosis (default for anything clinical).
- PATHOGEN: a specific microorganism. diseaseName = organism.
- DRUG: a drug or drug class. diseaseName = the drug.
- PRINCIPLE: a physiological principle, physical law, or mechanism. diseaseName = the principle.
- SYNDROME: a recognizable named syndrome.
- CONCEPT: ONLY biostatistics, epidemiology, study design, or medical ethics as the PRIMARY focus
  (e.g. NNT, ARR, intention-to-treat, blinding, informed consent). Do NOT use CONCEPT for any
  disease, drug, organism, or physiologic mechanism.

Be strict: most rows currently labeled CONCEPT are actually DISEASE. Only keep CONCEPT for true
biostats/epi/ethics/study-design questions.`;

const PROVIDERS = {
  deepseek: { url: DEEPSEEK_URL, model: DEEPSEEK_MODEL, key: DEEPSEEK_KEY, label: 'DeepSeek' },
  openrouter: { url: OR_URL, model: OR_MODEL, key: OR_KEY, label: 'OpenRouter' },
  openai: { url: OPENAI_URL, model: OPENAI_MODEL, key: OPENAI_KEY, label: 'OpenAI' },
};

async function callLLM(userText, providerName = 'deepseek') {
  const p = PROVIDERS[providerName];
  if (!p.key) throw new Error(`${p.label} API key not configured`);
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` };
  if (providerName === 'openrouter') { headers['HTTP-Referer'] = 'http://localhost:3000'; headers['X-Title'] = 'ugent-app'; }

  const resp = await fetch(p.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: userText }],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 1024,
    }),
  });
  if (!resp.ok) throw new Error(`${p.label} ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');
  const match = content.match(/\{[\s\S]*\}/); // free models wrap JSON in prose/fences
  const raw = JSON.parse(match ? match[0] : content);
  const upper = String(raw.topicType || '').toUpperCase().trim();
  return {
    topicType: VALID.includes(upper) ? upper : 'CONCEPT',
    diseaseName: (raw.diseaseName || '').trim() || null,
  };
}

async function classifyWithFallback(userText) {
  const cascade = ['deepseek', 'openrouter', 'openai'].filter(n => PROVIDERS[n].key);
  const errs = [];

  for (let i = 0; i < cascade.length; i++) {
    const name = cascade[i];
    const label = PROVIDERS[name].label;
    if (i > 0) console.log(`  -> ${label} fallback...`);

    if (name === 'openrouter') {
      for (let a = 0; a < 5; a++) {
        try { return await callLLM(userText, name); }
        catch (err) {
          if (!/429|Rate limit/.test(err.message)) { errs.push(err); break; }
          if (a === 4) { errs.push(err); break; }
          await new Promise(r => setTimeout(r, Math.pow(2, a) * 2000 + Math.random() * 1000));
        }
      }
    } else {
      try { return await callLLM(userText, name); }
      catch (err) { errs.push(err); }
    }
  }

  throw new Error(errs.map(e => e.message).join(' | '));
}

async function main() {
  if (!DEEPSEEK_KEY && !OR_KEY && !OPENAI_KEY) { console.error('No DEEPSEEK_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY in .env.local'); process.exit(1); }

  const rows = fs.readFileSync(OUT_FILE, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  let targets = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.enriched?.topicType === 'CONCEPT');
  if (process.env.LIMIT) targets = targets.slice(0, Number(process.env.LIMIT));
  console.log(`[LOAD] ${rows.length} rows, ${targets.length} CONCEPT to reclassify`);

  const moved = { DISEASE: 0, PATHOGEN: 0, PRINCIPLE: 0, DRUG: 0, SYNDROME: 0, CONCEPT: 0 };
  let errors = 0;

  for (let b = 0; b < targets.length; b += BATCH_SIZE) {
    const batch = targets.slice(b, b + BATCH_SIZE);
    console.log(`\n[BATCH ${Math.floor(b / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}]`);
    await Promise.all(batch.map(async ({ r }) => {
      const e = r.enriched;
      const userText = `Current diseaseName: ${e.diseaseName || '(none)'}\n\nQuestion:\n${e.questionText || r.text || ''}`;
      try {
        const out = await classifyWithFallback(userText);
        const prev = e.topicType;
        e.topicType = out.topicType;
        if (out.diseaseName) e.diseaseName = out.diseaseName.replace(/\b\w/g, c => c.toUpperCase());
        moved[out.topicType]++;
        console.log(`  ${prev} -> ${out.topicType} | ${e.diseaseName}`);
      } catch (err) {
        errors++;
        console.log(`  x ${err.message.slice(0, 80)}`);
      }
    }));
    // Rewrite whole file after each batch so an interrupt keeps progress (resumable via CONCEPT filter).
    fs.writeFileSync(OUT_FILE, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  }

  console.log(`\n=== DONE === reclassified into:`, moved, `| errors: ${errors}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
