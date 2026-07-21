import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set in .env.local" }, { status: 500 });
  }

  let body: { text: string; voiceId?: string; modelId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { text, voiceId = "21m00Tcm4TlvDq8ikWAM", modelId = "eleven_turbo_v2" } = body;
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        output_format: "mp3_44100_128",
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[elevenlabs-tts] upstream error", res.status, errBody);
    return NextResponse.json({ error: `ElevenLabs API ${res.status}: ${errBody}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({
    audio: data.audio_base64,
    alignment: data.alignment ?? null,
    normalized_alignment: data.normalized_alignment ?? null,
  });
}
