'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, generateId, type UIMessage } from 'ai';
import { useWatch } from '@/lib/watch-context';
import { useContinuousMic } from '@/lib/use-continuous-mic';
import { useWhisperMic } from '@/lib/use-whisper-mic';
import { getWhisperPipeline } from '@/lib/whisper-pipeline';
import { correctText, stripTranscriptNoise } from '@/lib/asr-correct';
import { logAsrTurn, getAsrLog, getAsrCorrections } from '@/lib/asr-log';
import { getQuizAttempts } from '@/lib/quizAttempts';

const CHAT_ID_KEY = 'clea-chat-id';

const WELCOME_MESSAGE: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: "Hi, I'm Clea, your Ugent study assistant. My full tutoring abilities are coming soon. You can try the chat interface now.",
    },
  ],
};

export type VoiceSurface = 'avatar' | 'orb' | null;

type CleaAgentValue = ReturnType<typeof useChat> & {
  micActive: boolean;
  toggleMic: () => void;
  micModelLoading: boolean;
  // Exactly one surface may own TTS playback at a time — setting this to a
  // new surface implicitly evicts whichever one held it before, so the
  // avatar and the live orb can never both speak the same reply.
  voiceSurface: VoiceSurface;
  setVoiceSurface: (surface: VoiceSurface) => void;
  // True while TTS audio is actually playing out loud. The Whisper mic path
  // (use-whisper-mic.ts) stays capturing through this and treats a loud,
  // sustained onset as a barge-in; the SpeechRecognition fallback has no
  // energy-level access to do the same, so it still hard-mutes on this flag.
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  // Whichever surface is currently playing TTS (e.g. FloatingAvatar) registers
  // its stop function here so a mic-detected barge-in can kill that playback
  // immediately, regardless of which component owns the audio element.
  registerSpeechInterrupt: (handler: (() => void) | null) => void;
};

const CleaAgentContext = createContext<CleaAgentValue | null>(null);

export function CleaAgentProvider({ children }: { children: ReactNode }) {
  const { activity } = useWatch();
  // ponytail: sticky — the quiz page nulls activity on every dep change (and on
  // navigation), but the vignette only ever reaches the model via the system
  // prompt, never the message history. Without this Clea forgets the question
  // it is mid-discussion on and falls back to queryQbank.
  const activityRef = useRef(activity);
  if (activity) activityRef.current = activity;

  const [chatId] = useState(() => {
    if (typeof window === 'undefined') return generateId();
    const existing = window.localStorage.getItem(CHAT_ID_KEY);
    if (existing) return existing;
    const created = generateId();
    window.localStorage.setItem(CHAT_ID_KEY, created);
    return created;
  });

  const chat = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: '/api/clea-chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, message: messages[messages.length - 1], activity: activityRef.current, quizAttempts: getQuizAttempts() },
      }),
    }),
  });

  const hasHydratedRef = useRef(false);
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;

  // chat.sendMessage races if called again before the previous request
  // finishes — the SDK doesn't serialize it, and the API route's
  // load-append-save cycle then drops whichever turn's save loses the
  // race. Queue sends client-side instead: a new one fires immediately
  // only when idle, otherwise it waits for `ready` and is flushed in order.
  const statusRef = useRef(chat.status);
  statusRef.current = chat.status;
  const sendQueueRef = useRef<Parameters<typeof chat.sendMessage>[]>([]);

  useEffect(() => {
    if (chat.status !== 'ready') return;
    const next = sendQueueRef.current.shift();
    if (next) void chat.sendMessage(...next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.status]);

  const queuedSendMessage: typeof chat.sendMessage = (...args) => {
    if (statusRef.current === 'ready' && sendQueueRef.current.length === 0) {
      return chat.sendMessage(...args);
    }
    sendQueueRef.current.push(args);
    // The drain effect only runs on a `status` transition. Anything enqueued
    // while status is already 'ready' would wait for a change that never
    // comes, and the turn would be silently lost — so drain it here instead.
    if (statusRef.current === 'ready') {
      const next = sendQueueRef.current.shift();
      if (next) void chat.sendMessage(...next);
    }
    return Promise.resolve();
  };

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/clea-chat?id=${encodeURIComponent(chatId)}`);
      const loaded: UIMessage[] = res.ok ? await res.json() : [];
      if (cancelled) return;
      // The user may have already sent a message while this GET was in
      // flight (e.g. typed and submitted immediately on mount) — don't
      // clobber that with loaded/welcome history.
      if (messagesRef.current.length > 0) return;
      chat.setMessages(loaded.length > 0 ? loaded : [WELCOME_MESSAGE]);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const [micActive, setMicActive] = useState(false);
  const toggleMic = () => setMicActive((active) => !active);

  const [voiceSurface, setVoiceSurface] = useState<VoiceSurface>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // WebGPU is required for the in-browser Whisper pipeline (transformers.js).
  // Where it's unavailable (Safari, older browsers), fall back to the
  // browser's built-in SpeechRecognition — worse VAD control, but zero setup.
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

  // Warm the Whisper pipeline as soon as the app mounts, not on first mic
  // use — so the multi-hundred-MB model is already downloaded/compiled by
  // the time the user actually presses the mic button.
  useEffect(() => {
    if (hasWebGpu) getWhisperPipeline().catch((err) => console.error('whisper warm-up failed', err));
    // Console handles to review ASR turns and mine dictionary candidates.
    (window as unknown as Record<string, unknown>).asrLog = getAsrLog;
    (window as unknown as Record<string, unknown>).asrMisses = getAsrCorrections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTranscript = (text: string) => {
    const cleaned = stripTranscriptNoise(text);
    const corrected = cleaned ? correctText(cleaned) : '';
    logAsrTurn(text, corrected); // record raw + what reached the LLM
    if (!corrected) return;
    queuedSendMessage({ text: corrected });
  };

  const speechInterruptRef = useRef<(() => void) | null>(null);
  const registerSpeechInterrupt = (handler: (() => void) | null) => {
    speechInterruptRef.current = handler;
  };
  const onBargeIn = () => {
    speechInterruptRef.current?.();
    setIsSpeaking(false);
  };

  const { modelLoading: whisperLoading } = useWhisperMic(
    micActive && hasWebGpu,
    isSpeaking,
    onTranscript,
    onBargeIn
  );
  // No raw audio access via SpeechRecognition, so it can't tell a barge-in
  // from TTS bleed — keep the hard mute for this fallback path.
  useContinuousMic(micActive && !isSpeaking && !hasWebGpu, onTranscript);
  const micModelLoading = hasWebGpu && whisperLoading;

  return (
    <CleaAgentContext.Provider
      value={{
        ...chat,
        sendMessage: queuedSendMessage,
        micActive,
        toggleMic,
        micModelLoading,
        voiceSurface,
        setVoiceSurface,
        isSpeaking,
        setIsSpeaking,
        registerSpeechInterrupt,
      }}
    >
      {children}
    </CleaAgentContext.Provider>
  );
}

export function useCleaAgent(): CleaAgentValue {
  const value = useContext(CleaAgentContext);
  if (!value) {
    throw new Error('useCleaAgent must be used within a CleaAgentProvider');
  }
  return value;
}
