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
  const ttsRes = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream',
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

  console.log(`[tts-audio] via=elevenlabs chars=${text.length} latency=${(performance.now() - t0).toFixed(0)}ms`);
  return new Response(ttsRes.body, { headers: { 'Content-Type': ttsRes.headers.get('content-type') || 'audio/mpeg' } });
}
