// Dev-only: ElevenLabs TTS -> local Wav2Lip warm server -> lipsynced mp4.
// Same CSP-avoidance reasoning as /api/lipsync-test: browser only calls 'self',
// this route does both cross-origin hops (ElevenLabs, localhost:8765) server-side.
const LIPSYNC_SERVER = 'http://localhost:8765/lipsync';

export async function POST(request: Request) {
  const { text } = await request.json();
  if (!text) {
    return new Response('text required', { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('ELEVENLABS_API_KEY not set', { status: 500 });
  }

  const tTts0 = performance.now();
  const ttsRes = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2', output_format: 'mp3_44100_128' }),
    }
  );

  if (!ttsRes.ok) {
    const errBody = await ttsRes.text();
    return new Response(`ElevenLabs error ${ttsRes.status}: ${errBody}`, { status: ttsRes.status });
  }

  const mp3Buffer = await ttsRes.arrayBuffer();
  const ttsMs = performance.now() - tTts0;

  const form = new FormData();
  form.append('audio', new Blob([mp3Buffer], { type: 'audio/mpeg' }), 'speech.mp3');

  const tLip0 = performance.now();
  const lipsyncRes = await fetch(LIPSYNC_SERVER, { method: 'POST', body: form });
  if (!lipsyncRes.ok) {
    return new Response(`lipsync server error: ${lipsyncRes.status}`, { status: lipsyncRes.status });
  }
  const lipsyncBuffer = await lipsyncRes.arrayBuffer();
  const lipsyncMs = performance.now() - tLip0;

  console.log(`[lipsync-tts] tts=${ttsMs.toFixed(0)}ms (${mp3Buffer.byteLength}b) lipsync=${lipsyncMs.toFixed(0)}ms total=${(ttsMs + lipsyncMs).toFixed(0)}ms`);

  return new Response(lipsyncBuffer, { headers: { 'Content-Type': 'video/mp4' } });
}
