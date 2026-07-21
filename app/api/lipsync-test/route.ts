const LIPSYNC_SERVER = (process.env.WAV2LIP_HTTP_URL || 'http://localhost:8765') + '/lipsync';

export async function POST(request: Request) {
  const form = await request.formData();

  const res = await fetch(LIPSYNC_SERVER, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    return new Response(`lipsync server error: ${res.status}`, { status: res.status });
  }

  return new Response(res.body, {
    headers: { 'Content-Type': 'video/mp4' },
  });
}
