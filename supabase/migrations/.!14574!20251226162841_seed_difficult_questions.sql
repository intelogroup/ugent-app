-- Seed file for difficult medical questions
-- Focus on HARD difficulty with complex reasoning, multi-step problems, and advanced concepts

-- Question 21: Advanced Cardiovascular Pathophysiology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A 65-year-old man with chronic heart failure develops worsening dyspnea. His serum sodium is 128 mEq/L, and he has been on maximum medical therapy including ACE inhibitors, beta-blockers, and loop diuretics. What is the most likely mechanism of his hyponatremia?',
    'In heart failure, reduced cardiac output leads to activation of the renin-angiotensin-aldosterone system and ADH release, causing water retention that dilutes serum sodium (dilutional hyponatremia). This is exacerbated by diuretic use and represents advanced heart failure.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Heart failure'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Primary adrenal insufficiency', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Dilutional hyponatremia from ADH excess', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Diuretic-induced sodium wasting alone', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Cerebral salt wasting syndrome', false, 3, NOW());
END $$;

-- Question 22: Complex Respiratory Physiology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A patient with severe COPD has the following ABG: pH 7.35, PaCO2 65 mmHg, HCO3- 35 mEq/L, PaO2 55 mmHg. Which statement best describes this acid-base status?',
    'This represents chronic respiratory acidosis with metabolic compensation. The elevated HCO3- (35 vs normal 24) indicates renal compensation over days to weeks. The pH is near-normal (7.35) showing adequate compensation. The chronic hypercapnia (PaCO2 65) is the primary disturbance.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Physiology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Asthma and COPD'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Acute respiratory acidosis', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Chronic respiratory acidosis with metabolic compensation', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Mixed respiratory and metabolic acidosis', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Metabolic alkalosis with respiratory compensation', false, 3, NOW());
END $$;

-- Question 23: Advanced Neuropharmacology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A patient develops status epilepticus that is refractory to lorazepam and phenytoin. What is the mechanism by which prolonged seizure activity reduces the effectiveness of GABAergic medications?',
    'During prolonged seizures, GABA-A receptors undergo internalization and trafficking away from the synaptic membrane, reducing the number of available receptors. Additionally, receptor subunit composition changes, making them less responsive to benzodiazepines. This is why early aggressive treatment is crucial.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    (SELECT id FROM "Topic" WHERE name = 'Epilepsy'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Increased GABA metabolism', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'GABA-A receptor internalization and altered subunit composition', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Competitive inhibition by glutamate', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Downregulation of GABA synthesis', false, 3, NOW());
END $$;

-- Question 24: Complex Biochemistry - Metabolic Pathways
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A patient with McArdle disease (muscle glycogen phosphorylase deficiency) would be expected to have impaired production of which metabolic intermediate during intense exercise?',
    'McArdle disease prevents glycogen breakdown in muscle. Without glucose-1-phosphate from glycogen, muscle cannot undergo glycolysis during exercise, leading to impaired lactate production. This causes muscle cramps, myoglobinuria, and the second-wind phenomenon when alternative fuels become available.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Biochemistry'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Acetyl-CoA', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Lactate', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Creatine phosphate', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'ATP from oxidative phosphorylation', false, 3, NOW());
END $$;

-- Question 25: Advanced Microbiology - Antimicrobial Resistance
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A hospital experiences an outbreak of vancomycin-resistant Enterococcus faecium (VRE). What is the molecular mechanism of vancomycin resistance in VRE with the VanA phenotype?',
    'The VanA gene cluster produces enzymes that synthesize modified peptidoglycan precursors ending in D-Ala-D-Lactate instead of D-Ala-D-Ala. Vancomycin has 1000-fold lower affinity for D-Ala-D-Lactate, rendering it ineffective while allowing normal cell wall synthesis.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Production of beta-lactamases', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Alteration of peptidoglycan precursors (D-Ala-D-Lactate)', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Efflux pump overexpression', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Ribosomal methylation', false, 3, NOW());
END $$;

-- Question 26: Complex Cardiovascular Pharmacology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Why might digoxin toxicity be precipitated by the initiation of furosemide therapy in a patient with chronic heart failure?',
    'Furosemide causes renal potassium wasting, leading to hypokalemia. Digoxin and potassium compete for the same binding site on the Na-K-ATPase pump. When potassium is low, digoxin binding is enhanced, increasing its effects and toxicity risk. This is why potassium levels must be monitored when combining these drugs.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Heart failure'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Furosemide increases digoxin absorption', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Hypokalemia enhances digoxin binding to Na-K-ATPase', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Furosemide inhibits digoxin metabolism', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Drug-drug interaction at P-glycoprotein', false, 3, NOW());
END $$;

-- Question 27: Advanced Anatomy - Vascular Supply
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A patient develops Weber syndrome after a stroke. Which artery is most likely occluded, and what structures are affected?',
    'Weber syndrome results from occlusion of paramedian branches of the posterior cerebral artery (or basilar artery), affecting the midbrain. This damages the cerebral peduncle (causing contralateral hemiplegia) and oculomotor nerve fascicles (causing ipsilateral CN III palsy with ptosis, "down and out" eye, and pupil dilation).',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Middle cerebral artery; internal capsule', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Paramedian branches of PCA/basilar; midbrain', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Anterior cerebral artery; medial frontal lobe', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'PICA; lateral medulla', false, 3, NOW());
END $$;

-- Question 28: Complex Pathology - Coagulation
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'A patient develops thrombocytopenia 7 days after starting heparin therapy. Platelet antibodies are positive. What is the pathophysiology of this condition?',
