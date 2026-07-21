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
      getAudioTracks: () => [{ label: 'test-mic', stop: jest.fn() }],
    })),
  };

  (global as any).MediaRecorder = class {
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    state = 'recording';
    mimeType = 'audio/webm';
    start() {
      recorderDataHandler = (e) => this.ondataavailable?.(e);
    }
    stop() {
      this.state = 'inactive';
      this.onstop?.();
    }
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

  const rafStub = (cb: FrameRequestCallback) => {
    pendingTick = cb;
    return 1;
  };
  (global as any).requestAnimationFrame = rafStub;
  (window as any).requestAnimationFrame = rafStub;
});

describe('useWhisperMic', () => {
  it('transcribes a completed utterance after the VAD detects silence', async () => {
    const onTranscript = jest.fn();
    renderHook(() => useWhisperMic(true, false, onTranscript, jest.fn()));

    await waitFor(() => expect(pendingTick).not.toBeNull());

    // energy crosses floor at now=0, sustained past SPEECH_ONSET_MS (150ms)
    currentRms = 0.1;
    tick();
    mockNow = 150;
    tick();
    await waitFor(() => expect(recorderDataHandler).not.toBeNull());
    act(() => recorderDataHandler!({ data: new Blob(['chunk']) }));

    // keep speaking past MIN_UTTERANCE_MS (300ms) so utterance is long enough
    mockNow = 400;
    tick();

    // go silent — starts silence-hang timer at 500
    currentRms = 0;
    mockNow = 500;
    tick();

    // advance past SILENCE_HANG_MS (1000ms) from silenceStart — utterance finalizes
    mockNow = 1500;
    tick();

    await waitFor(() => expect(asrMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hello world'));
  });

  it('ignores a brief noise blip that never sustains past the onset window', async () => {
    const onTranscript = jest.fn();
    renderHook(() => useWhisperMic(true, false, onTranscript, jest.fn()));

    await waitFor(() => expect(pendingTick).not.toBeNull());

    // energy spikes at now=0 then drops back before SPEECH_ONSET_MS elapses
    currentRms = 0.1;
    tick();
    currentRms = 0;
    mockNow = 50;
    tick();
    mockNow = 900;
    tick();

    expect(recorderDataHandler).toBeNull();
    expect(asrMock).not.toHaveBeenCalled();
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
    renderHook(() => useWhisperMic(true, false, onTranscript, jest.fn()));

    await waitFor(() => expect(pendingTick).not.toBeNull());

    // first utterance: speak past onset, sustain past MIN_UTTERANCE_MS, go silent,
    // wait past SILENCE_HANG_MS — kicks off a slow transcription
    currentRms = 0.1;
    tick();
    mockNow = 150;
    tick();
    await waitFor(() => expect(recorderDataHandler).not.toBeNull());
    act(() => recorderDataHandler!({ data: new Blob(['chunk-1']) }));
    mockNow = 400;
    tick();
    currentRms = 0;
    mockNow = 500;
    tick();
    mockNow = 1500;
    tick();
    await waitFor(() => expect(asrMock).toHaveBeenCalledTimes(1));

    // second utterance arrives and finalizes while first still pending —
    // recording/VAD must not block on in-flight transcription
    currentRms = 0.1;
    mockNow = 1550;
    tick();
    mockNow = 1700;
    tick();
    await waitFor(() => expect(recorderDataHandler).not.toBeNull());
    act(() => recorderDataHandler!({ data: new Blob(['chunk-2']) }));
    mockNow = 1950;
    tick();
    currentRms = 0;
    mockNow = 2050;
    tick();
    mockNow = 3050;
    tick();

    // release the first transcription now that the second has already queued
    resolveFirst({ text: 'first' });

    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('first'));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hello world'));
    expect(asrMock).toHaveBeenCalledTimes(2);
  });
});
