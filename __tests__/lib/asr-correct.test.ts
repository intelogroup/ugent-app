import { correctText, stripTranscriptNoise } from '@/lib/asr-correct';

describe('correctText', () => {
  it('fixes single-token phonetic corruption via alias', () => {
    expect(correctText('coccidoidometrosis')).toBe('coccidioidomycosis');
  });

  it('fixes multi-token corruption Whisper split across a space', () => {
    // The bug: guard missed these because they were two tokens.
    expect(correctText('coccidoid geomycosis')).toBe('coccidioidomycosis');
    expect(correctText('coccidoid homechis')).toBe('coccidioidomycosis');
  });

  it('handles multi-token alias with punctuation and casing', () => {
    // alphaKey normalizes case/punct for matching; trailing punct is dropped.
    expect(correctText('Coccidoid Geomycosis')).toBe('coccidioidomycosis');
  });

  it('fixes a multi-token term embedded in a sentence', () => {
    expect(correctText('the patient has coccidoid geomycosis now'))
      .toBe('the patient has coccidioidomycosis now');
  });

  it('generically rejoins a real dict word Whisper split across a space', () => {
    // "abetalipoproteinemia" split — no hardcoded alias, handled by the
    // generic pair-join fallback.
    expect(correctText('abeta lipoproteinemia')).toBe('abetalipoproteinemia');
  });

  it('rejoins a dangling word-fragment with its neighbor', () => {
    expect(correctText('glomerulo nephritis')).toBe('glomerulonephritis');
    expect(correctText('dermato myositis')).toBe('dermatomyositis');
    expect(correctText('oligodendro glioma')).toBe('oligodendroglioma');
    expect(correctText('retro peritoneal')).toBe('retroperitoneal');
    expect(correctText('choledoco lithiasis')).toBe('choledocholithiasis');
  });

  it('does NOT merge independently valid words into a compound', () => {
    expect(correctText('the patient has asthma')).toBe('the patient has asthma');
    expect(correctText('acute renal failure')).toBe('acute renal failure');
    expect(correctText('myasthenia gravis')).toBe('myasthenia gravis');
    expect(correctText('xeroderma pigmentosum')).toBe('xeroderma pigmentosum');
  });

  it('still runs per-word correction on remaining tokens', () => {
    expect(correctText('seudomonas')).toBe('pseudomonas');
  });

  it('leaves clean text untouched', () => {
    expect(correctText('the patient has asthma')).toBe('the patient has asthma');
  });

  it('does not mangle short common words missing from the medical dict', () => {
    // Regression: "meant"->"mount", "let's"->"leads" (Levenshtein 2 to a
    // medical term). Short words now require an exact near-match (dist 1).
    expect(correctText('meant')).toBe('meant');
    expect(correctText("let's")).toBe("let's");
  });

  it('does not snap correctly-heard medical terms to an unrelated dict word', () => {
    // Regression: "typhus" and "epidemic" were missing from the dict, so
    // "epidemic typhus" -> "epidemics tophus" (unrelated: gout crystal term).
    expect(correctText('what caused epidemic typhus')).toBe('what caused epidemic typhus');
  });

  it('fixes badly garbled medical terms via alias', () => {
    // Whisper capitalizes sentence-start words ("Recatseal") — alias lookup
    // must be case-insensitive to catch these.
    expect(correctText('Recatseal Diseases')).toBe('rickettsial diseases');
    expect(correctText('debrief Mikoplasmaniem')).toBe('debrief mycoplasma');
    expect(correctText("start with photozoach")).toBe('start with protozoa');
  });

  it('widens the distance ratio for long-word soundex matches', () => {
    // dist 4/22 to "paracoccidioidomycosis" — too far under the old dist<=2
    // cutoff, but safe at this ratio given the word length.
    expect(correctText('what about paragoxydioidomycosis')).toBe('what about paracoccidioidomycosis');
  });

  it('fixes parasitology terms missing from an earlier dict gap', () => {
    // "trematoids"->"trematodes" is dist 2, within the default threshold now
    // that "trematodes" is in the dict. "cystoids"->"cestodes" is dist 3,
    // too far for its length, so it needs an explicit alias.
    expect(correctText('the cystoids and the trematoids')).toBe('the cestodes and the trematodes');
  });

  it('distance-matches capitalized words against the lowercase dict', () => {
    // Regression: soundex/levenshtein compared raw casing against an
    // all-lowercase dict, so "IKU" (dist 1 to "icu") never matched — every
    // char differed on case alone.
    expect(correctText("Let's talk about the IKU results")).toBe("Let's talk about the icu results");
  });

  it('fixes "hairpaste" -> "herpes" via alias (too far for distance match)', () => {
    expect(correctText("let's study hairpaste viruses")).toBe("let's study herpes viruses");
  });

  it('normalizes garbled terms via double metaphone', () => {
    expect(correctText('Pheocromositoma')).toBe('pheochromocytoma');
    expect(correctText('Sawmonilla')).toBe('salmonella');
    expect(correctText('salmanela')).toBe('salmonella');
  });

  it('never flips confusable minimal pairs', () => {
    // ilium (pelvis) must NOT become ileum (gut), and vice-versa. Both are now
    // in-dict and CONFUSABLE-guarded.
    expect(correctText('ilium')).toBe('ilium');
    expect(correctText('ileum')).toBe('ileum');
    expect(correctText('afferent')).toBe('afferent');
    expect(correctText('efferent')).toBe('efferent');
    expect(correctText('hypokalemia')).toBe('hypokalemia');
    expect(correctText('hyperkalemia')).toBe('hyperkalemia');
    expect(correctText('the ilium and the sacrum')).toBe('the ilium and the sacrum');
  });
});

describe('stripTranscriptNoise', () => {
  it('removes bracketed noise markers', () => {
    expect(stripTranscriptNoise('[BLANK_AUDIO]')).toBe('');
    expect(stripTranscriptNoise('hello (cough) there')).toBe('hello there');
  });

  it('drops pure known-noise transcripts', () => {
    expect(stripTranscriptNoise('silence')).toBe('');
  });

  it('drops filler noise regardless of casing/punctuation', () => {
    expect(stripTranscriptNoise('Shh.')).toBe('');
    expect(stripTranscriptNoise('SHH!')).toBe('');
    expect(stripTranscriptNoise('Hmm')).toBe('');
  });

  it('keeps real speech', () => {
    expect(stripTranscriptNoise('what is asthma')).toBe('what is asthma');
  });
});
