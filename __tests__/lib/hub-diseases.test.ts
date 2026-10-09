import { DISEASE_ALIAS, DISEASE_SUBTYPE, mergeDiseases, subtypeParents } from '@/lib/hub/diseases';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

const f = (label: string, weight: Finding['weight'] = 'common'): Finding => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, type: 'sign', systems: ['systemic'], weight, sourceHashes: [],
});
const d = (disease: string, ...findings: Finding[]): DiseaseFindings => ({ disease, topicType: 'DISEASE', findings });

describe('mergeDiseases', () => {
  it('folds an alias into its canonical disease and keeps the strongest weight per finding', () => {
    const out = mergeDiseases([
      d('Myocardial Infarction', f('ST elevation', 'classic'), f('Chest pain')),
      d('Acute Myocardial Infarction', f('ST elevation', 'pathognomonic'), f('Diaphoresis')),
      d('Asthma', f('Wheeze')),
    ]);
    expect(out.map((x) => x.disease).sort()).toEqual(['Asthma', 'Myocardial Infarction']);
    const mi = out.find((x) => x.disease === 'Myocardial Infarction')!;
    expect(mi.findings.map((x) => x.id).sort()).toEqual(['chest-pain', 'diaphoresis', 'st-elevation']);
    expect(mi.findings.find((x) => x.id === 'st-elevation')!.weight).toBe('pathognomonic');
  });

  it('renames an alias that has no canonical row in the data', () => {
    expect(mergeDiseases([d('Sickle Cell Anemia', f('Sickling'))]).map((x) => x.disease)).toEqual(['Sickle Cell Disease']);
  });

  it('does not mutate its input', () => {
    const input = [d('Major Depressive', f('Anhedonia'))];
    mergeDiseases(input);
    expect(input[0].disease).toBe('Major Depressive');
  });

  it('never aliases a disease onto itself or onto another alias', () => {
    for (const [from, to] of Object.entries(DISEASE_ALIAS)) {
      expect(from).not.toBe(to);
      expect(DISEASE_ALIAS[to]).toBeUndefined();
    }
  });
});

describe('subtypeParents', () => {
  it('keeps only links whose both ends exist', () => {
    expect(subtypeParents(['Graves Disease', 'Hyperthyroidism', 'Emphysema'])).toEqual({ 'Graves Disease': 'Hyperthyroidism' });
  });
  it('has no cycles and no self links', () => {
    for (const [c, p] of Object.entries(DISEASE_SUBTYPE)) {
      expect(c).not.toBe(p);
      expect(DISEASE_SUBTYPE[p]).not.toBe(c);
    }
  });
  it('subtype names are never alias names (merge runs first)', () => {
    for (const [c, p] of Object.entries(DISEASE_SUBTYPE)) {
      expect(DISEASE_ALIAS[c]).toBeUndefined();
      expect(DISEASE_ALIAS[p]).toBeUndefined();
    }
  });
});
