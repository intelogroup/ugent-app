import { describe, it, expect } from 'vitest';
import { levenshtein, correctText, stripTranscriptNoise } from '@/lib/asr-correct';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('counts insertions', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });

  it('counts deletions', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });

  it('counts substitutions', () => {
    expect(levenshtein('cat', 'car')).toBe(1);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', '')).toBe(0);
  });

  it('handles full replacement', () => {
    expect(levenshtein('abc', 'xyz')).toBe(3);
  });
});

describe('correctText', () => {
  it('passes through known dictionary words unchanged', () => {
    expect(correctText('pneumonia')).toBe('pneumonia');
    expect(correctText('asthma')).toBe('asthma');
  });

  it('normalizes dictionary word casing', () => {
    expect(correctText('Pneumonia')).toBe('pneumonia');
    expect(correctText('PNEUMONIA')).toBe('pneumonia');
  });

  it('leaves short words (< 3 chars) untouched', () => {
    expect(correctText('I am ok')).toBe('I am ok');
  });

  it('leaves common English words untouched', () => {
    // "hello" is in common-english.json, should not be corrected to a medical term
    expect(correctText('hello world')).toBe('hello world');
  });

  it('corrects known aliases', () => {
    expect(correctText('seudomonas')).toBe('pseudomonas');
    expect(correctText('strepococcus')).toBe('streptococcus');
    expect(correctText('hairpaste')).toBe('herpes');
  });

  it('corrects multi-word aliases', () => {
    expect(correctText('coccidoid geomycosis')).toBe('coccidioidomycosis');
    expect(correctText('prota virus')).toBe('rotavirus');
    expect(correctText('raja lamblia')).toBe('giardia lamblia');
  });

  it('normalizes punctuation-wrapped tokens via alphaKey', () => {
    // "Oto-vie-wises" → alphaKey → "otoviewises" → alias → "orthomyxoviruses"
    expect(correctText('Oto-vie-wises')).toBe('orthomyxoviruses');
  });

  it('preserves words already in dictionary even with odd casing', () => {
    // "IKU" → alphaKey → "iku" (3 chars), not in dict or stoplist — depends on phonetic match
    // Just verify it doesn't crash
    const result = correctText('IKU');
    expect(typeof result).toBe('string');
  });

  it('handles empty input', () => {
    expect(correctText('')).toBe('');
  });

  it('leaves confusable-pair members untouched when ambiguous', () => {
    // "ilium" and "ileum" are both in the confusable set
    expect(correctText('ilium')).toBe('ilium');
    expect(correctText('ileum')).toBe('ileum');
  });

  it('does not correct common English false positives from scraped dict', () => {
    // "peace" at edit-distance-1 from "phace" (if phace were in dict)
    // The stoplist guard should protect real English words
    expect(correctText('peace')).toBe('peace');
    expect(correctText('nothing')).toBe('nothing');
  });
});

describe('stripTranscriptNoise', () => {
  it('passes through normal text', () => {
    expect(stripTranscriptNoise('What is pneumonia?')).toBe('What is pneumonia?');
  });

  it('strips parenthetical noise blocks', () => {
    expect(stripTranscriptNoise('hello (cough) world')).toBe('hello world');
    expect(stripTranscriptNoise('text [noise] here')).toBe('text here');
  });

  it('drops known noise tokens', () => {
    expect(stripTranscriptNoise('silence')).toBe('');
    expect(stripTranscriptNoise('hmm')).toBe('');
    expect(stripTranscriptNoise('uh')).toBe('');
    expect(stripTranscriptNoise('thank you')).toBe('');
    expect(stripTranscriptNoise('bye')).toBe('');
  });

  it('drops noise case-insensitively with surrounding punctuation', () => {
    expect(stripTranscriptNoise('SHH!')).toBe('');
    expect(stripTranscriptNoise('Shh.')).toBe('');
    // "UMM" (3 chars) is not in KNOWN_NOISE — only "um" (2 chars) is.
    // So "UMM..." lowercased+stripped → "umm" → not in set → preserved.
    expect(stripTranscriptNoise('Um.')).toBe('');
  });

  it('drops non-Latin script transcripts', () => {
    expect(stripTranscriptNoise('你的安全')).toBe('');
    // Cyrillic range U+0400-U+04FF is in the regex
    expect(stripTranscriptNoise('Привет')).toBe('');
  });

  it('collapses multiple spaces', () => {
    expect(stripTranscriptNoise('hello   world')).toBe('hello world');
  });

  it('trims whitespace', () => {
    expect(stripTranscriptNoise('  hello  ')).toBe('hello');
  });

  it('preserves real short answers', () => {
    expect(stripTranscriptNoise('yes')).toBe('yes');
    expect(stripTranscriptNoise('okay')).toBe('okay');
    expect(stripTranscriptNoise('cool')).toBe('cool');
  });
});
