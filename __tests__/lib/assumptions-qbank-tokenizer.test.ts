import { describe, it, expect } from 'vitest';
import { tokenizeSearchText } from '@/lib/qbank';

describe('assumption: qbank search tokenizer stays bounded and truthful', () => {
  it('caps at 6 tokens to keep the .or() filter string bounded', () => {
    const words = tokenizeSearchText(
      'acute coronary syndrome myocardial infarction pulmonary embolism stroke sepsis'
    );
    expect(words.length).toBeLessThanOrEqual(6);
  });

  it('strips stopwords and punctuation', () => {
    expect(tokenizeSearchText('the patient with asthma?')).toEqual(['patient', 'asthma']);
    expect(tokenizeSearchText('what is the mechanism of heart failure?')).toEqual([
      'mechanism',
      'heart',
      'failure',
    ]);
  });

  it('preserves real medical terms (never a stopword collision)', () => {
    // If a medical term were added to stopwords, full-sentence ILIKE search
    // would silently drop it and recall would break.
    const medical = [
      'heart', 'failure', 'infection', 'disease', 'acute', 'chronic',
      'pneumonia', 'sepsis', 'tumor', 'cancer', 'diabetes', 'hypertension',
    ];
    for (const term of medical) {
      const tokens = tokenizeSearchText(term);
      expect(tokens).toContain(term);
    }
  });

  it('keeps numbers as searchable tokens', () => {
    expect(tokenizeSearchText('type 2 diabetes')).toContain('2');
  });

  it('returns empty for stopword-only input (falls back to raw filter)', () => {
    expect(tokenizeSearchText('and or the of')).toEqual([]);
  });
});
