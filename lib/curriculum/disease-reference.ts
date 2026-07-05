import fs from 'fs';
import path from 'path';

export interface DiseaseManifestation {
  diseaseName: string;
  questionCount: number;
  topicType: string;
  mechanism: string;
  keySymptoms: string[];
  discriminators: string[];
  highLeverageClues: string[];
}

export interface SystemDiseaseGroup {
  system: string;
  totalQuestions: number;
  totalDiseases: number;
  diseases: DiseaseManifestation[];
}

const SYSTEM_NORMALIZE: Record<string, string> = {
  'Nervous System': 'Neurology',
  'Nervous': 'Neurology',
  'Visual System': 'Neurology',
  'Auditory System': 'Neurology',
  'Auditory and Vestibular System': 'Neurology',
  'Ophthalmology': 'Neurology',
  'Ocular': 'Neurology',
  'Sensory System': 'Neurology',
  'Autonomic Nervous System': 'Neurology',
  'Nervous System (special senses)': 'Neurology',
  'Respiratory System': 'Respiratory',
  'Respiratory': 'Respiratory',
  'Cardiovascular System': 'Cardiovascular',
  'Cardiovascular and Renal': 'Cardiovascular',
  'Cardiovascular and Respiratory': 'Cardiovascular',
  'Vascular System': 'Cardiovascular',
  'Vascular': 'Cardiovascular',
  'Endocrine System': 'Endocrine',
  'Endocrine': 'Endocrine',
  'Endocrine/Metabolic': 'Endocrine',
  'Endocrine/Nutrition': 'Endocrine',
  'Endocrine/Musculoskeletal': 'Endocrine',
  'Endocrine/Reproductive': 'Endocrine',
  'Immune System': 'Immune System',
  'Immune': 'Immune System',
  'Hematologic System': 'Hematology & Oncology',
  'Hematologic': 'Hematology & Oncology',
  'Hematologic and Immune Systems': 'Hematology & Oncology',
  'Hematologic/Immune': 'Hematology & Oncology',
  'Hematologic/Immunologic': 'Hematology & Oncology',
  'Hematologic / Immune': 'Hematology & Oncology',
  'Hematologic/Lymphatic': 'Hematology & Oncology',
  'Hematologic / Infectious': 'Hematology & Oncology',
  'Hematologic and Nervous Systems': 'Hematology & Oncology',
  'Hematologic and Renal Systems': 'Hematology & Oncology',
  'Hematologic and Musculoskeletal': 'Hematology & Oncology',
  'Hematologic and Gastrointestinal': 'Hematology & Oncology',
  'Hematologic and Lymphatic System': 'Hematology & Oncology',
  'Hematologic and Lymphatic Systems': 'Hematology & Oncology',
  'Hematologic and Endocrine Systems': 'Hematology & Oncology',
  'Hematology/Electrolytes': 'Hematology & Oncology',
  'Hematologic/Coagulation': 'Hematology & Oncology',
  'Hematopoietic System': 'Hematology & Oncology',
  'Reproductive System': 'Reproductive',
  'Reproductive': 'Reproductive',
  'Reproductive / Musculoskeletal / Integumentary': 'Reproductive',
  'Integumentary System': 'Integumentary',
  'Integumentary': 'Integumentary',
  'Integumentary / Hematologic': 'Integumentary',
  'Integumentary / Hematologic / Gastrointestinal': 'Integumentary',
  'Integumentary / Infectious Disease': 'Integumentary',
  'Integumentary / Respiratory': 'Integumentary',
  'Integumentary / Nervous': 'Integumentary',
  'Integumentary / General Pathology': 'Integumentary',
  'Integumentary / Infection Control': 'Integumentary',
  'Integumentary / Mucosal': 'Integumentary',
  'Integumentary / Reproductive': 'Integumentary',
  'Integumentary / Immune': 'Integumentary',
  'Integumentary / Systemic': 'Integumentary',
  'Integumentary/Musculoskeletal': 'Integumentary',
  'Integumentary and Nervous System': 'Integumentary',
  'Integumentary, Gastrointestinal, Nervous': 'Integumentary',
  'Digestive System': 'Gastrointestinal',
  'Gastrointestinal System': 'Gastrointestinal',
  'Gastrointestinal / Abdominal': 'Gastrointestinal',
  'Gastrointestinal/Immune': 'Gastrointestinal',
  'Gastrointestinal/Nutrition': 'Gastrointestinal',
  'Gastrointestinal, Nervous, Hematologic': 'Gastrointestinal',
  'Digestive and Hepatobiliary System': 'Gastrointestinal',
  'Urinary System': 'Renal',
  'Urinary Tract': 'Renal',
  'Urinary': 'Renal',
  'Renal System': 'Renal',
  'Renal/Urinary': 'Renal',
  'Renal/Hepatic': 'Renal',
  'Renal/Electrolytes': 'Renal',
  'Renal/Endocrine': 'Renal',
  'Renal/Vascular': 'Renal',
  'Renal / Hematologic': 'Renal',
  'Hepatic': 'Hepatobiliary',
  'Hepatic and Biliary': 'Hepatobiliary',
  'Hepatic and Biliary System': 'Hepatobiliary',
  'Hepatic and Portal Systems': 'Hepatobiliary',
  'Hepatic/Biliary': 'Hepatobiliary',
  'Hepatic/Immune': 'Hepatobiliary',
  'Musculoskeletal System': 'Musculoskeletal',
  'Musculoskeletal and Connective Tissue': 'Musculoskeletal',
  'Musculoskeletal and Immune': 'Musculoskeletal',
  'Musculoskeletal and Integumentary': 'Musculoskeletal',
  'Muscular System': 'Musculoskeletal',
  'Musculoskeletal, Gastrointestinal': 'Musculoskeletal',
  'Lymphatic System': 'Lymphatic/Hematologic',
  'Lymphatic/Hematologic': 'Lymphatic/Hematologic',
  'Lymphatic/Hematopoietic': 'Lymphatic/Hematologic',
  'Lymphatic/Immune System': 'Lymphatic/Hematologic',
  'Lymphatic and Immune Systems': 'Lymphatic/Hematologic',
  'Lymphatic / Immune System': 'Lymphatic/Hematologic',
  'Lymphatic/Immune': 'Lymphatic/Hematologic',
  'Reticuloendothelial System': 'Lymphatic/Hematologic',
  'Genetic/Molecular': 'Genetics',
  'Genetic/Metabolic': 'Genetics',
  'Genetic': 'Genetics',
  'Genetic / Developmental': 'Genetics',
  'Genetic / Reproductive': 'Genetics',
  'Genetic Information': 'Genetics',
  'Genetic Information Flow': 'Genetics',
  'Genetic Information Processing': 'Genetics',
  'Genetic Regulation': 'Genetics',
  'Genetic and Developmental': 'Genetics',
  'Genetic and Evolutionary Systems': 'Genetics',
  'Cellular and Molecular Biology': 'Cell Biology',
  'Cellular': 'Cell Biology',
  'Cellular Biology': 'Cell Biology',
  'Cellular Signaling': 'Cell Biology',
  'Cell Membrane Transport': 'Cell Biology',
  'Molecular Biology': 'Cell Biology',
  'Psychiatric': 'Psychiatry',
  'Psychiatric/Mental Health': 'Psychiatry',
  'Psychosocial': 'Psychiatry',
  'Behavioral Health': 'Psychiatry',
  'Metabolic': 'Metabolic',
  'Metabolic Pathways': 'Metabolic',
  'Nutritional/Metabolic': 'Metabolic',
  'Connective Tissue': 'Musculoskeletal',
  'Craniofacial': 'Head and Neck',
  'Pharyngeal Arches': 'Head and Neck',
  'Pharyngeal Apparatus': 'Head and Neck',
  'Ear, Nose, and Throat': 'Head and Neck',
  'Neoplasms': 'Neoplasia',
  'Neoplasia': 'Neoplasia',
  'Neoplastic': 'Neoplasia',
  'Breast': 'Reproductive',
  'Healthcare Systems': 'Public Health',
  'Healthcare System': 'Public Health',
  'Healthcare Delivery': 'Public Health',
  'Healthcare Quality': 'Public Health',
  'Legal and Ethical Issues': 'Ethics',
  'Ethics and Legal': 'Ethics',
  'General Pharmacology': 'Pharmacology',
  'Regulatory/Clinical Trials': 'Public Health',
  'Population Health': 'Public Health',
  'Radiology/Oncology': 'Neoplasia',
  'Genitourinary': 'Renal',
  'Urogenital': 'Renal',
  'Urogenital / Cardiovascular': 'Renal',
  'Endocrine/Metabolic': 'Endocrine',
  'Respiratory, Gastrointestinal, Endocrine': 'Respiratory',
  'Respiratory, Cardiovascular, Renal': 'Respiratory',
  'Respiratory and Cardiovascular': 'Respiratory',
  'Respiratory / Hepatobiliary': 'Respiratory',
  'Respiratory System, Nervous System': 'Respiratory',
  'Respiratory and Gastrointestinal': 'Respiratory',
  'Respiratory, Gastrointestinal': 'Respiratory',
  'Reproductive System / Respiratory System': 'Reproductive',
  'Multiple Systems': 'Multisystem',
  'Multiple systems': 'Multisystem',
  'Multiple systems (fetal development)': 'Multisystem',
  'Multiple systems (Cardiovascular, Immune, Craniofacial)': 'Multisystem',
  'Multiple systems (lysosomal storage disorder)': 'Multisystem',
  'Multiple systems (Neurologic, Gastrointestinal, Renal, Hematologic)': 'Multisystem',
  'Multiple systems (Integumentary, Hematologic, Respiratory)': 'Multisystem',
  'Multiple systems (congenital infection)': 'Multisystem',
  'Multiple systems (urinary, antimicrobial)': 'Multisystem',
  'Multiple (Respiratory, Metabolic)': 'Multisystem',
  'Multiple systems (respiratory, metabolic, renal)': 'Multisystem',
  'Multiple': 'Multisystem',
  'Multisystem': 'Multisystem',
  'Immune System / Infectious Disease': 'Infectious Disease',
  'N/A': 'General',
  'Not applicable': 'General',
  'None': 'General',
  'Nervous System, Cardiovascular': 'Neurology',
  'Nervous System, Hematologic': 'Neurology',
  'Nervous System, Cardiovascular, Integumentary': 'Neurology',
  'Nervous System, Respiratory System, Metabolic': 'Neurology',
  'Integumentary, Gastrointestinal, Nervous': 'Neurology',
  'Female Reproductive System': 'Reproductive',
  'Head and Neck': 'Head and Neck',
  'Infectious Disease': 'Infectious Disease',
};

// High-yield FA/Pathoma conditions not yet in question bank (reference-only, 0 questions)
const REFERENCE_DISEASES: Record<string, string[]> = {
  Neurology: [
    'Guillain-Barre Syndrome', 'Horner Syndrome', 'Brown-Sequard Syndrome',
    'Cerebral Aneurysm', 'Brain Herniation', 'Uncal Herniation',
    'Central Pontine Myelinolysis', 'Friedreich Ataxia',
    'Duchenne Muscular Dystrophy', 'Becker Muscular Dystrophy',
    'Myotonic Dystrophy', 'Amyotrophic Lateral Sclerosis',
    'Charcot-Marie-Tooth Disease', 'Spinal Muscular Atrophy',
    'Von Hippel-Lindau Disease', 'Neurofibromatosis Type 2',
    'Sturge-Weber Syndrome', 'Tuberous Sclerosis',
    'Glioblastoma Multiforme', 'Oligodendroglioma',
    'Medulloblastoma', 'Craniopharyngioma', 'Ependymoma',
    'Cavernous Sinus Thrombosis', 'Epidural Abscess',
    'Normal Pressure Hydrocephalus', 'Conus Medullaris Syndrome',
    'Cauda Equina Syndrome',
  ],
  Cardiovascular: [
    'Deep Vein Thrombosis', 'Varicose Veins', 'Raynaud Disease',
    'Brugada Syndrome', 'Wolff-Parkinson-White Syndrome',
    'Restrictive Cardiomyopathy', 'Arrhythmogenic RV Cardiomyopathy',
    'Myocarditis', 'Acute Endocarditis', 'Takayasu Arteritis',
    'Polyarteritis Nodosa', 'Buerger Disease',
    'Hypertensive Emergency',
  ],
  Respiratory: [
    'Alpha-1 Antitrypsin Deficiency', 'Bronchiectasis',
    'Silicosis', 'Asbestosis', 'Hypersensitivity Pneumonitis',
    'Pulmonary Nodule', 'Carcinoid Tumor',
  ],
  Gastrointestinal: [
    'GERD', 'Esophageal Cancer', 'Mallory-Weiss Syndrome',
    'Boerhaave Syndrome', 'Hirschsprung Disease',
    'Irritable Bowel Syndrome', 'Volvulus', 'Intussusception',
    'Intestinal Obstruction', 'NASH', 'NAFLD',
    'Alcoholic Hepatitis', 'Budd-Chiari Syndrome',
    'Hepatorenal Syndrome', 'Hepatic Encephalopathy',
    'Choledocholithiasis', 'Gallbladder Carcinoma',
    'Chronic Cholecystitis', 'Pancreatic Pseudocyst',
  ],
  Renal: [
    'Nephritic Syndrome', 'Alport Syndrome',
    'Focal Segmental Glomerulosclerosis', 'Membranous Glomerulopathy',
    'Thin Basement Membrane Disease', 'Renal Tubular Acidosis',
    'Bladder Cancer', 'Benign Prostatic Hyperplasia',
    'Wilms Tumor', 'Angiomyolipoma', 'Oncocytoma',
    'Hydronephrosis', 'Medullary Sponge Kidney',
    'Medullary Cystic Disease', 'Renal Agenesis',
    'Postrenal Azotemia',
  ],
  Endocrine: [
    'Diabetic Ketoacidosis', 'Hyperosmolar Hyperglycemic State',
    'Thyroiditis', 'Subacute Thyroiditis', 'Hashimoto Thyroiditis',
    'Thyroid Nodule', 'Goiter', 'Multinodular Goiter',
    'Papillary Thyroid Cancer', 'Follicular Thyroid Cancer',
    'Medullary Thyroid Cancer', 'Anaplastic Thyroid Cancer',
    'Cushing Disease', 'Conn Syndrome',
    'Congenital Adrenal Hyperplasia', 'Adrenal Carcinoma',
    'MEN 1', 'MEN 2', 'Pituitary Apoplexy',
    'Sheehan Syndrome', 'Autoimmune Polyendocrine Syndrome',
    'Gigantism', 'Hypopituitarism',
  ],
  'Hematology & Oncology': [
    'Essential Thrombocythemia', 'Antiphospholipid Syndrome',
    'Hairy Cell Leukemia', 'Mycosis Fungoides',
    'Multiple Myeloma', 'Waldenstrom Macroglobulinemia',
    'Fanconi Anemia', 'Paroxysmal Nocturnal Hemoglobinuria',
    'Langerhans Cell Histiocytosis',
    'Acute Intermittent Porphyria',
  ],
  Immunology: [
    'Sjogren Syndrome', 'Polymyalgia Rheumatica',
    'Behcet Disease', 'Erythema Nodosum',
    'Microscopic Polyangiitis', 'Churg-Strauss Syndrome',
    'Henoch-Schonlein Purpura', 'Granulomatosis With Polyangiitis',
    'Common Variable Immunodeficiency', 'Wiskott-Aldrich Syndrome',
    'Ataxia Telangiectasia', 'Chronic Granulomatous Disease',
    'Chediak-Higashi Syndrome', 'Leukocyte Adhesion Deficiency',
    'Graft vs Host Disease', 'Serum Sickness',
    'Angioedema', 'Hereditary Angioedema',
  ],
  'Infectious Disease': [
    'Necrotizing Fasciitis', 'Osteomyelitis',
    'Cellulitis', 'Erysipelas', 'Cat Scratch Disease',
    'Rocky Mountain Spotted Fever', 'Lyme Disease',
    'Syphilis', 'Nocardiosis', 'Actinomycosis',
    'Creutzfeldt-Jakob Disease',
    'Progressive Multifocal Leukoencephalopathy',
    'Miliary Tuberculosis', 'Leprosy',
    'Influenza', 'Respiratory Syncytial Virus',
    'Norovirus', 'Pertussis',
  ],
  Reproductive: [
    'Cervical Cancer', 'Endometrial Cancer',
    'Vaginal Cancer', 'Vulvar Cancer',
    'Ovarian Torsion', 'Dermoid Cyst',
    'Granulosa Cell Tumor', 'Sertoli-Leydig Cell Tumor',
    'Gestational Trophoblastic Disease', 'Hydatidiform Mole',
    'Choriocarcinoma', 'Placental Abruption',
    'Placenta Previa', 'Preeclampsia', 'Eclampsia',
    'HELLP Syndrome', 'Ectopic Pregnancy',
    'Cervical Insufficiency', 'Preterm Labor',
    'PPROM', 'Intrauterine Growth Restriction',
    'Umbilical Cord Prolapse', 'Shoulder Dystocia',
    'Endometritis', 'Mastitis',
    'Varicocele', 'Hydrocele', 'Orchitis',
    'Paget Disease of Nipple',
  ],
  Integumentary: [
    'Eczema', 'Atopic Dermatitis', 'Contact Dermatitis',
    'Seborrheic Dermatitis', 'Stasis Dermatitis',
    'Stevens-Johnson Syndrome', 'Toxic Epidermal Necrolysis',
    'Erythema Multiforme', 'Lichen Planus',
    'Vitiligo', 'Alopecia Areata',
    'Merkel Cell Carcinoma', 'Dermatofibroma',
    'Seborrheic Keratosis', 'Lipoma',
    'Acne Vulgaris', 'Rosacea',
    'Molluscum Contagiosum', 'Scabies',
    'Pityriasis Rosea', 'Acanthosis Nigricans',
  ],
  Musculoskeletal: [
    'Ehlers-Danlos Syndrome', 'Osteogenesis Imperfecta',
    'Compartment Syndrome', 'Complex Regional Pain Syndrome',
    'Osteochondroma', 'Enchondroma', 'Chondrosarcoma',
    'Ewing Sarcoma', 'Giant Cell Tumor of Bone',
    'Fibrous Dysplasia', 'McCune-Albright Syndrome',
    'Septic Arthritis',
  ],
};

function normalizeDiseaseName(name: string): string {
  let n = name;

  // Strip possessive apostrophe-s
  n = n.replace(/['']S\b/gi, 's');
  n = n.replace(/['']/g, '');

  // Strip parenthetical content like (ADHD), (PCOS), (Gallstones)
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Strip leading staging/severity descriptors (safe — don't change disease identity)
  n = n.replace(/^(Metastatic|Invasive|Active|Latent)\s+/i, '');

  // Reorder "Malignant X" → "X" when X is already a malignancy (melanoma, neoplasm, etc.)
  n = n.replace(/^Malignant\s+(Melanoma|Neoplasm|Tumor|Lesion|Growth)\s*/i, '$1 ');

  // Strip trailing noise: " Virus", " Virus Infection", " Infection", " Disorder" after known base
  n = n.replace(/\s+(Virus(\s+Infection)?|Infection|Disorder)$/i, '');

  // Strip " Due To ..." clauses
  n = n.replace(/\s+(Due To|Secondary To|Associated With|Caused By)\s+.*/i, '');

  // Strip " With ..." clauses (keep base disease)
  n = n.replace(/\s+With\s+.*/i, '');

  // Normalize "Type N Disease" → "Disease Type N" for consistent grouping
  n = n.replace(/^(Type\s+\d+\s+)(.+)$/i, '$2 $1').trim();

  // Normalize whitespace
  n = n.replace(/\s+/g, ' ').trim();

  return n;
}

export function getDiseaseReference(): SystemDiseaseGroup[] {
  const enrichedPath = path.resolve(process.cwd(), 'data/medicospira-enriched.jsonl');
  if (!fs.existsSync(enrichedPath)) return [];

  const lines = fs.readFileSync(enrichedPath, 'utf-8').trim().split('\n');

  const systemMap: Record<string, Record<string, {
    count: number;
    symptoms: Set<string>;
    distractors: Set<string>;
    clues: Set<string>;
    mechanism: string;
    topicType: string;
  }>> = {};

  for (const line of lines) {
    try {
      const raw = JSON.parse(line);
      const e = raw.enriched;
      if (!e || !e.diseaseName || e.diseaseName === 'Unknown') continue;

      const rawSys = e.system || 'General';
      const sys = SYSTEM_NORMALIZE[rawSys] || rawSys;
      const rawName = e.diseaseName;
      const normalizedName = normalizeDiseaseName(rawName);

      if (!systemMap[sys]) systemMap[sys] = {};
      if (!systemMap[sys][normalizedName]) {
        systemMap[sys][normalizedName] = {
          count: 0,
          symptoms: new Set(),
          distractors: new Set(),
          clues: new Set(),
          mechanism: e.mechanism || '',
          topicType: e.topicType || 'DISEASE',
        };
      }

      const d = systemMap[sys][normalizedName];
      d.count++;

      if (e.keySymptoms) {
        const arr = Array.isArray(e.keySymptoms) ? e.keySymptoms : [e.keySymptoms];
        arr.forEach(s => { if (s) d.symptoms.add(s); });
      }

      if (e.discriminators) {
        const arr = Array.isArray(e.discriminators) ? e.discriminators : [e.discriminators];
        arr.forEach(disc => { if (disc?.distractor) d.distractors.add(disc.distractor); });
      }

      if (e.highLeverageClues) {
        const arr = Array.isArray(e.highLeverageClues) ? e.highLeverageClues : [e.highLeverageClues];
        arr.forEach(c => { if (c) d.clues.add(c); });
      }
    } catch { /* skip */ }
  }

  // Inject reference-only diseases (0 questions, FA/Pathoma high-yield gaps)
  Object.entries(REFERENCE_DISEASES).forEach(([sys, diseases]) => {
    if (!systemMap[sys]) systemMap[sys] = {};
    diseases.forEach(name => {
      if (!systemMap[sys][name]) {
        systemMap[sys][name] = {
          count: 0,
          symptoms: new Set(),
          distractors: new Set(),
          clues: new Set(),
          mechanism: '',
          topicType: 'DISEASE',
        };
      }
    });
  });

  const result: SystemDiseaseGroup[] = Object.entries(systemMap)
    .map(([system, diseases]) => {
      const diseaseList: DiseaseManifestation[] = Object.entries(diseases)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, data]) => ({
          diseaseName: name,
          questionCount: data.count,
          topicType: data.topicType,
          mechanism: data.mechanism,
          keySymptoms: [...data.symptoms],
          discriminators: [...data.distractors].slice(0, 10),
          highLeverageClues: [...data.clues],
        }));

      const total = diseaseList.reduce((s, d) => s + d.questionCount, 0);

      return {
        system,
        totalQuestions: total,
        totalDiseases: diseaseList.length,
        diseases: diseaseList,
      };
    })
    .sort((a, b) => b.totalQuestions - a.totalQuestions);

  return result;
}
