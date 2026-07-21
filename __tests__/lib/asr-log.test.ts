import { logAsrTurn, getAsrLog, getAsrCorrections } from '@/lib/asr-log';

beforeEach(() => localStorage.clear());

describe('asr-log', () => {
  it('records raw + corrected per turn', () => {
    logAsrTurn('coccidoid geomycosis', 'coccidioidomycosis');
    const log = getAsrLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ raw: 'coccidoid geomycosis', corrected: 'coccidioidomycosis' });
    expect(typeof log[0].t).toBe('number');
  });

  it('records dropped-as-noise turns with empty corrected', () => {
    logAsrTurn('[BLANK_AUDIO]', '');
    expect(getAsrLog()[0].corrected).toBe('');
  });

  it('surfaces only turns the corrector changed', () => {
    logAsrTurn('what is asthma', 'what is asthma');
    logAsrTurn('coccidoid geomycosis', 'coccidioidomycosis');
    const misses = getAsrCorrections();
    expect(misses).toHaveLength(1);
    expect(misses[0].raw).toBe('coccidoid geomycosis');
  });

  it('caps the ring buffer', () => {
    for (let i = 0; i < 520; i++) logAsrTurn(`raw${i}`, `raw${i}`);
    const log = getAsrLog();
    expect(log.length).toBe(500);
    expect(log[log.length - 1].raw).toBe('raw519'); // newest kept
    expect(log[0].raw).toBe('raw20'); // oldest 20 evicted
  });
});
