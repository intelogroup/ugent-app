import { NextRequest, NextResponse } from 'next/server';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  generateText,
  stepCountIs,
  toUIMessageStream,
  validateUIMessages,
  TypeValidationError,
  type UIMessage,
} from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import type { ActivitySnapshot } from '@/lib/watch-context';
import type { QuizAttempt } from '@/lib/quizAttempts';
import { queryQbank, queryCurriculum, searchPathoma, searchFirstAid, makeQueryMyAttempts, makeQueryCurriculumProgress, searchBooks } from '@/lib/clea-tools';
import { loadChat, saveChat, loadSummary, saveSummary, deleteChat } from '@/lib/clea-chat-store';
import { createClient } from '@/lib/supabase/server'
import { logAgentError, clientErrorMessage } from '@/lib/agent-error-logger';

export const dynamic = 'force-dynamic';

// Full history is always persisted (loadChat/saveChat use the untrimmed
// list). The model's window is everything from `upTo` (how far the summary
// has caught up to) onward — not a fixed last-40 slice — so nothing is ever
// dropped from context before it's been folded into the summary. That window
// is allowed to float between MAX_MODEL_HISTORY and MAX_MODEL_HISTORY +
// SUMMARY_BATCH_SIZE; once it exceeds the ceiling, the oldest
// SUMMARY_BATCH_SIZE messages get folded into the summary in one call and
// `upTo` jumps forward, snapping the window back down near MAX_MODEL_HISTORY.
// Batching trades summarization frequency (every ~5 turns instead of every
// turn) for a temporarily larger model window — never a context gap.
// ponytail: fixed-count tail, not token-aware — bump this or add real token
// counting if replies start losing relevant older context.
const MAX_MODEL_HISTORY = 40;
const SUMMARY_BATCH_SIZE = 10;

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join(' ');
}

// Returns the summary text to use this turn, and how many messages (from the
// start of `allMessages`) it now covers. Only calls the model when enough
// overflow has piled up past MAX_MODEL_HISTORY + SUMMARY_BATCH_SIZE.
async function updateSummary(
  chatId: string,
  allMessages: UIMessage[]
): Promise<{ text: string; upTo: number }> {
  const stored = await loadSummary(chatId);
  const upTo = stored?.upTo ?? 0;
  const text = stored?.text ?? '';

  const unsummarizedTail = allMessages.length - upTo;
  if (unsummarizedTail <= MAX_MODEL_HISTORY + SUMMARY_BATCH_SIZE) {
    return { text, upTo };
  }

  const foldCount = unsummarizedTail - MAX_MODEL_HISTORY;
  const toFold = allMessages.slice(upTo, upTo + foldCount);
  const transcript = toFold
    .map((m) => `${m.role}: ${messageText(m)}`)
    .filter((line) => line.trim().length > 0)
    .join('\n');

  if (!transcript) {
    const updated = { text, upTo: upTo + foldCount };
    await saveSummary(chatId, updated);
    return updated;
  }

  const { text: newText } = await generateText({
    model: deepseek('deepseek-chat'),
    system:
      'Summarize this study-assistant conversation excerpt in under 150 words. Keep concrete facts (topics covered, questions asked, decisions made) that would help the assistant continue the conversation naturally. Be terse.',
    prompt: text
      ? `Existing summary of earlier turns:\n${text}\n\nNew turns to fold in:\n${transcript}`
      : `Turns to summarize:\n${transcript}`,
  });

  const updated = { text: newText, upTo: upTo + foldCount };
  await saveSummary(chatId, updated);
  return updated;
}

function buildAttemptSummary(attempts: QuizAttempt[]): string {
  if (attempts.length === 0) return '';
  const total = attempts.length;
  const totalQ = attempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);
  const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const last = attempts[attempts.length - 1];
  const lastPct = last.total > 0 ? Math.round((last.correct / last.total) * 100) : 0;
  return ` The student has completed ${total} quiz session(s) (${totalQ} questions, ${overallPct}% overall). Most recent: ${lastPct}% on ${last.subject ?? 'mixed'} (${last.system ?? 'any system'}).`;
}

const QUIZ_FIRE_KEYWORDS = ['quiz', 'clues?', 'pick', 'choices?', 'answer choices?', 'a\\.\\s*.*b\\.', 'choose', 'which.*answer', 'tell me.*clues'];

function detectQuizFire(text: string, lastAiText = ''): boolean {
  const t = text.toLowerCase().replace(/[^a-z0-9\s.]/g, '');
  if (QUIZ_FIRE_KEYWORDS.some((kw) => new RegExp(kw, 'i').test(t))) return true;
  // single letter answer (a/b) or "the answer is X" — persist quiz-fire from prior turn
  if (/^[ab]$/.test(t.trim()) || /the answer is [ab]/i.test(t)) return true;
  // last AI reply was in quiz-fire format — persist
  if (/^Clues:|Answer:\s*[AB]/.test(lastAiText)) return true;
  return false;
}

const QUIZ_FIRE_ONE_SHOT = ' QUIZ-FIRE OVERRIDE: Output ONLY: 1 line of clue fragments, then a blank line, then A) ... B) ..., then "Answer: [A/B]". No full sentences anywhere. No explanations before clues. This overrides all other instructions.';

function buildSystemPrompt(activity: ActivitySnapshot | null, summary: string, attempts: QuizAttempt[], grounding: string, quizFire = false): string {
  const base = quizFire
    ? "You are Clea. QUIZ-FIRE MODE. Output ONLY: 1 line of clue fragments (no full sentences), blank line, A) ... B) ... separate lines, 'Answer: [A/B]'. Zero full sentences anywhere. No intro line. No 'the clues point to'. No definitions. No explanations. Never elaborate. Never add text before the clue line." + QUIZ_FIRE_ONE_SHOT
    : "You are Clea, a concise USMLE Step 1 study assistant. GROUNDING RULE: Answer ONLY from Pathoma/First Aid excerpts provided below. If those excerpts don't contain relevant info, say 'Your reference materials do not cover this topic' and offer to search the curriculum. Never use outside knowledge. Answer in 1-2 short sentences max. Single paragraph, plain words, no padding. Define technical terms briefly. Spell out all medical terms (intramuscular not IM, milligrams not mg). Callable tools: queryMyAttempts, queryQbank, queryCurriculum, queryCurriculumProgress. Never quote the vignette verbatim. Cover all clues in one concise explanation, then state the answer. Never lead with the correct answer — name at least one discriminating clue first. Never use markdown. List options inline, comma-separated. ASR may mishear words — infer intended term.";
  const selectionLine = activity && activity.hasSelectedAnswer
    ? activity.currentQuestionCorrect !== null
      ? activity.currentQuestionCorrect
        ? ' They got this question correct.'
        : ' They got this question wrong.'
      : ' They have selected an answer but not yet submitted it.'
    : '';
  const questionBlock = activity
    ? ` Current question text: "${activity.questionText}" Answer choices: ${activity.optionTexts
        .map((t, i) => `${String.fromCharCode(65 + i)}) ${t}`)
        .join(', ')}.${activity.selectedOptionText ? ` They have selected: "${activity.selectedOptionText}".` : ''}`
    : '';
  const activityLine = activity
    ? ` The student is currently on quiz question ${activity.questionNumber} of ${activity.totalQuestions}${
        activity.subject ? ` (${activity.subject}${activity.system ? `, ${activity.system}` : ''})` : ''
      }, difficulty: ${activity.difficulty}. They have answered ${activity.totalAnsweredSoFar} questions so far, ${activity.correctSoFar} correctly.${selectionLine}${questionBlock} You DO have live access to the student's current screen via this text — it is fed to you in real time. Never say you cannot see their screen, quiz, or question; that is false. If asked what they're looking at or for help on the current question, answer directly using the question text and choices above.`
    : '';
  const attemptBlock = buildAttemptSummary(attempts);
  const summaryBlock = summary ? `\n\nSummary of earlier conversation:\n${summary}` : '';
  const groundingBlock = grounding
    ? `\n\nReference material (Pathoma / First Aid excerpts for the student's latest message):\n${grounding}`
    : '\n\nNo relevant Pathoma or First Aid excerpts found for this query. Do not use outside knowledge.';
  return `${base}${activityLine}${attemptBlock}${summaryBlock}${groundingBlock}`;
}

// Prompt-only enforcement of "never quote the vignette" and "never lead with
// the answer" has a real ceiling — DeepSeek still slips on both occasionally
// (confirmed via scripts/eval-clea-prompt.mjs). This is the code-level
// backstop for the quiz-explain path only: cheap n-gram/substring checks run
// against the model's own draft, with one retry before we give up and ship
// the second draft as-is (no infinite loop).
function detectGuardrailViolation(text: string, activity: ActivitySnapshot): 'vignette-reread' | 'premature-answer' | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  const vignetteWords = normalize(activity.questionText);
  const replyWords = normalize(text);
  const GRAM = 4;
  if (vignetteWords.length >= GRAM) {
    const vignetteGrams = new Set<string>();
    for (let i = 0; i + GRAM <= vignetteWords.length; i++) vignetteGrams.add(vignetteWords.slice(i, i + GRAM).join(' '));
    for (let i = 0; i + GRAM <= replyWords.length; i++) {
      if (vignetteGrams.has(replyWords.slice(i, i + GRAM).join(' '))) return 'vignette-reread';
    }
  }

  if (activity.hasSelectedAnswer && activity.currentQuestionCorrect === false) {
    const firstSentence = (text.split(/(?<=[.!?])\s/)[0] || '').toLowerCase();
    const leaked = activity.optionTexts.find(
      (opt) => opt !== activity.selectedOptionText && opt.trim() && firstSentence.includes(opt.toLowerCase())
    );
    if (leaked) return 'premature-answer';
  }

  return null;
}

function messageQueryText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .slice(0, 300);
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  const messages = await loadChat(id);
  return NextResponse.json(messages);
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string };
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  await deleteChat(id);
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 });
  }

  const { id, message, activity: clientActivity, quizAttempts: clientAttempts } = (await request.json()) as {
    id: string;
    message: UIMessage;
    activity: ActivitySnapshot | null;
    quizAttempts: QuizAttempt[];
  };

  if (!id || !message) {
    return NextResponse.json({ error: 'id and message are required' }, { status: 400 });
  }

  const t0 = performance.now();
  const serverState = null;
  const activity = clientActivity;

  const supabase = await createClient()

  // Independent reads — none depend on each other's result — run in
  // parallel instead of as three sequential round trips. The RAG prefetch
  // (search both books against the raw user utterance) also has no
  // dependency on these and rides along in the same Promise.all so its
  // embed+RPC latency is hidden behind whichever read is slowest, not
  // added on top.
  const queryText = messageQueryText(message);
  const [attemptsRes, progressRes, previousMessages, groundingHits] = await Promise.all([
    supabase.from('quiz_attempts').select('*').order('created_at', { ascending: false }),
    supabase.from('curriculum_progress').select('block_id'),
    loadChat(id),
    queryText ? searchBooks(queryText) : Promise.resolve(''),
  ]);
  const lastAiText = previousMessages.filter(m => m.role === 'assistant').at(-1)?.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map(p => p.text).join(' ') ?? '';
  const quizFire = detectQuizFire(queryText, lastAiText);
  console.log(`[clea-chat] stage=parallel-reads ms=${(performance.now() - t0).toFixed(0)}`);

  const attempts: QuizAttempt[] = (attemptsRes.data || []).map((row: any) => ({
    timestamp: new Date(row.created_at).getTime(),
    subject: row.subject,
    system: row.system,
    total: row.total_questions,
    correct: row.correct_answers,
    timeSpentSeconds: row.time_spent_seconds,
  }))

  const queryMyAttempts = makeQueryMyAttempts(attempts);
  const queryCurriculumProgress = makeQueryCurriculumProgress((progressRes.data || []).map((r: any) => r.block_id));

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({
      messages: [...previousMessages, message],
      // validateUIMessages infers per-tool input/output types from a fully
      // parameterized UIMessage<...> generic; without one, TS can't unify
      // our concrete tool() definitions with its default unknown/unknown
      // shape even though they're structurally compatible at runtime.
      tools: { queryQbank, queryCurriculum, searchPathoma, searchFirstAid, queryMyAttempts, queryCurriculumProgress } as unknown as Record<string, never>,
    });
  } catch (error) {
    if (error instanceof TypeValidationError) {
      console.error('clea-chat history validation failed, starting fresh', error);
      validatedMessages = [message];
    } else {
      throw error;
    }
  }

  const summaryT0 = performance.now();
  const { text: summary, upTo } = await updateSummary(id, validatedMessages);
  console.log(`[clea-chat] stage=updateSummary ms=${(performance.now() - summaryT0).toFixed(0)}`);
  const recentMessages = validatedMessages.slice(upTo);
  const modelMessages = await convertToModelMessages(recentMessages);
  const sharedTools = { queryQbank, queryCurriculum, searchPathoma, searchFirstAid, queryMyAttempts, queryCurriculumProgress };
  const chatTools = { queryQbank, queryCurriculum, queryMyAttempts, queryCurriculumProgress };

  // Quiz-explain turns are exactly where "never quote the vignette" /
  // "never lead with the answer" get violated, and the filler-ack already
  // masks the latency of a non-streamed reply here — so this path buffers
  // the full answer, runs the code-level guardrail check, and retries once
  // before shipping. General chat (no vignette in play) keeps streaming
  // straight through below, since eval showed those rules hold up fine there.
  if (activity && activity.questionText) {
    const genT0 = performance.now();
    const generate = (system: string) =>
      generateText({
        model: deepseek('deepseek-chat'),
        system,
        messages: modelMessages,
    tools: sharedTools,
        stopWhen: stepCountIs(8),
      });

    const baseSystem = buildSystemPrompt(activity, summary, attempts, groundingHits, quizFire);
    let { text: finalText } = await generate(baseSystem);
    // ponytail: enforce grounding — if RAG found nothing and reply doesn't admit it, override
    if (!groundingHits && !quizFire && !/do not cover|no relevant|not in your/i.test(finalText)) {
      finalText = 'Your reference materials do not cover this topic. Would you like me to search the curriculum instead?';
    }
    let violation = detectGuardrailViolation(finalText, activity);
    if (violation) {
      console.warn(`[clea-chat] guardrail violation=${violation}, retrying once`);
      const retrySystem = `${baseSystem}\n\nIMPORTANT: your previous draft violated the rule against ${
        violation === 'vignette-reread' ? 'quoting the vignette verbatim' : 'revealing the correct answer before reasoning through a clue'
      }. Rewrite the reply so it doesn't do that this time.`;
      const retry = await generate(retrySystem);
      finalText = retry.text;
      violation = detectGuardrailViolation(finalText, activity);
      // Last resort for a leaked answer: the leak is always in the opening
      // sentence (that's the whole definition of "premature"), so dropping
      // it deterministically removes the leak without needing a 3rd model
      // call. Vignette-reread has no such fixed location, so it's left as
      // logged-only — a targeted redaction there would be more likely to
      // mangle the sentence than fix it.
      if (violation === 'premature-answer') {
        console.warn('[clea-chat] guardrail violation=premature-answer persisted after retry, dropping leaked opening sentence');
        const sentences = finalText.split(/(?<=[.!?])\s+/);
        finalText = sentences.slice(1).join(' ').trim() || finalText;
      } else if (violation) {
        console.warn(`[clea-chat] guardrail violation=${violation} persisted after retry, shipping anyway`);
      }
    }
    console.log(`[clea-chat] stage=guarded-generate ms=${(performance.now() - genT0).toFixed(0)}`);

    const stream = createUIMessageStream({
      originalMessages: validatedMessages,
      execute: ({ writer }) => {
        writer.write({ type: 'start' });
        writer.write({ type: 'start-step' });
        writer.write({ type: 'text-start', id: 'txt-0' });
        writer.write({ type: 'text-delta', id: 'txt-0', delta: finalText });
        writer.write({ type: 'text-end', id: 'txt-0' });
        writer.write({ type: 'finish-step' });
        writer.write({ type: 'finish' });
      },
      onError: clientErrorMessage,
      onEnd: ({ messages }) => {
        void saveChat({ chatId: id, messages });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  let firstChunkLogged = false;
  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: buildSystemPrompt(activity, summary, attempts, groundingHits, quizFire),
    messages: modelMessages,
    tools: chatTools,
    stopWhen: stepCountIs(8),
    onChunk: () => {
      if (firstChunkLogged) return;
      firstChunkLogged = true;
      console.log(`[clea-chat] stage=streamText-first-chunk ms=${(performance.now() - t0).toFixed(0)}`);
    },
    onError: ({ error }) => {
      void logAgentError({ chatId: id, route: 'clea-chat/streamText' }, error);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: validatedMessages,
      onError: clientErrorMessage,
      onEnd: ({ messages }) => {
        void saveChat({ chatId: id, messages });
      },
    }),
  });
}
