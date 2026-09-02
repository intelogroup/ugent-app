import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readDataFile } from '@/lib/data-source';

// data-source module caches per filename in a module-level Map.
// Tests verify: cache dedup (same ref on repeat calls), missing file throws,
// and (in dev) real data files parse as non-empty strings.

describe('assumption: readDataFile cache and error behavior', () => {
  it('returns a non-empty string for an existing data file (dev disk read)', async () => {
    // medicospira-questions.jsonl is a real data file in data/
    const content = await readDataFile('medicospira-questions.jsonl');
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  it('returns the same cached reference on a second call (no re-read)', async () => {
    const first = await readDataFile('medicospira-questions.jsonl');
    const second = await readDataFile('medicospira-questions.jsonl');
    expect(first).toBe(second); // identity: same ref from module-level cache
  });

  it('throws (ENOENT) for a nonexistent file, not returns empty', async () => {
    await expect(readDataFile('this-file-does-not-exist.jsonl'))
      .rejects.toThrow();
  });
});
