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
      { title: 'Embryology & Anatomy', items: ['Neural tube development & defects (Anencephaly, Spina Bifida)', 'Ventricles, CSF flow & Hydrocephalus (Normal pressure, Non-communicating, Communicating)', 'Spinal cord tracts & Cortical homunculus'] },
      { title: 'Physiology', items: ['Action potentials & myelination', 'Synaptic transmission & Neurotransmitter changes in disease (Alzheimer, Parkinson, Huntington, Depression)'] },
      { title: 'Pathology', items: ['Cerebrovascular disease & Stroke (Ischemic, Epidural/Subdural hematomas, Subarachnoid hemorrhage, Wallenberg)', 'Dementias (Alzheimer, Lewy Body, Frontotemporal, vascular)', 'Parkinson disease & Huntington disease', 'Demyelinating & Neuromuscular (Multiple Sclerosis, Guillain-Barré, Charcot-Marie-Tooth, ALS, Myasthenia Gravis)', 'Seizure disorders & Status epilepticus', 'Brain tumors (Glioblastoma, Meningioma, Schwannoma, Medulloblastoma, Pilocytic Astrocytoma)'] },
      { title: 'Ophthalmology', items: ['Visual pathway lesions', 'Glaucoma', 'Pupillary abnormalities'] },
      { title: 'Pharmacology', items: ['Anesthetics (local & inhaled)', 'Antiepileptics (Phenytoin, Valproate, Carbamazepine)', 'Parkinson therapeutics (Levodopa/Carbidopa, Dopamine agonists)'] }
    ]
  },
  Respiratory: {
    chapter: 'Respiratory',
    pages: '558-577',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Lung development phases (Pseudoglandular, Canalicular, Saccular, Alveolar)', 'Bronchial tree structure & histology'] },
      { title: 'Physiology', items: ['Lung volumes & capacities', 'Oxygen-hemoglobin dissociation curve shifts', 'V/Q mismatches & shunt vs dead space'] },
      { title: 'Pathology', items: ['Obstructive lung diseases (COPD, Asthma, Bronchiectasis)', 'Restrictive lung diseases (Idiopathic Pulmonary Fibrosis, Pneumoconioses, Sarcoidosis)', 'Pneumonias (Lobar, Bronchopneumonia, Interstitial)', 'Lung Abscess & Tuberculosis', 'Pulmonary embolism & Pulmonary hypertension', 'Pneumothorax & Pleural effusions', 'Lung Cancer types (Adenocarcinoma, Squamous cell, Small cell, Large cell)'] },
      { title: 'Pharmacology', items: ['Asthma controllers (steroids, leukotriene inhibitors)', 'Bronchodilators (Beta-2 agonists, Muscarinic antagonists)'] }
    ]
  },
  Gastrointestinal: {
    chapter: 'Gastrointestinal',
    pages: '327-363',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Peritoneum & retroperitoneal structures', 'GI blood supply (Celiac, SMA, IMA) & Portosystemic anastomoses', 'Hernia types (Direct, Indirect inguinal, Femoral)'] },
      { title: 'Physiology', items: ['GI secretory hormones (Gastrin, CCK, Secretin, Somatostatin)', 'Bilirubin metabolism & Jaundice etiologies', 'Digestion & absorption of macronutrients'] },
      { title: 'Pathology', items: ['Esophageal disorders (Achalasia, GERD, Esophagitis, Mallory-Weiss, Barrett)', 'Stomach disorders (Acute/Chronic Gastritis, Peptic Ulcer Disease, Gastric Cancer)', 'Bowel disorders (Crohn disease, Ulcerative Colitis, Celiac disease, Irritable Bowel Syndrome, Appendicitis)', 'Colonic pathology (Diverticulosis, Polyps, Colorectal Cancer, Angiodysplasia)', 'Hepatobiliary (Cirrhosis, Portal hypertension, Viral Hepatitis, Alcoholic liver disease, NAFLD, Cholelithiasis)'] },
      { title: 'Pharmacology', items: ['H2 receptor blockers & Proton Pump Inhibitors (PPIs)', 'Antiemetic agents (Ondansetron, Metoclopramide)', 'Laxatives & antidiarrheals'] }
    ]
  },
  Cardiovascular: {
    chapter: 'Cardiovascular',
    pages: '256-297',
    subChapters: [
      { title: 'Embryology & Anatomy', items: ['Heart development & looping', 'Fetal circulation & shunts closure', 'Coronary artery anatomy & dominance'] },
      { title: 'Physiology', items: ['Cardiac cycle, PV loops & Wiggers diagram', 'EKG interpretation & arrhythmias', 'Hemodynamics (CO, SV, TPR, MAP)'] },
      { title: 'Pathology', items: ['Congenital shunts (ASD, VSD, Patent Foramen Ovale, Tetralogy of Fallot, transposition of great vessels)', 'Ischemic heart disease (Stable/unstable angina, NSTEMI, STEMI)', 'Myocardial Infarction complications', 'Sudden cardiac death & heart failure', 'Hypertension & Atherosclerosis', 'Aortic dissection & Aneurysms', 'Cardiac arrhythmias (Atrial fibrillation, AV blocks, Ventricular fibrillation)', 'Valvular diseases (Mitral regurgitation/stenosis, Aortic regurgitation/stenosis)', 'Cardiomyopathies (Dilated, Hypertrophic, Restrictive)', 'Infectious & Inflammatory (Endocarditis, Myocarditis, Pericarditis, Rheumatic Fever, Rheumatic heart disease)', 'Vasculitis types (Large, Medium, Small vessel)'] },
      { title: 'Pharmacology', items: ['Antihypertensive agents (ACE inhibitors, ARBs, CCBs, Beta-blockers)', 'Antiarrhythmic drugs (Classes I-IV)', 'Lipid-lowering agents (Statins, Fibrates, Ezetimibe)'] }
    ]
  },
  'Hematology & Oncology': {
    chapter: 'Hematology & Oncology',
    pages: '364-411',
    subChapters: [
      { title: 'Physiology', items: ['Hematopoiesis & RBC lineage', 'RBC & WBC morphology', 'Platelet activation & Coagulation cascade'] },
      { title: 'Pathology', items: ['Microcytic, Macrocytic & Normocytic Anemias', 'Extravascular vs Intravascular hemolysis (Spherocytosis, G6PD, Sickle Cell, Paroxysmal nocturnal hemoglobinuria)', 'Bleeding disorders (vWD, Hemophilias, ITP, TTP, DIC)', 'Leukemias & Lymphomas (AML, ALL, CML, CLL, Hodgkin, Non-Hodgkin)', 'Plasma cell dyscrasias (Multiple Myeloma, MGUS)'] },
      { title: 'Oncology & Pharmacology', items: ['Chemotherapeutic agents (alkylating, antimetabolites, microtubule inhibitors)', 'Anticoagulants & thrombolytics (Heparin, Warfarin, DOACs)'] }
    ]
  },
  Immunology: {
    chapter: 'Immunology',
    pages: '94-113',
    subChapters: [
      { title: 'Cellular Components', items: ['T-cell & B-cell development', 'Antigen presentation (MHC I & II)', 'Cytokine signaling & functions'] },
      { title: 'Lymphoid Organs', items: ['Lymph node histology', 'Spleen architecture', 'Thymus development'] },
      { title: 'Hypersensitivities & Autoimmunity', items: ['Types I-IV Hypersensitivities', 'Transplant rejection mechanisms'] },
      { title: 'Autoimmune Disorders', items: ['Systemic Lupus Erythematosus (SLE)', 'Sjögren syndrome', 'Scleroderma (systemic sclerosis)', 'Mixed connective tissue disease'] },
      { title: 'Immunodeficiencies', items: ['B-cell disorders (X-linked Agam)', 'T-cell disorders (DiGeorge)', 'Combined (SCID, Wiskott-Aldrich)', 'Phagocyte dysfunctions'] }
    ]
  },
  'Infectious Disease': {
    chapter: 'Microbiology',
    pages: '114-183',
    subChapters: [
      { title: 'Bacteriology', items: ['Gram-positives (Staphylococcus, Streptococcus, Clostridium)', 'Gram-negatives (Neisseria, Pseudomonas, Enterics)', 'Mycobacteria, Spirochetes (Treponema, Borrelia) & Zoonotics'] },
      { title: 'Virology', items: ['DNA & RNA viruses', 'Herpesviruses (HSV, VZV, CMV, EBV)', 'HIV, Influenza & Hepatitis viruses'] },
      { title: 'Mycology & Parasitology', items: ['Systemic mycoses (Histoplasma, Blastomyces, Coccidioides)', 'Opportunistic fungi (Candida, Aspergillus, Cryptococcus)', 'Protozoa & Helminths'] },
      { title: 'Antimicrobials', items: ['Penicillins & Cephalosporins', 'Macrolides & Aminoglycosides', 'Antivirals & Antifungals'] }
    ]
  },
  Endocrine: {
    chapter: 'Endocrine',
    pages: '298-326',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Thyroid & adrenal gland anatomy', 'Pituitary development & Rathke cleft'] },
      { title: 'Physiology', items: ['Hypothalamic-Pituitary axes', 'Hormone feedback systems & receptor types'] },
      { title: 'Pathology', items: ['Pituitary gland disorders (Prolactinoma, Acromegaly, Diabetes Insipidus, SIADH)', 'Thyroid gland disorders (Hashimoto, De Quervain, Graves, Goiters, Thyroid Papillary/Follicular/Medullary Cancers)', 'Adrenal disorders (Cushing syndrome, Conn syndrome, Addison disease, Congenital Adrenal Hyperplasia)', 'Pancreatic disorders (Diabetes Mellitus type 1 & 2, DKA, Hyperosmolar state)', 'Multiple Endocrine Neoplasia (MEN 1, 2A, 2B)'] },
      { title: 'Pharmacology', items: ['Insulin regimens & oral hypoglycemics', 'Thyroid replacements & Antithyroid drugs'] }
    ]
  },
  Integumentary: {
    chapter: 'Musculoskeletal, Skin, CT',
    pages: '412-457',
    subChapters: [
      { title: 'Skin Anatomy & Physiology', items: ['Epidermal layers', 'Skin junctions & histology'] },
      { title: 'Dermatopathology', items: ['Inflammatory dermatoses (Atopic dermatitis, Psoriasis, Seborrheic dermatitis, Contact dermatitis)', 'Bullous diseases (Pemphigus vulgaris, Bullous pemphigoid, Dermatitis herpetiformis)', 'Infections (Impetigo, Cellulitis, Erysipelas, Necrotizing fasciitis, HSV, VZV, Molluscum, HPV)'] },
      { title: 'Skin Cancer', items: ['Basal Cell Carcinoma (BCC)', 'Squamous Cell Carcinoma (SCC)', 'Melanoma'] }
    ]
  },
  Renal: {
    chapter: 'Renal',
    pages: '500-527',
    subChapters: [
      { title: 'Anatomy & Embryology', items: ['Kidney development (Pronephros, Mesonephros, Metanephros)', 'Nephron structure & glomerular filtration barrier'] },
      { title: 'Physiology', items: ['GFR, RPF & renal clearance', 'Electrolyte & water handling along the nephron', 'Acid-base physiology & compensation'] },
      { title: 'Pathology', items: ['Nephritic syndromes (PSGN, IgA Nephropathy, Alport, RPGN, Membranoproliferative)', 'Nephrotic syndromes (Minimal Change, FSGS, Membranous, Amyloidosis, Diabetic nephropathy)', 'Acute Kidney Injury (Prerenal, Intrinsic, Postrenal)', 'Acute Tubular Necrosis (ATN) & Interstitial Nephritis', 'Kidney stones (Calcium oxalate, Ammonium magnesium phosphate, Uric acid, Cystine)', 'Renal Cell Carcinoma & Wilms tumor'] },
      { title: 'Pharmacology', items: ['Diuretics (Loop, Thiazide, K-sparing, Carbonic anhydrase inhibitors)'] }
    ]
  },
  Reproductive: {
    chapter: 'Reproductive',
    pages: '528-557',
    subChapters: [
      { title: 'Embryology & Anatomy', items: ['Sex determination & ducts differentiation', 'Uterine, ovarian & testicular anatomy'] },
      { title: 'Physiology', items: ['Menstrual cycle & hormonal changes', 'Pregnancy & lactation physiology'] },
      { title: 'Pathology', items: ['Breast disorders (Fibrocystic changes, Fibroadenoma, Intraductal papilloma, DCIS, Invasive ductal/lobular carcinoma)', 'Ovarian diseases (PCOS, Teratoma, Serous/Mucinous cystadenocarcinoma, Granulosa cell tumor)', 'Uterine/Cervical pathology (Endometrial hyperplasia/cancer, Leiomyomas, Cervical dysplasia, Endometriosis, Adenomyosis)', 'Male Reproductive (Benign Prostatic Hyperplasia, Prostate Adenocarcinoma, Testicular tumors like Seminoma, Yolk sac, Choriocarcinoma)'] },
      { title: 'Pharmacology', items: ['OCPs & HRT', 'SERMs (Tamoxifen, Raloxifene)', 'Androgen receptor antagonists & 5-alpha-reductase inhibitors'] }
    ]
  },
  Musculoskeletal: {
    chapter: 'Musculoskeletal, Skin, CT',
    pages: '412-457',
    subChapters: [
      { title: 'Bone & Joint Physiology', items: ['Osteoblast & osteoclast activity signaling (RANKL/OPG)', 'Cartilage structure & endochondral bone formation'] },
      { title: 'Pathology', items: ['Bone pathology (Osteoporosis, Osteopetrosis, Paget disease of bone, Osteosarcoma, Ewing sarcoma, Osteoclastoma)', 'Joint pathology (Osteoarthritis, Rheumatoid arthritis, Gout, Pseudogout, Ankylosing spondylitis, Reactive arthritis)', 'Skeletal muscle & Neuromuscular (Myasthenia Gravis, Lambert-Eaton, Muscular Dystrophies like Duchenne/Becker)'] }
    ]
  },
  Psychiatry: {
    chapter: 'Psychiatry',
    pages: '466-489',
    subChapters: [
      { title: 'Developmental Disorders', items: ['ADHD', 'Autism Spectrum', 'Conduct disorder & Oppositional Defiant Disorder'] },
      { title: 'Psychopathology', items: ['Depressive & Bipolar disorders', 'Schizophrenia & other psychoses', 'Anxiety, OCD & PTSD', 'Personality disorders (Cluster A, B, C)', 'Substance use disorders (Alcohol, Opioids, Cocaine, Benzodiazepines)'] },
      { title: 'Pharmacology', items: ['Antidepressants (SSRIs, SNRIs, TCAs, MAOIs)', 'Antipsychotics (Typical vs Atypical)', 'Mood stabilizers (Lithium, Valproate)'] }
    ]
  },
  Pediatrics: {
    chapter: 'Reproductive',
    pages: '557',
    subChapters: [
      { title: 'Congenital Anomalies', items: ['Genetic syndromes (Down, Edwards, Patau, Turner, Klinefelter)', 'Congenital defects (cleft lip/palate, cardiac shunts)'] },
      { title: 'Milestones', items: ['Gross motor, fine motor, language, and social milestones'] }
    ]
  },
  General: {
    chapter: 'General Principles',
    pages: '1-93',
    subChapters: [
      { title: 'Biochemistry', items: ['Metabolic pathways (Glycolysis, Krebs, Gluconeogenesis)', 'Storage diseases (Lysosomal, Glycogen storage)', 'Nucleotide synthesis & Repair'] },
      { title: 'Immunology & Pathology', items: ['Acute & Chronic Inflammation', 'Wound healing & tissue repair'] }
    ]
  },
  Pharmacology: {
    chapter: 'Pharmacology',
    pages: '184-255',
    subChapters: [
      { title: 'Pharmacokinetics', items: ['Half-life & clearance calculations', 'Volume of distribution & bioavailability'] },
      { title: 'Autonomic Drugs', items: ['Sympathomimetics & sympatholytics', 'Parasympathomimetics & parasympatholytics'] }
    ]
  },
  Genetics: {
    chapter: 'General Principles',
    pages: '42-62',
    subChapters: [
      { title: 'Gene Expression', items: ['Transcription & translation regulation', 'Epigenetic modifications (methylation, acetylation)'] },
      { title: 'Inheritance Patterns', items: ['Autosomal dominant & recessive', 'X-linked dominant & recessive', 'Mitochondrial & non-classical inheritance'] },
      { title: 'Chromosomal Disorders & Syndromes', items: ['Down Syndrome (Trisomy 21)', 'Edwards Syndrome (Trisomy 18)', 'Patau Syndrome (Trisomy 13)', 'Turner Syndrome (45,XO)', 'Klinefelter Syndrome (47,XXY)', 'Williams Syndrome', 'Cri-du-chat Syndrome', 'DiGeorge Syndrome (22q11.2)'] },
      { title: 'High-Yield Genetic Disorders', items: ['Cystic Fibrosis', 'Huntington Disease', 'Myotonic Dystrophy', 'Fragile X Syndrome', 'Prader-Willi & Angelman Syndromes', 'Marfan Syndrome', 'Xeroderma Pigmentosum', 'Friedreich Ataxia', 'Homocystinuria', 'Tuberous Sclerosis Complex', 'MELAS (mitochondrial)'] }
    ]
  },
  Ophthalmology: {
    chapter: 'Ophthalmology',
    pages: '551-560',
    subChapters: [
      { title: 'Anatomy & Refraction', items: ['Normal eye anatomy', 'Conjunctivitis', 'Refractive errors (Myopia, Hyperopia, Astigmatism)', 'Presbyopia'] },
      { title: 'Lens & Glaucoma', items: ['Cataracts (acquired & congenital)', 'Open-angle glaucoma', 'Closed-angle glaucoma'] },
      { title: 'Retinal Vascular & Degenerative', items: ['Age-related macular degeneration (AMD)', 'Diabetic retinopathy (proliferative & nonproliferative)', 'Hypertensive retinopathy', 'Retinal artery occlusion', 'Retinal vein occlusion', 'Retinal detachment', 'Retinitis pigmentosa', 'Retinopathy of prematurity'] },
      { title: 'Tumor & Inflammation', items: ['Retinoblastoma', 'Leukocoria (white reflex)', 'Uveitis (anterior & posterior)'] },
      { title: 'Neuro-Ophthalmology', items: ['Pupillary control (Miosis, Mydriasis)', 'Pupillary light reflex', 'Horner syndrome', 'Cranial nerve palsies (CN III, IV, VI)', 'Visual field defects (hemianopia, quadrantanopia)', 'Internuclear ophthalmoplegia (INO)', 'Argyll Robertson pupil', 'Optic neuritis', 'Papilledema'] }
    ]
  },
  ENT: {
    chapter: 'Neurology and Special Senses (Otology)',
    pages: '549-550',
    subChapters: [
      { title: 'Otology', items: ['Weber & Rinne hearing tests', 'Conductive vs Sensorineural hearing loss', 'Menière disease & Cholesteatoma', 'Otitis externa & media'] }
    ]
  },
  'Biostatistics & Epidemiology': {
    chapter: 'Public Health Sciences',
    pages: '256-266',
    subChapters: [
      { title: 'Study Designs', items: ['Case-control, cohort, RCT, meta-analysis'] },
      { title: 'Diagnostic Testing', items: ['Sensitivity, specificity, PPV, NPV, likelihood ratios'] },
      { title: 'Measures of Effect & Error', items: ['Relative risk (RR), Odds ratio (OR), ARR, NNT', 'Bias types & selection/measurement bias', 'Statistical hypothesis & p-values'] }
    ]
  },
  'Social Sciences': {
    chapter: 'Public Health Sciences (Ethics & Quality)',
    pages: '267-278',
    subChapters: [
      { title: 'Ethics & Law', items: ['Informed consent & decision capacity', 'Confidentiality & exceptions', 'Surrogate decision maker, advance directives'] },
      { title: 'Quality & Safety', items: ['Healthcare delivery & medical errors', 'Quality improvement (PDSA, root cause analysis)', 'Patient safety metrics'] }
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
      { title: 'Apoptosis Regulations', items: ['Bcl-2 & Bax mechanisms'] },
      { title: 'Cancer-Related Genetic Syndromes', items: ['Li-Fraumeni Syndrome (TP53)', 'Familial Adenomatous Polyposis (FAP) & Lynch Syndrome (HNPCC)', 'Neurofibromatosis Types 1 & 2', 'Tuberous Sclerosis & Von Hippel-Lindau (VHL)', 'Retinoblastoma (RB1)', 'Burkitt Lymphoma (t(8;14) c-myc)'] }
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
      { title: 'Neurological Connections', items: ['Pancoast tumor compression / Horner syndrome (Ch. 9 - p. 98)', 'Syringomyelia / Horner syndrome (Ch. 17 - p. 182)', 'Multiple Sclerosis (Optic neuritis, INO) (Ch. 17 - p. 188)', 'Malignant hypertension / Papilledema (Ch. 4 - p. 68)'] }
    ]
  },
  ENT: {
    chapter: 'Ch. 10 – Gastrointestinal Pathology (Oral Cavity)',
    subChapters: [
      { title: 'Oral & Salivary Pathology', items: ['Cleft lip & cleft palate', 'Mumps virus infection', 'Salivary tumors (Pleomorphic adenoma, Warthin tumor)'] }
    ]
  },
  'Biostatistics & Epidemiology': {
    chapter: '(not covered in Pathoma)',
    subChapters: []
  },
  'Social Sciences': {
    chapter: '(not covered in Pathoma)',
    subChapters: []
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
