import { deriveParents } from '@/lib/hub/hierarchy';
import { buildIndex, rank } from '@/lib/hub/rank';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const f = (label: string, type: Finding['type'] = 'symptom', weight: Finding['weight'] = 'common'): Finding => ({
  id: slug(label), label, type, weight, systems: ['systemic'], sourceHashes: [],
});

describe('deriveParents', () => {
  it('links a subtype to the most specific existing general finding', () => {
    const p = deriveParents([f('Abdominal pain'), f('Pain'), f('Lower abdominal pain'), f('Erythema'), f('Palmar erythema')]);
    expect(p['lower-abdominal-pain']).toBe('abdominal-pain');
    expect(p['abdominal-pain']).toBe('pain');
    expect(p['palmar-erythema']).toBe('erythema');
    expect(p['erythema']).toBeUndefined();
  });

  it('never links across types or across a direction word', () => {
    const p = deriveParents([f('Anemia', 'sign'), f('Microcytic anemia', 'lab'), f('ESR', 'lab'), f('Elevated ESR', 'lab')]);
    expect(p['microcytic-anemia']).toBeUndefined();
    expect(p['elevated-esr']).toBeUndefined();
  });

  it('leaves unrelated labels without a parent', () => {
    const p = deriveParents([f('Murmur', 'sign'), f('Systolic murmur', 'sign'), f('Positive VDRL', 'lab'), f('Test', 'lab')]);
    expect(p['systolic-murmur']).toBe('murmur');
    expect(p['positive-vdrl']).toBeUndefined();
  });
});

describe('rank with hierarchy', () => {
  const dyspnea = f('Dyspnea');
  const pnd = f('Paroxysmal nocturnal dyspnea', 'symptom', 'classic');
  const rash = f('Rash');
  const DATA: DiseaseFindings[] = [
    { disease: 'Plain Dyspnea Disease', topicType: 'DISEASE', findings: [dyspnea, rash] },
    { disease: 'PND Disease', topicType: 'DISEASE', findings: [pnd, rash] },
    { disease: 'Other', topicType: 'DISEASE', findings: [rash] },
  ];
  const parents = deriveParents(DATA.flatMap((d) => d.findings));
  const idx = buildIndex(DATA, parents);
  const pick = (id: string, state: 'present' | 'absent' = 'present') => ({ id, state });

  it('picking the parent credits a disease that only has a child, below one that has the parent itself', () => {
    const r = rank(idx, [pick(dyspnea.id)]);
    const direct = r.find((x) => x.disease === 'Plain Dyspnea Disease')!;
    const viaChild = r.find((x) => x.disease === 'PND Disease')!;
    expect(viaChild).toBeDefined();
    expect(viaChild.score).toBeGreaterThan(0);
    expect(direct.score).toBeGreaterThan(viaChild.score);
  });

  it('picking the child does not credit a disease that only has the parent', () => {
    const r = rank(idx, [pick(pnd.id)]);
    expect(r.map((x) => x.disease)).toEqual(['PND Disease']);
  });

  it('absent parent contradicts a disease whose classic child is present', () => {
    const r = rank(idx, [pick(rash.id), pick(dyspnea.id, 'absent')]);
    expect(r.find((x) => x.disease === 'PND Disease')!.contradicted).toBe(true);
    expect(r.find((x) => x.disease === 'Other')!.contradicted).toBe(false);
  });

  it('without parents behaves like before', () => {
    const flat = buildIndex(DATA);
    expect(rank(flat, [pick(dyspnea.id)]).map((x) => x.disease)).toEqual(['Plain Dyspnea Disease']);
  });
});
