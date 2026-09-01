'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BoltIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckIcon,
  ClipboardIcon,
  EyeIcon,
  EyeSlashIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CleaLiveOrb from './CleaLiveOrb';
import { useWatch } from '@/lib/watch-context';
import { useCleaAgent } from '@/lib/clea-agent-context';
import { stripMarkdown } from '@/lib/strip-markdown';

type CleaMode = 'closed' | 'chat' | 'live';

// Tools whose output is real platform data — textbook pages and the question
// bank. A reply backed by any of them is grounded; anything else came out of
// the model itself, which is what the badge exists to make visible.
const GROUNDING_TOOLS = ['searchPathoma', 'searchFirstAid', 'queryQbank'];

type ToolPart = { type: string; toolName?: string; output?: { hits?: unknown[]; matched?: number } };

// null = no grounding tool ran at all (e.g. small talk), so no badge.
// false = searches ran and every one came back empty — the model fell back
// to its own knowledge, exactly the case worth flagging.
function groundingOf(message: { role: string; parts: unknown[] }): boolean | null {
  if (message.role !== 'assistant') return null;
  const calls = (message.parts as ToolPart[]).filter(
    (part) =>
      typeof part?.type === 'string' &&
      part.type.startsWith('tool-') &&
      GROUNDING_TOOLS.includes(part.type.slice('tool-'.length))
  );
  if (calls.length === 0) return null;
  return calls.some((part) => (part.output?.hits?.length ?? part.output?.matched ?? 0) > 0);
}

export default function CleaChat() {
  const { watchEnabled, toggleWatch, activity } = useWatch();
  const {
    messages, sendMessage, status, micActive, toggleMic, micModelLoading, voiceSurface, setVoiceSurface,
    setMessages, id: chatId, quickCorrect,
  } = useCleaAgent();
  const [mode, setMode] = useState<CleaMode>('closed');
  const [draft, setDraft] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ttsId, setTtsId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof scrollRef.current?.scrollTo !== 'function') return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status, mode]);

  useEffect(() => {
    if (mode === 'closed') return;
    if (mode === 'chat') inputRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        leaveLive();
        setMode('closed');
        if (micActive) toggleMic();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Releases the orb's voice-surface claim, but only if it still holds it —
  // the avatar may have taken it over in the meantime, and this must not
  // clobber that.
  const leaveLive = () => {
    if (voiceSurface === 'orb') setVoiceSurface(null);
  };

  const closeClea = () => {
    leaveLive();
    setMode('closed');
    if (micActive) toggleMic();
  };

  const [orbPos, setOrbPos] = useState({ x: 300, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const startLive = () => {
    setMode('live');
    setVoiceSurface('orb');
    if (!micActive) toggleMic();
  };

  // The avatar taking the voice surface means live mode must close, not
  // just fall silent — otherwise both widgets would sit open at once.
  useEffect(() => {
    if (mode === 'live' && voiceSurface === 'avatar') {
      setMode('chat');
      if (micActive) toggleMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, voiceSurface]);

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

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const corrected = await quickCorrect(text);
    sendMessage({ text: corrected });
  };

  function getMessageText(message: (typeof messages)[number]): string {
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
  }

  const copyMessage = (message: (typeof messages)[number], key: string) => {
    navigator.clipboard.writeText(getMessageText(message));
    setCopiedId(key);
    setTimeout(() => setCopiedId((current) => (current === key ? null : current)), 1500);
  };

  const playingKeyRef = useRef<string | null>(null);
  // Single-slot cache — a replay of the message just played reuses this
  // object URL instead of re-hitting ElevenLabs. Only ever holds the most
  // recent clip: a new one lands, the old one is revoked, so this never
  // accumulates across a chat session.
  const audioCacheRef = useRef<{ key: string; url: string } | null>(null);
  useEffect(() => () => { if (audioCacheRef.current) URL.revokeObjectURL(audioCacheRef.current.url); }, []);

  const playMessage = async (text: string, key: string) => {
    // Guards against a double-click firing before the `disabled` prop's
    // re-render lands — setTtsId alone isn't synchronous enough to block it.
    if (playingKeyRef.current === key) return;
    playingKeyRef.current = key;
    setTtsId(key);
    const clearTts = () => {
      if (playingKeyRef.current === key) playingKeyRef.current = null;
      setTtsId((current) => (current === key ? null : current));
    };

    const cached = audioCacheRef.current;
    if (cached?.key === key) {
      const audio = new Audio(cached.url);
      audio.onended = clearTts;
      audio.onerror = clearTts;
      try {
        await audio.play();
      } catch {
        clearTts();
      }
      return;
    }

    try {
      const res = await fetch('/api/tts-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { clearTts(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioCacheRef.current) URL.revokeObjectURL(audioCacheRef.current.url);
      audioCacheRef.current = { key, url };
      const audio = new Audio(url);
      audio.onended = clearTts;
      audio.onerror = clearTts;
      await audio.play();
    } catch {
      clearTts();
    }
  };

  const clearChat = async () => {
    await fetch('/api/clea-chat', { method: 'DELETE', body: JSON.stringify({ id: chatId }) });
    setMessages([]);
    localStorage.removeItem('clea-chat-id');
  };

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
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 md:bottom-6 md:right-6">
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
                {watchEnabled && activity && (
                  <p className="text-xs font-medium text-primary-600">
                    Watching: Q{activity.questionNumber}/{activity.totalQuestions}
                    {activity.subject ? ` · ${activity.subject}` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleWatch}
                aria-label={watchEnabled ? 'Turn off Watch' : 'Turn on Watch'}
                aria-pressed={watchEnabled}
                className={`flex items-center justify-center rounded-full p-1.5 transition focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  watchEnabled
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600'
                }`}
              >
                {watchEnabled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
              </button>
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
                onClick={clearChat}
                aria-label="Clear chat"
                className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <TrashIcon className="h-4 w-4" />
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

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4" aria-live="polite">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const text = getMessageText(message);
              const grounded = groundingOf(message);
              const msgKey = message.id || String(index);
              const justCopied = copiedId === msgKey;
              const isPlaying = ttsId === msgKey;
              return (
                <div key={msgKey} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    isUser
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-700'
                  }`}>
                    {/* The system prompt bans markdown, but the model emits it in
                        ~37% of replies and nothing renders it — so asterisks and
                        list markers reach the user literally. Strip on display,
                        same as the TTS path already does. */}
                    <p>
                      {message.parts
                        .filter((part) => part.type === 'text')
                        .map((part, index) => (
                          <span key={index}>{stripMarkdown((part as { text: string }).text)}</span>
                        ))}
                    </p>
                    <div className={`mt-1.5 flex items-center gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {/* Only the icons fade — a badge inside the dimmed group
                          inherits its opacity and is unreadable at rest. */}
                      <span className={`flex gap-1 ${isUser ? 'opacity-60' : 'opacity-40'} transition-opacity hover:opacity-100`}>
                      <button
                        type="button"
                        onClick={() => copyMessage(message, msgKey)}
                        aria-label={justCopied ? 'Copied' : 'Copy message'}
                        className={`rounded p-0.5 transition ${justCopied ? 'text-emerald-600 opacity-100' : isUser ? 'hover:text-white' : 'hover:text-neutral-900'}`}
                      >
                        {justCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
                      </button>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => playMessage(text, msgKey)}
                          disabled={isPlaying}
                          aria-label={isPlaying ? 'Playing message' : 'Play message'}
                          aria-pressed={isPlaying}
                          className={`rounded p-0.5 transition ${isPlaying ? 'text-primary-600 opacity-100 animate-pulse' : 'hover:text-neutral-900'}`}
                        >
                          <SpeakerWaveIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      </span>
                      {grounded !== null && (
                        <span
                          title={
                            grounded
                              ? 'Based on First Aid, Pathoma, or the question bank'
                              : 'Those sources returned nothing — this is the model’s own knowledge'
                          }
                          className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide ${
                            grounded
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          }`}
                        >
                          {grounded ? 'Verified' : 'AI'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
                  Clea is thinking…
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-neutral-200 bg-white p-3">
            {microphoneButton(true)}
            <label htmlFor="clea-message" className="sr-only">Message Clea</label>
            <input
              ref={inputRef}
              id="clea-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={micActive ? 'Listening...' : 'Ask Clea...'}
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
        <div className="relative flex items-end justify-end">
          {micActive && (
            <p className="absolute bottom-1 right-16 whitespace-nowrap rounded-full border border-[#D5DEE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#0E7490] shadow-[0_8px_24px_rgba(15,23,42,0.12)]" aria-live="polite">
              Listening...
            </p>
          )}
          <button
            type="button"
            onClick={() => setMode('chat')}
            aria-label="Open Clea study assistant"
            className="group relative grid h-14 w-14 place-items-center rounded-full bg-[#06B6D4] text-white shadow-[0_12px_32px_rgba(14,116,144,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0E7490] hover:shadow-[0_16px_36px_rgba(14,116,144,0.32)] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:ring-offset-2"
          >
            <ChatBubbleOvalLeftEllipsisIcon className="relative h-6 w-6 stroke-2" />
            {micActive && (
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 h-3.5 w-3.5 animate-pulse rounded-full border-[3px] border-[#E8EDF2] bg-[#EF4444]"
              />
            )}
            <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-[#0E7490] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Ask Clea
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
