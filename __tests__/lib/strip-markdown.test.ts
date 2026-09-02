import { stripMarkdown } from '@/lib/strip-markdown';

describe('stripMarkdown', () => {
  it('removes fenced code blocks', () => {
    expect(stripMarkdown('before```code block```after')).toBe('beforeafter');
    // Code block removal leaves a blank line where the fences were
    expect(stripMarkdown('line1\n```\nmultiline\n```\nline2')).toBe('line1\n\nline2');
  });

  it('unwraps inline code', () => {
    expect(stripMarkdown('use `useState` hook')).toBe('use useState hook');
    expect(stripMarkdown('`a` and `b`')).toBe('a and b');
  });

  it('strips heading markers', () => {
    expect(stripMarkdown('# Title')).toBe('Title');
    expect(stripMarkdown('## Subtitle')).toBe('Subtitle');
    expect(stripMarkdown('###### Deep heading')).toBe('Deep heading');
  });

  it('unwraps bold', () => {
    expect(stripMarkdown('**bold text**')).toBe('bold text');
    expect(stripMarkdown('**PE** is high-yield')).toBe('PE is high-yield');
  });

  it('unwraps italic', () => {
    expect(stripMarkdown('*italic text*')).toBe('italic text');
    expect(stripMarkdown('a *b* c')).toBe('a b c');
  });

  it('unwraps double-underscore bold', () => {
    expect(stripMarkdown('__bold__')).toBe('bold');
  });

  it('unwraps single-underscore italic', () => {
    expect(stripMarkdown('_italic_')).toBe('italic');
  });

  it('strips bullet markers', () => {
    expect(stripMarkdown('- item one\n- item two')).toBe('item one\nitem two');
    expect(stripMarkdown('* item a\n* item b')).toBe('item a\nitem b');
    expect(stripMarkdown('+ item x')).toBe('item x');
  });

  it('strips numbered list markers', () => {
    expect(stripMarkdown('1. first\n2. second')).toBe('first\nsecond');
    expect(stripMarkdown('10. tenth')).toBe('tenth');
  });

  it('extracts link text from markdown links', () => {
    expect(stripMarkdown('[First Aid](https://example.com)')).toBe('First Aid');
    expect(stripMarkdown('see [Pathoma Ch.3](url) for details')).toBe('see Pathoma Ch.3 for details');
  });

  it('preserves medical terms without markdown', () => {
    expect(stripMarkdown('Pulmonary Embolism')).toBe('Pulmonary Embolism');
    expect(stripMarkdown('Tetralogy of Fallot')).toBe('Tetralogy of Fallot');
    expect(stripMarkdown('Factor V Leiden mutation')).toBe('Factor V Leiden mutation');
  });

  it('handles mixed markdown in a realistic medical answer', () => {
    const input = '## Pulmonary Embolism\n\n**Key clues:**\n- Sudden onset dyspnea\n- *Risk factors:* immobility, OCP use\n- D-dimer [elevated](link)\n```CT scan shows wedge-shaped opacity```';
    const result = stripMarkdown(input);
    expect(result).toContain('Pulmonary Embolism');
    expect(result).toContain('Key clues');
    expect(result).toContain('Sudden onset dyspnea');
    expect(result).toContain('Risk factors');
    expect(result).toContain('elevated');
    expect(result).not.toContain('##');
    expect(result).not.toContain('**');
    expect(result).not.toContain('```');
    expect(result).not.toContain('- ');
  });

  it('trims leading/trailing whitespace', () => {
    expect(stripMarkdown('  hello  ')).toBe('hello');
    expect(stripMarkdown('\n\ncontent\n\n')).toBe('content');
  });
});
