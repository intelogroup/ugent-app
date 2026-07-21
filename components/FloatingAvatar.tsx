'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, PlayIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { useCleaAgent } from '@/lib/clea-agent-context';
import { stripMarkdown } from '@/lib/strip-markdown';

const SIZE = 140;

// Streaming path connects straight to the warm server's WebSocket (allowed via
// the ws://localhost:8765 CSP connect-src entry) instead of round-tripping a
// full mp4 through Next — frames paint as they arrive instead of waiting for
// TTS + inference + mux to fully finish. See scratch/lipsync_test/Wav2Lip/stream_test.html
// for the standalone version this was validated against (~350ms time-to-first-frame warm).
const STREAM_WS_URL = 'ws://localhost:8765/lipsync-stream';
const PREBUFFER_FRAMES = 2;
// Wav2Lip only runs on the dev machine — prod builds fall back to audio-only
// (static avatar, no lipsync video) instead of trying an unreachable localhost WS.
const ENABLE_LIPSYNC = process.env.NODE_ENV === 'development';

export default function FloatingAvatar() {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: typeof window === 'undefined' ? 300 : window.innerWidth - SIZE - 24,
    y: 24,
  }));
  const videoSrc = '/clea_avatar.mp4';
  // Prefetch /api/tts-audio while LLM streams. On each text tick, abort
  // old request and restart with accumulated text. When LLM finishes, the
  // last prefetched response (if resolved) is handed directly to Wav2Lip —
  // saving one Kokoro round-trip from the critical path.
  const prefetchRef = useRef<{
    controller: AbortController;
    text: string;
    response: Promise<Response | null>;
  } | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Guards against overlapping speak() calls (e.g. a fast second reply while
  // the first is still streaming) stacking multiple audio/WS flows at once.
  const activeSpeechRef = useRef<{ audio: HTMLAudioElement; ws: WebSocket | null } | null>(null);
  const orphanAudiosRef = useRef<Set<HTMLAudioElement>>(new Set());
  const lastSpokenTextRef = useRef<string | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Playback queue for manual replay/test clips and completed assistant replies.
  // speak() resolves only once the current audio+lipsync clip fully finishes.
  const queueRef = useRef<string[]>([]);
  const pumpingRef = useRef(false);

  // Called at the top of every speak() too (cancels a stray previous clip),
  // so it must NOT clear queueRef. Callers that want a full interrupt
  // (barge-in, surface switch, manual replay) clear queueRef themselves first.
  const stopSpeaking = () => {
    for (const el of orphanAudiosRef.current) {
      el.pause();
      el.src = '';
    }
    orphanAudiosRef.current.clear();
    const active = activeSpeechRef.current;
    if (!active) return;
    activeSpeechRef.current = null;
    active.ws?.close();
    active.audio.pause();
    active.audio.src = '';
    setStreaming(false);
    setIsSpeaking(false);
  };

  const replayLast = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lastSpokenTextRef.current) {
      interruptSpeech();
      enqueueSpeech(lastSpokenTextRef.current);
    }
  };

  const speak = async (rawText: string) => {
    // Only one voice may play at a time — cancel whatever this widget was
    // already saying before starting the next reply.
    stopSpeaking();

    const text = stripMarkdown(rawText);
    lastSpokenTextRef.current = text;
    setLoading(true);
    setLatencyMs(null);
    const t0 = performance.now();
    const audio = new Audio();
    orphanAudiosRef.current.add(audio);
    try {
      // Check prefetch cache first — background fetch started while LLM
      // was still streaming may have already downloaded this audio.
      let audioRes: Response | null = null;
      const cached = prefetchRef.current;

      if (cached && cached.text === text) {
        audioRes = await cached.response;
        console.log(`[tts] prefetch HIT text=${text.length}chars ok=${audioRes?.ok} at +${(performance.now() - t0).toFixed(0)}ms`);
        if (!audioRes?.ok) audioRes = null;
        prefetchRef.current = null;
      }
      if (!audioRes) {
        console.log(`[tts] prefetch MISS (or text mismatch), aborting stale prefetch, fetching fresh`);
        prefetchRef.current?.controller.abort();
        prefetchRef.current = null;
        audioRes = await fetch('/api/tts-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
      }
      if (!audioRes.ok || !audioRes.body) {
        throw new Error(`tts-audio returned ${audioRes.status}: ${audioRes.body ? await audioRes.text() : 'no body'}`);
      }

      const frames = new Map<number, ImageBitmap>();
      let fps = 25;
      let videoStarted = false;
      let audioStarted = false;
      let chunkCount = 0;
      const chunks: Uint8Array[] = [];

      const startAudioPlayback = () => {
        if (audioStarted) return;
        audioStarted = true;
        const ms = performance.now() - t0;
        console.log(`[tts] AUDIO STARTED at +${ms.toFixed(0)}ms (after ${chunkCount} chunk(s))`);
        setIsSpeaking(true);
        setLatencyMs(ms);
        audio.play().catch((err) => console.error('audio.play() failed', err));
      };

      // Detect audio format from response — local TTS returns WAV,
      // ElevenLabs fallback returns MP3.
      const isWav = audioRes.headers.get('content-type')?.includes('wav') ?? true;
      console.log(`[tts] audio format=${isWav ? 'WAV' : 'MP3'}`);

      // Try MediaSource streaming. WAV path uses incremental PCM to Wav2Lip;
      // MP3 (ElevenLabs fallback) uses old full-buffer approach.
      const canStreamAudio = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(isWav ? 'audio/wav' : 'audio/mpeg');

      let mediaSource: MediaSource | null = null;
      let sourceBuffer: SourceBuffer | null = null;
      if (canStreamAudio) {
        mediaSource = new MediaSource();
        audio.src = URL.createObjectURL(mediaSource);
      }

      const ws = ENABLE_LIPSYNC ? new WebSocket(STREAM_WS_URL) : null;
      if (ws) ws.binaryType = 'arraybuffer';
      activeSpeechRef.current = { audio, ws };

      // Strip WAV header from first chunk — Wav2Lip expects raw PCM.
      // Search for "data" marker to handle any ffmpeg-produced variant.
      // Also read the sample rate (bytes 24-27, little-endian) so Wav2Lip
      // can resample to its expected 16kHz — Kokoro emits 24kHz, Piper
      // 22050Hz, and feeding either straight into the 16kHz-assumed mel
      // pipeline made mouth movement drift out of sync with the audio.
      function stripWavHeader(chunk: Uint8Array): { pcm: Uint8Array; sampleRate: number | null } {
        for (let i = 0; i < Math.min(chunk.length - 4, 256); i++) {
          if (chunk[i] === 0x64 && chunk[i+1] === 0x61 &&
              chunk[i+2] === 0x74 && chunk[i+3] === 0x61) {
            const sampleRate = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength).getUint32(24, true);
            return { pcm: chunk.slice(i + 8), sampleRate };
          }
        }
        return { pcm: chunk, sampleRate: null };
      }

      const reader = audioRes.body!.getReader();
      let wavHeaderStripped = false;
      const pcmBuffer: Uint8Array[] = [];
      let pendingSampleRate: number | null = null;

      const processChunk = (value: Uint8Array) => {
        chunkCount++;
        chunks.push(value);
        if (!isWav) return; // MP3: no incremental Wav2Lip
        let pcm = value;
        if (!wavHeaderStripped) {
          const stripped = stripWavHeader(value);
          pcm = stripped.pcm;
          wavHeaderStripped = true;
          pendingSampleRate = stripped.sampleRate;
        }
        if (pcm.length === 0 || !ws) return;
        if (ws.readyState === WebSocket.OPEN) {
          if (pendingSampleRate) {
            ws.send(JSON.stringify({ sampleRate: pendingSampleRate }));
            pendingSampleRate = null;
          }
          ws.send(pcm);
        } else {
          pcmBuffer.push(pcm);
        }
      };

      // Start reading chunks immediately. Await sourceBuffer setup before
      // appending — reader yields for network (localhost ~ms), sourceopen is
      // a microtask, so this is safe in practice.
      (async () => {
        if (mediaSource) {
          await new Promise<void>((resolve) => {
            mediaSource!.addEventListener('sourceopen', () => resolve(), { once: true });
          });
          sourceBuffer = mediaSource.addSourceBuffer(isWav ? 'audio/wav' : 'audio/mpeg');
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            processChunk(value);
            if (sourceBuffer) {
              const isFirst = chunkCount === 1;
              await new Promise<void>((resolve, reject) => {
                sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
                sourceBuffer!.addEventListener('error', () => reject(new Error('sourceBuffer append failed')), { once: true });
                sourceBuffer!.appendBuffer(value as BufferSource);
              });
              if (isFirst) startAudioPlayback();
            }
          }
          if (mediaSource && mediaSource.readyState === 'open') mediaSource.endOfStream();
          console.log(`[tts] all chunks received at +${(performance.now() - t0).toFixed(0)}ms (${chunkCount} total)`);
          if (!canStreamAudio) {
            const audioType = isWav ? 'audio/wav' : 'audio/mpeg';
            const total = chunks.reduce((sum, c) => sum + c.length, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) { merged.set(c, offset); offset += c.length; }
            audio.src = URL.createObjectURL(new Blob([merged], { type: audioType }));
            startAudioPlayback();
          }
          // For MP3 (ElevenLabs): send merged buffer after full download
          if (!isWav && chunkCount > 0 && ws) {
            const total = chunks.reduce((sum, c) => sum + c.length, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) { merged.set(c, offset); offset += c.length; }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(merged);
            } else {
              pcmBuffer.push(merged);
            }
            console.log(`[tts] sent/queued merged MP3 buffer (${total} bytes) for Wav2Lip`);
          }
        } catch (err) {
          console.error('[tts] read error', err);
        }
      })();

      if (!ws) {
        // Audio-only prod fallback: no lipsync video, just wait for playback to finish.
        await new Promise<void>((resolve) => {
          audio.addEventListener('ended', () => {
            activeSpeechRef.current = null;
            orphanAudiosRef.current.delete(audio);
            setIsSpeaking(false);
            resolve();
          }, { once: true });
        });
        return;
      }

      await new Promise<void>((resolve, reject) => {
        ws.onclose = () => resolve();

        ws.onopen = () => {
          console.log(`[tts] lipsync WS open at +${(performance.now() - t0).toFixed(0)}ms`);
          if (pendingSampleRate) {
            ws.send(JSON.stringify({ sampleRate: pendingSampleRate }));
            pendingSampleRate = null;
          }
          // Flush buffered PCM chunks
          for (const pcm of pcmBuffer) ws.send(pcm);
          pcmBuffer.length = 0;
        };

        ws.onmessage = async (ev) => {
          if (typeof ev.data === 'string') {
            fps = JSON.parse(ev.data).fps;
            return;
          }
          const buf = new Uint8Array(ev.data as ArrayBuffer);
          const idx = new DataView(buf.buffer, 0, 4).getUint32(0, false);
          const bitmap = await createImageBitmap(new Blob([buf.slice(4)], { type: 'image/jpeg' }));
          frames.set(idx, bitmap);

          if (!videoStarted && frames.size >= PREBUFFER_FRAMES) {
            videoStarted = true;
            console.log(`[tts] VIDEO STARTED (${PREBUFFER_FRAMES} frames prebuffered) at +${(performance.now() - t0).toFixed(0)}ms`);
            setStreaming(true);

            let lastDrawnIdx = -1;
            const canvas = canvasRef.current;
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
                console.log(`[tts] DONE at +${(performance.now() - t0).toFixed(0)}ms`);
                activeSpeechRef.current = null;
                orphanAudiosRef.current.delete(audio);
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
      orphanAudiosRef.current.delete(audio);
      setStreaming(false);
      setIsSpeaking(false);
    } finally {
      setLoading(false);
    }
  };

  const runTtsStream = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = window.prompt('Text for Clea to say:', 'Hello, welcome back to Ugent. Ready to study?');
    if (text) {
      interruptSpeech();
      enqueueSpeech(text);
    }
  };

  const {
    messages,
    status,
    micActive,
    toggleMic,
    micModelLoading,
    voiceSurface,
    setVoiceSurface,
    setIsSpeaking,
    registerSpeechInterrupt,
  } = useCleaAgent();
  const lastSpokenIdRef = useRef<string | null>(null);
  const hasSeenInitialMessagesRef = useRef(false);
  // Which assistant message is currently forming or playing. A fresh reply
  // interrupts older playback instead of stacking audio over it.
  const activeMessageIdRef = useRef<string | null>(null);

  const pumpQueue = async () => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        await speak(next);
      }
    } finally {
      pumpingRef.current = false;
    }
  };

  const enqueueSpeech = (text: string) => {
    queueRef.current.push(text);
    void pumpQueue();
  };

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

    // Only the surface the user is actually looking at speaks — a reply
    // sent from the plain text chat (or while the orb owns voice) must
    // stay silent here, otherwise text replies get spoken unexpectedly.
    if (voiceSurface !== 'avatar') return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (last.id === lastSpokenIdRef.current && status !== 'streaming') return;

    if (last.id !== activeMessageIdRef.current) {
      interruptSpeech();
      activeMessageIdRef.current = last.id;
    }

    const text = last.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('');

    // Prefetch TTS audio while LLM streams. Debounce 300ms — avoids flooding
    // Kokoro's single uvicorn worker with aborted connections (observed >80
    // stale FDs starving the server).
    if (status === 'streaming' && text.length > 10) {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = setTimeout(() => {
        prefetchRef.current?.controller.abort();
        const controller = new AbortController();
        prefetchRef.current = {
          controller,
          text,
          response: fetch('/api/tts-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal,
          }).catch(() => null),
        };
      }, 300);
    }

    // Speak full reply as ONE clip once LLM finishes.
    // Per-sentence streaming created ~2-3s gaps between sentences
    // (each sentence paid full Wav2Lip round-trip tax). Kokoro
    // internally comma-splits streaming within a single request,
    // so one shot plays gaplessly.
    if (status !== 'streaming') {
      if (text.trim()) enqueueSpeech(text);
      lastSpokenIdRef.current = last.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status, voiceSurface]);

  // Stop any in-flight audio/WS as soon as this widget loses (or never
  // holds) the voice surface — e.g. the orb takes over — and on unmount.
  const interruptSpeech = () => {
    queueRef.current = [];
    stopSpeaking();
  };

  useEffect(() => {
    if (voiceSurface !== 'avatar') {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
      interruptSpeech();
    }
    return () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
      interruptSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSurface]);

  // Let the mic's barge-in detector kill this widget's TTS the moment it
  // fires — only while this widget actually owns the voice surface, so a
  // barge-in never reaches into a surface that isn't speaking.
  useEffect(() => {
    if (voiceSurface !== 'avatar') return;
    registerSpeechInterrupt(interruptSpeech);
    return () => registerSpeechInterrupt(null);
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
        <img src="/clea2-avatar-photo.png" alt="Clea" className="h-full w-full object-cover" />
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
            loop
            muted
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
          onClick={replayLast}
          disabled={loading || !lastSpokenTextRef.current}
          aria-label="Replay last reply"
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
