// Primary: ElevenLabs Scribe. Falls back to OpenAI gpt-4o-transcribe if
// ElevenLabs errors/is unreachable — same key already used for TTS.

// Vocabulary hint for the transcriber — steers decoding toward the terms this
// app uses, since the model has no domain context on a bare mic clip. High-
// frequency confusables the USMLE bank actually tests; extend as new mis-
// transcriptions surface (same maintenance model as ALIASES in asr-correct.ts).
const ASR_TERMS = [
  'tetralogy of Fallot', 'pulmonary embolism', 'asthma', 'tuberculosis', 'anaphylaxis',
  'Turner syndrome', 'myocardial infarction', 'atrial septal defect', 'ventricular septal defect',
  'patent ductus arteriosus', 'aortic stenosis', 'mitral regurgitation', 'murmur', 'dyspnea',
  'cyanosis', 'ischemia', 'Pathoma', 'First Aid', 'discriminator', 'differential diagnosis',
];
const ASR_PROMPT = `USMLE Step 1 medical tutoring. Terms: ${ASR_TERMS.join(', ')}.`;

async function transcribeElevenLabs(audio: Blob, filename: string, apiKey: string): Promise<string> {
  const forwardBody = new FormData();
  forwardBody.append('file', audio, filename);
  forwardBody.append('model_id', 'scribe_v2');
  forwardBody.append('language_code', 'eng');
  // Repeated field, one term per entry — a single comma-joined string is
  // treated as one keyterm and rejects on the API's 50-char-per-term cap.
  for (const term of ASR_TERMS) forwardBody.append('keyterms', term);

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: forwardBody,
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs STT error ${res.status}: ${await res.text()}`);
  }
  const { text } = (await res.json()) as { text: string };
  return text;
}

async function transcribeOpenAI(audio: Blob, filename: string, apiKey: string): Promise<string> {
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
    throw new Error(`OpenAI transcription error ${res.status}: ${await res.text()}`);
  }
  const { text } = (await res.json()) as { text: string };
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

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (elevenKey) {
    try {
      const text = await transcribeElevenLabs(audio, filename, elevenKey);
      console.log(`[whisper-transcribe] via=elevenlabs bytes=${audio.size} latency=${(performance.now() - t0).toFixed(0)}ms`);
      return Response.json({ text });
    } catch (err) {
      console.error('ElevenLabs transcription failed, falling back to OpenAI', err);
    }
  }

  if (!openaiKey) {
    console.error('Neither ELEVENLABS_API_KEY nor OPENAI_API_KEY set');
    return new Response('transcription unavailable', { status: 500 });
  }

  try {
    const text = await transcribeOpenAI(audio, filename, openaiKey);
    console.log(`[whisper-transcribe] via=openai bytes=${audio.size} latency=${(performance.now() - t0).toFixed(0)}ms`);
    return Response.json({ text });
  } catch (err) {
    console.error('OpenAI transcription request failed', err);
    return new Response('transcription failed', { status: 500 });
  }
}
