import { NextRequest, NextResponse } from 'next/server';
import {
  convertToModelMessages,
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
import { queryQbank, queryCurriculum, searchPathoma, searchFirstAid, makeQueryMyAttempts, makeQueryCurriculumProgress } from '@/lib/clea-tools';
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

function buildSystemPrompt(activity: ActivitySnapshot | null, summary: string, attempts: QuizAttempt[]): string {
  const base =
    "You are Clea, a friendly and concise USMLE Step 1 study assistant for the Ugent platform. Answer in 1-3 short sentences, plain prose, always — keep every reply as short as possible even when explaining reasoning, never pad. Use simple, everyday words over medical jargon or fancy vocabulary whenever a plain word means the same thing — this helps students understand complex concepts. When a technical term is necessary, briefly say what it means in plain words. Always call searchPathoma and/or searchFirstAid before answering any USMLE content question, and base your answer on their returned excerpts rather than on your own training knowledge — only fall back to your own knowledge if both searches return no hits. You can call queryMyAttempts to see the student's past quiz performance, queryQbank to look up practice questions by subject/system/difficulty, queryCurriculum to check disease frequency and weak-area stats across the curriculum, and queryCurriculumProgress to see the student's own percent-complete, current week, and next uncompleted study blocks. When explaining a quiz question or answer, the student can already see the vignette on screen — never restate or reread it back to them. Go straight into teasing out the clues: name one discriminating finding at a time and drill the logic (what it rules in, what it rules out) so the student does the thinking, rather than dumping the full reasoning chain at once. Never lead with the correct answer — only state it after the clue-by-clue reasoning, so the student learns to spot the pattern themselves next time. Never use markdown formatting of any kind: no asterisks, no **bold**, no bullet points, no numbered lists, no headers, no dashes-as-bullets. If you need to list options, name them inline in a single sentence separated by commas. The user speaks through automatic speech recognition which can mishear words. If a word seems like a phonetic misspelling of a medical term, infer the intended term and respond accordingly.";
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
  return `${base}${activityLine}${attemptBlock}${summaryBlock}`;
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

  const serverState = null;
  const activity = clientActivity;

  const supabase = await createClient()
  const { data: attemptsData } = await supabase
    .from('quiz_attempts')
    .select('*')
    .order('created_at', { ascending: false })
  const attempts: QuizAttempt[] = (attemptsData || []).map((row: any) => ({
    timestamp: new Date(row.created_at).getTime(),
    subject: row.subject,
    system: row.system,
    total: row.total_questions,
    correct: row.correct_answers,
    timeSpentSeconds: row.time_spent_seconds,
  }))

  const queryMyAttempts = makeQueryMyAttempts(attempts);

  const { data: progressData } = await supabase.from('curriculum_progress').select('block_id');
  const queryCurriculumProgress = makeQueryCurriculumProgress((progressData || []).map((r: any) => r.block_id));

  const previousMessages = await loadChat(id);

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

  const { text: summary, upTo } = await updateSummary(id, validatedMessages);
  const recentMessages = validatedMessages.slice(upTo);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: buildSystemPrompt(activity, summary, attempts),
    messages: await convertToModelMessages(recentMessages),
    tools: { queryQbank, queryCurriculum, searchPathoma, searchFirstAid, queryMyAttempts, queryCurriculumProgress },
    stopWhen: stepCountIs(8),
    onError: ({ error }) => {
      void logAgentError({ chatId: id, route: 'clea-chat/streamText' }, error);
    },
  });

  result.consumeStream();

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
