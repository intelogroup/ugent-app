/** Body sites a finding is observed at or measured in. Finer than organ systems: a knee dot lists knee findings,
 *  a cervix dot lists cervix findings. Tagged per finding by scripts/extract-finding-sites.ts into data/finding-sites.json. */
export const SITES = [
  'brain', 'cerebellum', 'spine', 'eye', 'ear', 'nose-throat', 'thyroid', 'neck-nodes',
  'heart', 'lung', 'lung-left', 'lung-right', 'esophagus', 'breast', 'vessels',
  'stomach', 'liver', 'biliary', 'pancreas', 'spleen', 'small-bowel', 'colon', 'appendix',
  'kidney', 'adrenal', 'bladder',
  'prostate', 'testis-penis', 'uterus', 'ovary', 'cervix', 'vulva-vagina',
  'shoulder', 'hand', 'hip', 'knee', 'foot', 'limb',
  'skin', 'blood-marrow', 'bone', 'systemic',
] as const;
export type Site = (typeof SITES)[number];
export const SITE_SET: ReadonlySet<string> = new Set(SITES);
