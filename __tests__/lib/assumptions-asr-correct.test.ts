import { describe, it, expect } from 'vitest';
import { levenshtein, correctText, stripTranscriptNoise } from '@/lib/asr-correct';

// Assumption pin: the ASR correction pipeline must reliably map Whisper
// manglings to correct medical terms, drop noise, and never corrupt
// already-correct text.

describe('assumption: levenshtein distance', () => {
  it('identical strings return 0', () => {
    expect(levenshtein('asthma', 'asthma')).toBe(0);
  });

  it('single char difference returns 1', () => {
    expect(levenshtein('asthma', 'asthme')).toBe(1);
  });

  it('completely different strings', () => {
    expect(levenshtein('abc', 'xyz')).toBe(3);
  });
});

describe('assumption: stripTranscriptNoise', () => {
  it('drops parenthetical noise blocks', () => {
    expect(stripTranscriptNoise('Asthma (silence) treatment')).toBe('Asthma treatment');
  });

  it('drops bracketed noise blocks', () => {
    expect(stripTranscriptNoise('COPD [cough] management')).toBe('COPD management');
  });

  it('drops known noise tokens', () => {
    expect(stripTranscriptNoise('hmm')).toBe('');
    expect(stripTranscriptNoise('uh')).toBe('');
    expect(stripTranscriptNoise('um')).toBe('');
  });

  it('drops Whisper hallucination phrases', () => {
    expect(stripTranscriptNoise('thank you for watching')).toBe('');
    expect(stripTranscriptNoise('bye')).toBe('');
  });

  it('drops non-Latin script transcripts (CJK/Cyrillic)', () => {
    expect(stripTranscriptNoise('你好')).toBe('');
    expect(stripTranscriptNoise('Привет')).toBe('');
  });

  it('preserves real speech', () => {
    expect(stripTranscriptNoise('Asthma is reversible')).toBe('Asthma is reversible');
  });

  it('normalizes whitespace', () => {
    expect(stripTranscriptNoise('Asthma   is   reversible')).toBe('Asthma is reversible');
  });
});

describe('assumption: correctText maps known aliases', () => {
  it('single-word alias (seudomonas -> pseudomonas)', () => {
    expect(correctText('seudomonas')).toBe('pseudomonas');
  });

  it('multi-word alias (coccidoid geomycosis -> coccidioidomycosis)', () => {
    expect(correctText('coccidoid geomycosis')).toBe('coccidioidomycosis');
  });

  it('preserves already-correct words', () => {
    expect(correctText('asthma')).toBe('asthma');
  });

  it('handles sentence with mixed correct and incorrect', () => {
    const result = correctText('the seudomonas causes pneumonia');
    expect(result).toContain('pseudomonas');
  });
});

describe('assumption: correctText does not corrupt', () => {
  it('leaves common English words alone', () => {
    expect(correctText('hello world')).toBe('hello world');
  });

  it('leaves short words (< 3 chars) alone', () => {
    expect(correctText('is a')).toBe('is a');
  });
});
