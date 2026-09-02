import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the model factories
vi.mock('@ai-sdk/deepseek', () => ({
  deepseek: vi.fn((model: string) => ({ type: 'deepseek', model })),
}));
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => ({ type: 'openai', model })),
}));

// vi.mock factory is hoisted above let/const initializers — use a mutable
// wrapper so tests can swap the implementation without re-registering the mock.
const impl = { fn: null as ((opts: any) => Promise<any>) | null };

vi.mock('ai', () => ({
  generateText: vi.fn((opts: any) => {
    if (impl.fn) return impl.fn(opts);
    return Promise.resolve({ text: 'default' });
  }),
}));

import { generateText } from 'ai';
import { generateTextWithFallback, _resetFallbackState } from '@/lib/llm-fallback';

const mockGenerateText = vi.mocked(generateText);

beforeEach(() => {
  impl.fn = null;
  mockGenerateText.mockClear();
  _resetFallbackState();
});

describe('generateTextWithFallback', () => {
  it('uses deepseek when it succeeds', async () => {
    impl.fn = () => Promise.resolve({ text: 'ok' });
    const result = await generateTextWithFallback({ prompt: 'test' });
    expect(result).toEqual({ text: 'ok' });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockGenerateText.mock.calls[0][0].model).toMatchObject({ type: 'deepseek' });
  });

  it('falls back to openai on deepseek failure', async () => {
    // deepseek fails on first generateText call, openai succeeds on second
    let callCount = 0;
    impl.fn = () => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('deepseek down'));
      return Promise.resolve({ text: 'fallback ok' });
    };

    const result = await generateTextWithFallback({ prompt: 'test' });
    expect(result).toEqual({ text: 'fallback ok' });
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockGenerateText.mock.calls[1][0].model).toMatchObject({ type: 'openai', model: 'gpt-4o-mini' });
  });

  it('circuit breaker: second call skips deepseek after first failure', async () => {
    // First call trips the breaker — openai succeeds in the catch path
    let callCount = 0;
    impl.fn = () => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('down'));
      return Promise.resolve({ text: 'fb' });
    };
    await generateTextWithFallback({ prompt: 'first' });
    expect(mockGenerateText).toHaveBeenCalledTimes(2);

    // Second call: deepseekDown is now true — goes straight to openai (line 16)
    // The mock must succeed here since line 16 has no try/catch.
    callCount = 10; // irrelevant — second call only invokes openai once
    impl.fn = () => Promise.resolve({ text: 'second' });
    const result = await generateTextWithFallback({ prompt: 'second' });
    expect(result).toEqual({ text: 'second' });
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
    expect(mockGenerateText.mock.calls[2][0].model).toMatchObject({ type: 'openai' });
  });

  it('passes through all options to the model call', async () => {
    impl.fn = () => Promise.resolve({ text: 'ok' });
    await generateTextWithFallback({
      prompt: 'What is PE?',
      maxTokens: 500,
      temperature: 0.7,
    });
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'What is PE?',
        maxTokens: 500,
        temperature: 0.7,
      }),
    );
  });
});
