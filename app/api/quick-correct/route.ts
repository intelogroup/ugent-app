import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithFallback } from '@/lib/llm-fallback';

export const dynamic = 'force-dynamic';

const SYSTEM = `You fix typos and misspellings in messages sent to a USMLE medical study chat. Given the user's message and, if provided, recent conversation context, correct every misspelled or garbled word (medical or plain English) by inferring what the user meant. You MUST fix words like "teh"->"the", "wut"->"what", "numonia"->"pneumonia" — never leave a misspelled word uncorrected just because the sentence is still readable. Do not change correctly spelled words, do not answer the question, do not add or remove content, do not change punctuation or capitalization beyond what the fix requires. Return ONLY the corrected text, nothing else — no preamble, no quotes.

Example:
Input: wut is teh tx for numonia
Output: what is the tx for pneumonia`;

export async function POST(req: NextRequest) {
  const { text, recentMessages } = (await req.json()) as { text?: string; recentMessages?: string[] };
  if (!text || !text.trim()) {
    return NextResponse.json({ corrected: text ?? '' });
  }

  const context = Array.isArray(recentMessages) && recentMessages.length > 0
    ? `Recent conversation:\n${recentMessages.join('\n')}\n\n`
    : '';

  try {
    const res = await generateTextWithFallback({
      system: SYSTEM,
      prompt: `${context}Message to fix:\n${text}`,
      temperature: 0,
      maxOutputTokens: 200,
    });
    const corrected = (res as any).text?.trim();
    return NextResponse.json({ corrected: corrected || text });
  } catch (e) {
    console.warn('[quick-correct] model call failed, returning original text', e);
    return NextResponse.json({ corrected: text });
  }
}
