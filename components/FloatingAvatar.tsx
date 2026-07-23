'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, PlayIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { useCleaAgent } from '@/lib/clea-agent-context';
import { stripMarkdown } from '@/lib/strip-markdown';

const SIZE = 200;

const STREAM_WS_URL = process.env.NEXT_PUBLIC_WAV2LIP_WS_URL || 'ws://localhost:8765/lipsync-stream';
const PREBUFFER_FRAMES = 2;
// Both clea1 sources (idle loop + Wav2Lip face clip) are the same 250-frame
// clip — breaks if either is swapped for a different-length clip.
const CLIP_FRAME_COUNT = 250;
const ENABLE_LIPSYNC = process.env.NODE_ENV === 'development' || !!process.env.NEXT_PUBLIC_WAV2LIP_WS_URL;

// Spoken instantly while the real reply is still computing (RAG + LLM
// generation can take a couple seconds) so the user hears something within
// ~1s instead of staring at silence. Deliberately generic — never references
// message content, so it's safe to fire before we know what the question was.
const FILLER_PHRASES = ['One moment.', 'Let me check that.', 'Give me a second.'];
const FILLER_DELAY_MS = 700;

export default function FloatingAvatar() {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: typeof window === 'undefined' ? 300 : window.innerWidth - SIZE - 24,
    y: 24,
  }));
  const THUMB_SIZE = 64;
  const [thumbPos, setThumbPos] = useState(() => ({
    x: typeof window === 'undefined' ? 300 : window.innerWidth - THUMB_SIZE - 48,
    y: 48,
  }));
  const videoSrc = '/clea1-avatar-480p.mp4';
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
  // Paused/resumed imperatively at each setStreaming call site (not via a
  // useEffect watching `streaming`) — an effect fires a render tick after
  // the opacity style is applied, so the video kept playing live for an
  // extra frame right as the crossfade started, reading as a black/smeared
  // pop at the exact transition instant.
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  // Idle video and Wav2Lip's face source are the same clip (confirmed by
  // frame diff), so seeking idle to this timestamp before resuming makes
  // the freeze-frame match the last live canvas frame instead of whatever
  // random point the idle loop happened to be at — that pose mismatch was
  // the actual cause of the talk->idle flick, not transition timing.
  const lastFrameTimeRef = useRef(0);
  // Resume the idle video at the frame matching Wav2Lip's last output, then
  // run onReady (which flips `streaming` off, starting the crossfade). We gate
  // the crossfade on the 'seeked' event: setting currentTime updates the
  // property instantly but the decoded pixels lag ~1 frame, so firing the
  // fade immediately can blend the stale pre-seek frame in for a frame at the
  // exact transition. Waiting for 'seeked' means the video shows the matched
  // frame before it ever becomes visible. Canvas holds its last frame (opaque)
  // during the short wait, so nothing flickers.
  const resumeIdleVideo = (onReady: () => void) => {
    const video = idleVideoRef.current;
    if (!video) { onReady(); return; }
    const start = () => { video.play().catch(() => {}); onReady(); };
    const target = lastFrameTimeRef.current;
    if (target > 0 && Math.abs(video.currentTime - target) > 0.02) {
      let done = false;
      const fire = () => { if (done) return; done = true; video.removeEventListener('seeked', fire); start(); };
      video.addEventListener('seeked', fire);
      video.currentTime = target;
      setTimeout(fire, 120); // fallback if 'seeked' never fires
    } else {
      start();
    }
  };
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Guards against overlapping speak() calls (e.g. a fast second reply while
  // the first is still streaming) stacking multiple audio/WS flows at once.
  const activeSpeechRef = useRef<{ audio: HTMLAudioElement; ws: WebSocket | null; endAudio?: () => void } | null>(null);
  const orphanAudiosRef = useRef<Set<HTMLAudioElement>>(new Set());
  const lastSpokenTextRef = useRef<string | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Playback queue for manual replay/test clips and completed assistant replies.
  // speak() resolves only once the current audio+lipsync clip fully finishes.
  const queueRef = useRef<string[]>([]);
  const pumpingRef = useRef(false);

  // Bumped by every stopSpeaking(). speak() captures the value at entry and
  // bails at each await boundary once it no longer matches — without this a
  // barge-in landing before the TTS fetch resolves cancels nothing (there is
  // no activeSpeechRef yet), and the stale closure goes on to create and play
  // its own audio on top of the reply that replaced it.
  const speechGenRef = useRef(0);

  // Called at the top of every speak() too (cancels a stray previous clip),
  // so it must NOT clear queueRef. Callers that want a full interrupt
  // (barge-in, surface switch, manual replay) clear queueRef themselves first.
  const stopSpeaking = () => {
    speechGenRef.current++;
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
    active.endAudio?.();
    resumeIdleVideo(() => { setStreaming(false); setIsSpeaking(false); });
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
    const gen = speechGenRef.current;
    const stale = () => gen !== speechGenRef.current;

    const text = stripMarkdown(rawText);
    lastSpokenTextRef.current = text;
    setLoading(true);
    setLatencyMs(null);
    const t0 = performance.now();
    const audio = new Audio();
    orphanAudiosRef.current.add(audio);
    // Chrome's MediaSource never accepted 'audio/wav' as a container
    // (MediaSource.isTypeSupported('audio/wav') === false in every Chromium
    // build tested), so the sourceBuffer-append path below is MSE-only and
    // only ever actually engages for the mp3 fallback. WAV — Kokoro, Piper,
    // and the ElevenLabs-pcm route all emit WAV — is played by scheduling
    // each chunk as its own AudioBuffer on this context instead, so audio
    // starts on chunk 1 like the video WS already does, rather than silently
    // falling back to buffer-the-whole-reply-then-play (which read as a
    // ~500ms delay on short replies and an 11s dead-air freeze on long ones).
    const webAudioCtxBox: { current: AudioContext | null } = { current: null };
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
      // Interrupted while the fetch was in flight — drop it before it can
      // claim activeSpeechRef and start playing over the newer reply.
      if (stale()) {
        orphanAudiosRef.current.delete(audio);
        return;
      }
      if (!audioRes.ok || !audioRes.body) {
        throw new Error(`tts-audio returned ${audioRes.status}: ${audioRes.body ? await audioRes.text() : 'no body'}`);
      }

      const frames = new Map<number, ImageBitmap>();
      let fps = 25;
      let videoStarted = false;
      let audioStarted = false;
      let videoStartedAt: number | null = null;
      let audioStartedAt: number | null = null;
      let chunkCount = 0;
      const chunks: Uint8Array[] = [];

      const startAudioPlayback = () => {
        if (audioStarted || stale()) return;
        audioStarted = true;
        const ms = performance.now() - t0;
        console.log(`[tts] AUDIO STARTED at +${ms.toFixed(0)}ms (after ${chunkCount} chunk(s))`);
        setIsSpeaking(true);
        setLatencyMs(ms);
        // WAV plays through webAudioCtx (scheduled in scheduleWavChunk), not
        // this <audio> element — it exists only as a MediaSource host for mp3.
        if (!isWav) audio.play().catch((err) => console.error('audio.play() failed', err));
        audioStartedAt = ms;
        logSyncGap();
      };
      const logSyncGap = () => {
        if (audioStartedAt == null || videoStartedAt == null) return;
        console.log(`[tts] SYNC GAP audio->video: ${(videoStartedAt - audioStartedAt).toFixed(0)}ms`);
      };

      // Detect audio format from response — local TTS returns WAV,
      // ElevenLabs fallback returns MP3.
      const isWav = audioRes.headers.get('content-type')?.includes('wav') ?? true;
      console.log(`[tts] audio format=${isWav ? 'WAV' : 'MP3'}`);

      // MediaSource never supports 'audio/wav' — only the mp3 fallback can
      // stream via sourceBuffer. WAV playback is handled by scheduleWavChunk
      // below instead (see comment at webAudioCtx declaration).
      const canStreamAudio = !isWav && typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg');

      let mediaSource: MediaSource | null = null;
      let sourceBuffer: SourceBuffer | null = null;
      if (canStreamAudio) {
        mediaSource = new MediaSource();
        audio.src = URL.createObjectURL(mediaSource);
      }

      let webAudioCursor = 0;
      let webAudioStartCtxTime = 0;
      let webAudioEnded = false;
      const lastSourceNodeBox: { current: AudioBufferSourceNode | null } = { current: null };
      let audioSampleRate: number | null = null;
      let wavEndedResolve: (() => void) | null = null;
      const wavEndedPromise = new Promise<void>((resolve) => { wavEndedResolve = resolve; });
      const endWavPlayback = () => {
        if (webAudioEnded) return;
        webAudioEnded = true;
        wavEndedResolve?.();
        webAudioCtxBox.current?.close().catch(() => {});
      };
      const getWavElapsed = () => (webAudioCtxBox.current ? Math.max(0, webAudioCtxBox.current.currentTime - webAudioStartCtxTime) : 0);
      // Schedules one network chunk as its own AudioBuffer, back-to-back on
      // the shared context timeline. ponytail: assumes each chunk starts on
      // a 2-byte sample boundary — true in practice since ffmpeg's stdout
      // pipe reads land on 4096-byte (even) boundaries; a misaligned chunk
      // would just glitch one join, not corrupt playback overall.
      const scheduleWavChunk = (pcm: Uint8Array, sampleRate: number) => {
        const sampleCount = Math.floor(pcm.length / 2);
        if (sampleCount === 0) return;
        if (!webAudioCtxBox.current) webAudioCtxBox.current = new AudioContext();
        const ctx = webAudioCtxBox.current;
        const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, sampleCount);
        const float32 = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) float32[i] = int16[i] / 32768;
        const buffer = ctx.createBuffer(1, sampleCount, sampleRate);
        buffer.copyToChannel(float32, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime, webAudioCursor);
        if (webAudioCursor === 0) webAudioStartCtxTime = startAt;
        source.start(startAt);
        webAudioCursor = startAt + buffer.duration;
        lastSourceNodeBox.current = source;
        if (!audioStarted) startAudioPlayback();
      };

      const ws = ENABLE_LIPSYNC ? new WebSocket(STREAM_WS_URL) : null;
      if (ws) ws.binaryType = 'arraybuffer';
      activeSpeechRef.current = { audio, ws, endAudio: isWav ? endWavPlayback : undefined };

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
          audioSampleRate = stripped.sampleRate ?? 24000;
        }
        if (pcm.length === 0) return;
        if (ws) {
          if (ws.readyState === WebSocket.OPEN) {
            if (pendingSampleRate) {
              ws.send(JSON.stringify({ sampleRate: pendingSampleRate }));
              pendingSampleRate = null;
            }
            ws.send(pcm);
          } else {
            pcmBuffer.push(pcm);
          }
        }
        if (!stale() && audioSampleRate) scheduleWavChunk(pcm, audioSampleRate);
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
            // This IIFE is deliberately not awaited by speak(), so it outlives
            // an interrupt unless it checks for itself.
            if (stale()) {
              await reader.cancel().catch(() => {});
              return;
            }
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
              // MP3+lipsync path: video lags behind (full-buffer decode + cloud
              // inference round trip), so starting audio on first chunk makes
              // the avatar fall behind its own voice. Hold audio until video's
              // first frames are ready (see ws.onmessage) so they start together.
              if (isFirst && (isWav || !ws)) startAudioPlayback();
            }
          }
          if (mediaSource && mediaSource.readyState === 'open') mediaSource.endOfStream();
          console.log(`[tts] all chunks received at +${(performance.now() - t0).toFixed(0)}ms (${chunkCount} total)`);
          if (isWav) {
            // Playback already happened per-chunk via scheduleWavChunk — just
            // mark completion once the last scheduled buffer finishes.
            if (lastSourceNodeBox.current) lastSourceNodeBox.current.onended = endWavPlayback;
            else endWavPlayback(); // empty reply, nothing was ever scheduled
          }
          if (!canStreamAudio && !isWav) {
            const audioType = isWav ? 'audio/wav' : 'audio/mpeg';
            const total = chunks.reduce((sum, c) => sum + c.length, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) { merged.set(c, offset); offset += c.length; }
            audio.src = URL.createObjectURL(new Blob([merged], { type: audioType }));
            startAudioPlayback();
          }
          // For MP3 (ElevenLabs): /lipsync-stream wants raw int16 PCM, not
          // compressed audio — decode via Web Audio first. Shipping the raw
          // MP3 bytes as if they were PCM fed the mel pipeline near-silent
          // noise, so the mouth never moved even though frames still streamed.
          if (!isWav && chunkCount > 0 && ws) {
            console.log(`[tts] MP3 decode starting at +${(performance.now() - t0).toFixed(0)}ms`);
            const total = chunks.reduce((sum, c) => sum + c.length, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) { merged.set(c, offset); offset += c.length; }

            const audioCtx = new AudioContext();
            const decoded = await audioCtx.decodeAudioData(merged.buffer.slice(0));
            const channel = decoded.getChannelData(0);
            const pcm16 = new Int16Array(channel.length);
            for (let i = 0; i < channel.length; i++) {
              const s = Math.max(-1, Math.min(1, channel[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            const pcmBytes = new Uint8Array(pcm16.buffer);
            audioCtx.close();
            if (stale()) return;

            const send = () => {
              ws.send(JSON.stringify({ sampleRate: decoded.sampleRate }));
              ws.send(pcmBytes);
            };
            if (ws.readyState === WebSocket.OPEN) {
              send();
            } else {
              ws.addEventListener('open', send, { once: true });
            }
            console.log(`[tts] decoded MP3 -> PCM (${pcmBytes.byteLength} bytes @ ${decoded.sampleRate}Hz) for Wav2Lip`);
          }
        } catch (err) {
          console.error('[tts] read error', err);
        }
      })();

      if (!ws) {
        // Audio-only prod fallback: no lipsync video, just wait for playback to finish.
        if (isWav) {
          await wavEndedPromise;
          activeSpeechRef.current = null;
          orphanAudiosRef.current.delete(audio);
          setIsSpeaking(false);
          return;
        }
        await new Promise<void>((resolve) => {
          const finish = () => {
            activeSpeechRef.current = null;
            orphanAudiosRef.current.delete(audio);
            setIsSpeaking(false);
            resolve();
          };
          audio.addEventListener('ended', finish, { once: true });
          // An interrupt pauses this element, which never then fires 'ended' —
          // without this the queue pump would wait on it forever.
          audio.addEventListener('pause', finish, { once: true });
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
          if (stale()) return;
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
            videoStartedAt = performance.now() - t0;
            console.log(`[tts] VIDEO STARTED (${PREBUFFER_FRAMES} frames prebuffered) at +${videoStartedAt.toFixed(0)}ms`);
            if (!isWav) startAudioPlayback(); // MP3 path: sync audio start to video readiness
            logSyncGap();
            idleVideoRef.current?.pause();
            setStreaming(true);

            let lastDrawnIdx = -1;
            const canvas = canvasRef.current;
            if (canvas) {
              const dpr = window.devicePixelRatio || 1;
              canvas.width = SIZE * dpr;
              canvas.height = SIZE * dpr;
            }
            const ctx = canvas?.getContext('2d');
            // Seed the canvas with the current idle-video frame before the
            // first Wav2Lip frame paints — otherwise the freshly-resized
            // (blank) canvas fades in over a black shadow for the one or
            // two frames it takes the WS stream to catch up.
            const idleVideo = idleVideoRef.current;
            if (ctx && canvas && idleVideo && idleVideo.videoWidth) {
              const scale = Math.max(canvas.width / idleVideo.videoWidth, canvas.height / idleVideo.videoHeight);
              const sw = canvas.width / scale;
              const sh = canvas.height / scale;
              const sx = (idleVideo.videoWidth - sw) / 2;
              const sy = (idleVideo.videoHeight - sh) / 2;
              ctx.drawImage(idleVideo, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            }
            const paint = () => {
              const currentTime = isWav ? getWavElapsed() : audio.currentTime;
              const wantIdx = Math.floor(currentTime * fps);
              const bitmap = frames.get(wantIdx) ?? frames.get(lastDrawnIdx);
              if (bitmap && ctx && canvas) {
                const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
                const sw = canvas.width / scale;
                const sh = canvas.height / scale;
                const sx = (bitmap.width - sw) / 2;
                const sy = (bitmap.height - sh) / 2;
                ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                lastDrawnIdx = frames.has(wantIdx) ? wantIdx : lastDrawnIdx;
                lastFrameTimeRef.current = (lastDrawnIdx % CLIP_FRAME_COUNT) / fps;
              }
              if (!(isWav ? webAudioEnded : audio.ended)) requestAnimationFrame(paint);
              else {
                console.log(`[tts] DONE at +${(performance.now() - t0).toFixed(0)}ms`);
                activeSpeechRef.current = null;
                orphanAudiosRef.current.delete(audio);
                resumeIdleVideo(() => { setStreaming(false); setIsSpeaking(false); });
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
      webAudioCtxBox.current?.close().catch(() => {});
      resumeIdleVideo(() => { setStreaming(false); setIsSpeaking(false); });
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
  const fillerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerFiredRef = useRef(false);

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

  const cancelFillerTimer = () => {
    if (fillerTimerRef.current) clearTimeout(fillerTimerRef.current);
    fillerTimerRef.current = null;
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
    if (voiceSurface !== 'avatar') {
      cancelFillerTimer();
      return;
    }

    // Arm a filler ack the moment a turn is submitted, in case the real
    // reply (RAG + LLM generation) takes a while — cancelled below as soon
    // as real text shows up, or here once the turn resolves/errors.
    if (status === 'submitted' && !fillerTimerRef.current && !fillerFiredRef.current) {
      fillerTimerRef.current = setTimeout(() => {
        fillerTimerRef.current = null;
        fillerFiredRef.current = true;
        enqueueSpeech(FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)]);
      }, FILLER_DELAY_MS);
    }
    if (status === 'ready' || status === 'error') {
      cancelFillerTimer();
      fillerFiredRef.current = false;
    }

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (last.id === lastSpokenIdRef.current && status !== 'streaming') return;

    const hasRealText = last.parts.some((part) => part.type === 'text' && (part as { text: string }).text.trim());
    // Real content arrived — the filler (if it hasn't fired yet) is no
    // longer needed. If it already fired and is playing, interruptSpeech()
    // below (new message id vs activeMessageIdRef) cuts it over cleanly.
    if (hasRealText) cancelFillerTimer();

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
      // Kill any still-pending prefetch timer before speaking. The debounce
      // (300ms after the last delta) can fire AFTER speak() has started its
      // own /tts, and the Kokoro generation counter treats that stray request
      // as the newest — superseding the live one mid-reply, so playback stops
      // after the first sentence. Clearing the timer here removes the stray.
      if (prefetchTimerRef.current) { clearTimeout(prefetchTimerRef.current); prefetchTimerRef.current = null; }
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
      cancelFillerTimer();
      interruptSpeech();
    }
    return () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
      cancelFillerTimer();
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

  // Thumbnail is itself a <button>, so `closest('button')` would always match
  // and block dragging — track movement distance instead and let onClick
  // check draggedRef to tell a real drag from a plain click.
  const draggedRef = useRef(false);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(ev.clientX - dragRef.current.startX) > 3 || Math.abs(ev.clientY - dragRef.current.startY) > 3) {
        draggedRef.current = true;
      }
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
    draggedRef.current = false;
    dragRef.current = { startX: t.clientX, startY: t.clientY, posX: pos.x, posY: pos.y };
    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(ev.touches[0].clientX - dragRef.current.startX) > 3 || Math.abs(ev.touches[0].clientY - dragRef.current.startY) > 3) {
        draggedRef.current = true;
      }
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

  const clampThumbPos = (x: number, y: number) => ({
    x: Math.min(Math.max(x, 0), window.innerWidth - THUMB_SIZE),
    y: Math.min(Math.max(y, 0), window.innerHeight - THUMB_SIZE),
  });

  const handleThumbDragStart = (e: React.MouseEvent) => {
    draggedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: thumbPos.x, posY: thumbPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(ev.clientX - dragRef.current.startX) > 3 || Math.abs(ev.clientY - dragRef.current.startY) > 3) {
        draggedRef.current = true;
      }
      setThumbPos(
        clampThumbPos(
          dragRef.current.posX + ev.clientX - dragRef.current.startX,
          dragRef.current.posY + (ev.clientY - dragRef.current.startY),
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

  const handleThumbTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    draggedRef.current = false;
    dragRef.current = { startX: t.clientX, startY: t.clientY, posX: thumbPos.x, posY: thumbPos.y };
    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(ev.touches[0].clientX - dragRef.current.startX) > 3 || Math.abs(ev.touches[0].clientY - dragRef.current.startY) > 3) {
        draggedRef.current = true;
      }
      setThumbPos(
        clampThumbPos(
          dragRef.current.posX + ev.touches[0].clientX - dragRef.current.startX,
          dragRef.current.posY + (ev.touches[0].clientY - dragRef.current.startY),
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
          if (draggedRef.current) return;
          setExpanded(true);
          setVoiceSurface('avatar');
        }}
        onMouseDown={handleThumbDragStart}
        onTouchStart={handleThumbTouchStart}
        aria-label="Open Clea avatar"
        style={{ left: thumbPos.x, top: thumbPos.y }}
        className="fixed z-50 hidden h-16 w-16 cursor-grab touch-none select-none overflow-hidden rounded-full border-2 border-white shadow-lg transition hover:scale-105 active:cursor-grabbing lg:block"
      >
        <img src="/clea2-avatar-photo.png" alt="Clea" className="h-full w-full object-cover" draggable={false} />
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
        <div className="absolute inset-0 overflow-hidden rounded-full border-2 border-white shadow-2xl bg-neutral-800">
          {/* Simultaneous crossfade — a staggered/sequential fade leaves a
              gap where both layers sit near-zero opacity at once, exposing
              this div's background as a bright flash. Overlapping them
              instead means there's always at least one layer near full
              opacity. The outgoing layer is paused (see idleVideoRef effect
              above) so the overlap blends a static frame, not two live
              motions — two videos playing at once during the crossfade
              read as a smear. */}
          <video
            ref={idleVideoRef}
            key={videoSrc}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-in-out"
            style={{ opacity: streaming ? 0 : 1 }}
          />
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-in-out"
            style={{ opacity: streaming ? 1 : 0 }}
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
