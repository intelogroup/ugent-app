import { diseasesForRegion, primaryTags } from '@/lib/hub/browse';
import { buildIndex } from '@/lib/hub/rank';
import { regionById } from '@/lib/hub/regions';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

const f = (label: string, systems: string[], weight: Finding['weight'] = 'classic', type: Finding['type'] = 'sign', sites?: string[]): Finding => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, type, systems, weight, sourceHashes: [], ...(sites ? { sites } : {}),
});
const d = (disease: string, ...findings: Finding[]): DiseaseFindings => ({ disease, topicType: 'DISEASE', findings });

const idx = buildIndex([
  d('Prostate Cancer', f('Elevated PSA', ['reproductive-male']), f('Nodular prostate', ['reproductive-male']), f('Bone pain', ['musculoskeletal'], 'common')),
  d('BPH', f('Nocturia', ['renal-urinary'], 'classic', 'sign', ['prostate']), f('Weak stream', ['renal-urinary'], 'classic', 'sign', ['prostate'])),
  d('Glaucoma', f('High eye pressure', ['eye'])),
  d('Stray', f('Fever', ['systemic'], 'common'), f('Hesitancy', ['renal-urinary'], 'common', 'sign', ['prostate'])), // only common findings: all count
  d('Context only', f('Course over years', ['systemic'], 'classic', 'course'), f('Cough', ['respiratory'])),
]);
const pelvis = regionById('prostate')!;
const yieldBy = { 'Prostate Cancer': 3, BPH: 9, Glaucoma: 50 };

describe('primaryTags', () => {
  it('uses classic and pathognomonic findings, so a stray common finding does not move a disease', () => {
    expect(primaryTags(idx, 'Prostate Cancer')).toEqual(['sys:reproductive-male']);
  });
  it('ignores course/size/geography findings', () => {
    expect(primaryTags(idx, 'Context only')).toEqual(['sys:respiratory']);
  });
});

describe('diseasesForRegion', () => {
  it('a site tag beats the organ system: BPH is renal-urinary by system but lives at the prostate', () => {
    expect(primaryTags(idx, 'BPH')).toEqual(['prostate']);
  });
  it('lists only diseases living in the region, most tested first', () => {
    expect(diseasesForRegion(idx, pelvis, yieldBy).map((r) => r.disease)).toEqual(['BPH', 'Prostate Cancer', 'Stray']);
  });
  it('excludes other regions and carries the yield count', () => {
    const rows = diseasesForRegion(idx, pelvis, yieldBy);
    expect(rows.map((r) => r.disease)).not.toContain('Glaucoma');
    expect(rows[0]).toEqual({ disease: 'BPH', yield: 9 });
  });
  it('falls back to name order when no yield is known', () => {
    expect(diseasesForRegion(idx, pelvis, {}).map((r) => r.disease)).toEqual(['BPH', 'Prostate Cancer', 'Stray']);
  });
});
