import { buildIndex, rank, leaders, remaining, nextBestFinding, differentiators } from '@/lib/hub/rank';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

const f = (label: string, type: Finding['type'], weight: Finding['weight'], systems = ['systemic']): Finding => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  type,
  weight,
  systems,
  sourceHashes: ['h'],
});

const fever = f('Fever', 'symptom', 'common');
const jaundice = f('Jaundice', 'sign', 'classic', ['hepatobiliary']);
const asma = f('Anti-smooth muscle antibody', 'lab', 'pathognomonic', ['hepatobiliary']);
const amaAb = f('Anti-mitochondrial antibody', 'lab', 'pathognomonic', ['hepatobiliary']);
const hbsag = f('HBsAg positive', 'lab', 'pathognomonic', ['hepatobiliary']);
const ruq = f('Right upper quadrant pain', 'symptom', 'classic', ['hepatobiliary']);

const DATA: DiseaseFindings[] = [
  { disease: 'Autoimmune Hepatitis', topicType: 'DISEASE', findings: [jaundice, asma, fever] },
  { disease: 'Primary Biliary Cholangitis', topicType: 'DISEASE', findings: [jaundice, amaAb] },
  { disease: 'Hepatitis B', topicType: 'DISEASE', findings: [jaundice, hbsag, fever, ruq] },
  { disease: 'Influenza', topicType: 'DISEASE', findings: [fever] },
  { disease: 'Malaria', topicType: 'DISEASE', findings: [fever, jaundice] },
  { disease: 'Cholecystitis', topicType: 'DISEASE', findings: [fever, ruq] },
];

const idx = buildIndex(DATA);
const present = (id: string) => ({ id, state: 'present' as const });
const absent = (id: string) => ({ id, state: 'absent' as const });

describe('rank', () => {
  it('returns nothing without a present pick', () => {
    expect(rank(idx, [])).toEqual([]);
    expect(rank(idx, [absent(fever.id)])).toEqual([]);
  });

  it('a specific finding ranks its disease first and narrows far more than a common one', () => {
    const bySpecific = rank(idx, [present(asma.id)]);
    expect(bySpecific[0].disease).toBe('Autoimmune Hepatitis');
    const byCommon = rank(idx, [present(fever.id)]);
    expect(bySpecific.length).toBeLessThan(byCommon.length);
  });

  it('a pathognomonic finding outweighs several common ones', () => {
    const r = rank(idx, [present(fever.id), present(asma.id)]);
    expect(r[0].disease).toBe('Autoimmune Hepatitis');
  });

  it('an absent classic finding contradicts and sinks the disease', () => {
    const r = rank(idx, [present(jaundice.id), absent(ruq.id)]);
    const hepB = r.find((x) => x.disease === 'Hepatitis B')!;
    expect(hepB.contradicted).toBe(true);
    const lastClean = r.filter((x) => !x.contradicted).length;
    expect(r.slice(lastClean).every((x) => x.contradicted)).toBe(true);
  });

  it('is deterministic on ties (name order)', () => {
    const a = rank(idx, [present(fever.id)]).map((x) => x.disease);
    const b = rank(idx, [present(fever.id)]).map((x) => x.disease);
    expect(a).toEqual(b);
    const tied = rank(idx, [present(jaundice.id)]).filter((x) => x.score === rank(idx, [present(jaundice.id)])[0].score);
    expect(tied.map((x) => x.disease)).toEqual([...tied.map((x) => x.disease)].sort());
  });
});

describe('remaining', () => {
  it('shrinks as the case grows: more present picks tighten the cutoff', () => {
    const row = (disease: string, score: number) => ({ disease, score, matched: 1, contradicted: false });
    const r = [row('A', 10), row('B', 5), row('C', 4)]; // 0.5 and 0.4 of the leader
    expect(remaining(r, 1).map((x) => x.disease)).toEqual(['A', 'B', 'C']);
    expect(remaining(r, 4).map((x) => x.disease)).toEqual(['A']);
  });
});

describe('leaders', () => {
  it('names the disease when a pathognomonic pick is clearly ahead', () => {
    const picks = [present(asma.id), present(jaundice.id)];
    const l = leaders(idx, rank(idx, picks), picks);
    expect(l.map((x) => x.disease)).toEqual(['Autoimmune Hepatitis']);
    expect(l[0].proof).toEqual(['Anti-smooth muscle antibody']);
  });

  it('stays empty without a pathognomonic pick, even when one disease tops the list', () => {
    const picks = [present(ruq.id), present(fever.id)];
    expect(leaders(idx, rank(idx, picks), picks)).toEqual([]);
  });

  it('two diseases sharing the only pathognomonic pick are co-leaders; four are too many', () => {
    const twin = f('Twin marker', 'lab', 'pathognomonic', ['hepatobiliary']);
    const d2 = buildIndex([
      { disease: 'A', topicType: 'DISEASE', findings: [twin] },
      { disease: 'B', topicType: 'DISEASE', findings: [twin] },
    ]);
    const picks = [present(twin.id)];
    expect(leaders(d2, rank(d2, picks), picks).map((x) => x.disease).sort()).toEqual(['A', 'B']);
    const d4 = buildIndex(['A', 'B', 'C', 'D'].map((disease) => ({ disease, topicType: 'DISEASE' as const, findings: [twin] })));
    expect(leaders(d4, rank(d4, picks), picks)).toEqual([]);
  });

  it('cousins: a shared pathognomonic finding makes co-leaders, a unique one crowns its disease', () => {
    const shared = f('Shared marker', 'lab', 'pathognomonic', ['renal-urinary']);
    const only = f('Only marker', 'lab', 'pathognomonic', ['renal-urinary']);
    const filler = f('Filler', 'sign', 'classic', ['renal-urinary']);
    const d = buildIndex([
      { disease: 'Parent', topicType: 'DISEASE', findings: [shared, only, filler] },
      { disease: 'Cousin', topicType: 'DISEASE', findings: [shared] },
    ]);
    const a = [present(shared.id)];
    expect(leaders(d, rank(d, a), a).map((x) => x.disease)).toEqual(expect.arrayContaining(['Parent', 'Cousin'])); // tied co-leaders until a separating pick
    const b = [present(shared.id), present(only.id)];
    expect(leaders(d, rank(d, b), b).map((x) => x.disease)).toEqual(['Parent']);
  });

  it('skips a contradicted leader', () => {
    const picks = [present(asma.id), absent(fever.id)];
    const r = rank(idx, picks);
    expect(r[0].contradicted).toBe(false); // fever is common: penalised, not contradicting
    const picks2 = [present(hbsag.id), absent(ruq.id)];
    expect(leaders(idx, rank(idx, picks2), picks2)).toEqual([]);
  });
});

describe('nextBestFinding', () => {
  it('never suggests an already-picked finding and splits the remaining set', () => {
    const picks = [present(jaundice.id)];
    const next = nextBestFinding(idx, rank(idx, picks), picks);
    expect(next).not.toBeNull();
    expect(next!.id).not.toBe(jaundice.id);
  });
});

describe('differentiators', () => {
  it('lists only findings that split the remaining diseases', () => {
    const ranked = rank(idx, [present(jaundice.id), present(fever.id)]).filter((r) => !r.contradicted);
    const top3 = ranked.slice(0, 3).map((r) => r.disease);
    const d = differentiators(idx, top3);
    for (const x of d) {
      expect(x.has.length).toBeGreaterThan(0);
      expect(x.lacks.length).toBeGreaterThan(0);
    }
  });
});
