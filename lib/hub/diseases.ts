import { applyCanon } from './canon';
import type { DiseaseFindings } from './types';

/** Same disease under two names (checked against Pathoma and First Aid, which use only the canonical one).
 *  Alias name -> canonical name; findings are merged onto the canonical entity. */
export const DISEASE_ALIAS: Record<string, string> = {
  'Major Depressive': 'Major Depressive Disorder',
  'Acute Myocardial Infarction': 'Myocardial Infarction',
  'Clostridioides Difficile Colitis': 'Clostridioides Difficile',
  'Sickle Cell Anemia': 'Sickle Cell Disease',
};

/** Genuinely different entities where one is a form of the other. Child -> parent.
 *  Book-backed: Pathoma p96 (NSCLC), First Aid p694 (emphysema in COPD), Pathoma p161 (Graves), First Aid p700 (PAH group 1),
 *  First Aid p578 (bipolar I). Clinical knowledge, books silent: septic shock, colon adenocarcinoma, glucocorticoid osteoporosis. */
export const DISEASE_SUBTYPE: Record<string, string> = {
  'Non-Small Cell Lung Cancer': 'Lung Cancer',
  Emphysema: 'Chronic Obstructive Pulmonary Disease',
  'Graves Disease': 'Hyperthyroidism',
  'Pulmonary Arterial Hypertension': 'Pulmonary Hypertension',
  'Bipolar I': 'Bipolar',
  'Diabetes Mellitus Type 1': 'Diabetes Mellitus',
  'Diabetes Mellitus Type 2': 'Diabetes Mellitus',
  'Idiopathic Pulmonary Fibrosis': 'Pulmonary Fibrosis',
  'Glucocorticoid-Induced Osteoporosis': 'Osteoporosis',
  'Septic Shock': 'Sepsis',
  'Colon Adenocarcinoma': 'Colorectal Cancer',
};

/** Folds alias diseases into their canonical entity. Pure. An alias with no canonical row in the data is renamed. */
export function mergeDiseases(data: DiseaseFindings[], alias: Record<string, string> = DISEASE_ALIAS): DiseaseFindings[] {
  const byName = new Map<string, DiseaseFindings>();
  for (const d of data) {
    const name = alias[d.disease] ?? d.disease;
    const prev = byName.get(name);
    byName.set(name, prev ? { ...prev, findings: [...prev.findings, ...d.findings] } : { ...d, disease: name, findings: [...d.findings] });
  }
  return applyCanon([...byName.values()], {}); // same-id findings collapse to the strongest
}

/** Subtype links whose both ends exist in the data. */
export function subtypeParents(names: string[], subtype: Record<string, string> = DISEASE_SUBTYPE): Record<string, string> {
  const have = new Set(names);
  return Object.fromEntries(Object.entries(subtype).filter(([c, p]) => have.has(c) && have.has(p)));
}
