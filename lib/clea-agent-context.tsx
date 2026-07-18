'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, generateId, type UIMessage } from 'ai';
import { useWatch } from '@/lib/watch-context';
import { useContinuousMic } from '@/lib/use-continuous-mic';

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

type CleaAgentValue = ReturnType<typeof useChat> & {
  micActive: boolean;
  toggleMic: () => void;
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

  useContinuousMic(micActive, (text) => {
    chat.sendMessage({ text });
  });

  return (
    <CleaAgentContext.Provider value={{ ...chat, micActive, toggleMic }}>
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
