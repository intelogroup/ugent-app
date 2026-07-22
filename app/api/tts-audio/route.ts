// Used by the streaming avatar path — the browser plays this audio directly
// while opening its own WebSocket straight to the Wav2Lip warm server for
// video frames, so the two happen in parallel instead of the sequential
// TTS-then-lipsync-then-mux of /api/lipsync-tts.
//
// Tries local Kokoro (scripts/local-kokoro-server.py, :8767) first — better
// voice quality, now with comma-splitting for lower first-chunk latency.
// Falls back to Piper (:8768, ~9x faster but more robotic) if Kokoro is down,
// then ElevenLabs if both local servers are down. Local servers return WAV
// (PCM streamed via ffmpeg), ElevenLabs returns MP3.
const LOCAL_PIPER_URL = process.env.LOCAL_PIPER_URL || 'http://localhost:8768/tts';
const LOCAL_KOKORO_URL = process.env.LOCAL_KOKORO_URL || 'http://localhost:8767/tts';

// ElevenLabs pcm_24000 returns headerless raw PCM. Prepend a streaming-style
// WAV header (sizes = 0xFFFFFFFF, same placeholder trick the browser side
// already tolerates in stripWavHeader) so the existing incremental WAV path
// — the one Kokoro/Piper already use for synced audio+lipsync — handles
// ElevenLabs too, skipping the MP3 decode-then-send round trip entirely.
function wavHeader(sampleRate: number): Uint8Array {
  const buf = new ArrayBuffer(44);
  const v = new DataView(buf);
  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); v.setUint32(4, 0xffffffff, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  writeStr(36, 'data'); v.setUint32(40, 0xffffffff, true);
  return new Uint8Array(buf);
}

function prependWavHeader(body: ReadableStream<Uint8Array>, sampleRate: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let first = true;
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      if (first) { first = false; controller.enqueue(wavHeader(sampleRate)); }
      controller.enqueue(value);
    },
  });
}

function streamWithLatencyLog(body: ReadableStream<Uint8Array>, via: string, text: string, t0: number, contentType: string) {
  let bytes = 0;
  const timed = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      controller.enqueue(chunk);
    },
    flush() {
      console.log(
        `[tts-audio] via=${via} chars=${text.length} bytes=${bytes} total-latency=${(performance.now() - t0).toFixed(0)}ms`
      );
    },
  });
  return new Response(body.pipeThrough(timed), { headers: { 'Content-Type': contentType } });
}

export async function POST(request: Request) {
  const t0 = performance.now();
  const { text } = await request.json();
  if (!text) {
    return new Response('text required', { status: 400 });
  }

  // Kokoro/Piper only run on the dev machine — skip straight to ElevenLabs in prod.
  if (!process.env.VERCEL) {
    try {
      const kokoroRes = await fetch(LOCAL_KOKORO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (kokoroRes.ok) {
        console.log(`[tts-audio] via=kokoro chars=${text.length} time-to-first-byte=${(performance.now() - t0).toFixed(0)}ms`);
        return streamWithLatencyLog(kokoroRes.body!, 'kokoro', text, t0, 'audio/wav');
      }
      console.error(`local kokoro server returned ${kokoroRes.status}, falling back to Piper`);
    } catch (err) {
      console.error('local kokoro server unreachable, falling back to Piper', err);
    }

    try {
      const piperRes = await fetch(LOCAL_PIPER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (piperRes.ok) {
        console.log(`[tts-audio] via=piper chars=${text.length} time-to-first-byte=${(performance.now() - t0).toFixed(0)}ms`);
        return streamWithLatencyLog(piperRes.body!, 'piper', text, t0, 'audio/wav');
      }
      console.error(`local piper server returned ${piperRes.status}, falling back to ElevenLabs`);
    } catch (err) {
      console.error('local piper server unreachable, falling back to ElevenLabs', err);
    }
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('local kokoro server down and ELEVENLABS_API_KEY not set', { status: 500 });
  }

  // /stream (not the plain /v1/text-to-speech endpoint) sends audio chunks
  // back as ElevenLabs generates them — the non-stream endpoint buffers the
  // entire clip server-side before returning anything, which made this
  // route's own chunked Response pointless (confirmed via dry run: all
  // "chunks" landed within 1ms of each other, since there was nothing left
  // to stream by the time Node saw the first byte).
  // pcm_* output is gated to higher ElevenLabs tiers — accounts without it
  // get a silent 200 audio/mpeg response instead of an error, so the
  // content-type must be checked before trusting the format we asked for.
  const ELEVEN_PCM_SR = 24000;
  const pcmRes = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream',
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2', output_format: `pcm_${ELEVEN_PCM_SR}` }),
    }
  );

  if (!pcmRes.ok) {
    const errBody = await pcmRes.text();
    return new Response(`ElevenLabs error ${pcmRes.status}: ${errBody}`, { status: pcmRes.status });
  }

  const gotPcm = !(pcmRes.headers.get('content-type') || '').includes('mpeg');
  if (gotPcm && pcmRes.body) {
    console.log(`[tts-audio] via=elevenlabs-pcm chars=${text.length} time-to-first-byte=${(performance.now() - t0).toFixed(0)}ms`);
    return streamWithLatencyLog(prependWavHeader(pcmRes.body, ELEVEN_PCM_SR), 'elevenlabs-pcm', text, t0, 'audio/wav');
  }

  console.log(`[tts-audio] via=elevenlabs (account tier doesn't support pcm output, got mp3) chars=${text.length} latency=${(performance.now() - t0).toFixed(0)}ms`);
  return new Response(pcmRes.body, { headers: { 'Content-Type': pcmRes.headers.get('content-type') || 'audio/mpeg' } });
}
