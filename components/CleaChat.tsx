'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CleaLiveOrb from './CleaLiveOrb';

type CleaMode = 'closed' | 'chat' | 'live';

type Message = {
  id: number;
  role: 'clea' | 'user';
  text: string;
};

const WELCOME_MESSAGE: Message = {
  id: 1,
  role: 'clea',
  text: "Hi, I'm Clea, your Ugent study assistant. My full tutoring abilities are coming soon. You can try the chat interface now.",
};

export default function CleaChat() {
  const [mode, setMode] = useState<CleaMode>('closed');
  const [isMicActive, setIsMicActive] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextMessageId = useRef(2);

  useEffect(() => {
    if (mode === 'closed') return;
    if (mode === 'chat') inputRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMode('closed');
        setIsMicActive(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mode]);

  const closeClea = () => {
    setMode('closed');
    setIsMicActive(false);
  };

  const toggleMicrophone = () => setIsMicActive((active) => !active);

  const [orbPos, setOrbPos] = useState({ x: 300, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const startLive = () => {
    setMode('live');
    setIsMicActive(true);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: orbPos.x, posY: orbPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setOrbPos({
        x: dragRef.current.posX + ev.clientX - dragRef.current.startX,
        y: dragRef.current.posY + ev.clientY - dragRef.current.startY,
      });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, posX: orbPos.x, posY: orbPos.y };
    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) return;
      setOrbPos({
        x: dragRef.current.posX + ev.touches[0].clientX - dragRef.current.startX,
        y: dragRef.current.posY + ev.touches[0].clientY - dragRef.current.startY,
      });
    };
    const onEnd = () => { dragRef.current = null; document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const reply = 'Clea is in placeholder mode for now. Soon I will use your Ugent study material to help answer this.';

    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, role: 'user', text },
      { id: nextMessageId.current++, role: 'clea', text: reply },
    ]);
    setDraft('');
  };

  const microphoneButton = (compact = false) => (
    <button
      type="button"
      onClick={toggleMicrophone}
      aria-label={isMicActive ? 'Stop visual microphone' : 'Start visual microphone'}
      aria-pressed={isMicActive}
      className={`${compact ? 'h-9 w-9' : 'h-11 w-11'} flex items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        isMicActive
          ? 'border-primary-500 bg-primary-600 text-white shadow-md'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-600'
      }`}
    >
      <MicrophoneIcon className="h-4 w-4" />
    </button>
  );

  if (mode === 'live') {
    return (
      <div
        role="dialog"
        aria-label="Clea Live mode"
        className="fixed z-50 cursor-grab active:cursor-grabbing touch-none select-none"
        style={{ left: orbPos.x, top: orbPos.y }}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
      >
        <CleaLiveOrb />
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-20 z-50 md:right-6 md:top-6">
      {mode === 'chat' ? (
        <section
          role="dialog"
          aria-label="Clea study assistant"
          className="flex h-[min(480px,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-[360px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">C</div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Clea</h2>
                <p className="text-xs text-neutral-500">Study Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startLive}
                aria-label="Start Clea Live"
                className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <BoltIcon className="h-3.5 w-3.5" />
                Live
              </button>
              <button
                type="button"
                onClick={closeClea}
                aria-label="Close Clea study assistant"
                className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-primary-600 text-white'
                    : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-700'
                }`}>
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-neutral-200 bg-white p-3">
            {microphoneButton(true)}
            <label htmlFor="clea-message" className="sr-only">Message Clea</label>
            <input
              ref={inputRef}
              id="clea-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={isMicActive ? 'Listening...' : 'Ask Clea...'}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-50"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => setMode('chat')}
              aria-label="Open Clea study assistant"
              className="flex items-center gap-2 rounded-full bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Clea
            </button>
          </div>
          {isMicActive && (
            <p className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-primary-600 shadow-sm" aria-live="polite">
              Listening...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
