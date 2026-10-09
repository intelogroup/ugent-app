import type { FindingType } from './types';

/** Case-context finding types: not tied to a body region, drawn from fixed vocabularies so every disease
 *  that shares a value shares one finding id (needed for specificity and for separating tied diagnoses). */
export const CONTEXT_TYPES: FindingType[] = ['course', 'size', 'geography'];
export const isContextType = (t: FindingType) => CONTEXT_TYPES.includes(t);

export const CONTEXT_VOCAB: Record<'course' | 'size' | 'geography', string[]> = {
  course: [
    'Onset over minutes to hours',
    'Onset over days',
    'Course over weeks',
    'Course over months',
    'Course over years',
    'Episodic or relapsing',
    'Congenital or lifelong',
  ],
  size: [
    'Solitary small lesion under 2 cm',
    'Mass 2 to 5 cm',
    'Large mass over 5 cm',
    'Multiple lesions or nodules',
    'Enlarged organ',
    'Shrunken organ',
  ],
  geography: [
    'Southwestern United States',
    'Ohio and Mississippi river valleys',
    'Northeastern United States',
    'Central or South America',
    'Sub-Saharan Africa',
    'Southeast Asia',
    'Mediterranean',
    'Tropics and subtropics',
    'Travel to an endemic area',
    'Rural or farm exposure',
    'Cave or bat exposure',
  ],
};
