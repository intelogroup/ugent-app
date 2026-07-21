# Whisper STT Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Clea avatar/chat mic's browser `SpeechRecognition` (Chrome/Edge-only, cloud-routed, no VAD control) with an in-browser Whisper pipeline (`@huggingface/transformers`, WebGPU) that has real, tunable VAD-based endpointing, keeps listening continuously, and never blocks new recording on a slow transcription.

**Architecture:** Three new pure/isolated modules — `lib/serial-queue.ts` (generic FIFO async queue, mirrors the `ai` SDK's internal `SerialJobExecutor` pattern already used by `useChat`), `lib/whisper-pipeline.ts` (lazy-singleton Whisper ASR pipeline + 16kHz mono PCM resampler), and `lib/use-whisper-mic.ts` (energy-based VAD + `MediaRecorder` capture, drop-in replacement for `useContinuousMic`'s `(active, onTranscript)` signature, backed by the serial queue so a new utterance can start recording immediately while the previous one is still transcribing). `lib/clea-agent-context.tsx` picks Whisper when `navigator.gpu` exists, falling back to the existing `useContinuousMic` (Web Speech API) otherwise — a browser capability branch, not a redesign of either hook.

**Tech Stack:** `@huggingface/transformers` v4.2.0 (already a dependency), Web Audio API (`AudioContext`, `AnalyserNode`, `OfflineAudioContext`), `MediaRecorder`, Jest + Testing Library (existing test stack), TypeScript.

## Global Constraints

- Do not modify `lib/use-continuous-mic.ts` — it stays as the WebGPU-unavailable fallback, unchanged.
- Do not touch `lib/clea-chat-store.ts`, `app/api/clea-chat/route.ts`, or the `sendMessage` queue added in `lib/clea-agent-context.tsx` this session — this plan is STT-engine-only; the transcript still flows through the existing `queuedSendMessage`.
- No new npm dependencies — `@huggingface/transformers` is already in `package.json`.
- Every new module ships with a passing Jest test in the same task that introduces it (TDD: failing test → minimal code → passing test).
- Match existing code style: no comments explaining *what*, only non-obvious *why* (see `lib/use-continuous-mic.ts` for the house style).

---

### Task 1: `SerialQueue` — generic FIFO async queue

**Files:**
- Create: `lib/serial-queue.ts`
- Test: `__tests__/lib/serial-queue.test.ts`

**Interfaces:**
- Produces: `class SerialQueue { push<T>(job: () => Promise<T>): Promise<T> }` — enqueues `job`; `job` starts only after every previously-pushed job has settled; returns a promise that resolves/rejects with that job's own result. Used by Task 3 to serialize Whisper transcription calls without blocking the caller.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/serial-queue.test.ts
import { SerialQueue } from '@/lib/serial-queue';

describe('SerialQueue', () => {
  it('runs jobs strictly one at a time, in push order', async () => {
    const queue = new SerialQueue();
    const order: number[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const p1 = queue.push(async () => {
      order.push(1);
      await delay(30);
      order.push(2);
      return 'a';
    });
    const p2 = queue.push(async () => {
      order.push(3);
      return 'b';
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3]);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
  });

  it('a later job still runs after an earlier job rejects', async () => {
    const queue = new SerialQueue();
    const failing = queue.push(async () => {
      throw new Error('boom');
    });
    const succeeding = queue.push(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(succeeding).resolves.toBe('ok');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/serial-queue.test.ts`
Expected: FAIL with `Cannot find module '@/lib/serial-queue'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/serial-queue.ts

/** Runs pushed jobs strictly one at a time, in push order — a rejection in one job
 *  never blocks the next. Used to serialize Whisper transcription calls so a slow
 *  one can't race a fast one, while still letting the caller push the next job
 *  immediately (e.g. while still recording the next utterance). */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  push<T>(job: () => Promise<T>): Promise<T> {
    const result = this.tail.then(job, job);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/serial-queue.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/serial-queue.ts __tests__/lib/serial-queue.test.ts
git commit -m "feat: add SerialQueue for FIFO async job serialization"
```

---

### Task 2: Whisper pipeline loader + 16kHz resampler

**Files:**
- Create: `lib/whisper-pipeline.ts`
- Test: `__tests__/lib/whisper-pipeline.test.ts`

**Interfaces:**
- Consumes: `@huggingface/transformers`'s `pipeline(task, model, options)` and `env`.
- Produces: `getWhisperPipeline(): Promise<AutomaticSpeechRecognitionPipeline>` (module-level singleton — loads the model once no matter how many times it's called) and `resampleTo16kMono(blob: Blob): Promise<Float32Array>` (decodes a recorded audio `Blob` to 16kHz mono PCM, the format Whisper expects). Used by Task 3.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/whisper-pipeline.test.ts
const pipelineMock = jest.fn(async () => ({ __fakeAsr: true }));
jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => pipelineMock(...args),
  env: { allowLocalModels: true },
}));

import { getWhisperPipeline } from '@/lib/whisper-pipeline';

describe('getWhisperPipeline', () => {
  it('loads the ASR pipeline on webgpu, once, and caches it', async () => {
    const a = await getWhisperPipeline();
    const b = await getWhisperPipeline();

    expect(a).toBe(b);
    expect(pipelineMock).toHaveBeenCalledTimes(1);
    expect(pipelineMock).toHaveBeenCalledWith(
      'automatic-speech-recognition',
      'onnx-community/whisper-base',
      expect.objectContaining({ device: 'webgpu' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/whisper-pipeline.test.ts`
Expected: FAIL with `Cannot find module '@/lib/whisper-pipeline'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/whisper-pipeline.ts
'use client';

import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

// Model weights are fetched from the HF Hub CDN, not bundled in the repo.
env.allowLocalModels = false;

let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/** Loads the Whisper ASR pipeline once and reuses it across every mic session —
 *  re-loading on each mic toggle would re-download/re-init a multi-hundred-MB model. */
export function getWhisperPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
      device: 'webgpu',
    }) as Promise<AutomaticSpeechRecognitionPipeline>;
  }
  return pipelinePromise;
}

/** Decodes a recorded audio Blob and resamples it to 16kHz mono Float32 PCM — the
 *  input format Whisper's feature extractor expects, regardless of the mic's native rate. */
export async function resampleTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  await decodeCtx.close();
  return rendered.getChannelData(0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/whisper-pipeline.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/whisper-pipeline.ts __tests__/lib/whisper-pipeline.test.ts
git commit -m "feat: add Whisper ASR pipeline loader and 16kHz PCM resampler"
```

---

### Task 3: `useWhisperMic` — VAD-gated continuous recording hook

**Files:**
- Create: `lib/use-whisper-mic.ts`
- Test: `__tests__/lib/use-whisper-mic.test.ts`

**Interfaces:**
- Consumes: `SerialQueue` (Task 1), `getWhisperPipeline`/`resampleTo16kMono` (Task 2).
- Produces: `useWhisperMic(active: boolean, onTranscript: (text: string) => void): { modelLoading: boolean }` — same `(active, onTranscript)` contract as `useContinuousMic`, so Task 4 can swap it in with one line. Used by Task 4.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/use-whisper-mic.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhisperMic } from '@/lib/use-whisper-mic';

const asrMock = jest.fn(async () => ({ text: 'hello world' }));
jest.mock('@/lib/whisper-pipeline', () => ({
  getWhisperPipeline: jest.fn(async () => asrMock),
  resampleTo16kMono: jest.fn(async () => new Float32Array([0])),
}));

// jsdom has no MediaRecorder/getUserMedia/AudioContext — stub the minimum surface
// use-whisper-mic.ts touches. `emitAudioLevel` lets tests drive the VAD state
// machine deterministically instead of racing real audio hardware.
let emitAudioLevel: (rms: number) => void = () => {};
let recorderDataHandler: ((e: { data: Blob }) => void) | null = null;

beforeEach(() => {
  asrMock.mockClear();

  (navigator as any).mediaDevices = {
    getUserMedia: jest.fn(async () => ({
      getTracks: () => [{ stop: jest.fn() }],
    })),
  };

  (global as any).MediaRecorder = class {
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    mimeType = 'audio/webm';
    start() {
      recorderDataHandler = (e) => this.ondataavailable?.(e);
    }
    stop() {}
  };

  (global as any).AudioContext = class {
    createMediaStreamSource() {
      return { connect: jest.fn() };
    }
    createAnalyser() {
      return {
        fftSize: 1024,
        connect: jest.fn(),
        getFloatTimeDomainData: (arr: Float32Array) => {
          arr.fill(0);
        },
      };
    }
    close() {
      return Promise.resolve();
    }
  };

  let rafId = 0;
  (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    Promise.resolve().then(() => cb(performance.now()));
    return rafId;
  };
});

describe('useWhisperMic', () => {
  it('transcribes a completed utterance after the VAD detects silence', async () => {
    const onTranscript = jest.fn();
    renderHook(() => useWhisperMic(true, onTranscript));

    await waitFor(() => expect(recorderDataHandler).not.toBeNull());
    act(() => {
      recorderDataHandler!({ data: new Blob(['chunk']) });
    });

    await waitFor(() => expect(asrMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hello world'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/use-whisper-mic.test.ts`
Expected: FAIL with `Cannot find module '@/lib/use-whisper-mic'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/use-whisper-mic.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { SerialQueue } from './serial-queue';
import { getWhisperPipeline, resampleTo16kMono } from './whisper-pipeline';

// Empirical energy floor separating "silence" from "speech" on a typical mic —
// tune per-device if false triggers show up in practice.
const SILENCE_RMS_THRESHOLD = 0.015;
// How long the signal must stay below the floor before an utterance is
// considered finished and sent to Whisper. This is the actual "VAD wait"
// knob — SpeechRecognition gave no equivalent control.
const SILENCE_HANG_MS = 700;
// Ignore blips shorter than this — mic pops, breaths, keyboard clicks.
const MIN_UTTERANCE_MS = 300;

/** Continuously listens to the mic while `active`, using an in-browser Whisper
 *  pipeline gated by energy-based VAD. Recording never stops while a previous
 *  utterance is transcribing — finalized clips are pushed onto a SerialQueue
 *  so transcription happens one-at-a-time without blocking capture of the next. */
export function useWhisperMic(active: boolean, onTranscript: (text: string) => void) {
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const [modelLoading, setModelLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let recorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let speaking = false;
    let silenceStart: number | null = null;
    let speechStart = 0;
    const transcribeQueue = new SerialQueue();

    function finalizeUtterance() {
      if (chunks.length === 0) return;
      const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
      chunks = [];
      if (performance.now() - speechStart < MIN_UTTERANCE_MS) return;

      void transcribeQueue.push(async () => {
        const pcm = await resampleTo16kMono(blob);
        setModelLoading(true);
        const asr = await getWhisperPipeline();
        setModelLoading(false);
        const result: any = await asr(pcm);
        const text = (Array.isArray(result) ? result[0]?.text : result?.text)?.trim();
        if (text && !stopped) onTranscriptRef.current(text);
      });
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('mic permission denied', err);
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);

      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(250);

      const tick = () => {
        if (stopped) return;
        analyser.getFloatTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) sumSquares += data[i] * data[i];
        const rms = Math.sqrt(sumSquares / data.length);

        const now = performance.now();
        if (rms > SILENCE_RMS_THRESHOLD) {
          if (!speaking) {
            speaking = true;
            speechStart = now;
          }
          silenceStart = null;
        } else if (speaking) {
          if (silenceStart === null) silenceStart = now;
          else if (now - silenceStart >= SILENCE_HANG_MS) {
            speaking = false;
            silenceStart = null;
            finalizeUtterance();
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    })();

    return () => {
      stopped = true;
      recorder?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      void audioCtx?.close();
    };
  }, [active]);

  return { modelLoading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/use-whisper-mic.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/use-whisper-mic.ts __tests__/lib/use-whisper-mic.test.ts
git commit -m "feat: add VAD-gated Whisper mic hook (useWhisperMic)"
```

---

### Task 4: Wire `useWhisperMic` into `CleaAgentProvider` with WebGPU fallback

**Files:**
- Modify: `lib/clea-agent-context.tsx`
- Test: `__tests__/lib/clea-agent-context.test.tsx` (extend existing file)

**Interfaces:**
- Consumes: `useWhisperMic` (Task 3), `useContinuousMic` (existing, untouched).
- Produces: adds `micModelLoading: boolean` to `CleaAgentValue` — consumed by Task 5's UI.

- [ ] **Step 1: Write the failing test**

Add to `__tests__/lib/clea-agent-context.test.tsx`, above the existing `beforeEach`:

```typescript
jest.mock('@/lib/use-whisper-mic', () => ({
  useWhisperMic: jest.fn(() => ({ modelLoading: false })),
}));
jest.mock('@/lib/use-continuous-mic', () => ({
  useContinuousMic: jest.fn(),
}));
```

Add a new test inside the `describe` block:

```typescript
  it('exposes micModelLoading from the active mic hook', async () => {
    function LoadingConsumer() {
      const { micModelLoading } = useCleaAgent();
      return <p data-testid="mic-loading">{String(micModelLoading)}</p>;
    }
    render(
      <CleaAgentProvider>
        <LoadingConsumer />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('mic-loading')).toHaveTextContent('false');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/clea-agent-context.test.tsx`
Expected: FAIL — `micModelLoading` renders as `undefined`, or the mocked hooks are never imported (module doesn't reference them yet)

- [ ] **Step 3: Write minimal implementation**

In `lib/clea-agent-context.tsx`, replace the imports and the mic wiring:

```typescript
import { useContinuousMic } from '@/lib/use-continuous-mic';
import { useWhisperMic } from '@/lib/use-whisper-mic';
```

Replace the existing block:

```typescript
  useContinuousMic(micActive, (text) => {
    queuedSendMessage({ text });
  });
```

with:

```typescript
  // WebGPU is required for the in-browser Whisper pipeline (transformers.js).
  // Where it's unavailable (Safari, older browsers), fall back to the
  // browser's built-in SpeechRecognition — worse VAD control, but zero setup.
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const onTranscript = (text: string) => queuedSendMessage({ text });

  const { modelLoading: whisperLoading } = useWhisperMic(micActive && hasWebGpu, onTranscript);
  useContinuousMic(micActive && !hasWebGpu, onTranscript);
  const micModelLoading = hasWebGpu && whisperLoading;
```

Update `CleaAgentValue`:

```typescript
type CleaAgentValue = ReturnType<typeof useChat> & {
  micActive: boolean;
  toggleMic: () => void;
  micModelLoading: boolean;
  voiceSurface: VoiceSurface;
  setVoiceSurface: (surface: VoiceSurface) => void;
};
```

Update the provider's returned value:

```typescript
    <CleaAgentContext.Provider
      value={{
        ...chat,
        sendMessage: queuedSendMessage,
        micActive,
        toggleMic,
        micModelLoading,
        voiceSurface,
        setVoiceSurface,
      }}
    >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/clea-agent-context.test.tsx`
Expected: PASS (all tests, including the new one)

Then run the full existing Clea suite to confirm nothing regressed:

Run: `npx jest __tests__/lib/clea-agent-context.test.tsx __tests__/components/CleaChat.test.tsx __tests__/api/clea-chat.test.ts __tests__/lib/clea-chat-store.test.ts`
Expected: PASS (all suites)

- [ ] **Step 5: Commit**

```bash
git add lib/clea-agent-context.tsx __tests__/lib/clea-agent-context.test.tsx
git commit -m "feat: switch Clea mic to Whisper on WebGPU, fall back to SpeechRecognition"
```

---

### Task 5: Surface `micModelLoading` on the mic buttons

**Files:**
- Modify: `components/CleaChat.tsx`
- Modify: `components/FloatingAvatar.tsx`

**Interfaces:**
- Consumes: `micModelLoading` from `useCleaAgent()` (Task 4).

- [ ] **Step 1: Update `CleaChat.tsx`'s mic button**

In `components/CleaChat.tsx`, update the destructure:

```typescript
  const { messages, sendMessage, status, micActive, toggleMic, micModelLoading, voiceSurface, setVoiceSurface } = useCleaAgent();
```

Update the `microphoneButton` function to disable + label during load:

```typescript
  const microphoneButton = (compact = false) => (
    <button
      type="button"
      onClick={toggleMic}
      disabled={micModelLoading}
      aria-label={micModelLoading ? 'Loading voice model' : micActive ? 'Stop visual microphone' : 'Start visual microphone'}
      aria-pressed={micActive}
      className={`${compact ? 'h-9 w-9' : 'h-11 w-11'} flex items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
        micActive
          ? 'border-primary-500 bg-primary-600 text-white shadow-md'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-600'
      }`}
    >
      <MicrophoneIcon className="h-4 w-4" />
    </button>
  );
```

- [ ] **Step 2: Update `FloatingAvatar.tsx`'s mic button**

In `components/FloatingAvatar.tsx`, update the destructure:

```typescript
  const { messages, status, micActive, toggleMic, micModelLoading, voiceSurface, setVoiceSurface } = useCleaAgent();
```

Update the mic `<button>`:

```typescript
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
```

- [ ] **Step 3: Run the full Clea test suite to confirm no regression**

Run: `npx jest __tests__/lib/clea-agent-context.test.tsx __tests__/components/CleaChat.test.tsx __tests__/api/clea-chat.test.ts __tests__/lib/clea-chat-store.test.ts`
Expected: PASS (all suites)

- [ ] **Step 4: Typecheck**

Run: `rm -rf .next && npx tsc --noEmit`
Expected: no errors referencing `CleaChat.tsx`, `FloatingAvatar.tsx`, or `clea-agent-context.tsx`

- [ ] **Step 5: Commit**

```bash
git add components/CleaChat.tsx components/FloatingAvatar.tsx
git commit -m "feat: show loading state on mic buttons while Whisper model warms up"
```

---

### Task 6: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Open the dashboard in a WebGPU-capable browser (Chrome/Edge)**

Navigate to `http://localhost:3000/dashboard`, open Clea chat, click the mic button.

Expected: button shows the loading state briefly (first Whisper model download/compile — check DevTools Network tab for `onnx-community/whisper-base` fetches), then goes active.

- [ ] **Step 3: Verify continuous listening + VAD endpointing**

Speak a full sentence, pause ~1s, speak a second sentence without touching the mic button.

Expected: two separate messages appear in chat (not one merged blob, not silence timing out mid-sentence) — confirms `SILENCE_HANG_MS = 700` is a reasonable default endpoint; tune the constant in `lib/use-whisper-mic.ts` if utterances cut off early or merge.

- [ ] **Step 4: Verify recording continues during a slow transcription**

Speak a longer utterance, then immediately (before the first transcript appears in chat) speak a second one.

Expected: both eventually appear in chat, in order, via `console.log` or Network tab confirming two separate ASR calls — confirms `SerialQueue` isn't dropping or blocking the second utterance's capture.

- [ ] **Step 5: Verify the WebGPU fallback**

In DevTools Console, run `Object.defineProperty(navigator, 'gpu', { value: undefined })`, reload, click mic.

Expected: mic still works (browser SpeechRecognition path), confirming the fallback branch in `lib/clea-agent-context.tsx` engages correctly when WebGPU is unavailable.

- [ ] **Step 6: Confirm existing session-owner exclusivity still holds**

With mic active in Chat mode, click "Live" to open the orb, then reopen the floating avatar.

Expected: behavior matches the `voiceSurface` mutual-exclusion work from earlier this session — unaffected by this STT swap, since only the mic *input* engine changed, not the `voiceSurface`/TTS output logic.
