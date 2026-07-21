import { readFileSync, writeFileSync } from 'fs';

const lines = readFileSync('data/medicospira-enriched.jsonl', 'utf8')
  .split('\n')
  .filter(Boolean);

const words = new Set();

const MANUAL_TERMS = [
  // ponytail: FA subject chapter titles — not in enriched data as disease/system names
  'mycology', 'virology', 'bacteriology', 'parasitology',
  'pharmacology', 'pathology', 'physiology', 'biochemistry',
  'immunology', 'embryology', 'histology', 'genetics',
  'neurology', 'nephrology', 'cardiology', 'pulmonology',
  'gastroenterology', 'endocrinology', 'rheumatology',
  'oncology', 'hematology', 'anatomy',
  // common Qbank topics the user would reference
  'microbiology', 'epidemiology', 'biostatistics',
  'psychiatry', 'dermatology', 'radiology',
  'ophthalmology', 'otorhinolaryngology', 'orthopedics',
  'urology', 'gynecology', 'pediatrics',
  'geriatrics', 'nutrition', 'ethics',
  // diseases & conditions visible in question text but not in enriched fields
  'myelofibrosis', 'pancytopenia', 'leukopenia', 'neutropenia',
  'lymphocytosis', 'granulocytopenia', 'granulocytosis',
  'hypersplenism', 'asplenia', 'splenomegaly', 'hepatomegaly',
  'bronchiectasis', 'atelectasis', 'pneumothorax', 'hemothorax',
  'hydropneumothorax', 'pyopneumothorax', 'chylothorax',
  'hemangioendothelioma', 'pseudohypoparathyroidism',
  'pseudopseudohypoparathyroidism', 'choledocholithiasis',
  'pancreatolithiasis', 'sialolithiasis', 'broncholithiasis',
  // key drugs & pathogens from FA that user might pronounce
  'amphotericin', 'fluconazole', 'voriconazole', 'caspofungin',
  'trimethoprim', 'sulfamethoxazole', 'isoniazid', 'rifampin',
  'pyrazinamide', 'ethambutol', 'acyclovir', 'ganciclovir',
  'vancomycin', 'gentamicin', 'tobramycin', 'erythromycin',
  'azithromycin', 'clarithromycin', 'levofloxacin', 'ciprofloxacin',
  'penicillin', 'cephalexin', 'ceftriaxone', 'cefepime',
  'meropenem', 'imipenem', 'doxycycline', 'minocycline',
  'streptococcus', 'staphylococcus', 'pseudomonas', 'clostridium',
  'haemophilus', 'neisseria', 'escherichia', 'klebsiella',
  'mycobacterium', 'mycoplasma', 'chlamydia', 'rickettsia',
  'enterococcus', 'salmonella', 'shigella', 'campylobacter',
  'helicobacter', 'legionella', 'borrelia', 'treponema',
  // B-cell and T-cell names
  'lymphocyte', 'lymphocytes', 'neutrophil', 'neutrophils',
  'eosinophil', 'eosinophils', 'basophil', 'basophils',
  'monocyte', 'monocytes', 'macrophage', 'macrophages',
  'granulocyte', 'granulocytes', 'erythrocyte', 'erythrocytes',
  'thrombocyte', 'thrombocytes', 'megakaryocyte',
  // organs and anatomical terms often referenced
  'pericardium', 'myocardium', 'endocardium', 'epicardium',
  'periosteum', 'peritoneum', 'mesentery', 'omentum',
  'mediastinum', 'parenchyma', 'stroma', 'interstitium',
  'epididymis', 'mesorchium', 'mesovarium',
  // fungi — missing species, diseases, and drugs from FA mycology chapter
  'pneumocystosis', 'dermatophytosis',
  'chromoblastomycosis', 'paracoccidioidomycosis',
  'glabrata', 'krusei', 'parapsilosis', 'tropicalis',
  'niger', 'flavus', 'terreus',
  'gattii',
  'posaconazole', 'isavuconazole', 'micafungin', 'anidulafungin',
  'clotrimazole', 'miconazole',
  'hypha', 'calcofluor',
  // virology — missing genera/viruses from FA
  'ebola', 'echovirus', 'coxsackie', 'monkeypox',
  'hantavirus', 'arenavirus', 'filovirus',
  // parasitology — missing genera/common names from FA
  'leishmania', 'trichinella', 'necator', 'ancylostoma',
  'whipworm', 'trichuris', 'dracunculus',
  'isospora', 'cyclospora', 'microsporidia', 'acanthamoeba',
  // endocrinology
  'gigantism', 'dwarfism', 'glyburide',
  // hematology/oncology
  'leukapheresis', 'plasmapheresis',
  // GI — syndromes and acid-suppressing drugs
  'boerhaave', 'pantoprazole', 'famotidine', 'ranitidine',
  // psychiatry — hallucination somehow not in enriched data
  'hallucination',
  // immunology
  'sjogren',
  // renal
  'nephroptosis', 'urolithiasis',
  // cardiology
  'angioplasty',
  // neurology
  'convulsant', 'plexopathy',
];
for (const t of MANUAL_TERMS) words.add(t);

function add(text) {
  if (!text || typeof text !== 'string') return;
  text.toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^-+|-+$/g, ''))
    .filter(w => w.length >= 3 && /[a-z]/.test(w))
    .forEach(w => words.add(w));
}

for (const line of lines) {
  const q = JSON.parse(line);
  const e = q.enriched || {};

  add(e.diseaseName);
  add(e.system);
  add(e.subject);
  add(e.mechanism);

  if (Array.isArray(e.keySymptoms)) e.keySymptoms.forEach(add);
  if (Array.isArray(e.prerequisites)) e.prerequisites.forEach(add);

  for (const d of e.discriminators || []) {
    add(d.distractor);
    add(d.ruleOutFact);
  }
}

const sorted = [...words].sort();
writeFileSync('lib/asr-dictionary.json', JSON.stringify(sorted, null, 2));
console.log(`wrote ${sorted.length} words to lib/asr-dictionary.json`);
