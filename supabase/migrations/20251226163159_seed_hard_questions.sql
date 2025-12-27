-- Seed 15 additional HARD difficulty questions
-- Focus on complex reasoning and advanced medical concepts

-- Question 21: Cardiovascular - HF Hyponatremia
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A 65-year-old with chronic heart failure develops worsening dyspnea. Serum sodium is 128 mEq/L despite maximum medical therapy. What is the most likely mechanism?',
    'Reduced cardiac output activates RAAS and ADH release, causing water retention that dilutes serum sodium. This dilutional hyponatremia represents advanced heart failure.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Heart failure'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Primary adrenal insufficiency', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Dilutional hyponatremia from ADH excess', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Diuretic-induced sodium wasting alone', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Cerebral salt wasting', false, 3, NOW());
END $$;

-- Question 22: Respiratory - COPD ABG
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A COPD patient has ABG: pH 7.35, PaCO2 65 mmHg, HCO3- 35 mEq/L, PaO2 55 mmHg. Which statement best describes this?',
    'Chronic respiratory acidosis with metabolic compensation. Elevated HCO3- indicates renal compensation over days. pH near-normal shows adequate compensation.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Physiology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Asthma and COPD'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Acute respiratory acidosis', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Chronic respiratory acidosis with metabolic compensation', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Mixed respiratory and metabolic acidosis', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Metabolic alkalosis with respiratory compensation', false, 3, NOW());
END $$;

-- Question 23: Neuropharmacology - Status Epilepticus
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Status epilepticus becomes refractory to lorazepam and phenytoin. Why do prolonged seizures reduce GABAergic medication effectiveness?',
    'During prolonged seizures, GABA-A receptors undergo internalization and trafficking away from synaptic membrane. Receptor subunit composition changes, making them less responsive to benzodiazepines.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    (SELECT id FROM "Topic" WHERE name = 'Epilepsy'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Increased GABA metabolism', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'GABA-A receptor internalization and altered subunits', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Competitive inhibition by glutamate', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Downregulation of GABA synthesis', false, 3, NOW());
END $$;

-- Question 24: Biochemistry - McArdle Disease
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'McArdle disease (muscle glycogen phosphorylase deficiency) impairs production of which metabolic intermediate during intense exercise?',
    'McArdle disease prevents glycogen breakdown in muscle. Without glucose-1-phosphate from glycogen, glycolysis is impaired, preventing lactate production during exercise.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Biochemistry'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Acetyl-CoA', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Lactate', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Creatine phosphate', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'ATP from oxidative phosphorylation', false, 3, NOW());
END $$;

-- Question 25: Microbiology - VRE Resistance
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the molecular mechanism of vancomycin resistance in VRE with VanA phenotype?',
    'VanA produces enzymes that synthesize peptidoglycan precursors ending in D-Ala-D-Lactate instead of D-Ala-D-Ala. Vancomycin has 1000-fold lower affinity for D-Ala-D-Lactate.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Production of beta-lactamases', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Alteration of peptidoglycan precursors (D-Ala-D-Lactate)', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Efflux pump overexpression', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Ribosomal methylation', false, 3, NOW());
END $$;

-- Question 26: Pharmacology - Digoxin Toxicity
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Why might digoxin toxicity be precipitated by furosemide initiation in chronic heart failure?',
    'Furosemide causes hypokalemia. Digoxin and potassium compete for Na-K-ATPase binding. When potassium is low, digoxin binding increases, enhancing its effects and toxicity risk.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Heart failure'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Furosemide increases digoxin absorption', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Hypokalemia enhances digoxin binding to Na-K-ATPase', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Furosemide inhibits digoxin metabolism', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Drug interaction at P-glycoprotein', false, 3, NOW());
END $$;

-- Question 27: Anatomy - Weber Syndrome
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Weber syndrome after stroke: which artery is occluded and what structures are affected?',
    'Paramedian PCA/basilar branches occlude, affecting midbrain. Damages cerebral peduncle (contralateral hemiplegia) and CN III fascicles (ipsilateral CN III palsy).',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Middle cerebral artery; internal capsule', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Paramedian PCA/basilar branches; midbrain', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Anterior cerebral artery; medial frontal lobe', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'PICA; lateral medulla', false, 3, NOW());
END $$;

-- Question 28: Pathology - HIT
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Heparin-induced thrombocytopenia develops 7 days after heparin. Platelet antibodies positive. What is the pathophysiology?',
    'Antibodies against PF4-heparin complexes activate platelets via Fc receptors, causing thrombocytopenia and paradoxical thrombosis despite low platelets.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Direct heparin platelet destruction', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Anti-PF4-heparin antibodies activate platelets', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Drug-induced bone marrow suppression', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Immune platelet sequestration in spleen', false, 3, NOW());
END $$;

-- Question 29: Respiratory - ARDS
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'ARDS patient with bilateral pneumonia has hypoxemia refractory to supplemental oxygen. Primary mechanism?',
    'Intrapulmonary shunt (perfusion without ventilation). Protein-rich fluid floods alveoli, blood passes through non-ventilated alveoli and cannot be oxygenated.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Pneumonia'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Decreased diffusion capacity', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Intrapulmonary shunt', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Hypoventilation', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Increased dead space', false, 3, NOW());
END $$;

-- Question 30: Biochemistry - Enzyme Kinetics
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Non-competitive inhibitor effect on Michaelis-Menten kinetics compared to no inhibitor?',
    'Non-competitive inhibitors decrease Vmax (fewer functional enzymes) but do not change Km (substrate can still bind normally to uninhibited enzyme).',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Biochemistry'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Decreased Vmax, increased Km', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Decreased Vmax, unchanged Km', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Unchanged Vmax, increased Km', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Increased Vmax, decreased Km', false, 3, NOW());
END $$;

-- Question 31: Cardiology - Bifascicular Block
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Syncope with ECG showing QRS 180ms, RBBB pattern, left axis deviation. Most likely conduction abnormality?',
    'Bifascicular block: RBBB plus left anterior fascicular block. RBBB causes wide QRS with RSR in V1. LAFB causes left axis deviation. Together indicates high-degree AV disease.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Cardiac arrhythmias'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Complete left bundle branch block', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Bifascicular block (RBBB + LAFB)', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Wolff-Parkinson-White syndrome', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Ventricular preexcitation', false, 3, NOW());
END $$;

-- Question 32: Neurology - Meningitis CSF
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Bacterial meningitis CSF: 2000 WBC (95% neutrophils), protein 250 mg/dL, glucose 20 mg/dL (serum 90). Why is CSF glucose decreased?',
    'Decreased CSF glucose from: bacterial/WBC glucose consumption, impaired glucose transport across inflamed BBB, and glycolysis by neutrophils. CSF:serum ratio <0.4 is characteristic.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    (SELECT id FROM "Topic" WHERE name = 'Stroke'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Decreased CSF production', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Bacterial/WBC consumption and impaired BBB transport', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Dilution from increased CSF volume', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Direct bacterial toxin on choroid plexus', false, 3, NOW());
END $$;

-- Question 33: Pharmacology - CYP Induction
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Patient on warfarin starts rifampin for TB and develops subtherapeutic INR. What is the mechanism?',
    'Rifampin is a potent CYP450 inducer (especially CYP3A4, 2C9). Increases warfarin metabolism, reducing plasma concentration and anticoagulant effect over 1-2 weeks.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Competitive inhibition of warfarin', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'CYP450 enzyme induction increases warfarin metabolism', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Decreased warfarin absorption', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Increased renal clearance', false, 3, NOW());
END $$;

-- Question 34: Microbiology - Influenza Drift
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'How does influenza hemagglutinin antigenic drift lead to recurrent seasonal epidemics?',
    'Antigenic drift: point mutations in HA/NA genes accumulate over time, altering antibody epitopes. Virus evades existing immunity, requiring annual vaccine updates.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Pneumonia'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Gene segment reassortment', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Point mutations in HA/NA altering epitopes', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Immune response suppression', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Latency between outbreaks', false, 3, NOW());
END $$;

-- Question 35: Anatomy - Brown-Sequard
DO $$
DECLARE q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Contralateral pain/temperature loss below C5, ipsilateral proprioception/vibration loss, ipsilateral spastic paresis. Location?',
    'Brown-Sequard (hemisection): ipsilateral corticospinal (spastic paresis), ipsilateral dorsal column (proprioception), contralateral spinothalamic (pain/temperature).',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    NOW(), NOW()
  ) RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Central cord syndrome', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Spinal cord hemisection (Brown-Sequard)', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Anterior spinal artery syndrome', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Syringomyelia', false, 3, NOW());
END $$;

-- Update counts
UPDATE "Subject" SET "questionCount" = (SELECT COUNT(*) FROM "Question" WHERE "subjectId" = "Subject".id), "updatedAt" = NOW();
UPDATE "System" SET "questionCount" = (SELECT COUNT(*) FROM "Question" WHERE "systemId" = "System".id), "updatedAt" = NOW();
UPDATE "Topic" SET "questionCount" = (SELECT COUNT(*) FROM "Question" WHERE "topicId" = "Topic".id), "updatedAt" = NOW();
