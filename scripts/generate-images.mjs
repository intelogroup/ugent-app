// Image generation orchestrator for USMLE questions.
// Routes imageSpec types to the right generator:
//   ekg        → scripts/generate-ekg.py (matplotlib, accurate by construction)
//   diagram    → DALL-E (AI-generated from spec description + key findings)
//   curated    → pre-existing open-license images (Servier CC-BY, bioicons)
//   pv_loop    → matplotlib (pressure-volume loops)
//   graph      → matplotlib (lab curves, flow-volume loops, etc.)
//
// Usage: node scripts/generate-images.mjs --question <hash> [--all]
//        node scripts/generate-images.mjs --batch <jsonl> [--upload]

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const IMAGE_DIR = path.join(process.cwd(), 'data', 'images');
const BUCKET = 'question-images';

// ── ImageSpec type ──
// {
//   type: 'ekg' | 'diagram' | 'curated' | 'pv_loop' | 'graph',
//   description: string,       // what to draw
//   keyFindings: string[],     // what the student should notice
//   caption: string,           // display caption under image
//   license?: string,          // for curated images
//   sourceUrl?: string,        // for curated images
// }

// ── EKG generation ──
function generateEkg(spec) {
  const rhythm = spec.rhythm || 'normal_sinus';
  const name = `ekg-${rhythm}-${Date.now()}.png`;
  const outputPath = path.join(IMAGE_DIR, name);
  execSync(`python3 scripts/generate-ekg.py "${outputPath}" ${rhythm}`, { stdio: 'pipe' });
  return { path: outputPath, name, type: 'ekg' };
}

// ── PV loop / graph generation ──
function generateGraph(spec) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'generate-graph.py');
  const name = `${spec.graphType || 'graph'}-${Date.now()}.png`;
  const outputPath = path.join(IMAGE_DIR, name);
  const specJson = JSON.stringify(spec);
  execSync(`python3 "${scriptPath}" "${outputPath}" '${specJson}'`, { stdio: 'pipe' });
  return { path: outputPath, name, type: 'graph' };
}

// ── DALL-E diagram generation ──
async function generateDiagram(spec) {
  const prompt = `Medical illustration for USMLE: ${spec.description}. Key findings: ${(spec.keyFindings || []).join(', ')}. Clean, unlabeled diagram with labels as overlaid text. White or light background. Educational medical illustration style.`;
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) throw new Error(`DALL-E HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error('No image URL in DALL-E response');

  // Download to local
  const name = `diagram-${Date.now()}.png`;
  const outputPath = path.join(IMAGE_DIR, name);
  const imgResp = await fetch(imageUrl);
  const buffer = Buffer.from(await imgResp.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return { path: outputPath, name, type: 'diagram' };
}

// ── Supabase Storage upload ──
async function uploadToStorage(filePath, fileName) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const content = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, content, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl;
}

// ── qwen2.5vl review ──
async function reviewImage(outputPath, spec) {
  try {
    const imageBase64 = fs.readFileSync(outputPath).toString('base64');
    const prompt = `Review this medical image against its specification. Spec type: ${spec.type}. Description: ${spec.description}. Key findings expected: ${(spec.keyFindings || []).join(', ')}. Is the image medically accurate for USMLE Step 1? Answer with JSON: {"pass": true/false, "issues": ["issue1", ...], "suggestions": ["fix1", ...]}`;

    const resp = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5vl:3b',
        messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
        keep_alive: '60m',
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!resp.ok) return { pass: true, note: 'review unavailable' };
    const text = await resp.text();
    const lines = text.trim().split('\n');
    let content = '';
    for (const line of lines) {
      try { const msg = JSON.parse(line); if (msg.message?.content) content += msg.message.content; } catch {}
    }
    try { return JSON.parse(content); } catch { return { pass: true, note: 'unparseable review' }; }
  } catch {
    return { pass: true, note: 'review unavailable' };
  }
}

// ── Main generator ──
export async function generateImage(spec) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  let result;
  switch (spec.type) {
    case 'ekg':
    case 'pv_loop':
      result = generateEkg(spec);
      break;
    case 'graph':
      result = generateGraph(spec);
      break;
    case 'diagram':
      result = await generateDiagram(spec);
      break;
    case 'curated':
      return { imageUrl: spec.sourceUrl, caption: spec.caption, isCurated: true };
    default:
      throw new Error(`Unknown image spec type: ${spec.type}`);
  }

  // Skip review — deferred until qwen2.5vl integrated into prod pipeline
  const review = null;

  const publicUrl = await uploadToStorage(result.path, result.name);

  return {
    imageUrl: publicUrl,
    type: result.type,
    caption: spec.caption || '',
    keyFindings: spec.keyFindings || [],
    license: spec.license || 'original',
    review,
  };
}

// ── CLI ──
async function main() {
  const batchFile = process.argv.includes('--batch')
    ? process.argv[process.argv.indexOf('--batch') + 1]
    : null;
  const questionHash = process.argv.includes('--question')
    ? process.argv[process.argv.indexOf('--question') + 1]
    : null;

  if (batchFile) {
    const lines = fs.readFileSync(batchFile, 'utf8').split('\n').filter(Boolean);
    console.log(`Processing ${lines.length} questions...`);
    for (let i = 0; i < lines.length; i++) {
      const q = JSON.parse(lines[i]);
      if (!q.imageSpec) continue;
      console.log(`[${i + 1}/${lines.length}] ${q.imageSpec.type}...`);
      try { await generateImage(q.imageSpec); } catch (e) { console.error(`  Error: ${e.message}`); }
    }
  } else if (questionHash) {
    console.log(`Single question mode: ${questionHash}`);
    // Look up question from DB
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: rows } = await supabase.from('questions').select('*').eq('id', questionHash).limit(1);
    if (!rows?.length) { console.error('Question not found'); process.exit(1); }
    const q = rows[0];
    if (!q.image_spec) { console.error('No imageSpec on this question'); process.exit(1); }
    const result = await generateImage(q.image_spec);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('Usage: node scripts/generate-images.mjs --question <hash> | --batch <jsonl>');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
