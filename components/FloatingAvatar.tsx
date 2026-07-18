'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, PlayIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { useCleaAgent } from '@/lib/clea-agent-context';
import { stripMarkdown } from '@/lib/strip-markdown';

const SIZE = 140;

// Proxied through /api/lipsync-test (server-side) since the app's CSP connect-src only
// allows 'self' — the browser can't fetch localhost:8765 directly. Backs onto the local
// Wav2Lip warm server (scratch/lipsync_test/Wav2Lip/server.py) — dev-only latency test.
const LIPSYNC_SERVER = '/api/lipsync-test';

// Streaming path connects straight to the warm server's WebSocket (allowed via
// the ws://localhost:8765 CSP connect-src entry) instead of round-tripping a
// full mp4 through Next — frames paint as they arrive instead of waiting for
// TTS + inference + mux to fully finish. See scratch/lipsync_test/Wav2Lip/stream_test.html
// for the standalone version this was validated against (~350ms time-to-first-frame warm).
const STREAM_WS_URL = 'ws://localhost:8765/lipsync-stream';
const PREBUFFER_FRAMES = 8;

export default function FloatingAvatar() {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: typeof window === 'undefined' ? 300 : window.innerWidth - SIZE - 24,
    y: 24,
  }));
  const [videoSrc, setVideoSrc] = useState('/clea1-avatar-480p.mp4');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Guards against overlapping speak() calls (e.g. a fast second reply while
  // the first is still streaming) stacking multiple audio/WS flows at once.
  const activeSpeechRef = useRef<{ audio: HTMLAudioElement; ws: WebSocket } | null>(null);

  const stopSpeaking = () => {
    const active = activeSpeechRef.current;
    if (!active) return;
    activeSpeechRef.current = null;
    active.ws.close();
    active.audio.pause();
    setStreaming(false);
    setIsSpeaking(false);
  };

  const runLipsync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setLatencyMs(null);
    const t0 = performance.now();
    try {
      const audioBlob = await (await fetch('/test-lipsync-audio.wav')).blob();
      const form = new FormData();
      form.append('audio', audioBlob, 'audio.wav');
      const res = await fetch(LIPSYNC_SERVER, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`server returned ${res.status}`);
      const videoBlob = await res.blob();
      setVideoSrc(URL.createObjectURL(videoBlob));
      setLatencyMs(performance.now() - t0);
    } catch (err) {
      console.error('lipsync test failed', err);
      setLatencyMs(-1);
    } finally {
      setLoading(false);
    }
  };

  const speak = async (rawText: string) => {
    // Only one voice may play at a time — cancel whatever this widget was
    // already saying before starting the next reply.
    stopSpeaking();

    const text = stripMarkdown(rawText);
    setLoading(true);
    setLatencyMs(null);
    const t0 = performance.now();

    try {
      const audioRes = await fetch('/api/tts-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!audioRes.ok) throw new Error(`tts-audio returned ${audioRes.status}: ${await audioRes.text()}`);
      const audioBlob = await audioRes.blob();
      const audioBuf = await audioBlob.arrayBuffer();

      const audio = new Audio(URL.createObjectURL(audioBlob));
      const frames = new Map<number, ImageBitmap>();
      let fps = 25;
      let started = false;

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(STREAM_WS_URL);
        ws.binaryType = 'arraybuffer';
        activeSpeechRef.current = { audio, ws };

        ws.onopen = () => ws.send(audioBuf);

        ws.onmessage = async (ev) => {
          if (typeof ev.data === 'string') {
            fps = JSON.parse(ev.data).fps;
            return;
          }
          const buf = new Uint8Array(ev.data as ArrayBuffer);
          const idx = new DataView(buf.buffer, 0, 4).getUint32(0, false);
          const bitmap = await createImageBitmap(new Blob([buf.slice(4)], { type: 'image/jpeg' }));
          frames.set(idx, bitmap);

          if (!started && frames.size >= PREBUFFER_FRAMES) {
            started = true;
            setStreaming(true);
            setIsSpeaking(true);
            setLatencyMs(performance.now() - t0);
            audio.play().catch((err) => console.error('stream audio.play() failed', err));

            let lastDrawnIdx = -1;
            const canvas = canvasRef.current;
            // Raster resolution defaults to the CSS box size (SIZE), which is
            // soft on HiDPI screens — <video> scales natively, canvas doesn't.
            if (canvas) {
              const dpr = window.devicePixelRatio || 1;
              canvas.width = SIZE * dpr;
              canvas.height = SIZE * dpr;
            }
            const ctx = canvas?.getContext('2d');
            const paint = () => {
              const wantIdx = Math.floor(audio.currentTime * fps);
              const bitmap = frames.get(wantIdx) ?? frames.get(lastDrawnIdx);
              if (bitmap && ctx && canvas) {
                // object-fit: cover, done by hand — drawImage has no such mode,
                // and source frames (480x270) aren't square like the canvas.
                const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
                const sw = canvas.width / scale;
                const sh = canvas.height / scale;
                const sx = (bitmap.width - sw) / 2;
                const sy = (bitmap.height - sh) / 2;
                ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                lastDrawnIdx = frames.has(wantIdx) ? wantIdx : lastDrawnIdx;
              }
              if (!audio.ended) requestAnimationFrame(paint);
              else {
                activeSpeechRef.current = null;
                setStreaming(false);
                setIsSpeaking(false);
                resolve();
              }
            };
            requestAnimationFrame(paint);
          }
        };

        ws.onerror = () => reject(new Error('stream websocket error — is the Wav2Lip server up on :8765?'));
      });
    } catch (err) {
      console.error('tts stream failed', err);
      setLatencyMs(-1);
      activeSpeechRef.current = null;
      setStreaming(false);
      setIsSpeaking(false);
    } finally {
      setLoading(false);
    }
  };

  const runTtsStream = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = window.prompt('Text for Clea to say:', 'Hello, welcome back to Ugent. Ready to study?');
    if (text) void speak(text);
  };

  const { messages, status, micActive, toggleMic, micModelLoading, voiceSurface, setVoiceSurface, setIsSpeaking } =
    useCleaAgent();
  const lastSpokenIdRef = useRef<string | null>(null);
  const hasSeenInitialMessagesRef = useRef(false);

  useEffect(() => {
    // Skip the very first non-empty messages snapshot — that's history
    // restored from disk on mount, not a fresh reply to speak aloud.
    if (!hasSeenInitialMessagesRef.current) {
      if (messages.length > 0) {
        hasSeenInitialMessagesRef.current = true;
        lastSpokenIdRef.current = messages[messages.length - 1]?.id ?? null;
      }
      return;
    }

    if (status !== 'ready') return;
    // Only the surface the user is actually looking at speaks — a reply
    // sent from the plain text chat (or while the orb owns voice) must
    // stay silent here, otherwise text replies get spoken unexpectedly.
    if (voiceSurface !== 'avatar') return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.id === lastSpokenIdRef.current) return;

    lastSpokenIdRef.current = last.id;
    const text = last.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('');
    if (text.trim()) void speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status, voiceSurface]);

  // Stop any in-flight audio/WS as soon as this widget loses (or never
  // holds) the voice surface — e.g. the orb takes over — and on unmount.
  useEffect(() => {
    if (voiceSurface !== 'avatar') stopSpeaking();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSurface]);

  // The orb taking the voice surface means the widget itself must close,
  // not just go silent — otherwise both would sit open at once.
  useEffect(() => {
    if (expanded && voiceSurface === 'orb') setExpanded(false);
  }, [expanded, voiceSurface]);

  const clampPos = (x: number, y: number) => ({
    x: Math.min(Math.max(x, 0), window.innerWidth - SIZE),
    y: Math.min(Math.max(y, 0), window.innerHeight - SIZE),
  });

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      // bottom-anchored: mouse moving down should shrink `bottom`, not grow it
      setPos(
        clampPos(
          dragRef.current.posX + ev.clientX - dragRef.current.startX,
          dragRef.current.posY - (ev.clientY - dragRef.current.startY),
        ),
      );
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, posX: pos.x, posY: pos.y };
    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) return;
      setPos(
        clampPos(
          dragRef.current.posX + ev.touches[0].clientX - dragRef.current.startX,
          dragRef.current.posY - (ev.touches[0].clientY - dragRef.current.startY),
        ),
      );
    };
    const onEnd = () => {
      dragRef.current = null;
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          setVoiceSurface('avatar');
        }}
        aria-label="Open Clea avatar"
        className="fixed right-[104px] top-20 z-50 h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-lg transition hover:scale-105 md:right-[124px] md:top-6"
      >
        <img src="/clea-avatar-photo.png" alt="Clea" className="h-full w-full object-cover" />
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ left: pos.x, bottom: pos.y, width: SIZE, height: SIZE }}
      onMouseDown={handleDragStart}
      onTouchStart={handleTouchStart}
    >
      <div className="relative h-full w-full">
        {/* Circular clip lives on its own layer — corner-positioned buttons below sit
            outside this mask so they aren't clipped by the rounded-full circle. */}
        <div className="absolute inset-0 overflow-hidden rounded-full border-2 border-white shadow-2xl">
          <video
            key={videoSrc}
            src={videoSrc}
            autoPlay
            loop={videoSrc === '/clea1-avatar-480p.mp4'}
            muted={videoSrc === '/clea1-avatar-480p.mp4'}
            playsInline
            className="h-full w-full object-cover"
            style={{ display: streaming ? 'none' : 'block' }}
          />
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="h-full w-full object-cover"
            style={{ display: streaming ? 'block' : 'none' }}
          />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
            if (voiceSurface === 'avatar') setVoiceSurface(null);
          }}
          aria-label="Close avatar"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={runLipsync}
          disabled={loading}
          aria-label="Run lipsync test"
          className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 disabled:opacity-50"
        >
          <PlayIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleMic();
          }}
          disabled={micModelLoading}
          aria-label={micModelLoading ? 'Loading voice model' : micActive ? 'Stop listening' : 'Start listening'}
          aria-pressed={micActive}
          className={`absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full text-white transition disabled:cursor-wait disabled:opacity-50 ${
            micActive ? 'bg-primary-600' : 'bg-black/50 hover:bg-black/70'
          }`}
        >
          <MicrophoneIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={runTtsStream}
          disabled={loading}
          aria-label="Speak custom text (dev test)"
          className="absolute bottom-1 left-8 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 disabled:opacity-50"
        >
          <PlayIcon className="h-3.5 w-3.5 rotate-90" />
        </button>
      </div>
      {(loading || latencyMs !== null) && (
        <div className="absolute -bottom-6 left-0 w-full text-center text-xs font-medium text-neutral-700">
          {loading ? 'syncing...' : latencyMs === -1 ? 'failed (server down?)' : `${latencyMs!.toFixed(0)}ms`}
        </div>
      )}
    </div>
  );
}
