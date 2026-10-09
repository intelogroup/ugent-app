export type Sex = 'male' | 'female';

export interface Region {
  id: string;
  label: string;
  /** dot position in the body art space (about 106 x 195); null = no dot, reached from the whole-body chip */
  at: [number, number] | null;
  /** female body override when the organ sits elsewhere on it */
  atFemale?: [number, number];
  /** body sites (lib/hub/sites.ts) whose findings this region lists */
  sites: string[];
  /** organ systems that decide for findings with no site tag */
  systems: string[];
  /** only on this sex; the other body shows the dot disabled */
  sex?: Sex;
  /** art keys lit while the region is selected (BODY_ART organs or DRAWN) */
  organs: string[];
}

const R = (id: string, label: string, at: [number, number] | null, sites: string[], systems: string[], organs: string[], extra: Partial<Region> = {}): Region =>
  ({ id, label, at, sites, systems, organs, ...extra });

export const REGIONS: Region[] = [
  R('brain', 'Brain', [53, 5.5], ['brain'], ['nervous', 'psychiatric'], ['brain']),
  R('cerebellum', 'Cerebellum', [46, 10], ['cerebellum'], [], ['cerebellum']),
  R('eye', 'Eye', [53, 13.5], ['eye'], ['eye'], ['eye', 'eye-vl', 'eye-vr']),
  R('ent', 'Ear, nose, throat', [53, 20], ['ear', 'nose-throat'], ['ear-nose-throat'], []),
  R('neck-nodes', 'Neck lymph nodes', [47, 25], ['neck-nodes'], [], []),
  R('thyroid', 'Thyroid', [53, 28], ['thyroid'], ['endocrine'], ['thyroid']),
  R('esophagus', 'Esophagus', [53, 35], ['esophagus'], [], ['esophagus']),
  R('lung-right', 'Right lung', [45, 38], ['lung', 'lung-right'], ['respiratory'], ['lung-vl']),
  R('lung-left', 'Left lung', [62, 38], ['lung', 'lung-left'], ['respiratory'], ['lung-vr']),
  R('heart', 'Heart', [55, 45], ['heart'], ['cardiovascular'], ['heart']),
  R('vessels', 'Blood vessels', [47, 47], ['vessels'], [], []),
  R('breast', 'Breast', [63, 51], ['breast'], ['breast'], ['breast']),
  R('spine', 'Spine', [53, 57], ['spine'], [], []),
  R('liver', 'Liver', [41, 60], ['liver'], ['hepatobiliary'], ['liver']),
  R('adrenal', 'Adrenal glands', [46, 57], ['adrenal'], [], ['adrenal-vl', 'adrenal-vr']),
  R('stomach', 'Stomach', [63, 63], ['stomach'], [], ['stomach']),
  R('spleen', 'Spleen', [68.5, 60], ['spleen'], [], ['spleen']),
  R('biliary', 'Gallbladder and bile ducts', [48.5, 68.5], ['biliary'], [], ['gallbladder']),
  R('pancreas', 'Pancreas', [54, 71.5], ['pancreas'], [], ['pancreas']),
  R('kidney', 'Kidneys', [62, 71], ['kidney'], ['renal-urinary'], ['kidney-vl', 'kidney-vr']),
  R('small-bowel', 'Small bowel', [53, 80], ['small-bowel'], ['gastrointestinal'], ['small-bowel']),
  R('colon', 'Colon', [64, 80], ['colon'], [], ['colon']),
  R('appendix', 'Appendix', [42, 94], ['appendix'], [], ['appendix']),
  R('bladder', 'Bladder', [53, 89.5], ['bladder'], [], ['bladder'], { atFemale: [59, 99] }),
  R('prostate', 'Prostate', [53, 96], ['prostate'], ['reproductive-male'], ['prostate'], { sex: 'male' }),
  R('testis-penis', 'Testis and penis', [53, 104], ['testis-penis'], [], ['testis'], { sex: 'male' }),
  R('uterus', 'Uterus', [53, 90.5], ['uterus'], ['reproductive-female', 'pregnancy-perinatal'], ['uterus', 'fallopian-tube'], { sex: 'female' }),
  R('ovary', 'Ovaries', [59, 88], ['ovary'], [], ['ovary-vl', 'ovary-vr'], { sex: 'female' }),
  R('cervix', 'Cervix', [53, 95.5], ['cervix'], [], ['cervix'], { sex: 'female' }),
  R('vulva-vagina', 'Vulva and vagina', [53, 102], ['vulva-vagina'], [], [], { sex: 'female' }),
  R('shoulder', 'Shoulder', [30, 37], ['shoulder'], [], []),
  R('hand', 'Hand and palm', [8, 98], ['hand'], [], [], { atFemale: [8, 94] }),
  R('hip', 'Hip', [37, 92], ['hip'], [], []),
  R('limb', 'Arm and leg', [43, 125], ['limb'], [], []),
  R('bone', 'Bone', [63, 125], ['bone'], ['musculoskeletal'], []),
  R('knee', 'Knee', [44, 158], ['knee'], [], []),
  R('foot', 'Foot and sole', [42, 189], ['foot'], [], []),
  R('skin', 'Skin', [84, 68], ['skin'], ['skin'], []),
  R('wholebody', 'Whole body', null, ['systemic', 'blood-marrow'], ['systemic', 'hematologic', 'immune-rheumatologic', 'endocrine'], []),
];

export const regionById = (id: string) => REGIONS.find((r) => r.id === id);
export const bodyDots = REGIONS.filter((r) => r.at);
export const dotAt = (r: Region, sex: Sex): [number, number] => (sex === 'female' && r.atFemale) || r.at!;
/** a region the chosen body cannot have: its dot shows faint and does nothing */
export const disabledFor = (r: Region, sex: Sex) => !!r.sex && r.sex !== sex;

/** Tags a finding answers to: its body sites when tagged, else its organ systems (prefixed so the two never collide). */
export const findingTags = (f: { systems: string[]; sites?: string[] }): string[] =>
  f.sites?.length ? f.sites : f.systems.map((s) => `sys:${s}`);
const regionTags = (r: Region) => [...r.sites, ...r.systems.map((s) => `sys:${s}`)];

/** A finding shows in a region when one of its tags is one of the region's. */
export const tagsInRegion = (tags: string[], region: Region) => {
  const mine = regionTags(region);
  return tags.some((t) => mine.includes(t));
};
export const findingInRegion = (f: { systems: string[]; sites?: string[] }, region: Region) => tagsInRegion(findingTags(f), region);
