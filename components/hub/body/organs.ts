/** Organs the anatomogram art lacks, drawn by hand in the same unit space (about 106 x 195, front view).
 *  Shared by both bodies: the torso proportions match closely enough that one set fits. */
export interface DrawnOrgan { d: string; sex?: 'male' | 'female'; line?: boolean }

export const DRAWN: Record<string, DrawnOrgan> = {
  thyroid: { d: 'M53 26.6C52 25 49.7 25.2 49.6 27.4C49.6 29.4 51 30.2 52.6 29.6L53 28.6L53.4 29.6C55 30.2 56.4 29.4 56.4 27.4C56.3 25.2 54 25 53 26.6Z' },
  esophagus: { d: 'M52 31C52 40 52.4 46 52.6 52M54 31C54 40 53.6 46 53.4 52', line: true },
  liver: { d: 'M38 60C41 55.5 49 55.8 57 57.5C57.5 61 54 67 47 68C42 68 38.5 65 38 60Z' },
  gallbladder: { d: 'M48.5 66C47 66.4 46.8 69.6 48.2 70.8C49.6 70.4 50 67.4 48.5 66Z' },
  stomach: { d: 'M57 58.5C62 56.5 68 59 67 64.5C66 70 60 72.5 57.5 69.5C56 67.5 59 66 59.5 64C60 62 57.5 61.5 57 58.5Z' },
  spleen: { d: 'M66.4 59C69.4 59 70.2 63 68.4 66C67 66.6 66.2 63.5 66.4 59Z' },
  pancreas: { d: 'M46 68.6C50 66.6 56 67.4 62 66.2C63.6 66 64 68 62.6 69.2C57 71.4 50 71 46.4 70.8Z' },
  'small-bowel': { d: 'M45 74C52 72 60 74 62 76C60 78 48 77 46 79C48 81 60 80 62 82C60 84 48 83 46 85C48 87 58 86 60 88', line: true },
  colon: { d: 'M43 90L43 72.5C43 70.5 64 70.5 64 72.5L64 89C64 92 59 94 56 91', line: true },
  appendix: { d: 'M43.4 90C41 92 40.6 95 42.6 96', line: true },
  bladder: { d: 'M49 89C49 86 57 86 57 89C57 93 49 93 49 89Z', sex: 'male' },
  'bladder-f': { d: 'M49 97C49 94.4 57 94.4 57 97C57 100 49 100 49 97Z', sex: 'female' },
  prostate: { d: 'M50.4 95.5C50.4 93.6 55.6 93.6 55.6 95.5C55.6 98 50.4 98 50.4 95.5Z', sex: 'male' },
};
