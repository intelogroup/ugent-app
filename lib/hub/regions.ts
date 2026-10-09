export type BodyView = 'front' | 'back';

export interface Region {
  id: string;
  label: string;
  /** which avatar view shows this dot; 'none' = no dot, reached from the whole-body chip */
  view: BodyView | 'none';
  /** dot position in the avatar viewBox (200 x 420) */
  cx: number;
  cy: number;
  /** organ-system tags (lib/hub/systems.json) whose findings this region lists */
  systems: string[];
}

export const REGIONS: Region[] = [
  { id: 'head', label: 'Head and face', view: 'front', cx: 100, cy: 40, systems: ['nervous', 'psychiatric', 'eye', 'ear-nose-throat'] },
  { id: 'neck', label: 'Neck', view: 'front', cx: 100, cy: 84, systems: ['endocrine', 'ear-nose-throat'] },
  { id: 'chest', label: 'Chest', view: 'front', cx: 100, cy: 128, systems: ['cardiovascular', 'respiratory', 'breast'] },
  { id: 'abdomen', label: 'Abdomen', view: 'front', cx: 100, cy: 188, systems: ['gastrointestinal', 'hepatobiliary'] },
  { id: 'pelvis', label: 'Pelvis and genitals', view: 'front', cx: 100, cy: 244, systems: ['reproductive-male', 'reproductive-female', 'pregnancy-perinatal', 'renal-urinary'] },
  { id: 'arm', label: 'Arms and hands', view: 'front', cx: 38, cy: 214, systems: ['musculoskeletal', 'nervous', 'skin'] },
  { id: 'leg', label: 'Legs and feet', view: 'front', cx: 80, cy: 350, systems: ['musculoskeletal', 'cardiovascular', 'nervous', 'skin'] },
  { id: 'back', label: 'Back and spine', view: 'back', cx: 100, cy: 150, systems: ['musculoskeletal', 'nervous'] },
  { id: 'flank', label: 'Flank', view: 'back', cx: 100, cy: 205, systems: ['renal-urinary', 'gastrointestinal'] },
  { id: 'limb-back', label: 'Limbs, back view', view: 'back', cx: 80, cy: 350, systems: ['musculoskeletal', 'cardiovascular', 'skin'] },
  { id: 'wholebody', label: 'Whole body', view: 'none', cx: 0, cy: 0, systems: ['systemic', 'skin', 'hematologic', 'immune-rheumatologic', 'endocrine'] },
];

export const regionById = (id: string) => REGIONS.find((r) => r.id === id);
export const bodyRegions = (view: BodyView) => REGIONS.filter((r) => r.view === view);

/** Adjacency is overlap: a finding shows in a region when any of its organ-system tags is one of the region's. */
export const findingInRegion = (findingSystems: string[], region: Region) =>
  findingSystems.some((s) => region.systems.includes(s));
