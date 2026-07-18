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
