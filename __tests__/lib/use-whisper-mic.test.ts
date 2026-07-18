import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhisperMic } from '@/lib/use-whisper-mic';

const asrMock = jest.fn(async () => ({ text: 'hello world' }));
jest.mock('@/lib/whisper-pipeline', () => ({
  getWhisperPipeline: jest.fn(async () => asrMock),
  resampleTo16kMono: jest.fn(async () => new Float32Array([0])),
}));

// jsdom has no MediaRecorder/getUserMedia/AudioContext — stub the minimum surface
// use-whisper-mic.ts touches. `currentRms`/`mockNow` and the manual `tick()` helper
// let the test drive the VAD's speaking->silence state machine deterministically
// instead of racing real audio hardware and real wall-clock time.
let recorderDataHandler: ((e: { data: Blob }) => void) | null = null;
let pendingTick: FrameRequestCallback | null = null;
let currentRms = 0;
let mockNow = 0;

function tick() {
  const cb = pendingTick;
  pendingTick = null;
  act(() => {
    cb?.(mockNow);
  });
}

beforeEach(() => {
  asrMock.mockClear();
  recorderDataHandler = null;
  pendingTick = null;
  currentRms = 0;
  mockNow = 0;
  jest.spyOn(performance, 'now').mockImplementation(() => mockNow);

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
          arr.fill(currentRms);
        },
      };
    }
    close() {
      return Promise.resolve();
    }
  };

  (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    pendingTick = cb;
    return 1;
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
    await waitFor(() => expect(pendingTick).not.toBeNull());

    // speak: rms above threshold marks speaking=true, speechStart=0
    currentRms = 0.1;
    tick();

    // go silent — starts the silence-hang timer at now=100
    currentRms = 0;
    mockNow = 100;
    tick();

    // advance past SILENCE_HANG_MS (700ms) from silenceStart — utterance finalizes
    mockNow = 900;
    tick();

    await waitFor(() => expect(asrMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hello world'));
  });

  it('keeps recording the next utterance while the previous one is still transcribing', async () => {
    let resolveFirst!: (value: { text: string }) => void;
    asrMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );

    const onTranscript = jest.fn();
    renderHook(() => useWhisperMic(true, onTranscript));

    await waitFor(() => expect(recorderDataHandler).not.toBeNull());

    // first utterance: speak, go silent, finalize — kicks off a slow transcription
    act(() => recorderDataHandler!({ data: new Blob(['chunk-1']) }));
    await waitFor(() => expect(pendingTick).not.toBeNull());
    currentRms = 0.1;
    tick();
    currentRms = 0;
    mockNow = 100;
    tick();
    mockNow = 900;
    tick();
    await waitFor(() => expect(asrMock).toHaveBeenCalledTimes(1));

    // second utterance arrives and finalizes while the first is still pending —
    // recording/VAD must not be blocked by the in-flight transcription
    act(() => recorderDataHandler!({ data: new Blob(['chunk-2']) }));
    await waitFor(() => expect(pendingTick).not.toBeNull());
    currentRms = 0.1;
    mockNow = 1000;
    tick();
    currentRms = 0;
    mockNow = 1100;
    tick();
    mockNow = 1900;
    tick();

    // release the first transcription now that the second has already queued
    resolveFirst({ text: 'first' });

    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('first'));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hello world'));
    expect(asrMock).toHaveBeenCalledTimes(2);
  });
});
