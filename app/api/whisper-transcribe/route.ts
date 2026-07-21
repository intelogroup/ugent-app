// Proxies mic audio to OpenAI's gpt-4o-mini-transcribe first — best accuracy
// on medical terminology. Falls back to the local faster-whisper (large-v3-turbo)
// server (scripts/local-whisper-server.py, :8766) if OpenAI errors or the API
// key is missing, then use-whisper-mic.ts falls back further to the
// in-browser Whisper pipeline if that also fails.
const LOCAL_WHISPER_URL = process.env.LOCAL_WHISPER_URL || 'http://localhost:8766/transcribe';

async function transcribeLocal(audio: Blob, filename: string): Promise<string> {
  const localBody = new FormData();
  localBody.append('audio', audio, filename);
  const localRes = await fetch(LOCAL_WHISPER_URL, { method: 'POST', body: localBody });
  if (!localRes.ok) throw new Error(`local whisper server returned ${localRes.status}`);
  const { text } = (await localRes.json()) as { text: string };
  return text;
}

export async function POST(request: Request) {
  const t0 = performance.now();
  const incoming = await request.formData();
  const audio = incoming.get('audio');
  if (!(audio instanceof Blob)) {
    return new Response('audio file required', { status: 400 });
  }
  const filename = audio instanceof File && audio.name ? audio.name : 'audio.webm';

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      // Forward the original filename/extension — OpenAI sniffs container
      // format from it. Hardcoding '.webm' here broke non-webm recordings
      // (e.g. Safari's MediaRecorder produces mp4), rejected as "corrupted"
      // despite valid audio.
      const forwardBody = new FormData();
      forwardBody.append('file', audio, filename);
      forwardBody.append('model', 'gpt-4o-mini-transcribe');
      // Without this, short/jargon-heavy clips get auto-detected as the wrong
      // language and come back garbled — force English since that's all this
      // app ever sends.
      forwardBody.append('language', 'en');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: forwardBody,
      });

      if (res.ok) {
        const { text } = (await res.json()) as { text: string };
        console.log(
          `[whisper-transcribe] via=openai bytes=${audio.size} latency=${(performance.now() - t0).toFixed(0)}ms`
        );
        return Response.json({ text });
      }
      const errBody = await res.text();
      console.error(`OpenAI transcription error ${res.status}: ${errBody}, falling back to local`);
    } catch (err) {
      console.error('OpenAI transcription request failed, falling back to local', err);
    }
  } else {
    console.error('OPENAI_API_KEY not set, falling back to local whisper server');
  }

  try {
    const text = await transcribeLocal(audio, filename);
    console.log(
      `[whisper-transcribe] via=local bytes=${audio.size} latency=${(performance.now() - t0).toFixed(0)}ms`
    );
    return Response.json({ text });
  } catch (err) {
    console.error('local whisper server also failed', err);
    return new Response('OpenAI and local whisper server both unavailable', { status: 500 });
  }
}
