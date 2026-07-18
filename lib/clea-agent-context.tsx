'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, generateId, type UIMessage } from 'ai';
import { useWatch } from '@/lib/watch-context';
import { useContinuousMic } from '@/lib/use-continuous-mic';
import { useWhisperMic } from '@/lib/use-whisper-mic';

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
};

const CleaAgentContext = createContext<CleaAgentValue | null>(null);

export function CleaAgentProvider({ children }: { children: ReactNode }) {
  const { activity } = useWatch();
  const activityRef = useRef(activity);
  activityRef.current = activity;

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
        body: { id, message: messages[messages.length - 1], activity: activityRef.current },
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

  // WebGPU is required for the in-browser Whisper pipeline (transformers.js).
  // Where it's unavailable (Safari, older browsers), fall back to the
  // browser's built-in SpeechRecognition — worse VAD control, but zero setup.
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const onTranscript = (text: string) => queuedSendMessage({ text });

  const { modelLoading: whisperLoading } = useWhisperMic(micActive && hasWebGpu, onTranscript);
  useContinuousMic(micActive && !hasWebGpu, onTranscript);
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
