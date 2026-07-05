import fs from 'fs';
import path from 'path';
import type {
  TopicNode,
  DependencyGraph,
  EnrichedData,
  TopicType,
  SubChapterNode,
} from './types';

export const FIRST_AID_MAP: Record<string, { chapter: string; pages: string; subChapters: SubChapterNode[] }> = {
  Neurology: {
    chapter: 'Neurology',
    pages: '458-499',
    subChapters: [
      { title: 'Embryology & Anatomy', items: ['Neural tube development', 'Ventricles & CSF', 'Spinal cord tracts'] },
      { title: 'Physiology', items: ['Action potentials', 'Synaptic transmission', 'Neurotransmitter changes'] },
      { title: 'Pathology', items: ['Stroke (ischemic/hemorrhagic)', 'Dementia (Alzheimer, Lewy Body)', 'Seizures', 'Brain tumors'] },
      { title: 'Ophthalmology', items: ['Visual pathway lesions', 'Glaucoma', 'Pupillary abnormalities'] },
      { title: 'Pharmacology', items: ['Anesthetics', 'Antiepileptics', 'Parkinson drugs'] }
    ]
  },
  Respiratory: {
    chapter: 'Respiratory',
    pages: '558-577',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Lung development', 'Bronchial tree structure'] },
      { title: 'Physiology', items: ['Lung volumes', 'Oxygen-hemoglobin dissociation', 'V/Q mismatches'] },
      { title: 'Pathology', items: ['Obstructive diseases (COPD, Asthma)', 'Restrictive diseases (IPF, Sarcoidosis)', 'Pneumonias', 'Lung Cancer'] },
      { title: 'Pharmacology', items: ['Asthma controllers & bronchodilators'] }
    ]
  },
  Gastrointestinal: {
    chapter: 'Gastrointestinal',
    pages: '327-363',
    subChapters: [
      { title: 'Anatomy', items: ['Peritoneum & retroperitoneal organs', 'GI blood supply & innervation'] },
      { title: 'Physiology', items: ['GI hormones', 'Bilirubin metabolism', 'Digestion & absorption'] },
      { title: 'Pathology', items: ['Esophageal disease (Achalasia, GERD)', 'Stomach (Gastritis, Peptic Ulcers)', 'Bowel (IBD, Polyps, Colon Cancer)', 'Hepatobiliary (Cirrhosis, Hepatitis)'] },
      { title: 'Pharmacology', items: ['H2 blockers', 'PPIs', 'Antiemetics'] }
    ]
  },
  Cardiovascular: {
    chapter: 'Cardiovascular',
    pages: '256-297',
    subChapters: [
      { title: 'Embryology & Anatomy', items: ['Heart development', 'Fetal circulation', 'Coronary anatomy'] },
      { title: 'Physiology', items: ['Cardiac cycle & PV loops', 'EKG rhythms', 'Hemodynamics'] },
      { title: 'Pathology', items: ['Congenital shunts (ASD, VSD, Tetralogy)', 'Ischemic heart disease', 'Valvular dysfunction', 'Cardiomyopathies'] },
      { title: 'Pharmacology', items: ['Antihypertensives', 'Antiarrhythmics', 'Lipid-lowering agents'] }
    ]
  },
  'Hematology & Oncology': {
    chapter: 'Hematology & Oncology',
    pages: '364-411',
    subChapters: [
      { title: 'Physiology', items: ['Hematopoiesis', 'RBC & WBC morphology', 'Platelet activation & Coagulation cascade'] },
      { title: 'Pathology', items: ['Anemias (Microcytic, Macrocytic, Normocytic)', 'Bleeding disorders (Hemophilia, vWD, DIC)', 'Leukemias & Lymphomas', 'Plasma cell dyscrasias'] },
      { title: 'Oncology & Pharmacology', items: ['Chemotherapeutic agents', 'Anticoagulants & thrombolytics'] }
    ]
  },
  Immunology: {
    chapter: 'Immunology',
    pages: '94-113',
    subChapters: [
      { title: 'Cellular Components', items: ['T-cell & B-cell development', 'Antigen presentation', 'Cytokine signaling'] },
      { title: 'Lymphoid Organs', items: ['Lymph nodes', 'Spleen', 'Thymus'] },
      { title: 'Hypersensitivities & Autoimmunity', items: ['Types I-IV Hypersensitivities', 'Transplant rejection mechanisms'] },
      { title: 'Autoimmune Disorders', items: ['Systemic Lupus Erythematosus (SLE)', 'Sjögren syndrome', 'Scleroderma (systemic sclerosis)', 'Mixed connective tissue disease'] },
      { title: 'Immunodeficiencies', items: ['B-cell disorders (X-linked Agam)', 'T-cell disorders (DiGeorge)', 'Combined (SCID, Wiskott-Aldrich)', 'Phagocyte dysfunctions'] }
    ]
  },
  'Infectious Disease': {
    chapter: 'Microbiology',
    pages: '114-183',
    subChapters: [
      { title: 'Bacteriology', items: ['Gram-positives (Staph, Strep)', 'Gram-negatives (Neisseria, Enterics)', 'Mycobacteria & Spirochetes'] },
      { title: 'Virology', items: ['DNA & RNA viruses', 'HIV & Hepatitis viruses'] },
      { title: 'Mycology & Parasitology', items: ['Systemic mycoses', 'Protozoa & Helminths'] },
      { title: 'Antimicrobials', items: ['Penicillins', 'Cephalosporins', 'Macrolides', 'Antivirals'] }
    ]
  },
  Endocrine: {
    chapter: 'Endocrine',
    pages: '298-326',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Thyroid & adrenal gland anatomy', 'Pituitary development'] },
      { title: 'Physiology', items: ['Hypothalamic-Pituitary axes', 'Hormone feedback systems'] },
      { title: 'Pathology', items: ['Thyroid disorders (Graves, Hashimoto)', 'Adrenal disorders (Cushing, Conn)', 'Diabetes Mellitus'] },
      { title: 'Pharmacology', items: ['Insulin regimes', 'Thyroid replacements', 'Antithyroid drugs'] }
    ]
  },
  Integumentary: {
    chapter: 'Musculoskeletal, Skin, CT',
    pages: '412-457',
    subChapters: [
      { title: 'Skin Anatomy & Physiology', items: ['Epidermal layers', 'Skin junctions'] },
      { title: 'Dermatopathology', items: ['Inflammatory dermatoses (Eczema, Psoriasis)', 'Bullous disorders (Pemphigus, Pemphigoid)'] },
      { title: 'Skin Cancer', items: ['BCC', 'SCC', 'Melanoma'] }
    ]
  },
  Renal: {
    chapter: 'Renal',
    pages: '500-527',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Kidney development', 'Nephron architecture'] },
      { title: 'Physiology', items: ['GFR & renal clearance', 'Electrolyte & water handling'] },
      { title: 'Pathology', items: ['Nephritic syndromes (PSGN, IgA)', 'Nephrotic syndromes (Minimal Change, FSGS)', 'AKI & CKD'] },
      { title: 'Pharmacology', items: ['Diuretics (Loop, Thiazide, K-sparing)'] }
    ]
  },
  Reproductive: {
    chapter: 'Reproductive',
    pages: '528-557',
    subChapters: [
      { title: 'Embryology & Anatomy', items: ['Sex determination', 'Uterine/ovarian anatomy'] },
      { title: 'Physiology', items: ['Menstrual cycle', 'Pregnancy & lactation'] },
      { title: 'Pathology', items: ['Breast disease (Fibrocystic, Fibroadenoma, Cancer)', 'Ovarian & uterine tumors', 'Prostate diseases'] },
      { title: 'Pharmacology', items: ['OCPs', 'SERMs', 'Androgen antagonists'] }
    ]
  },
  Musculoskeletal: {
    chapter: 'Musculoskeletal, Skin, CT',
    pages: '412-457',
    subChapters: [
      { title: 'Bone & Joint Physiology', items: ['Osteoblast & osteoclast activity', 'Cartilage structure'] },
      { title: 'Pathology', items: ['Osteoporosis & Paget disease', 'Osteo/Rheumatoid arthritis', 'Myopathies'] },
      { title: 'Connective Tissue', items: ['SLE', 'Sjogren', 'Scleroderma'] }
    ]
  },
  Psychiatry: {
    chapter: 'Psychiatry',
    pages: '466-489',
    subChapters: [
      { title: 'Developmental Disorders', items: ['ADHD', 'Autism Spectrum'] },
      { title: 'Psychopathology', items: ['Depressive & Bipolar disorders', 'Schizophrenia', 'Anxiety & OCD', 'Personality disorders'] },
      { title: 'Pharmacology', items: ['Antidepressants (SSRIs, TCAs)', 'Antipsychotics', 'Mood stabilizers'] }
    ]
  },
  Pediatrics: {
    chapter: 'Reproductive',
    pages: '557',
    subChapters: [
      { title: 'Congenital Anomalies', items: ['Genetic syndromes', 'Congenital defects'] },
      { title: 'Milestones', items: ['Motor, cognitive, and social milestones'] }
    ]
  },
  General: {
    chapter: 'General Principles',
    pages: '1-93',
    subChapters: [
      { title: 'Biochemistry', items: ['Metabolic pathways', 'Storage diseases'] },
      { title: 'Immunology & Pathology', items: ['Inflammation', 'Wound healing'] }
    ]
  },
  Pharmacology: {
    chapter: 'Pharmacology',
    pages: '184-255',
    subChapters: [
      { title: 'Pharmacokinetics', items: ['Half-life', 'Clearance', 'Volume of distribution'] },
      { title: 'Autonomic Drugs', items: ['Sympathomimetics', 'Parasympatholytics'] }
    ]
  },
  Genetics: {
    chapter: 'General Principles',
    pages: '42-62',
    subChapters: [
      { title: 'Gene Expression', items: ['Transcription', 'Translation', 'Epigenetics'] },
      { title: 'Inheritance Patterns', items: ['Autosomal dominant/recessive', 'X-linked'] }
    ]
  },
  Ophthalmology: {
    chapter: 'Ophthalmology',
    pages: '551-560',
    subChapters: [
      { title: 'Anatomy & Refraction', items: ['Normal eye anatomy', 'Conjunctivitis', 'Refractive errors (Hyperopia, Myopia, Astigmatism)'] },
      { title: 'Lens & Retinal Disorders', items: ['Lens disorders (Cataracts, Presbyopia)', 'Age-related macular degeneration', 'Diabetic retinopathy', 'Retinoblastoma & Uveitis'] },
      { title: 'Glaucoma', items: ['Open-angle glaucoma', 'Closed-angle glaucoma'] },
      { title: 'Pupillary & Visual Fields', items: ['Pupillary control (Miosis, Mydriasis)', 'Pupillary light reflex', 'Horner syndrome', 'Cranial nerve palsies (CN III, IV, VI)', 'Visual field defects', 'Internuclear ophthalmoplegia (INO)'] }
    ]
  },
};

export const PATHOMA_MAP: Record<string, { chapter: string; subChapters: SubChapterNode[] }> = {
  Neurology: {
    chapter: 'Ch. 17 – CNS Pathology',
    subChapters: [
      { title: 'Trauma & Herniations', items: ['Epidural/Subdural hematomas', 'Subarachnoid hemorrhage', 'Tonsillar herniation'] },
      { title: 'Demyelinating & Neurodegenerative', items: ['Multiple Sclerosis', 'Alzheimer Disease', 'Parkinson Disease', 'Amyotrophic Lateral Sclerosis (ALS)'] },
      { title: 'CNS Tumors', items: ['Glioblastoma Multiforme', 'Meningioma', 'Medulloblastoma', 'Pilocytic Astrocytoma'] }
    ]
  },
  Respiratory: {
    chapter: 'Ch. 9 – Respiratory Tract Pathology',
    subChapters: [
      { title: 'Infections & Congenital', items: ['Lobular & Bronchopneumonia', 'Atypical pneumonia', 'Vocal cord nodules'] },
      { title: 'Obstructive & Restrictive', items: ['Chronic Bronchitis & Emphysema', 'Asthma & Bronchiectasis', 'Pneumoconioses', 'Sarcoidosis'] },
      { title: 'Vascular & Tumors', items: ['Pulmonary Embolism', 'Pulmonary Hypertension', 'ARDS', 'Lung Adenocarcinoma & Squamous Cell'] }
    ]
  },
  Gastrointestinal: {
    chapter: 'Ch. 10 – GI Tract, Ch. 11 – Liver/Pancreas',
    subChapters: [
      { title: 'Esophagus & Stomach', items: ['Tracheoesophageal fistula', 'Esophageal varices & Barrett Esophagus', 'Chronic Gastritis & Peptic Ulcers'] },
      { title: 'Bowel Pathology', items: ['Celiac Disease', 'Crohn Disease & Ulcerative Colitis (IBD)', 'Colon Polyps & Adenocarcinoma'] },
      { title: 'Hepatobiliary & Pancreas', items: ['Viral Hepatitis', 'Cirrhosis', 'Cholecystitis', 'Acute/Chronic Pancreatitis'] }
    ]
  },
  Cardiovascular: {
    chapter: 'Ch. 7 – Vascular, Ch. 8 – Cardiac Pathology',
    subChapters: [
      { title: 'Atherosclerosis & Vasculitis', items: ['Arteriosclerosis types', 'Giant Cell & Takayasu Arteritis', 'Kawasaki & Polyarteritis Nodosa'] },
      { title: 'Ischemic & Congenital Defect', items: ['Angina pectoris & Myocardial Infarction', 'VSD, ASD & Patent Ductus Arteriosus'] },
      { title: 'Valvular & Cardiomyopathy', items: ['Rheumatic Fever & Endocarditis', 'Dilated, Hypertrophic & Restrictive Cardiomyopathies', 'Myxoma'] }
    ]
  },
  'Hematology & Oncology': {
    chapter: 'Ch. 3 – Neoplasia, Ch. 4-6 – Blood Disorders',
    subChapters: [
      { title: 'Microcytic & Macrocytic Anemias', items: ['Iron Deficiency & Thalassemia', 'Sideroblastic anemia', 'Folate & Vitamin B12 deficiency'] },
      { title: 'Normocytic Anemias', items: ['Hereditary Spherocytosis', 'Sickle Cell Anemia', 'G6PD Deficiency'] },
      { title: 'Leukemias & Lymphomas', items: ['Acute Leukemias (ALL, AML)', 'Chronic Leukemias (CLL, CML)', 'Hodgkin & Non-Hodgkin Lymphoma', 'Multiple Myeloma'] },
      { title: 'Hemostasis & Coagulation', items: ['ITP & TTP/HUS', 'Bernard-Soulier & Glanzmann', 'Hemophilia A/B', 'DIC'] }
    ]
  },
  Immunology: {
    chapter: 'Ch. 2 – Inflammation & Wound Healing',
    subChapters: [
      { title: 'Acute Inflammation', items: ['Vascular events (vasodilation, permeability)', 'Cellular events (margination, rolling, adhesion)', 'Chemical mediators'] },
      { title: 'Chronic Inflammation', items: ['Granulomatous inflammation', 'Giant cells & epithelioid histiocytes'] },
      { title: 'Autoimmune Disorders', items: ['Systemic Lupus Erythematosus (SLE)', 'Sjögren Syndrome', 'Systemic Sclerosis (Scleroderma)', 'Mixed Connective Tissue Disease (MCTD)'] },
      { title: 'Primary Immunodeficiencies', items: ['DiGeorge Syndrome (22q11 deletion)', 'Severe Combined Immunodeficiency (SCID)', 'Bruton X-linked Agammaglobulinemia'] },
      { title: 'Wound Healing & Amyloidosis', items: ['Primary & Secondary intention healing', 'AL vs AA Amyloidosis'] }
    ]
  },
  'Infectious Disease': {
    chapter: '(covered across all organ system chapters)',
    subChapters: [
      { title: 'Infectious Pathogens', items: ['Bacterial infections', 'Viral pathogenesis', 'Fungal opportunistic infections'] }
    ]
  },
  Endocrine: {
    chapter: 'Ch. 15 – Endocrine Pathology',
    subChapters: [
      { title: 'Pituitary Gland', items: ['Pituitary Adenoma', 'Sheehan Syndrome', 'Diabetes Insipidus'] },
      { title: 'Thyroid Gland', items: ['Graves Disease', 'Hashimoto Thyroiditis', 'Thyroid Goiter & Adenoma/Carcinoma'] },
      { title: 'Adrenal & Endocrine Pancreas', items: ['Cushing Syndrome', 'Conn Syndrome', 'Congenital Adrenal Hyperplasia', 'Diabetes Mellitus Types 1/2'] }
    ]
  },
  Integumentary: {
    chapter: 'Ch. 19 – Skin Pathology',
    subChapters: [
      { title: 'Inflammatory Dermatoses', items: ['Eczema & Contact Dermatitis', 'Psoriasis & Lichen Planus'] },
      { title: 'Vesiculobullous Diseases', items: ['Pemphigus Vulgaris (IgG vs desmoglein)', 'Bullous Pemphigoid (IgG vs hemidesmosomes)', 'Dermatitis Herpetiformis'] },
      { title: 'Skin Neoplasms', items: ['Seborrheic keratosis', 'Basal & Squamous Cell Carcinomas', 'Melanoma'] }
    ]
  },
  Renal: {
    chapter: 'Ch. 12 – Kidney & Urinary Tract',
    subChapters: [
      { title: 'Congenital & Acute Injury', items: ['Polycystic Kidney Disease', 'Acute Tubular Necrosis (ATN)', 'Acute Interstitial Nephritis (AIN)'] },
      { title: 'Nephrotic & Nephritic', items: ['Minimal Change & FSGS', 'Membranous Nephropathy', 'PSGN & IgA Nephropathy', 'Alport Syndrome'] },
      { title: 'Renal Neoplasia', items: ['Renal Cell Carcinoma', 'Wilms Tumor', 'Urothelial Carcinoma'] }
    ]
  },
  Reproductive: {
    chapter: 'Ch. 13 – Female Genital, Ch. 14 – Male Genital',
    subChapters: [
      { title: 'Female Pathology', items: ['Cervical intraepithelial neoplasia (CIN)', 'Endometrial Hyperplasia & Carcinoma', 'Ovarian Epithelial & Germ Cell Tumors'] },
      { title: 'Male Pathology', items: ['Benign Prostatic Hyperplasia (BPH)', 'Prostatic Adenocarcinoma', 'Seminoma & Yolk Sac Tumors'] },
      { title: 'Gestational Pathology', items: ['Hydatidiform Mole (Complete vs Partial)', 'Choriocarcinoma', 'Preeclampsia & Eclampsia'] }
    ]
  },
  Musculoskeletal: {
    chapter: 'Ch. 18 – Musculoskeletal Pathology',
    subChapters: [
      { title: 'Skeletal Diseases', items: ['Achondroplasia & Osteopetrosis', 'Osteomalacia & Rickets', 'Osteoporosis & Osteitis Fibrosa Cystica'] },
      { title: 'Joint & Skeletal Muscle', items: ['Osteoarthritis & Rheumatoid Arthritis', 'Gout & Pseudogout', 'Duchenne & Becker Muscular Dystrophy'] },
      { title: 'Soft Tissue Tumors', items: ['Lipoma & Liposarcoma', 'Rhabdomyoma & Rhabdomyosarcoma'] }
    ]
  },
  Psychiatry: {
    chapter: '(covered in FA Psychiatry, not Pathoma)',
    subChapters: []
  },
  Pediatrics: {
    chapter: '(covered across relevant organ chapters)',
    subChapters: []
  },
  Genetics: {
    chapter: 'Ch. 3 – Neoplasia (genetic aspects)',
    subChapters: [
      { title: 'Oncogenes & Suppressors', items: ['Ras, Myc, Her2 oncogenes', 'Rb & p53 tumor suppressors'] },
      { title: 'Apoptosis Regulations', items: ['Bcl-2 & Bax mechanisms'] }
    ]
  },
  General: {
    chapter: 'Ch. 1 – Cell Injury & Death, Ch. 2 – Inflammation',
    subChapters: [
      { title: 'Reversible & Irreversible', items: ['Cellular swelling & membrane damage', 'Mitochondrial dysfunction'] },
      { title: 'Apoptosis & Necrosis', items: ['Coagulative, Liquefactive, Caseous necrosis', 'Intrinsic & Extrinsic apoptosis pathways'] },
      { title: 'Free Radical Injury', items: ['Superoxide & Hydroxyl radical damage', 'pathologic calcification'] }
    ]
  },
  Ophthalmology: {
    chapter: '(covered across multiple pathology chapters)',
    subChapters: [
      { title: 'Neoplasia & Endocrine', items: ['Retinoblastoma (Ch. 3 - p. 26-27)', 'Diabetic Retinopathy & Cataracts (Ch. 15 - p. 168)'] },
      { title: 'Inflammatory & Extraintestinal', items: ['Extraintestinal manifestations of IBD (Ch. 10 - p. 110)', 'HLA-B27 Seronegative Spondyloarthropathies (Ch. 18 - p. 201)', 'Reactive Arthritis / Reiter Syndrome (Ch. 18 - p. 201)'] },
      { title: 'Neurological Connections', items: ['Pancoast tumor compression / Horner syndrome (Ch. 9 - p. 98)', 'Syringomyelia / Horner syndrome (Ch. 17 - p. 182)'] }
    ]
  },
};

const SYSTEM_PHYSIOLOGY_ORDER: string[] = [
  'Genetics',
  'Cardiovascular',
  'Respiratory',
  'Renal',
  'Gastrointestinal',
  'Endocrine',
  'Neurology',
  'Musculoskeletal',
  'Reproductive',
  'Hematology & Oncology',
  'Integumentary',
  'Immunology',
  'Pharmacology',
  'Infectious Disease',
  'Psychiatry',
  'Pediatrics',
];

function normalizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePrerequisites(prereqTexts: string[], _system: string): string[] {
  const ids: string[] = [];

  for (const text of prereqTexts) {
    const lower = text.toLowerCase();

    if (lower.includes('coagulation cascade') || lower.includes('hemostasis')) {
      ids.push('principle-coagulation-cascade');
    } else if (lower.includes('renin') || lower.includes('raas')) {
      ids.push('principle-raas');
    } else if (lower.includes('sympathetic') || lower.includes('adrenergic') || lower.includes('autonomic')) {
      ids.push('principle-autonomic-nervous-system');
    } else if (lower.includes('parasympathetic') || lower.includes('cholinergic')) {
      ids.push('principle-autonomic-nervous-system');
    } else if (lower.includes('hypersensitivity type')) {
      ids.push('principle-hypersensitivity');
    } else if (lower.includes('vitamin d') || lower.includes('calcium')) {
      ids.push('principle-calcium-phosphate-homeostasis');
    } else if (lower.includes('gnrh') || lower.includes('lh') || lower.includes('fsh') || lower.includes('hypothalamic-pituitary')) {
      ids.push('principle-hypothalamic-pituitary-axis');
    } else if (lower.includes('action potential') || lower.includes('depolarization')) {
      ids.push('principle-action-potential');
    } else if (lower.includes('virchow triad') || lower.includes('thrombo')) {
      ids.push('principle-thrombosis');
    } else if (lower.includes('glomerular') || lower.includes('gfr') || lower.includes('tubular')) {
      ids.push('principle-renal-physiology');
    } else if (lower.includes('ventilation') || lower.includes('perfusion') || lower.includes('gas exchange')) {
      ids.push('principle-respiratory-physiology');
    } else if (lower.includes('cardiac output') || lower.includes('starling') || lower.includes('cardiac cycle')) {
      ids.push('principle-cardiovascular-physiology');
    } else if (lower.includes('acid-base') || lower.includes('acid base')) {
      ids.push('principle-acid-base');
    } else if (lower.includes('inflammation') || lower.includes('cytokine')) {
      ids.push('principle-inflammation');
    } else if (lower.includes('complement')) {
      ids.push('principle-complement-system');
    } else if (lower.includes('immunoglobulin') || lower.includes('antibody')) {
      ids.push('principle-immunoglobulins');
    } else if (lower.includes('cell cycle') || lower.includes('apoptosis') || lower.includes('necrosis')) {
      ids.push('principle-cell-injury-death');
    } else if (lower.includes('phrenic nerve') || lower.includes('innervation')) {
      ids.push('principle-nerve-innervation');
    } else if (lower.includes('sensitivity') || lower.includes('specificity') || lower.includes('ppv') || lower.includes('npv')) {
      ids.push('principle-diagnostic-testing');
    } else if (lower.includes('case-control') || lower.includes('cohort') || lower.includes('study design')) {
      ids.push('principle-study-design');
    } else if (lower.includes('opioid') || lower.includes('mu receptor')) {
      ids.push('principle-opioid-pharmacology');
    } else if (lower.includes('pupillary') || lower.includes('pupil')) {
      ids.push('principle-pupillary-reflex');
    } else {
      ids.push(`concept-${normalizeId(text).slice(0, 60)}`);
    }
  }

  return [...new Set(ids)];
}

export function analyzeQuestions(): {
  graph: DependencyGraph;
  topicMap: Map<string, TopicNode>;
  allNodes: TopicNode[];
  frequencyStats: {
    diseases: { name: string; count: number }[];
    systems: { name: string; count: number }[];
    subjects: { name: string; count: number }[];
    topicTypes: { name: string; count: number }[];
    totalQuestions: number;
    totalTopics: number;
    dependencyDepth: number;
  };
  systemDiseaseMap: Record<string, DiseaseEntry[]>;
} {
  const questionHashes = new Set<string>();
  const topicMap = new Map<string, TopicNode>();
  const systemCount: Record<string, number> = {};
  const subjectCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};

  const nodes: TopicNode[] = [];
  const edges: { from: string; to: string }[] = [];

  function addNode(node: TopicNode) {
    if (!topicMap.has(node.id)) {
      node.systems = node.system ? [node.system] : [];
      node.subjects = node.subject ? [node.subject] : [];
      topicMap.set(node.id, node);
      nodes.push(node);
    } else {
      const existing = topicMap.get(node.id)!;
      existing.questionCount += node.questionCount;
      existing.questionIds.push(...node.questionIds);
      existing.highLeverageClues.push(...node.highLeverageClues);
      existing.discriminators.push(...node.discriminators);
      if (!existing.systems) {
        existing.systems = existing.system ? [existing.system] : [];
      }
      if (node.system && !existing.systems.includes(node.system)) {
        existing.systems.push(node.system);
      }
      if (!existing.subjects) {
        existing.subjects = existing.subject ? [existing.subject] : [];
      }
      if (node.subject && !existing.subjects.includes(node.subject)) {
        existing.subjects.push(node.subject);
      }
      if (node.subject && !existing.subject) {
        existing.subject = node.subject;
        existing.system = node.system;
      }
    }
  }

  // Load classified questions for subject/system frequency
  const classifiedPath = path.resolve(process.cwd(), 'data/classified-questions.jsonl');
  if (fs.existsSync(classifiedPath)) {
    const lines = fs.readFileSync(classifiedPath, 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const q = JSON.parse(line);
        const h = q.textHash;
        if (h) questionHashes.add(h);
        if (q.subject) subjectCount[q.subject] = (subjectCount[q.subject] || 0) + 1;
        if (q.system) systemCount[q.system] = (systemCount[q.system] || 0) + 1;
      } catch { /* skip malformed lines */ }
    }
  }

  // Load enriched questions for topic extraction
  const enrichedPath = path.resolve(process.cwd(), 'data/medicospira-enriched.jsonl');
  if (fs.existsSync(enrichedPath)) {
    const lines = fs.readFileSync(enrichedPath, 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        const e: EnrichedData = raw.enriched;
        const h = raw.textHash || e.questionText?.slice(0, 64);
        if (!e || !e.diseaseName) continue;

        const topicType: TopicType = e.topicType || 'DISEASE';
        const diseaseId = `disease-${normalizeId(e.diseaseName)}`;
        const subject = e.subject || '';
        const system = e.system || '';

        typeCount[topicType] = (typeCount[topicType] || 0) + 1;

        const prereqIds = parsePrerequisites(e.prerequisites || [], system);

        const node: TopicNode = {
          id: diseaseId,
          name: e.diseaseName,
          type: topicType,
          subject,
          system,
          questionCount: 1,
          prerequisites: prereqIds,
          dependsOn: prereqIds,
          questionIds: [h],
          discriminators: (e.discriminators || []).map(d => d.distractor),
          highLeverageClues: e.highLeverageClues || [],
        };

        addNode(node);

        for (const prereqId of prereqIds) {
          edges.push({ from: prereqId, to: diseaseId });
          if (!topicMap.has(prereqId)) {
            const conceptNode: TopicNode = {
              id: prereqId,
              name: prereqId.replace(/^principle-|^concept-/, '').replace(/-/g, ' '),
              type: 'PRINCIPLE',
              subject: 'Physiology',
              system,
              questionCount: 0,
              prerequisites: [],
              dependsOn: [],
              questionIds: [],
              discriminators: [],
              highLeverageClues: [],
            };
            addNode(conceptNode);
          }
        }
      } catch { /* skip */ }
    }
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
    if (!adj.has(node.id)) adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    if (!inDegree.has(edge.from)) inDegree.set(edge.from, 0);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let maxDepth = 0;
  const depth = new Map<string, number>();
  for (const id of queue) depth.set(id, 0);

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topologicalOrder.push(current);
    const currentDepth = depth.get(current) || 0;
    maxDepth = Math.max(maxDepth, currentDepth);

    for (const neighbor of adj.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      depth.set(neighbor, Math.max(depth.get(neighbor) || 0, currentDepth + 1));
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // Sort nodes for display: by dependency depth, then by question count
  const sortedNodes = [...nodes].sort((a, b) => {
    const aDepth = depth.get(a.id) || 0;
    const bDepth = depth.get(b.id) || 0;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return b.questionCount - a.questionCount;
  });

  const rootNodes = topologicalOrder.filter(id => (depth.get(id) || 0) === 0);
  const leafNodes = topologicalOrder.filter(id => !adj.has(id) || adj.get(id)!.length === 0);

  const graph: DependencyGraph = {
    nodes: sortedNodes,
    edges,
    topologicalOrder,
    rootNodes,
    leafNodes,
  };

  const frequencyStats = {
    diseases: Object.entries(
      sortedNodes
        .filter(n => n.type === 'DISEASE')
        .reduce((acc, n) => {
          acc[n.name] = (acc[n.name] || 0) + n.questionCount;
          return acc;
        }, {} as Record<string, number>)
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    systems: Object.entries(systemCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    subjects: Object.entries(subjectCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    topicTypes: Object.entries(typeCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    totalQuestions: questionHashes.size,
    totalTopics: nodes.length,
    dependencyDepth: maxDepth,
  };

  return { graph, topicMap, allNodes: nodes, frequencyStats, systemDiseaseMap: getSystemDiseaseMap() };
}

export interface DiseaseEntry {
  diseaseName: string;
  questionCount: number;
  topicType: string;
  subject: string;
  mechanism: string;
}

export function getSystemDiseaseMap(): Record<string, DiseaseEntry[]> {
  const map: Record<string, DiseaseEntry[]> = {};

  const enrichedPath = path.resolve(process.cwd(), 'data/medicospira-enriched.jsonl');
  if (!fs.existsSync(enrichedPath)) return map;

  const lines = fs.readFileSync(enrichedPath, 'utf-8').trim().split('\n');
  for (const line of lines) {
    try {
      const raw = JSON.parse(line);
      const e = raw.enriched;
      if (!e || !e.diseaseName || e.diseaseName === 'Unknown') continue;

      const system = e.system || 'General';
      const disease = e.diseaseName;
      const topicType = e.topicType || 'DISEASE';

      if (!map[system]) map[system] = [];

      const existing = map[system].find(d => d.diseaseName === disease);
      if (existing) {
        existing.questionCount++;
      } else {
        map[system].push({
          diseaseName: disease,
          questionCount: 1,
          topicType,
          subject: e.subject || '',
          mechanism: e.mechanism?.split(',')[0]?.trim() || '',
        });
      }
    } catch { /* skip */ }
  }

  // Sort diseases within each system by frequency (descending)
  for (const sys of Object.keys(map)) {
    map[sys].sort((a, b) => b.questionCount - a.questionCount);
  }

  return map;
}
