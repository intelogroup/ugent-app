import { buildCatalog, filterCatalog } from '@/lib/hub/catalog';
import { regionById } from '@/lib/hub/regions';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

const f = (label: string, type: Finding['type'], systems: string[]): Finding => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, type, systems, weight: 'common', sourceHashes: [],
});

const psa = f('Elevated PSA', 'lab', ['reproductive-male']);
const eyeP = f('Elevated intraocular pressure', 'sign', ['eye']);
const fever = f('Fever', 'symptom', ['systemic']);
const DATA: DiseaseFindings[] = [
  { disease: 'Prostate Cancer', topicType: 'DISEASE', findings: [psa, fever] },
  { disease: 'BPH', topicType: 'DISEASE', findings: [psa] },
  { disease: 'Glaucoma', topicType: 'DISEASE', findings: [eyeP] },
];
const cat = buildCatalog(DATA);

describe('context findings (course, size, geography)', () => {
  const chronic = f('Course over years', 'course', ['systemic']);
  const withCtx = buildCatalog([...DATA, { disease: 'Cirrhosis', topicType: 'DISEASE', findings: [chronic] }]);
  it('ignore the body region: they describe the case, not a body part', () => {
    const ids = filterCatalog(withCtx, { region: regionById('prostate')!, type: 'course' }).map((c) => c.id);
    expect(ids).toEqual([chronic.id]);
  });
  it('still respect the sector type', () => {
    expect(filterCatalog(withCtx, { region: regionById('prostate')!, type: 'lab' }).map((c) => c.id)).not.toContain(chronic.id);
  });
});

describe('catalog', () => {
  it('counts conditions per finding and unions systems', () => {
    expect(cat.find((c) => c.id === psa.id)).toMatchObject({ df: 2, type: 'lab' });
    expect(cat.find((c) => c.id === fever.id)!.df).toBe(1);
  });

  it('prostate dot lists PSA and not eye pressure', () => {
    const ids = filterCatalog(cat, { region: regionById('prostate')! }).map((c) => c.id);
    expect(ids).toContain(psa.id);
    expect(ids).not.toContain(eyeP.id);
  });

  it('sector filters by type; most widespread first', () => {
    expect(filterCatalog(cat, { type: 'lab' }).map((c) => c.id)).toEqual([psa.id]);
    expect(filterCatalog(cat, {}).map((c) => c.id)[0]).toBe(psa.id);
  });

  it('search ignores region and sector', () => {
    const ids = filterCatalog(cat, { region: regionById('prostate')!, type: 'lab', query: 'pressure' }).map((c) => c.id);
    expect(ids).toEqual([eyeP.id]);
  });
});
