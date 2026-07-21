// Dry run only — verifies OpenAI's streaming transcription (SSE deltas)
// actually behaves as expected before wiring it into use-whisper-mic.ts.
// Run: node scripts/dry-run-whisper-streaming.mjs
import { readFile } from 'node:fs/promises';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY not set in environment');
  process.exit(1);
}

const audioPath = new URL('../public/test-lipsync-audio.wav', import.meta.url);
const audioBuf = await readFile(audioPath);

const form = new FormData();
form.append('file', new Blob([audioBuf], { type: 'audio/wav' }), 'audio.wav');
form.append('model', 'gpt-4o-mini-transcribe');
form.append('stream', 'true');

const t0 = performance.now();
const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: form,
});

if (!res.ok || !res.body) {
  console.error(`request failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log(`[dry-run] request sent, status ${res.status}, reading SSE stream...\n`);

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let fullText = '';
let eventCount = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // SSE frames are separated by a blank line — OpenAI sends \r\n\r\n.
  const frames = buffer.split(/\r?\n\r?\n/);
  buffer = frames.pop() ?? '';

  for (const frame of frames) {
    const line = frame.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') continue;

    eventCount++;
    const t = (performance.now() - t0).toFixed(0);
    try {
      const parsed = JSON.parse(payload);
      console.log(`[+${t}ms] event #${eventCount} type=${parsed.type}`, JSON.stringify(parsed).slice(0, 200));
      if (parsed.type === 'transcript.text.delta' && parsed.delta) fullText += parsed.delta;
      if (parsed.type === 'transcript.text.done' && parsed.text) fullText = parsed.text;
    } catch {
      console.log(`[+${t}ms] event #${eventCount} (unparsed)`, payload.slice(0, 200));
    }
  }
}

const totalMs = (performance.now() - t0).toFixed(0);
console.log(`\n[dry-run] stream ended after ${totalMs}ms, ${eventCount} events`);
console.log(`[dry-run] final text: "${fullText}"`);
