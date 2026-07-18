import { NextRequest, NextResponse } from 'next/server';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  toUIMessageStream,
  validateUIMessages,
  TypeValidationError,
  type UIMessage,
} from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import type { ActivitySnapshot } from '@/lib/watch-context';
import { queryQbank, queryCurriculum } from '@/lib/clea-tools';
import { loadChat, saveChat } from '@/lib/clea-chat-store';

const tools = { queryQbank, queryCurriculum };

function buildSystemPrompt(activity: ActivitySnapshot | null): string {
  const base =
    "You are Clea, a friendly and concise USMLE Step 1 study assistant for the Ugent platform. Keep answers short and focused.";
  if (!activity) return base;
  const subjectLabel = activity.subject ? ` (${activity.subject}${activity.system ? `, ${activity.system}` : ''})` : '';
  return `${base} The student is currently on quiz question ${activity.questionNumber} of ${activity.totalQuestions}${subjectLabel}, difficulty: ${activity.difficulty}. They have answered ${activity.totalAnsweredSoFar} questions so far, ${activity.correctSoFar} correctly. Use this context to tailor your answer when relevant.`;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  const messages = await loadChat(id);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 });
  }

  const { id, message, activity } = (await request.json()) as {
    id: string;
    message: UIMessage;
    activity: ActivitySnapshot | null;
  };

  if (!id || !message) {
    return NextResponse.json({ error: 'id and message are required' }, { status: 400 });
  }

  const previousMessages = await loadChat(id);

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({
      messages: [...previousMessages, message],
      tools,
    });
  } catch (error) {
    if (error instanceof TypeValidationError) {
      console.error('clea-chat history validation failed, starting fresh', error);
      validatedMessages = [message];
    } else {
      throw error;
    }
  }

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: buildSystemPrompt(activity),
    messages: convertToModelMessages(validatedMessages),
    tools,
    stopWhen: stepCountIs(4),
    onError: ({ error }) => {
      console.error('clea-chat streamText error', error);
    },
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: validatedMessages,
      onEnd: ({ messages }) => {
        void saveChat({ chatId: id, messages });
      },
    }),
  });
}
