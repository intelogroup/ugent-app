-- Seed file for creating diverse questions across subjects and topics
-- This creates 2-10 questions per subject with proper distribution

-- First, create subjects
INSERT INTO "Subject" (id, name, "displayOrder", "questionCount", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Anatomy', 1, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Physiology', 2, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Biochemistry', 3, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Pathology', 4, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Pharmacology', 5, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Microbiology', 6, 0, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create systems
INSERT INTO "System" (id, name, description, "displayOrder", "questionCount", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Cardiovascular System', 'Heart and blood vessels', 1, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Respiratory System', 'Lungs and airways', 2, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Nervous System', 'Brain, spinal cord, and nerves', 3, 0, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create topics for Cardiovascular System
INSERT INTO "Topic" (id, name, "systemId", "displayOrder", "questionCount", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  topic_name,
  (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
  display_order,
  0,
  NOW(),
  NOW()
FROM (VALUES
  ('Coronary heart disease', 1),
  ('Heart failure', 2),
  ('Cardiac arrhythmias', 3)
) AS topics(topic_name, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "Topic" t
  WHERE t.name = topics.topic_name
  AND t."systemId" = (SELECT id FROM "System" WHERE name = 'Cardiovascular System')
);

-- Create topics for Respiratory System
INSERT INTO "Topic" (id, name, "systemId", "displayOrder", "questionCount", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  topic_name,
  (SELECT id FROM "System" WHERE name = 'Respiratory System'),
  display_order,
  0,
  NOW(),
  NOW()
FROM (VALUES
  ('Asthma and COPD', 1),
  ('Pneumonia', 2)
) AS topics(topic_name, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "Topic" t
  WHERE t.name = topics.topic_name
  AND t."systemId" = (SELECT id FROM "System" WHERE name = 'Respiratory System')
);

-- Create topics for Nervous System
INSERT INTO "Topic" (id, name, "systemId", "displayOrder", "questionCount", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  topic_name,
  (SELECT id FROM "System" WHERE name = 'Nervous System'),
  display_order,
  0,
  NOW(),
  NOW()
FROM (VALUES
  ('Stroke', 1),
  ('Epilepsy', 2)
) AS topics(topic_name, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "Topic" t
  WHERE t.name = topics.topic_name
  AND t."systemId" = (SELECT id FROM "System" WHERE name = 'Nervous System')
);

-- Now create questions with their options
-- Question 1: Cardiovascular + Anatomy
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which chamber of the heart receives oxygenated blood from the lungs?',
    'The left atrium receives oxygenated blood from the pulmonary veins returning from the lungs.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Coronary heart disease'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Right atrium', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Left atrium', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Right ventricle', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Left ventricle', false, 3, NOW());
END $$;

-- Question 2: Cardiovascular + Pathology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the primary cause of myocardial infarction?',
    'Myocardial infarction is primarily caused by thrombotic occlusion of a coronary artery, often due to atherosclerotic plaque rupture.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Coronary heart disease'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Coronary artery thrombosis', true, 0, NOW()),
    (gen_random_uuid(), q_id, 'Ventricular hypertrophy', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Atrial fibrillation', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Pulmonary embolism', false, 3, NOW());
END $$;

-- Question 3: Cardiovascular + Pharmacology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which medication class is first-line for treating chronic heart failure with reduced ejection fraction?',
    'ACE inhibitors are first-line therapy for heart failure with reduced ejection fraction, improving survival and reducing hospitalizations.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Heart failure'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Calcium channel blockers', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'ACE inhibitors', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Alpha blockers', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Thiazide diuretics alone', false, 3, NOW());
END $$;

-- Question 4: Cardiovascular + Pathology (Arrhythmias)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the most common cause of atrial fibrillation?',
    'Hypertension is the most common underlying condition associated with atrial fibrillation, followed by coronary artery disease and valvular heart disease.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Cardiovascular System'),
    (SELECT id FROM "Topic" WHERE name = 'Cardiac arrhythmias'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Hypertension', true, 0, NOW()),
    (gen_random_uuid(), q_id, 'Diabetes mellitus', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Hyperthyroidism alone', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Obesity alone', false, 3, NOW());
END $$;

-- Question 5: Respiratory + Anatomy
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the primary muscle of respiration?',
    'The diaphragm is the primary muscle of respiration, responsible for 70-80% of the work of breathing during quiet respiration.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Asthma and COPD'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'External intercostals', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Diaphragm', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Scalene muscles', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Abdominal muscles', false, 3, NOW());
END $$;

-- Question 6: Respiratory + Pathology (COPD)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'In COPD, what is the primary pathophysiologic mechanism of airflow limitation?',
    'In COPD, airflow limitation is primarily caused by small airway disease (bronchiolitis) and parenchymal destruction (emphysema), leading to loss of elastic recoil and airway collapse.',
    'HARD',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Asthma and COPD'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Bronchospasm alone', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Mucus hypersecretion alone', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Loss of elastic recoil and small airway disease', true, 2, NOW()),
    (gen_random_uuid(), q_id, 'Pulmonary hypertension', false, 3, NOW());
END $$;

-- Question 7: Respiratory + Microbiology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the most common bacterial cause of community-acquired pneumonia?',
    'Streptococcus pneumoniae is the most common bacterial pathogen causing community-acquired pneumonia across all age groups.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Pneumonia'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Streptococcus pneumoniae', true, 0, NOW()),
    (gen_random_uuid(), q_id, 'Haemophilus influenzae', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Staphylococcus aureus', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Klebsiella pneumoniae', false, 3, NOW());
END $$;

-- Question 8: Respiratory + Physiology
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which of the following best describes the oxygen-hemoglobin dissociation curve shift in acidosis?',
    'Acidosis causes a rightward shift of the oxygen-hemoglobin dissociation curve (Bohr effect), decreasing hemoglobin affinity for oxygen and promoting oxygen release to tissues.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Physiology'),
    (SELECT id FROM "System" WHERE name = 'Respiratory System'),
    (SELECT id FROM "Topic" WHERE name = 'Asthma and COPD'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Leftward shift, increased oxygen affinity', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Rightward shift, decreased oxygen affinity', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'No change in the curve', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Curve becomes linear', false, 3, NOW());
END $$;

-- Question 9: Nervous System + Pathology (Stroke)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the most common cause of ischemic stroke?',
    'Atherosclerotic thrombosis and thromboembolism from cardiac sources (especially atrial fibrillation) are the most common causes of ischemic stroke.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Pathology'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    (SELECT id FROM "Topic" WHERE name = 'Stroke'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Arterial thrombosis or embolism', true, 0, NOW()),
    (gen_random_uuid(), q_id, 'Venous thrombosis', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Vasculitis', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Arteriovenous malformation', false, 3, NOW());
END $$;

-- Question 10: Nervous System + Physiology (Epilepsy)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which neurotransmitter is primarily involved in the pathophysiology of epilepsy?',
    'Epilepsy involves an imbalance between excitatory (glutamate) and inhibitory (GABA) neurotransmission, with decreased GABAergic inhibition playing a key role.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Physiology'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    (SELECT id FROM "Topic" WHERE name = 'Epilepsy'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Dopamine', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Serotonin', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'GABA and Glutamate', true, 2, NOW()),
    (gen_random_uuid(), q_id, 'Acetylcholine', false, 3, NOW());
END $$;

-- Question 11: Nervous System + Pharmacology (Stroke treatment)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "topicId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the mechanism of action of tissue plasminogen activator (tPA) in acute ischemic stroke?',
    'tPA converts plasminogen to plasmin, which breaks down fibrin clots, restoring blood flow in occluded cerebral arteries.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    (SELECT id FROM "Topic" WHERE name = 'Stroke'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Blocks platelet aggregation', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Converts plasminogen to plasmin', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Inhibits thrombin', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Activates protein C', false, 3, NOW());
END $$;

-- Question 12: Biochemistry (PKU)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which enzyme is deficient in phenylketonuria (PKU)?',
    'PKU is caused by deficiency of phenylalanine hydroxylase, leading to accumulation of phenylalanine and its metabolites.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Biochemistry'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Tyrosine hydroxylase', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Phenylalanine hydroxylase', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Homogentisate oxidase', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'DOPA decarboxylase', false, 3, NOW());
END $$;

-- Question 13: Biochemistry (Glycolysis)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the rate-limiting enzyme of glycolysis?',
    'Phosphofructokinase-1 (PFK-1) catalyzes the conversion of fructose-6-phosphate to fructose-1,6-bisphosphate and is the rate-limiting step of glycolysis.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Biochemistry'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Hexokinase', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Phosphofructokinase-1', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Pyruvate kinase', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Glucose-6-phosphate dehydrogenase', false, 3, NOW());
END $$;

-- Question 14: Biochemistry (Vitamins)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which vitamin deficiency causes megaloblastic anemia?',
    'Deficiency of vitamin B12 (cobalamin) or folate causes megaloblastic anemia due to impaired DNA synthesis.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Biochemistry'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Vitamin B6', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Vitamin B12 or Folate', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Vitamin K', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Vitamin D', false, 3, NOW());
END $$;

-- Question 15: Pharmacology (Statins)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the primary mechanism by which statins lower cholesterol?',
    'Statins inhibit HMG-CoA reductase, the rate-limiting enzyme in cholesterol synthesis, leading to increased LDL receptor expression and decreased serum cholesterol.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Pharmacology'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Inhibit HMG-CoA reductase', true, 0, NOW()),
    (gen_random_uuid(), q_id, 'Inhibit cholesterol absorption', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Increase bile acid excretion', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Activate lipoprotein lipase', false, 3, NOW());
END $$;

-- Question 16: Microbiology (UTI)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which bacteria is the most common cause of urinary tract infections?',
    'Escherichia coli is responsible for approximately 80-85% of community-acquired urinary tract infections.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Staphylococcus saprophyticus', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Escherichia coli', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Klebsiella pneumoniae', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Proteus mirabilis', false, 3, NOW());
END $$;

-- Question 17: Microbiology (Antibiotics)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What is the mechanism of action of beta-lactam antibiotics?',
    'Beta-lactam antibiotics (penicillins, cephalosporins) inhibit bacterial cell wall synthesis by binding to penicillin-binding proteins and preventing peptidoglycan cross-linking.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Inhibit protein synthesis', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Inhibit cell wall synthesis', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Inhibit DNA replication', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Disrupt cell membrane', false, 3, NOW());
END $$;

-- Question 18: Microbiology (Virology)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which virus is associated with Burkitt lymphoma?',
    'Epstein-Barr virus (EBV) is strongly associated with endemic Burkitt lymphoma, particularly in Africa.',
    'MEDIUM',
    (SELECT id FROM "Subject" WHERE name = 'Microbiology'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Human papillomavirus', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Epstein-Barr virus', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Cytomegalovirus', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Hepatitis B virus', false, 3, NOW());
END $$;

-- Question 19: Anatomy (Cranial nerves)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'Which cranial nerve is responsible for lateral eye movement?',
    'The abducens nerve (CN VI) innervates the lateral rectus muscle, which is responsible for lateral (abduction) movement of the eye.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Oculomotor (CN III)', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Trochlear (CN IV)', false, 1, NOW()),
    (gen_random_uuid(), q_id, 'Abducens (CN VI)', true, 2, NOW()),
    (gen_random_uuid(), q_id, 'Optic (CN II)', false, 3, NOW());
END $$;

-- Question 20: Anatomy (Brain structure)
DO $$
DECLARE
  q_id UUID;
BEGIN
  INSERT INTO "Question" (id, text, explanation, difficulty, "subjectId", "systemId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    'What structure connects the two cerebral hemispheres?',
    'The corpus callosum is the largest white matter structure in the brain, containing commissural fibers that connect the two cerebral hemispheres.',
    'EASY',
    (SELECT id FROM "Subject" WHERE name = 'Anatomy'),
    (SELECT id FROM "System" WHERE name = 'Nervous System'),
    NOW(),
    NOW()
  )
  RETURNING id INTO q_id;

  INSERT INTO "AnswerOption" (id, "questionId", text, "isCorrect", "displayOrder", "createdAt")
  VALUES
    (gen_random_uuid(), q_id, 'Fornix', false, 0, NOW()),
    (gen_random_uuid(), q_id, 'Corpus callosum', true, 1, NOW()),
    (gen_random_uuid(), q_id, 'Internal capsule', false, 2, NOW()),
    (gen_random_uuid(), q_id, 'Anterior commissure', false, 3, NOW());
END $$;

-- Update question counts for all subjects
UPDATE "Subject" s
SET "questionCount" = (
  SELECT COUNT(*) FROM "Question" q WHERE q."subjectId" = s.id
),
"updatedAt" = NOW();

-- Update question counts for all systems
UPDATE "System" s
SET "questionCount" = (
  SELECT COUNT(*) FROM "Question" q WHERE q."systemId" = s.id
),
"updatedAt" = NOW();

-- Update question counts for all topics
UPDATE "Topic" t
SET "questionCount" = (
  SELECT COUNT(*) FROM "Question" q WHERE q."topicId" = t.id
),
"updatedAt" = NOW();

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully created 20 questions!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Question distribution:';
END $$;
