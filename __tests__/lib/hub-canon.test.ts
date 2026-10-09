import { applyCanon } from '@/lib/hub/canon';
import { buildIndex } from '@/lib/hub/rank';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

const f = (id: string, label: string, over: Partial<Finding> = {}): Finding => ({
  id, label, type: 'symptom', weight: 'common', systems: ['systemic'], sourceHashes: [], source: 'notes', ...over,
});

const MAP = {
  'progressive-fatigue': { id: 'fatigue', label: 'Fatigue' },
  'fatigue': { id: 'fatigue', label: 'Fatigue' },
};

describe('applyCanon', () => {
  it('merges synonyms inside one disease: strongest weight, unioned systems and sources', () => {
    const data: DiseaseFindings[] = [{
      disease: 'A', topicType: 'DISEASE',
      findings: [
        f('progressive-fatigue', 'Progressive fatigue', { weight: 'classic', sourceHashes: ['h1'], systems: ['systemic'] }),
        f('fatigue', 'Fatigue', { weight: 'common', sourceHashes: ['h2'], systems: ['endocrine'], source: 'knowledge' }),
      ],
    }];
    const [d] = applyCanon(data, MAP);
    expect(d.findings).toHaveLength(1);
    expect(d.findings[0]).toMatchObject({ id: 'fatigue', label: 'Fatigue', weight: 'classic', source: 'notes' });
    expect(d.findings[0].sourceHashes.sort()).toEqual(['h1', 'h2']);
    expect(d.findings[0].systems.sort()).toEqual(['endocrine', 'systemic']);
  });

  it('leaves unmapped findings untouched and does not mutate input', () => {
    const data: DiseaseFindings[] = [{ disease: 'A', topicType: 'DISEASE', findings: [f('fever', 'Fever')] }];
    const out = applyCanon(data, MAP);
    expect(out[0].findings[0]).toEqual(data[0].findings[0]);
    expect(out[0].findings[0]).not.toBe(data[0].findings[0]);
  });

  it('shared canonical id across diseases lowers its specificity (idf)', () => {
    const data: DiseaseFindings[] = [
      { disease: 'A', topicType: 'DISEASE', findings: [f('progressive-fatigue', 'Progressive fatigue')] },
      { disease: 'B', topicType: 'DISEASE', findings: [f('fatigue', 'Fatigue')] },
      { disease: 'C', topicType: 'DISEASE', findings: [f('rash', 'Rash')] },
    ];
    const raw = buildIndex(data);
    const canon = buildIndex(applyCanon(data, MAP));
    expect(canon.idf.get('fatigue')!).toBeLessThan(raw.idf.get('fatigue')!);
  });
});
