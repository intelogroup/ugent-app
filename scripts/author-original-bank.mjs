// Author original USMLE questions from First Aid / Pathoma topic lists.
// Usage: node scripts/author-original-bank.mjs --system Cardiovascular [--count 100] [--supabase]
//
// Pipeline: LLM authors a question from scratch → blind answer-verify → if
// mismatch retry up to 3 times → textHash dedupe → write JSONL → optional
// upsert to Supabase `questions` table with source='original'.
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ── Config ──
const SYSTEM = process.argv.includes('--system')
  ? process.argv[process.argv.indexOf('--system') + 1]
  : 'Cardiovascular';

const TARGET_COUNT = (() => {
  const idx = process.argv.indexOf('--count');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 100;
})();

const SHOULD_UPSERT = process.argv.includes('--supabase');
const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'authored-questions.jsonl');

// ── Topic lists (from lib/curriculum/analyzer.ts FIRST_AID_MAP + PATHOMA_MAP) ──
const SYSTEM_TOPICS = {
  Cardiovascular: [
    'Heart development and looping',
    'Fetal circulation and shunt closure (ductus arteriosus, foramen ovale, ductus venosus)',
    'Coronary artery anatomy and dominance patterns',
    'Cardiac cycle, pressure-volume loops, and Wiggers diagram',
    'EKG interpretation and arrhythmia mechanisms',
    'Hemodynamics: cardiac output, stroke volume, total peripheral resistance, mean arterial pressure',
    'Starling forces and capillary fluid exchange',
    'Atrial septal defect (ASD)',
    'Ventricular septal defect (VSD)',
    'Patent ductus arteriosus',
    'Tetralogy of Fallot',
    'Transposition of the great vessels',
    'Coarctation of the aorta',
    'Stable angina: pathophysiology and diagnosis',
    'Unstable angina and NSTEMI',
    'STEMI: ECG localization and management',
    'Myocardial infarction complications (papillary muscle rupture, free wall rupture, ventricular septal rupture, Dressler syndrome)',
    'Systolic vs diastolic heart failure',
    'Cardiogenic shock',
    'Essential hypertension and hypertensive emergency',
    'Atherosclerosis pathogenesis',
    'Aortic dissection (Stanford A vs B)',
    'Aortic aneurysm (thoracic vs abdominal)',
    'Atrial fibrillation: mechanism, complications, and management',
    'AV blocks (first, second Mobitz I/II, third degree)',
    'Ventricular tachycardia and ventricular fibrillation',
    'Wolff-Parkinson-White syndrome',
    'Mitral regurgitation',
    'Mitral stenosis',
    'Aortic regurgitation',
    'Aortic stenosis',
    'Mitral valve prolapse',
    'Dilated cardiomyopathy',
    'Hypertrophic cardiomyopathy',
    'Restrictive cardiomyopathy',
    'Infective endocarditis (acute vs subacute)',
    'Acute pericarditis',
    'Cardiac tamponade',
    'Constrictive pericarditis',
    'Rheumatic fever and rheumatic heart disease',
    'Myocarditis',
    'Giant cell arteritis',
    'Takayasu arteritis',
    'Polyarteritis nodosa',
    'Kawasaki disease',
    'Granulomatosis with polyangiitis (Wegener)',
    'ACE inhibitors and ARBs: mechanism and side effects',
    'Beta-blockers: cardioselectivity and indications',
    'Calcium channel blockers: dihydropyridine vs non-dihydropyridine',
    'Antiarrhythmic drugs: class I-IV mechanisms and uses',
    'Statins: mechanism, side effects, and monitoring',
    'Digoxin: mechanism, toxicity, and ECG findings',
    'Nitrates in angina management',
    'Diuretics in heart failure management',
  ],
  Respiratory: [
    'Lung development phases (Pseudoglandular, Canalicular, Saccular, Alveolar)',
    'Bronchial tree structure and histology',
    'Lung volumes and capacities (TLC, VC, RV, FRC, TV)',
    'Oxygen-hemoglobin dissociation curve shifts (left vs right)',
    'V/Q mismatches, shunt vs dead space',
    'COPD (chronic bronchitis vs emphysema)',
    'Asthma: pathophysiology, types, and management',
    'Bronchiectasis',
    'Idiopathic pulmonary fibrosis (IPF)',
    'Pneumoconioses (silicosis, asbestosis, coal workers)',
    'Sarcoidosis',
    'Lobar pneumonia vs bronchopneumonia',
    'Atypical pneumonia (Mycoplasma, Legionella, Chlamydia)',
    'Lung abscess',
    'Tuberculosis: primary vs reactivation',
    'Pulmonary embolism: risk factors, diagnosis, management',
    'Pulmonary hypertension',
    'Pneumothorax (spontaneous vs tension)',
    'Pleural effusions (transudate vs exudate)',
    'Lung adenocarcinoma',
    'Squamous cell carcinoma of the lung',
    'Small cell lung cancer',
    'Asthma controllers (steroids, leukotriene inhibitors)',
    'Bronchodilators (beta-2 agonists, muscarinic antagonists)',
    'ARDS: pathophysiology and management',
  ],
  Gastrointestinal: [
    'Peritoneum and retroperitoneal structures',
    'GI blood supply (Celiac, SMA, IMA) and portosystemic anastomoses',
    'Hernia types (direct vs indirect inguinal, femoral)',
    'GI secretory hormones (Gastrin, CCK, Secretin, Somatostatin)',
    'Bilirubin metabolism and jaundice etiologies',
    'Digestion and absorption of macronutrients',
    'Achalasia',
    'GERD and Barrett esophagus',
    'Mallory-Weiss tear',
    'Acute and chronic gastritis',
    'Peptic ulcer disease (gastric vs duodenal)',
    'Gastric cancer',
    'Crohn disease vs ulcerative colitis (IBD)',
    'Celiac disease',
    'Irritable bowel syndrome',
    'Appendicitis',
    'Diverticulosis and diverticulitis',
    'Colon polyps and colorectal cancer',
    'Angiodysplasia',
    'Cirrhosis and portal hypertension',
    'Viral hepatitis (A, B, C, D, E)',
    'Alcoholic liver disease',
    'Non-alcoholic fatty liver disease (NAFLD)',
    'Cholelithiasis and cholecystitis',
    'H2 receptor blockers and proton pump inhibitors',
    'Antiemetic agents (Ondansetron, Metoclopramide)',
    'Acute and chronic pancreatitis',
  ],
  Neurology: [
    'Neural tube development and defects (Anencephaly, Spina Bifida)',
    'Ventricles, CSF flow, and hydrocephalus (normal pressure, non-communicating, communicating)',
    'Spinal cord tracts and cortical homunculus',
    'Action potentials and myelination',
    'Synaptic transmission and neurotransmitter changes in disease',
    'Ischemic stroke: pathophysiology and management',
    'Epidural vs subdural hematomas',
    'Subarachnoid hemorrhage',
    'Wallenberg syndrome (lateral medullary syndrome)',
    'Alzheimer disease: pathophysiology and diagnosis',
    'Lewy body dementia',
    'Frontotemporal dementia',
    'Vascular dementia',
    'Parkinson disease',
    'Huntington disease',
    'Multiple sclerosis',
    'Guillain-Barre syndrome',
    'Amyotrophic lateral sclerosis (ALS)',
    'Myasthenia gravis',
    'Seizure disorders and epilepsy',
    'Status epilepticus',
    'Glioblastoma multiforme',
    'Meningioma',
    'Schwannoma',
    'Medulloblastoma and pilocytic astrocytoma',
    'Visual pathway lesions',
    'Anesthetics (local and inhaled)',
    'Antiepileptics (Phenytoin, Valproate, Carbamazepine)',
    'Parkinson therapeutics (Levodopa/Carbidopa, dopamine agonists)',
  ],
  Renal: [
    'Kidney development (Pronephros, Mesonephros, Metanephros)',
    'Nephron structure and glomerular filtration barrier',
    'GFR, RPF, and renal clearance',
    'Electrolyte and water handling along the nephron',
    'Acid-base physiology and compensation',
    'Post-streptococcal glomerulonephritis (PSGN)',
    'IgA nephropathy (Berger disease)',
    'Alport syndrome',
    'Rapidly progressive glomerulonephritis (RPGN)',
    'Membranoproliferative glomerulonephritis',
    'Minimal change disease',
    'Focal segmental glomerulosclerosis (FSGS)',
    'Membranous nephropathy',
    'Amyloidosis: renal involvement',
    'Diabetic nephropathy',
    'Prerenal, intrinsic, and postrenal acute kidney injury',
    'Acute tubular necrosis (ATN)',
    'Acute interstitial nephritis',
    'Calcium oxalate kidney stones',
    'Ammonium magnesium phosphate (struvite) stones',
    'Uric acid stones',
    'Cystine stones',
    'Renal cell carcinoma',
    'Wilms tumor (nephroblastoma)',
    'Loop diuretics',
    'Thiazide diuretics',
    'Potassium-sparing diuretics',
    'Carbonic anhydrase inhibitors',
  ],
  Endocrine: [
    'Thyroid and adrenal gland anatomy',
    'Hypothalamic-pituitary axes',
    'Hormone feedback systems and receptor types',
    'Prolactinoma',
    'Acromegaly',
    'Diabetes insipidus (central vs nephrogenic)',
    'SIADH',
    'Hashimoto thyroiditis',
    'De Quervain (subacute) thyroiditis',
    'Graves disease',
    'Thyroid goiter and nodular disease',
    'Papillary thyroid carcinoma',
    'Follicular thyroid carcinoma',
    'Medullary thyroid carcinoma',
    'Cushing syndrome',
    'Conn syndrome (primary hyperaldosteronism)',
    'Addison disease (primary adrenal insufficiency)',
    'Congenital adrenal hyperplasia',
    'Diabetes mellitus type 1',
    'Diabetes mellitus type 2',
    'Diabetic ketoacidosis (DKA)',
    'Hyperosmolar hyperglycemic state (HHS)',
    'Multiple endocrine neoplasia (MEN 1, 2A, 2B)',
    'Insulin regimens and oral hypoglycemics',
    'Thyroid replacement and antithyroid drugs',
  ],
  'Hematology & Oncology': [
    'Hematopoiesis and RBC lineage',
    'Coagulation cascade (intrinsic, extrinsic, common pathways)',
    'Iron deficiency anemia',
    'Thalassemia (alpha and beta)',
    'Sideroblastic anemia',
    'Folate and vitamin B12 deficiency (megaloblastic anemia)',
    'Hereditary spherocytosis',
    'Sickle cell anemia',
    'G6PD deficiency',
    'Paroxysmal nocturnal hemoglobinuria',
    'von Willebrand disease',
    'Hemophilia A and B',
    'Immune thrombocytopenia (ITP)',
    'Thrombotic thrombocytopenic purpura (TTP)',
    'Disseminated intravascular coagulation (DIC)',
    'Acute lymphoblastic leukemia (ALL)',
    'Acute myeloid leukemia (AML)',
    'Chronic lymphocytic leukemia (CLL)',
    'Chronic myeloid leukemia (CML)',
    'Hodgkin lymphoma',
    'Non-Hodgkin lymphoma',
    'Multiple myeloma',
    'MGUS (monoclonal gammopathy of undetermined significance)',
    'Chemotherapeutic agents (alkylating, antimetabolites, microtubule inhibitors)',
    'Heparin (unfractionated and LMWH)',
    'Warfarin: mechanism and monitoring',
    'Direct oral anticoagulants (DOACs)',
  ],
  Immunology: [
    'T-cell and B-cell development',
    'Antigen presentation (MHC I and II)',
    'Cytokine signaling and functions',
    'Lymph node histology',
    'Types I-IV Hypersensitivities',
    'Transplant rejection mechanisms',
    'Systemic lupus erythematosus (SLE)',
    'Sjogren syndrome',
    'Scleroderma (systemic sclerosis)',
    'X-linked agammaglobulinemia',
    'DiGeorge syndrome',
    'Severe combined immunodeficiency (SCID)',
    'Wiskott-Aldrich syndrome',
    'Phagocyte dysfunctions',
  ],
  'Infectious Disease': [
    'Gram-positive bacteria (Staphylococcus, Streptococcus, Clostridium)',
    'Gram-negative bacteria (Neisseria, Pseudomonas, Enterics)',
    'Mycobacteria (TB, leprosy)',
    'Spirochetes (Treponema, Borrelia)',
    'DNA viruses (HSV, VZV, CMV, EBV)',
    'RNA viruses (HIV, Influenza, Hepatitis)',
    'Systemic mycoses (Histoplasma, Blastomyces, Coccidioides)',
    'Opportunistic fungi (Candida, Aspergillus, Cryptococcus)',
    'Protozoa and helminths',
    'Penicillins and cephalosporins',
    'Macrolides and aminoglycosides',
    'Antivirals (acyclovir, HAART)',
    'Antifungals (amphotericin B, azoles)',
  ],
  Integumentary: [
    'Epidermal layers and skin histology',
    'Atopic dermatitis',
    'Psoriasis',
    'Seborrheic dermatitis',
    'Contact dermatitis',
    'Pemphigus vulgaris',
    'Bullous pemphigoid',
    'Dermatitis herpetiformis',
    'Impetigo and cellulitis',
    'Erysipelas and necrotizing fasciitis',
    'Viral skin infections (HSV, VZV, Molluscum, HPV)',
    'Basal cell carcinoma',
    'Squamous cell carcinoma',
    'Melanoma',
  ],
  Reproductive: [
    'Sex determination and duct differentiation',
    'Menstrual cycle and hormonal changes',
    'Fibrocystic breast changes and fibroadenoma',
    'DCIS and invasive ductal/lobular breast carcinoma',
    'Polycystic ovary syndrome (PCOS)',
    'Ovarian teratoma',
    'Ovarian serous and mucinous cystadenocarcinoma',
    'Granulosa cell tumor',
    'Endometrial hyperplasia and carcinoma',
    'Leiomyomas (uterine fibroids)',
    'Cervical dysplasia and cervical cancer',
    'Endometriosis and adenomyosis',
    'Benign prostatic hyperplasia (BPH)',
    'Prostate adenocarcinoma',
    'Testicular tumors (seminoma, yolk sac, choriocarcinoma)',
    'Hydatidiform mole (complete vs partial)',
    'Preeclampsia and eclampsia',
    'SERMs (tamoxifen, raloxifene)',
  ],
  Musculoskeletal: [
    'Osteoblast and osteoclast signaling (RANKL/OPG)',
    'Endochondral bone formation',
    'Osteoporosis',
    'Osteopetrosis',
    'Paget disease of bone',
    'Osteosarcoma',
    'Ewing sarcoma',
    'Osteoarthritis',
    'Rheumatoid arthritis',
    'Gout and pseudogout',
    'Ankylosing spondylitis',
    'Duchenne and Becker muscular dystrophy',
    'Myasthenia gravis and Lambert-Eaton',
  ],
  Psychiatry: [
    'ADHD',
    'Autism spectrum disorder',
    'Major depressive disorder',
    'Bipolar disorder (I and II)',
    'Schizophrenia',
    'Generalized anxiety disorder',
    'OCD and PTSD',
    'Cluster A personality disorders (paranoid, schizoid, schizotypal)',
    'Cluster B personality disorders (borderline, antisocial, histrionic, narcissistic)',
    'Cluster C personality disorders (avoidant, dependent, obsessive-compulsive)',
    'Alcohol use disorder',
    'Opioid use disorder',
    'SSRIs and SNRIs',
    'TCAs and MAOIs',
    'Typical vs atypical antipsychotics',
    'Lithium and valproate',
  ],
  Pediatrics: [
    'Down syndrome (Trisomy 21)',
    'Edwards syndrome (Trisomy 18)',
    'Patau syndrome (Trisomy 13)',
    'Turner syndrome (45,XO)',
    'Klinefelter syndrome (47,XXY)',
    'Congenital heart defects (VSD, ASD, PDA, Tetralogy of Fallot)',
    'Gross motor milestones',
    'Fine motor milestones',
    'Language milestones',
    'Social milestones',
  ],
  General: [
    'Glycolysis, Krebs cycle, and gluconeogenesis',
    'Lysosomal storage diseases (Gaucher, Tay-Sachs, Niemann-Pick)',
    'Glycogen storage diseases (von Gierke, Pompe, McArdle)',
    'Nucleotide synthesis and repair',
    'Acute inflammation: vascular and cellular events',
    'Chronic inflammation and granulomatous disease',
    'Wound healing and tissue repair',
    'Cell injury: reversible vs irreversible',
    'Apoptosis and necrosis pathways',
    'Free radical injury',
  ],
  Pharmacology: [
    'Pharmacokinetics: half-life, clearance, volume of distribution',
    'Sympathomimetics and sympatholytics',
    'Parasympathomimetics and parasympatholytics',
    'Cholinergic agonists and antagonists',
    'Adrenergic agonists and antagonists',
    'Drug metabolism: phase I and II reactions',
    'Bioavailability and first-pass metabolism',
  ],
  Genetics: [
    'Transcription and translation regulation',
    'Epigenetic modifications (methylation, acetylation)',
    'Autosomal dominant inheritance',
    'Autosomal recessive inheritance',
    'X-linked dominant and recessive inheritance',
    'Mitochondrial inheritance',
    'Cystic fibrosis',
    'Huntington disease',
    'Fragile X syndrome',
    'Prader-Willi and Angelman syndromes',
    'Marfan syndrome',
    'Xeroderma pigmentosum',
    'Friedreich ataxia',
    'Homocystinuria',
    'Oncogenes (Ras, Myc, Her2)',
    'Tumor suppressors (Rb, p53)',
  ],
  Ophthalmology: [
    'Conjunctivitis',
    'Cataracts (acquired and congenital)',
    'Open-angle glaucoma',
    'Closed-angle glaucoma',
    'Age-related macular degeneration',
    'Diabetic retinopathy',
    'Hypertensive retinopathy',
    'Retinal artery and vein occlusion',
    'Retinal detachment',
    'Retinoblastoma',
    'Horner syndrome',
    'Cranial nerve palsies (CN III, IV, VI)',
    'Visual field defects',
    'Internuclear ophthalmoplegia',
    'Optic neuritis and papilledema',
  ],
  ENT: [
    'Weber and Rinne hearing tests',
    'Conductive vs sensorineural hearing loss',
    'Menière disease',
    'Otitis externa and media',
    'Cleft lip and palate',
  ],
  'Biostatistics & Epidemiology': [
    'Case-control studies',
    'Cohort studies',
    'Randomized controlled trials and meta-analysis',
    'Sensitivity and specificity',
    'Positive and negative predictive value (PPV, NPV)',
    'Likelihood ratios',
    'Relative risk (RR) and odds ratio (OR)',
    'Absolute risk reduction (ARR) and number needed to treat (NNT)',
    'Bias types (selection, measurement, confounding)',
    'P-values and statistical hypothesis testing',
  ],
  'Social Sciences': [
    'Informed consent and decision-making capacity',
    'Confidentiality and mandatory reporting',
    'Advance directives and surrogate decision makers',
    'Healthcare delivery and medical errors',
    'Quality improvement (PDSA, root cause analysis)',
    'Patient safety metrics',
  ],
};

const topics = SYSTEM_TOPICS[SYSTEM];
if (!topics) {
  console.error(`Unknown system: ${SYSTEM}. Available: ${Object.keys(SYSTEM_TOPICS).join(', ')}`);
  process.exit(1);
}

// ── LLM cascade (deepseek → openrouter → openai) ──
const PROVIDERS = [];
if (process.env.DEEPSEEK_API_KEY) PROVIDERS.push({
  name: 'deepseek',
  url: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-flash',
  key: process.env.DEEPSEEK_API_KEY,
});
if (process.env.OPENROUTER_API_KEY) PROVIDERS.push({
  name: 'openrouter',
  url: 'https://openrouter.ai/api/v1/chat/completions',
  model: process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
  key: process.env.OPENROUTER_API_KEY,
});
if (process.env.OPENAI_API_KEY) PROVIDERS.push({
  name: 'openai',
  url: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  key: process.env.OPENAI_API_KEY,
});

async function callLLM(systemMsg, userMsg, { temperature = 0.1, maxTokens = 4096 } = {}) {
  const errors = [];
  for (const provider of PROVIDERS) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      };
      if (provider.name === 'openrouter') {
        headers['HTTP-Referer'] = 'http://localhost:3000';
        headers['X-Title'] = 'ugent-app';
      }
      const res = await fetch(provider.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
          response_format: { type: 'json_object' },
          temperature,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${provider.name} HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      if (err.name === 'TimeoutError' || err.cause?.name === 'TimeoutError') {
        errors.push(`${provider.name}: timeout`);
      } else {
        errors.push(`${provider.name}: ${err.message}`);
      }
    }
  }
  throw new Error(`All providers failed: ${errors.join(' | ')}`);
}

// ── System → subject mapping ──
const SYSTEM_SUBJECT = {
  Cardiovascular: 'Cardiology',
  Respiratory: 'Pulmonology',
  Gastrointestinal: 'Gastroenterology',
  Neurology: 'Neurology',
  Renal: 'Nephrology',
  Endocrine: 'Endocrinology',
  'Hematology & Oncology': 'Hematology & Oncology',
  Immunology: 'Immunology',
  'Infectious Disease': 'Infectious Disease',
  Integumentary: 'Dermatology',
  Reproductive: 'Reproductive Medicine',
  Musculoskeletal: 'Rheumatology',
  Psychiatry: 'Psychiatry',
  Pediatrics: 'Pediatrics',
  General: 'General Principles',
  Pharmacology: 'Pharmacology',
  Genetics: 'Genetics',
  Ophthalmology: 'Ophthalmology',
  ENT: 'Otolaryngology',
  'Biostatistics & Epidemiology': 'Biostatistics',
  'Social Sciences': 'Ethics',
};
const SUBJECT = SYSTEM_SUBJECT[SYSTEM] || SYSTEM;

// ── Prompts ──
function authorSystemPrompt() {
  return `You are a senior USMLE question writer and board-certified physician. Create one high-quality USMLE Step 1-style multiple-choice question based on the topic provided. Follow these rules strictly:

1. Write a clinical vignette (3-8 sentences) with demographics, presenting symptoms, physical exam findings, and relevant labs/imaging.
2. Provide 5 answer choices (A through E). One must be correct. The distractors should be plausible and target HIGH-YIELD differential diagnoses.
3. Include a detailed explanation that walks through the reasoning, including why each distractor is wrong.
4. Output valid JSON only — no other text.

Return this exact JSON shape:
{
  "questionText": "full clinical vignette + question stem",
  "correctAnswer": "single letter A-E",
  "options": [
    {"text": "A. option text", "isCorrect": false},
    {"text": "B. option text", "isCorrect": true}
  ],
  "explanation": "step-by-step reasoning, why correct, why each distractor wrong",
  "educationalObjective": "one-line summary learning point",
  "subject": "${SUBJECT}",
  "system": "${SYSTEM}",
  "diseaseName": "primary disease/concept tested",
  "topicType": "DISEASE",
  "mechanism": "core pathophysiology or mechanism",
  "highLeverageClues": ["clue from vignette that points to diagnosis", "..."],
  "discriminators": [
    {"distractor": "wrong answer text", "ruleOutFact": "why it's wrong"}
  ],
  "nextBestStep": "next diagnostic or management step after diagnosis",
  "clinicalContext": {"age": "", "gender": "", "physiologyState": "", "onsetPattern": ""},
  "keySymptoms": ["symptom from vignette", "..."],
  "prerequisites": ["prerequisite knowledge", "..."],
  "tableData": []
}

topicType must be: DISEASE, PATHOGEN, PRINCIPLE, DRUG, SYNDROME, or CONCEPT.
NEVER return empty diseaseName or topicType.
Vary clinical contexts — do not always use the same age/gender/onset pattern.`;
}

const VERIFY_SYSTEM = `You are a board-certified physician taking a USMLE Step 1 exam. Answer the following multiple-choice question by selecting the single best answer letter (A-E). Return ONLY valid JSON. No other text.

Return this shape:
{
  "chosenAnswer": "A",
  "reasoning": "brief clinical reasoning for your choice"
}`;

function authorPrompt(topic) {
  return `Create a USMLE Step 1 question testing: ${topic}.

Context — First Aid ${SYSTEM} chapter and Pathoma.

Make the question realistic with a clinical vignette. Vary the presentation — cover different age groups, genders, and clinical settings. Include relevant exam findings, lab values, imaging results, or physical exam maneuvers as appropriate for the topic.`;
}

// ── Normalize LLM output (same logic as deepseek-enrich.mjs) ──
function normalizeQuestion(raw) {
  return {
    questionText: raw.questionText || raw.questiontext || raw.question_text || raw.text || '',
    correctAnswer: raw.correctAnswer || raw.correctanswer || raw.correct_answer || '',
    options: (raw.options || raw.Options || []).map((opt) => {
      const text = typeof opt === 'string'
        ? opt
        : (opt.text || opt.Text || opt.label || opt.Label || '');
      // Normalize isCorrect: the verify LLM may output isCorrect as the chosen answer indicator
      const isCorrect = typeof opt === 'string'
        ? false
        : Boolean(opt.isCorrect ?? opt.IsCorrect ?? opt.iscorrect ?? false);
      return { text: text.startsWith(/\w/.test(text[0]) && text[1] === '.' ? text : text) ? text : text, isCorrect };
    }),
    explanation: raw.explanation || raw.Explanation || '',
    educationalObjective: raw.educationalObjective || raw.educationalobjective || raw.educational_objective || raw.objective || '',
    subject: raw.subject || raw.Subject || SUBJECT,
    system: raw.system || raw.System || SYSTEM,
    diseaseName: (raw.diseaseName || raw.diseasename || raw.disease_name || raw.Disease || '').charAt(0).toUpperCase() + (raw.diseaseName || raw.diseasename || raw.disease_name || raw.Disease || '').slice(1),
    topicType: (raw.topicType || raw.topictype || raw.topic_type || raw.TopicType || 'CONCEPT').toUpperCase(),
    mechanism: raw.mechanism || raw.Mechanism || '',
    highLeverageClues: raw.highLeverageClues || raw.highleverageclues || raw.clues || raw.highLeverageClue || [],
    discriminators: (raw.discriminators || raw.Discriminators || []).map((d) => ({
      distractor: d.distractor ?? d.Distractor ?? '',
      ruleOutFact: d.ruleOutFact ?? d.ruleoutfact ?? d.rule_out_fact ?? '',
    })),
    nextBestStep: raw.nextBestStep || raw.nextbeststep || raw.next_best_step || '',
    clinicalContext: raw.clinicalContext || raw.clinicalcontext || raw.clinical_context || { age: '', gender: '', physiologyState: '', onsetPattern: '' },
    keySymptoms: raw.keySymptoms || raw.keysymptoms || raw.key_symptoms || raw.symptoms || [],
    prerequisites: raw.prerequisites || raw.Prerequisites || [],
    tableData: raw.tableData || raw.tabledata || [],
  };
}

function computeTextHash(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

// ── Load existing hashes from JSONL for dedupe ──
function loadExistingHashes() {
  const hashes = new Set();
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
    for (const line of raw.split('\n').filter(Boolean)) {
      const q = JSON.parse(line);
      if (q.textHash) hashes.add(q.textHash);
    }
  } catch {
    // file doesn't exist yet
  }
  return hashes;
}

// ── Incremental write: append a single question to JSONL ──
function writeQuestion(q) {
  const line = JSON.stringify(q) + '\n';
  fs.appendFileSync(OUTPUT_FILE, line);
}
async function authorQuestion(topic, existingHashes) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`  [attempt ${attempt}/${MAX_RETRIES}] ${topic}`);

    // Step 1: Author
    let authorRaw;
    try {
      const authorResp = await callLLM(authorSystemPrompt(), authorPrompt(topic), { temperature: 0.8 });
      const authorContent = authorResp.choices?.[0]?.message?.content;
      if (!authorContent) throw new Error('No content in author response');
      authorRaw = JSON.parse(authorContent);
    } catch (err) {
      console.log(`    author JSON parse/error: ${err.message.slice(0, 120)}, retrying...`);
      continue;
    }
    const question = normalizeQuestion(authorRaw);

    // Validate essential fields
    if (!question.questionText || !question.correctAnswer || question.options.length < 4) {
      console.log(`    author produced incomplete output, retrying...`);
      continue;
    }

    // Dedupe check
    const hash = computeTextHash(question.questionText);
    if (existingHashes.has(hash)) {
      console.log(`    duplicate textHash, retrying...`);
      continue;
    }

    // Step 2: Blind verify — strip correctAnswer from the question
    const verifyPrompt = JSON.stringify({
      question: question.questionText,
      options: question.options.map((o) => ({ text: o.text })),
    });

    let verifyPassed = false;
    let verifyError = null;
    try {
      const verifyResp = await callLLM(VERIFY_SYSTEM, verifyPrompt, { temperature: 0, maxTokens: 512 });
      const verifyContent = verifyResp.choices?.[0]?.message?.content;
      const verifyResult = JSON.parse(verifyContent);
      const chosen = (verifyResult.chosenAnswer || verifyResult.chosenanswer || '').trim().toUpperCase();

      if (chosen === question.correctAnswer.trim().toUpperCase()) {
        verifyPassed = true;
        console.log(`    verify PASSED (chose ${chosen})`);
      } else {
        console.log(`    verify MISMATCH: author=${question.correctAnswer}, verifier=${chosen}`);
      }
    } catch (err) {
      verifyError = err.message;
      console.log(`    verify JSON parse error: ${err.message.slice(0, 80)}`);
    }

    if (!verifyPassed && !verifyError && attempt < MAX_RETRIES) {
      console.log(`    blind verify failed, regenerating...`);
      continue;
    }

    // Return even if verify failed on last attempt — flag it but don't lose the question
    const flag = verifyPassed ? null : 'verify_mismatch';
    return { ...question, textHash: hash, source: 'original', _flag: flag };
  }
  return null;
}

// ── Main ──
async function main() {
  console.log(`Authoring ${TARGET_COUNT} original ${SYSTEM} questions...`);
  const questionsPerTopic = Math.ceil(TARGET_COUNT / topics.length);
  console.log(`Topics: ${topics.length}, per-topic: ${questionsPerTopic}, expected: ${topics.length * questionsPerTopic}\n`);

  const existingHashes = loadExistingHashes();
  console.log(`Existing authored questions in ${OUTPUT_FILE}: ${existingHashes.size}\n`);

  const authored = [];
  let questionIndex = 0;

  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    if (authored.length >= TARGET_COUNT) break;
    const batch = topics.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (topic) => {
        const questions = [];
        for (let q = 0; q < questionsPerTopic && authored.length < TARGET_COUNT; q++) {
          const result = await authorQuestion(topic, existingHashes);
          if (result) {
            result._index = ++questionIndex;
            writeQuestion(result);
            questions.push(result);
            existingHashes.add(result.textHash);
            authored.push(result);
          }
        }
        return questions;
      })
    );
    if (authored.length > TARGET_COUNT) authored.length = TARGET_COUNT;
    const batchTotal = results.flat().length;
    console.log(`Progress: ${authored.length}/${TARGET_COUNT} (batch ${i / BATCH_SIZE + 1}: +${batchTotal})`);
  }

  console.log(`\nAuthored: ${authored.length} questions → ${OUTPUT_FILE}`);

  // Check verify stats
  const mismatches = authored.filter((q) => q._flag);
  const passed = authored.filter((q) => !q._flag);
  console.log(`Blind verify: ${passed.length} passed, ${mismatches.length} mismatched\n`);

  // Optional Supabase upsert
  if (SHOULD_UPSERT) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const rows = authored.map((q) => ({
      id: q.textHash,
      text: q.questionText,
      correct_answer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
      subject: q.subject,
      system: q.system,
      difficulty: 'medium',
      source: 'original',
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error(`Upsert batch failed at ${i}:`, error.message);
      } else {
        console.log(`Upserted ${i + batch.length}/${rows.length}`);
      }
    }
    console.log('Supabase upsert complete.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
