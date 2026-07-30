// Proxies mic audio to OpenAI's gpt-4o-transcribe.
// This is the only ASR path — no local fallback.

// Vocabulary hint for the transcriber — steers decoding toward the terms this
// app uses, since the model has no domain context on a bare mic clip. High-
// frequency confusables the USMLE bank actually tests; extend as new mis-
// transcriptions surface (same maintenance model as ALIASES in asr-correct.ts).
const ASR_PROMPT =
  'USMLE Step 1 medical tutoring. Terms: tetralogy of Fallot, pulmonary embolism, ' +
  'asthma, tuberculosis, anaphylaxis, Turner syndrome, myocardial infarction, ' +
  'atrial septal defect, ventricular septal defect, patent ductus arteriosus, ' +
  'aortic stenosis, mitral regurgitation, murmur, dyspnea, cyanosis, ischemia, ' +
  'Pathoma, First Aid, discriminator, differential diagnosis.';

export async function POST(request: Request) {
  const t0 = performance.now();
  const incoming = await request.formData();
  const audio = incoming.get('audio');
  if (!(audio instanceof Blob)) {
    return new Response('audio file required', { status: 400 });
  }
  const filename = audio instanceof File && audio.name ? audio.name : 'audio.webm';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set');
    return new Response('OpenAI transcription unavailable', { status: 500 });
  }

  try {
    const forwardBody = new FormData();
    forwardBody.append('file', audio, filename);
    forwardBody.append('model', 'gpt-4o-transcribe');
    forwardBody.append('language', 'en');
    forwardBody.append('prompt', ASR_PROMPT);

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: forwardBody,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`OpenAI transcription error ${res.status}: ${errBody}`);
      return new Response('OpenAI transcription failed', { status: res.status });
    }

    const { text } = (await res.json()) as { text: string };
    console.log(
      `[whisper-transcribe] bytes=${audio.size} latency=${(performance.now() - t0).toFixed(0)}ms`
    );
    return Response.json({ text });
  } catch (err) {
    console.error('OpenAI transcription request failed', err);
    return new Response('OpenAI transcription failed', { status: 500 });
  }
}
