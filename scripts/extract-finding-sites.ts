// Tags every hub finding with 0-2 body sites from lib/hub/sites.ts -> data/finding-sites.json ({findingId: sites[]}).
// Same ids as /api/hub serves (canon + disease merge applied). Resumable.
//   npx tsx scripts/extract-finding-sites.ts --limit 60      first batch only, prints results
//   npx tsx scripts/extract-finding-sites.ts                 everything not yet tagged
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { applyCanon } from '../lib/hub/canon';
import { mergeDiseases } from '../lib/hub/diseases';
import { SITES, SITE_SET } from '../lib/hub/sites';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const OUT = path.join(process.cwd(), 'data', 'finding-sites.json');
const BATCH = 60;
const CONCURRENCY = 4;
const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const KEY = process.env.OPENAI_API_KEY;

const SYSTEM = `Tag each clinical finding with the body site(s) where it is observed or measured.
Return JSON only: {"items":[{"i":<number>,"sites":["..."]}]}
Allowed sites (copy exactly): ${SITES.join(', ')}
Rules:
- 0 to 2 sites per finding; pick the most specific site. Use [] when the finding is not tied to a site.
- lung-left / lung-right ONLY when the finding is clearly one-sided (e.g. right lower lobe consolidation); otherwise lung.
- skin = rashes/lesions anywhere. blood-marrow = CBC/smear/marrow findings. systemic = fever, weight loss, fatigue-type whole-body findings (use [] if in doubt about site but it is not clearly whole-body).
- limb = generic arm/leg findings (neuropathy, edema, claudication); use hand, knee, hip, shoulder, foot when the joint or part is named. bone = bone findings not at one named joint.
- vessels = aorta, great vessels, peripheral arteries/veins, blood pressure.
- Labs and tests go to the organ they reflect (troponin -> heart, TSH -> thyroid, PSA -> prostate, creatinine -> kidney).`;

async function call(items: { i: number; label: string; type: string; ctx: string }[]) {
  const user = items.map((x) => `${x.i}. ${x.label} [${x.type}] (in: ${x.ctx})`).join('\n');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'gpt-4o', temperature: 0, max_tokens: 4096, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 160)}`);
  return JSON.parse((await r.json()).choices[0].message.content).items as { i: number; sites: string[] }[];
}

async function main() {
  if (!KEY) throw new Error('OPENAI_API_KEY missing');
  const raw = fs.readFileSync('data/findings.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const canon = JSON.parse(fs.readFileSync('data/finding-canon.json', 'utf8'));
  const diseases = mergeDiseases(applyCanon(raw, canon).filter((d) => d.findings.length));
  const byId = new Map<string, { label: string; type: string; ctx: string[] }>();
  for (const d of diseases) for (const f of d.findings) {
    if (['course', 'size', 'geography'].includes(f.type)) continue;
    const e = byId.get(f.id) || { label: f.label, type: f.type, ctx: [] };
    if (e.ctx.length < 2) e.ctx.push(d.disease);
    byId.set(f.id, e);
  }
  const done: Record<string, string[]> = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const todo = [...byId].filter(([id]) => !(id in done)).slice(0, limit);
  const batches: [string, { label: string; type: string; ctx: string[] }][][] = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  console.log(`${byId.size} findings, ${todo.length} to tag in ${batches.length} batches`);
  let next = 0, tagged = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < batches.length) {
      const b = batches[next++];
      try {
        const res = await call(b.map(([, e], i) => ({ i, label: e.label, type: e.type, ctx: e.ctx.join(', ') })));
        for (const [i, [id]] of b.entries()) {
          const sites = (res.find((x) => x.i === i)?.sites || []).filter((s) => SITE_SET.has(s)).slice(0, 2);
          done[id] = sites; tagged++;
        }
        fs.writeFileSync(OUT, JSON.stringify(done));
        console.log(`batch ok (${tagged}/${todo.length})`);
      } catch (e) { console.error('batch failed:', String((e as Error).message).slice(0, 140)); }
    }
  }));
}
main();
