'use client';

import { useEffect, useRef } from 'react';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

// Fires on every silent pause even in continuous mode — not a real failure,
// just the signal that onend is about to restart the session.
const BENIGN_ERRORS = new Set(['no-speech', 'aborted']);
// Restarting after these just re-triggers the same failure forever.
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

/** Continuously listens to the mic while `active` using the browser's built-in
 *  SpeechRecognition (Web Speech API — Chrome/Edge), firing onTranscript per finalized utterance. */
export function useContinuousMic(active: boolean, onTranscript: (text: string) => void) {
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (!active) return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      console.error('SpeechRecognition not supported in this browser');
      return;
    }

    let stopped = false;
    let fatal = false;
    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onTranscriptRef.current(text);
        }
      }
    };
    recognition.onerror = (e) => {
      if (BENIGN_ERRORS.has(e.error)) return;
      if (FATAL_ERRORS.has(e.error)) fatal = true;
      console.error(`speech recognition error: ${e.error}`);
    };
    // Browsers auto-stop after a pause even in continuous mode — restart while
    // still active, unless the last error was unrecoverable (e.g. mic permission
    // denied), which would otherwise just loop the same failure forever.
    recognition.onend = () => {
      if (!stopped && !fatal) recognition.start();
    };

    recognition.start();

    return () => {
      stopped = true;
      recognition.onend = null;
      recognition.stop();
    };
  }, [active]);
}
