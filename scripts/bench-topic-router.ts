// Microbench for lib/topic-router — measures the router's own latency in isolation
// (no auth, no dev server). Answers "how much does routing actually cost per turn".
// Run: npx tsx scripts/bench-topic-router.ts
import { routeWith, __test } from '../lib/topic-router';

const SHORT = [
  'what causes pheochromocytoma',
  'tell me about nephrotic syndrome',
  'explain tetralogy of fallot',
  'how does asthma present',
  'turner syndrome features',
  'pulmonary embolism workup',
];
const VIGNETTE =
  'A 35-year-old woman presents with several days of productive cough, chills, ' +
  'fever, and pleuritic chest pain. Sputum is purulent with pink streaks. ' +
  'Temperature 38.3 C, pulse 98, respirations 22. Crackles on exam. What is the ' +
  'most likely diagnosis and next best step in management for this patient?';

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function bench(label: string, index: Awaited<ReturnType<typeof __test.buildIndex>>, utts: string[], iters: number) {
  // warm JIT
  for (let i = 0; i < 1000; i++) routeWith(index, utts[i % utts.length]);
  const samples: number[] = [];
  for (let i = 0; i < iters; i++) {
    const u = utts[i % utts.length];
    const t = performance.now();
    routeWith(index, u);
    samples.push(performance.now() - t);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  console.log(
    `${label.padEnd(22)} n=${iters}  mean=${mean.toFixed(4)}ms  p50=${pct(samples, 50).toFixed(4)}ms  ` +
    `p95=${pct(samples, 95).toFixed(4)}ms  max=${samples[samples.length - 1].toFixed(4)}ms`
  );
  return pct(samples, 50);
}

async function main() {
  const cold0 = performance.now();
  const index = await __test.buildIndex();
  const coldMs = performance.now() - cold0;
  console.log(`cold index build (one-time, cached after): ${coldMs.toFixed(1)}ms`);
  console.log(`phrase entries=${index.phrase.size}  token entries=${index.token.size}\n`);

  const shortP50 = bench('short query', index, SHORT, 10000);
  bench('full vignette', index, [VIGNETTE], 10000);

  console.log('\n--- counterfactual ---');
  const llmFloorLo = 200, llmFloorHi = 600; // hosted tiny-LLM router: network + inference
  console.log(`deterministic route (short, p50): ${shortP50.toFixed(4)} ms`);
  console.log(`hosted-LLM Brain 1 floor:          ${llmFloorLo}-${llmFloorHi} ms/turn`);
  console.log(
    `avoided per turn:                  ~${llmFloorLo}-${llmFloorHi} ms ` +
    `(${Math.round(llmFloorLo / shortP50)}-${Math.round(llmFloorHi / shortP50)}x faster)`
  );
  console.log('note: net turn cost is ~0 — routeTopic rides the chat route Promise.all behind searchBooks.');
}

main();
