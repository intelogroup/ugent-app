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
const SILENCE_HANG_MS = 1000;
// Ignore blips shorter than this — mic pops, breaths, keyboard clicks.
const MIN_UTTERANCE_MS = 300;
// Energy must stay above the floor for this long before it's treated as
// real speech rather than a transient (cough, door, distant chatter) —
// costs a little onset latency to avoid burning a Whisper call on noise.
const SPEECH_ONSET_MS = 150;
// While Clea's TTS is playing, echoCancellation alone doesn't reliably strip
// her voice back out of the mic (speaker output vs. a headset mic), so a
// barge-in during playback needs to look more deliberate than a normal
// utterance: louder floor, longer sustained onset. This trades a bit of
// barge-in latency for not self-interrupting on TTS bleed.
// ponytail: untuned guess — lower this (toward SILENCE_RMS_THRESHOLD) if
// barge-in isn't firing on real speech, raise it if TTS bleed triggers it.
const BARGE_RMS_THRESHOLD = 0.045;
// 1s sustained onset: a barge must be a deliberate, held utterance — short
// coughs, chair scrapes, and TTS-bleed blips fall well under this and never
// interrupt Clea. Raised from 400ms after those short noises were cutting her
// off mid-reply.
const BARGE_ONSET_MS = 1000;

/** Continuously listens to the mic while `active`, using an in-browser Whisper
 *  pipeline gated by energy-based VAD. Recording never stops while a previous
 *  utterance is transcribing — finalized clips are pushed onto a SerialQueue
 *  so transcription happens one-at-a-time without blocking capture of the next.
 *  While `suppressed` (TTS playing), normal utterances are ignored, but a loud
 *  sustained onset is treated as a barge-in: `onBargeIn` fires once (to stop
 *  the TTS) and the utterance is then recorded normally. */
export function useWhisperMic(
  active: boolean,
  suppressed: boolean,
  onTranscript: (text: string) => void,
  onBargeIn: () => void
) {
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onBargeInRef = useRef(onBargeIn);
  onBargeInRef.current = onBargeIn;
  // Read via ref rather than an effect dependency — `suppressed` flips every
  // time TTS starts/stops, and restarting the effect on every flip would tear
  // down and recreate the mic stream mid-conversation.
  const suppressedRef = useRef(suppressed);
  suppressedRef.current = suppressed;
  const [modelLoading, setModelLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    // Analyser graph is rewired whenever the mic stream is re-acquired, so
    // these can't be captured consts like before — they move as the stream does.
    let analyser: AnalyserNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let data: Float32Array<ArrayBuffer> | null = null;
    // Bluetooth Classic can't run a live mic (HFP) and hi-fi output (A2DP) at
    // once — an open input forces the headset into mono HFP, which makes Clea's
    // TTS come out choppy. So on a BT input we RELEASE the mic while TTS plays
    // (letting the headset return to A2DP) and re-acquire it when she's done.
    // Voice barge-in is unavailable during that window on BT; tap to interrupt.
    // Non-BT inputs keep the mic open throughout, so barge-in still works.
    let isBluetooth = false;
    let micReleased = false;
    let acquiring = false;
    let prevSuppressed = suppressedRef.current;

    const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    };

    // Best-effort: the input track's label is the device name on Chrome/Safari
    // once permission is granted. Extend the pattern as new BT gear shows up.
    const isBluetoothInput = (s: MediaStream): boolean => {
      const label = s.getAudioTracks()[0]?.label ?? '';
      return /bluetooth|hands[-\s]?free|airpods|wireless|headset|buds|beats|bose|jabra|sony wh|sennheiser/i.test(
        label
      );
    };
    // A MediaRecorder only emits the container header in its very first
    // chunk — reusing one recorder and slicing its chunk stream into
    // per-utterance blobs leaves every utterance after the first headerless
    // and undecodable. Start a fresh recorder per utterance instead, so
    // each one produces a self-contained, valid file.
    let recorder: MediaRecorder | null = null;
    let speaking = false;
    let silenceStart: number | null = null;
    let onsetStart: number | null = null;
    let speechStart = 0;
    let lastBargeLogAt = 0;
    let lastTickTime = performance.now();
    // Cumulative "how much of the recent signal was loud", not a streak —
    // real speech has natural micro-gaps between syllables/words that kept
    // resetting a streak-based onset before it ever reached BARGE_ONSET_MS.
    // Grows while loud, decays faster while quiet, so it rides through those
    // gaps but still can't be tripped by a single brief TTS-bleed spike.
    let bargeEnergyMs = 0;
    // Guards onBargeIn to fire once per utterance rather than repeatedly
    // while energy stays over threshold; cleared once the utterance ends.
    let bargeFired = false;
    const transcribeQueue = new SerialQueue();

    function startUtteranceRecording() {
      if (!stream) return;
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (performance.now() - speechStart < MIN_UTTERANCE_MS || chunks.length === 0) return;
        const mimeType = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const finalizedAt = performance.now();
        // OpenAI sniffs container format from the filename extension, not the
        // multipart Content-Type — send one that matches what actually got
        // recorded (Safari's MediaRecorder produces mp4, not webm).
        const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';

        transcribeQueue
          .push(async () => {
            const t0 = performance.now();
            let text: string | undefined;
            let via: 'openai' | 'local' = 'openai';
            try {
              const form = new FormData();
              form.append('audio', blob, `audio.${extension}`);
              const res = await fetch('/api/whisper-transcribe', { method: 'POST', body: form });
              if (!res.ok) throw new Error(`whisper-transcribe returned ${res.status}`);
              text = ((await res.json()) as { text: string }).text?.trim();
            } catch (err) {
              console.error('OpenAI transcription failed, falling back to local Whisper', err);
              via = 'local';
              const pcm = await resampleTo16kMono(blob);
              setModelLoading(true);
              const asr = await getWhisperPipeline();
              setModelLoading(false);
              const result: any = await asr(pcm);
              text = (Array.isArray(result) ? result[0]?.text : result?.text)?.trim();
            }
            const t1 = performance.now();
            console.log(
              `[whisper] via=${via} total=${(t1 - t0).toFixed(0)}ms totalSinceSilenceEnd=${(t1 - finalizedAt).toFixed(0)}ms`
            );
            if (text && !stopped) onTranscriptRef.current(text);
          })
          .catch((err) => {
            setModelLoading(false);
            console.error('whisper transcription failed', err);
          });
      };
      rec.start();
      recorder = rec;
    }

    function finalizeUtterance() {
      if (!recorder || recorder.state === 'inactive') return;
      recorder.stop();
      recorder = null;
    }

    // autoGainControl stays off (see AUDIO_CONSTRAINTS): AGC normalizes volume,
    // erasing the loudness-vs-distance falloff the RMS threshold relies on as a
    // rough proximity filter.
    function wireAnalyser() {
      if (!stream) return;
      audioCtx = audioCtx || new AudioContext();
      sourceNode = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      sourceNode.connect(analyser);
      data = new Float32Array(analyser.fftSize);
      micReleased = false;
    }

    async function acquireMic(): Promise<boolean> {
      if (acquiring) return false;
      acquiring = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return false;
        }
        wireAnalyser();
        return true;
      } catch (err) {
        console.error('mic acquire failed', err);
        return false;
      } finally {
        acquiring = false;
      }
    }

    function releaseMic() {
      finalizeUtterance();
      try {
        sourceNode?.disconnect();
      } catch {
        /* already torn down */
      }
      sourceNode = null;
      analyser = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      micReleased = true;
      // Reset VAD so re-acquire starts from a clean silence baseline.
      speaking = false;
      silenceStart = null;
      onsetStart = null;
    }

    (async () => {
      if (!(await acquireMic()) || !stream) return;
      const ms: MediaStream = stream;
      isBluetooth = isBluetoothInput(ms);
      console.log(
        `[whisper] input="${ms.getAudioTracks()[0]?.label}" bluetooth=${isBluetooth}` +
          (isBluetooth ? ' — releasing mic during TTS to keep A2DP output' : '')
      );

      const tick = () => {
        if (stopped) return;

        // On Bluetooth, release the mic when TTS starts (lets the headset go
        // back to A2DP) and re-acquire it when TTS ends. prevSuppressed tracks
        // the edge so we act once per transition, not every frame.
        const suppressedNow = suppressedRef.current;
        if (isBluetooth && suppressedNow !== prevSuppressed) {
          prevSuppressed = suppressedNow;
          if (suppressedNow) releaseMic();
          else void acquireMic();
        } else {
          prevSuppressed = suppressedNow;
        }

        // Mic released (BT during TTS) or mid re-acquire — nothing to analyse.
        if (micReleased || !analyser || !data) {
          requestAnimationFrame(tick);
          return;
        }
        analyser.getFloatTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) sumSquares += data[i] * data[i];
        const rms = Math.sqrt(sumSquares / data.length);

        const now = performance.now();
        const dt = now - lastTickTime;
        lastTickTime = now;

        // Recording runs on the exact same VAD regardless of TTS playback —
        // it must never sit idle while Clea is speaking. Confirming a real
        // barge-in (vs. TTS bleed) is a separate, stricter check below that
        // only decides whether to interrupt the TTS; it never gates capture.
        if (suppressedRef.current) {
          if (rms > BARGE_RMS_THRESHOLD) {
            bargeEnergyMs = Math.min(bargeEnergyMs + dt, BARGE_ONSET_MS * 2);
          } else {
            bargeEnergyMs = Math.max(bargeEnergyMs - dt, 0);
          }
          if (now - lastBargeLogAt > 300) {
            lastBargeLogAt = now;
            console.log(
              `[whisper] barge-in rms=${rms.toFixed(4)} energyMs=${bargeEnergyMs.toFixed(0)}/${BARGE_ONSET_MS}`
            );
          }
          if (bargeEnergyMs >= BARGE_ONSET_MS && !bargeFired) {
            bargeFired = true;
            console.log(`[whisper] BARGE-IN FIRED at rms=${rms.toFixed(4)}`);
            onBargeInRef.current();
          }
        } else {
          bargeEnergyMs = 0;
          bargeFired = false;
        }

        if (rms > SILENCE_RMS_THRESHOLD) {
          if (!speaking) {
            if (onsetStart === null) onsetStart = now;
            if (now - onsetStart >= SPEECH_ONSET_MS) {
              speaking = true;
              speechStart = onsetStart;
              startUtteranceRecording();
            }
          }
          silenceStart = null;
        } else {
          // Dropped back to silence before the onset window confirmed —
          // that was a blip, not speech. Reset so the next crossing gets
          // its own fresh onset check.
          onsetStart = null;
          if (speaking) {
            if (silenceStart === null) silenceStart = now;
            else if (now - silenceStart >= SILENCE_HANG_MS) {
              speaking = false;
              silenceStart = null;
              finalizeUtterance();
            }
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
