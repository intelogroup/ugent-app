// Dev-only proxy to the local Wav2Lip warm server (scratch/lipsync_test/Wav2Lip/server.py).
// Exists so the browser only ever calls 'self' (CSP connect-src requirement) — this route
// makes the actual cross-port call server-side, which isn't CSP-restricted.
const LIPSYNC_SERVER = 'http://localhost:8765/lipsync';

export async function POST(request: Request) {
  if (process.env.VERCEL) {
    return new Response('lipsync unavailable in prod (local Wav2Lip server only)', { status: 501 });
  }

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
