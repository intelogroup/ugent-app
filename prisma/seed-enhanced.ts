import { PrismaClient, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

// Sample medical questions organized by system and topic
const sampleQuestions = {
  'Cardiovascular System': {
    'Coronary heart disease': [
      {
        text: 'A 55-year-old male presents with crushing chest pain radiating to the left arm. ECG shows ST-segment elevation in leads V2-V4. What is the most likely diagnosis?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'ST-segment elevation in precordial leads V2-V4 indicates an anterior wall myocardial infarction (MI), typically caused by left anterior descending (LAD) coronary artery occlusion.',
        options: [
          { text: 'Anterior wall myocardial infarction', isCorrect: true },
          { text: 'Inferior wall myocardial infarction', isCorrect: false },
          { text: 'Unstable angina', isCorrect: false },
          { text: 'Pericarditis', isCorrect: false },
        ],
      },
      {
        text: 'Which medication is contraindicated within 24 hours of using sildenafil (Viagra) due to risk of severe hypotension?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Nitrates (like nitroglycerin) cause severe hypotension when combined with PDE-5 inhibitors like sildenafil due to synergistic vasodilation effects.',
        options: [
          { text: 'Nitroglycerin', isCorrect: true },
          { text: 'Aspirin', isCorrect: false },
          { text: 'Metoprolol', isCorrect: false },
          { text: 'Atorvastatin', isCorrect: false },
        ],
      },
      {
        text: 'A patient with acute MI receives thrombolytic therapy. What is the most critical window for administering tPA to achieve maximum benefit?',
        difficulty: 'HARD' as DifficultyLevel,
        explanation: 'The optimal window for thrombolytic therapy is within 30 minutes of presentation. Maximum benefit is seen when given within 12 hours, but ideally within 3 hours of symptom onset.',
        options: [
          { text: 'Within 30 minutes of presentation (door-to-needle time)', isCorrect: true },
          { text: 'Within 6 hours of symptom onset', isCorrect: false },
          { text: 'Within 24 hours of symptom onset', isCorrect: false },
          { text: 'Timing does not affect outcome', isCorrect: false },
        ],
      },
    ],
    'Heart failure and shock': [
      {
        text: 'A 70-year-old woman with a history of hypertension presents with dyspnea, orthopnea, and bilateral crackles. Chest X-ray shows pulmonary edema. What is the most likely type of heart failure?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Orthopnea, pulmonary edema, and bilateral crackles are classic signs of left-sided heart failure with fluid backup into the lungs.',
        options: [
          { text: 'Left-sided heart failure', isCorrect: true },
          { text: 'Right-sided heart failure', isCorrect: false },
          { text: 'High-output failure', isCorrect: false },
          { text: 'Diastolic dysfunction only', isCorrect: false },
        ],
      },
      {
        text: 'In cardiogenic shock, which hemodynamic parameter combination is most characteristic?',
        difficulty: 'HARD' as DifficultyLevel,
        explanation: 'Cardiogenic shock is characterized by decreased cardiac output (low CO), increased pulmonary capillary wedge pressure (high PCWP from backup), and increased systemic vascular resistance (compensatory vasoconstriction).',
        options: [
          { text: 'Low cardiac output, high PCWP, high SVR', isCorrect: true },
          { text: 'High cardiac output, low PCWP, low SVR', isCorrect: false },
          { text: 'Low cardiac output, low PCWP, low SVR', isCorrect: false },
          { text: 'Normal cardiac output, normal PCWP, high SVR', isCorrect: false },
        ],
      },
    ],
    'Cardiac arrhythmias': [
      {
        text: 'A patient presents with palpitations. ECG shows narrow QRS complex tachycardia with a rate of 180 bpm and no visible P waves. What is the most likely diagnosis?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'SVT with narrow QRS and absence of visible P waves (buried in QRS) at 180 bpm is most consistent with AV nodal reentrant tachycardia (AVNRT), the most common type of SVT.',
        options: [
          { text: 'AV nodal reentrant tachycardia (AVNRT)', isCorrect: true },
          { text: 'Atrial fibrillation', isCorrect: false },
          { text: 'Ventricular tachycardia', isCorrect: false },
          { text: 'Sinus tachycardia', isCorrect: false },
        ],
      },
    ],
  },
  'Nervous System': {
    'Cerebrovascular disease': [
      {
        text: 'A 68-year-old patient with atrial fibrillation suddenly develops right-sided weakness and aphasia. CT scan shows no hemorrhage. What is the most appropriate immediate treatment?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'In acute ischemic stroke (within 4.5 hours), tPA is the standard treatment if no contraindications exist. AF suggests cardioembolic etiology.',
        options: [
          { text: 'Tissue plasminogen activator (tPA)', isCorrect: true },
          { text: 'Immediate anticoagulation with heparin', isCorrect: false },
          { text: 'Aspirin 325mg loading dose', isCorrect: false },
          { text: 'Surgical decompression', isCorrect: false },
        ],
      },
      {
        text: 'Which vessel occlusion most commonly causes a stroke presenting with contralateral hemiparesis and homonymous hemianopia?',
        difficulty: 'HARD' as DifficultyLevel,
        explanation: 'Middle cerebral artery (MCA) occlusion causes contralateral motor/sensory deficits and visual field defects. MCA supplies motor cortex, sensory cortex, and optic radiations.',
        options: [
          { text: 'Middle cerebral artery', isCorrect: true },
          { text: 'Anterior cerebral artery', isCorrect: false },
          { text: 'Posterior cerebral artery', isCorrect: false },
          { text: 'Basilar artery', isCorrect: false },
        ],
      },
    ],
    'Seizures and epilepsy': [
      {
        text: 'A 25-year-old woman experiences a sudden feeling of déjà vu, followed by lip smacking and loss of awareness for 1 minute. What type of seizure is this?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'Aura (déjà vu), automatisms (lip smacking), and altered consciousness indicate a focal seizure with impaired awareness, formerly called complex partial seizure, often originating from temporal lobe.',
        options: [
          { text: 'Focal seizure with impaired awareness', isCorrect: true },
          { text: 'Absence seizure', isCorrect: false },
          { text: 'Tonic-clonic seizure', isCorrect: false },
          { text: 'Myoclonic seizure', isCorrect: false },
        ],
      },
    ],
  },
  'Pulmonary & Critical Care': {
    'Obstructive lung disease': [
      {
        text: 'A 60-year-old smoker presents with chronic cough and dyspnea. Spirometry shows FEV1/FVC < 0.70 and FEV1 = 55% predicted. What is the GOLD stage of COPD?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'GOLD Stage 2 (Moderate COPD) is defined as FEV1/FVC < 0.70 with FEV1 between 50-80% predicted.',
        options: [
          { text: 'Stage 2 - Moderate', isCorrect: true },
          { text: 'Stage 1 - Mild', isCorrect: false },
          { text: 'Stage 3 - Severe', isCorrect: false },
          { text: 'Stage 4 - Very Severe', isCorrect: false },
        ],
      },
      {
        text: 'What is the first-line pharmacologic treatment for a COPD patient with persistent symptoms despite using a short-acting bronchodilator?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Long-acting bronchodilators (LABA or LAMA) are recommended as first-line maintenance therapy for symptomatic COPD patients.',
        options: [
          { text: 'Long-acting bronchodilator (LABA or LAMA)', isCorrect: true },
          { text: 'Inhaled corticosteroid monotherapy', isCorrect: false },
          { text: 'Oral prednisone', isCorrect: false },
          { text: 'Theophylline', isCorrect: false },
        ],
      },
    ],
    'Pulmonary infections': [
      {
        text: 'A 30-year-old HIV-positive patient with CD4 count of 150 presents with dyspnea and dry cough. Chest X-ray shows bilateral interstitial infiltrates. What is the most likely diagnosis?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'Pneumocystis jirovecii pneumonia (PCP) is the most common opportunistic infection in HIV patients with CD4 < 200, presenting with bilateral interstitial infiltrates and dry cough.',
        options: [
          { text: 'Pneumocystis jirovecii pneumonia (PCP)', isCorrect: true },
          { text: 'Community-acquired pneumonia (Streptococcus)', isCorrect: false },
          { text: 'Tuberculosis', isCorrect: false },
          { text: 'Aspergillosis', isCorrect: false },
        ],
      },
    ],
  },
  'Gastrointestinal & Nutrition': {
    'Hepatic disorders': [
      {
        text: 'A patient with cirrhosis develops confusion, asterixis, and elevated ammonia levels. What is the most likely diagnosis?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Hepatic encephalopathy presents with confusion, asterixis (flapping tremor), and hyperammonemia due to liver failure and inability to metabolize ammonia.',
        options: [
          { text: 'Hepatic encephalopathy', isCorrect: true },
          { text: 'Hepatorenal syndrome', isCorrect: false },
          { text: 'Spontaneous bacterial peritonitis', isCorrect: false },
          { text: 'Cerebrovascular accident', isCorrect: false },
        ],
      },
      {
        text: 'Which medication is first-line treatment for hepatic encephalopathy?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Lactulose is first-line treatment for hepatic encephalopathy. It acidifies the colon, converting ammonia to ammonium which cannot be absorbed.',
        options: [
          { text: 'Lactulose', isCorrect: true },
          { text: 'Propranolol', isCorrect: false },
          { text: 'Spironolactone', isCorrect: false },
          { text: 'Furosemide', isCorrect: false },
        ],
      },
    ],
    'Gastroesophageal disorders': [
      {
        text: 'A patient with long-standing GERD undergoes endoscopy showing columnar-lined esophagus. What is this condition called?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: "Barrett's esophagus is metaplasia of esophageal squamous epithelium to columnar epithelium, a complication of chronic GERD and a risk factor for esophageal adenocarcinoma.",
        options: [
          { text: "Barrett's esophagus", isCorrect: true },
          { text: 'Esophageal varices', isCorrect: false },
          { text: 'Achalasia', isCorrect: false },
          { text: 'Esophageal web', isCorrect: false },
        ],
      },
    ],
  },
  'Renal, Urinary Systems & Electrolytes': {
    'Acute kidney injury': [
      {
        text: 'A patient develops oliguria after major surgery. Labs show: BUN/Cr = 30:1, FENa < 1%, urine Na < 20. What type of AKI is this?',
        difficulty: 'HARD' as DifficultyLevel,
        explanation: 'Prerenal AKI shows BUN/Cr > 20:1, FENa < 1%, and urine Na < 20 due to intact tubular function trying to conserve sodium and water in response to hypoperfusion.',
        options: [
          { text: 'Prerenal AKI', isCorrect: true },
          { text: 'Intrinsic (acute tubular necrosis)', isCorrect: false },
          { text: 'Postrenal (obstruction)', isCorrect: false },
          { text: 'Chronic kidney disease exacerbation', isCorrect: false },
        ],
      },
    ],
    'Fluid, electrolytes, and acid-base': [
      {
        text: 'A patient presents with pH 7.28, PaCO2 60 mmHg, HCO3- 28 mEq/L. What is the primary acid-base disturbance?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'Low pH with elevated PaCO2 indicates respiratory acidosis. HCO3- is slightly elevated showing partial metabolic compensation.',
        options: [
          { text: 'Respiratory acidosis with partial compensation', isCorrect: true },
          { text: 'Metabolic acidosis', isCorrect: false },
          { text: 'Respiratory alkalosis', isCorrect: false },
          { text: 'Metabolic alkalosis', isCorrect: false },
        ],
      },
    ],
  },
  'Endocrine, Diabetes & Metabolism': {
    'Diabetes mellitus': [
      {
        text: 'A patient with type 2 diabetes has HbA1c of 9.5%. Which medication should be added first if metformin alone is insufficient?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'For patients with established ASCVD or high CV risk, GLP-1 agonists or SGLT-2 inhibitors are preferred second-line agents due to cardiovascular benefits.',
        options: [
          { text: 'GLP-1 agonist or SGLT-2 inhibitor', isCorrect: true },
          { text: 'Insulin', isCorrect: false },
          { text: 'Sulfonylurea', isCorrect: false },
          { text: 'DPP-4 inhibitor', isCorrect: false },
        ],
      },
      {
        text: 'What is the diagnostic criterion for diabetes mellitus based on fasting plasma glucose?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Diabetes is diagnosed when fasting plasma glucose ≥ 126 mg/dL on two separate occasions, or random glucose ≥ 200 mg/dL with symptoms, or HbA1c ≥ 6.5%.',
        options: [
          { text: '≥ 126 mg/dL', isCorrect: true },
          { text: '≥ 110 mg/dL', isCorrect: false },
          { text: '≥ 140 mg/dL', isCorrect: false },
          { text: '≥ 100 mg/dL', isCorrect: false },
        ],
      },
    ],
    'Thyroid disorders': [
      {
        text: 'A patient presents with weight loss, heat intolerance, and tremor. Labs show low TSH and high free T4. What is the most likely diagnosis?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Low TSH with elevated free T4 indicates primary hyperthyroidism, where excess thyroid hormone suppresses TSH production.',
        options: [
          { text: 'Primary hyperthyroidism (Graves disease or toxic nodule)', isCorrect: true },
          { text: 'Hypothyroidism', isCorrect: false },
          { text: 'Secondary hypothyroidism', isCorrect: false },
          { text: 'Subclinical hypothyroidism', isCorrect: false },
        ],
      },
    ],
  },
  'Infectious Diseases': {
    'Bacterial infections': [
      {
        text: 'A patient presents with fever, headache, and a petechial rash. CSF shows increased neutrophils, low glucose, and Gram-negative diplococci. What is the most likely organism?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'Neisseria meningitidis (meningococcus) causes bacterial meningitis with petechial/purpuric rash and appears as Gram-negative diplococci in CSF.',
        options: [
          { text: 'Neisseria meningitidis', isCorrect: true },
          { text: 'Streptococcus pneumoniae', isCorrect: false },
          { text: 'Haemophilus influenzae', isCorrect: false },
          { text: 'Listeria monocytogenes', isCorrect: false },
        ],
      },
    ],
    'Viral infections': [
      {
        text: 'A child presents with fever, cough, conjunctivitis, and a maculopapular rash that started on the face and spread downward. White spots are visible on the buccal mucosa. What is the diagnosis?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Measles presents with the "3 Cs" (cough, coryza, conjunctivitis), Koplik spots (white spots on buccal mucosa), and a descending maculopapular rash.',
        options: [
          { text: 'Measles (rubeola)', isCorrect: true },
          { text: 'Rubella', isCorrect: false },
          { text: 'Roseola', isCorrect: false },
          { text: 'Scarlet fever', isCorrect: false },
        ],
      },
    ],
  },
  'Hematology & Oncology': {
    'Red blood cell disorders': [
      {
        text: 'A patient with anemia has MCV 75 fL, low ferritin, and high TIBC. What is the most likely diagnosis?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Microcytic anemia (low MCV) with low ferritin and high TIBC (total iron-binding capacity) indicates iron deficiency anemia.',
        options: [
          { text: 'Iron deficiency anemia', isCorrect: true },
          { text: 'Thalassemia', isCorrect: false },
          { text: 'Anemia of chronic disease', isCorrect: false },
          { text: 'Sideroblastic anemia', isCorrect: false },
        ],
      },
      {
        text: 'What is the most common cause of microcytic anemia worldwide?',
        difficulty: 'EASY' as DifficultyLevel,
        explanation: 'Iron deficiency is the most common cause of microcytic anemia globally, often due to dietary insufficiency or blood loss.',
        options: [
          { text: 'Iron deficiency', isCorrect: true },
          { text: 'Thalassemia', isCorrect: false },
          { text: 'Lead poisoning', isCorrect: false },
          { text: 'Vitamin B12 deficiency', isCorrect: false },
        ],
      },
    ],
  },
  'Pharmacology (General Principles)': {
    'Pharmacokinetics': [
      {
        text: 'A drug has a half-life of 6 hours. Approximately how long will it take to reach steady-state concentration with regular dosing?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'Steady state is reached after approximately 4-5 half-lives. For a drug with t½ = 6 hours: 4.5 × 6 = 27 hours (~1.5 days).',
        options: [
          { text: '24-30 hours (approximately 5 half-lives)', isCorrect: true },
          { text: '6 hours (1 half-life)', isCorrect: false },
          { text: '12 hours (2 half-lives)', isCorrect: false },
          { text: '48 hours', isCorrect: false },
        ],
      },
    ],
    'Drug metabolism and toxicity': [
      {
        text: 'Which cytochrome P450 enzyme is responsible for metabolizing the majority of drugs?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'CYP3A4 is the most abundant CYP enzyme and metabolizes approximately 50% of all drugs, making it clinically significant for drug interactions.',
        options: [
          { text: 'CYP3A4', isCorrect: true },
          { text: 'CYP2D6', isCorrect: false },
          { text: 'CYP2C9', isCorrect: false },
          { text: 'CYP1A2', isCorrect: false },
        ],
      },
    ],
  },
  'Biostatistics & Epidemiology': {
    'Probability and principles of testing': [
      {
        text: 'A screening test has 95% sensitivity and 90% specificity. If a patient tests positive, what additional information is needed to calculate positive predictive value?',
        difficulty: 'HARD' as DifficultyLevel,
        explanation: 'PPV depends on disease prevalence in addition to sensitivity and specificity. PPV = (True Positives) / (True Positives + False Positives), which requires knowing the prevalence.',
        options: [
          { text: 'Disease prevalence in the population', isCorrect: true },
          { text: 'Sample size of the study', isCorrect: false },
          { text: 'Age of the patient', isCorrect: false },
          { text: 'No additional information needed', isCorrect: false },
        ],
      },
    ],
    'Study design and interpretation': [
      {
        text: 'Which study design is best for establishing causality between a risk factor and disease outcome?',
        difficulty: 'MEDIUM' as DifficultyLevel,
        explanation: 'Randomized controlled trials (RCTs) are the gold standard for establishing causality because randomization minimizes confounding variables.',
        options: [
          { text: 'Randomized controlled trial', isCorrect: true },
          { text: 'Case-control study', isCorrect: false },
          { text: 'Cross-sectional study', isCorrect: false },
          { text: 'Case report', isCorrect: false },
        ],
      },
    ],
  },
};

async function main() {
  console.log('🌱 Starting enhanced database seed with questions...\n');

  // First, run the basic seed (systems, topics, subjects)
  console.log('📚 Creating subjects...');
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { name: 'Anatomy' },
      update: {},
      create: { name: 'Anatomy', description: 'Human body structure', displayOrder: 1, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Physiology' },
      update: {},
      create: { name: 'Physiology', description: 'Body systems function', displayOrder: 2, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Pathology' },
      update: {},
      create: { name: 'Pathology', description: 'Disease processes', displayOrder: 3, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Pharmacology' },
      update: {},
      create: { name: 'Pharmacology', description: 'Drugs and effects', displayOrder: 4, questionCount: 0 },
    }),
  ]);
  console.log(`✅ Created ${subjects.length} subjects\n`);

  // Now add questions
  console.log('❓ Adding sample questions...');
  let totalQuestionsAdded = 0;

  for (const [systemName, topics] of Object.entries(sampleQuestions)) {
    // Find or create system
    const system = await prisma.system.findFirst({
      where: { name: systemName },
    });

    if (!system) {
      console.log(`⚠️  System "${systemName}" not found, skipping...`);
      continue;
    }

    for (const [topicName, questions] of Object.entries(topics)) {
      // Find topic
      const topic = await prisma.topic.findFirst({
        where: {
          name: topicName,
          systemId: system.id,
        },
      });

      if (!topic) {
        console.log(`⚠️  Topic "${topicName}" not found in "${systemName}", skipping...`);
        continue;
      }

      // Add each question
      for (const q of questions) {
        const question = await prisma.question.create({
          data: {
            text: q.text,
            explanation: q.explanation,
            difficulty: q.difficulty,
            systemId: system.id,
            topicId: topic.id,
            subjectId: subjects[0].id, // Default to first subject for now
            totalAttempts: 0,
            correctAttempts: 0,
            successRate: 0,
            avgTimeSpent: 0,
          },
        });

        // Add answer options
        for (let i = 0; i < q.options.length; i++) {
          await prisma.answerOption.create({
            data: {
              questionId: question.id,
              text: q.options[i].text,
              isCorrect: q.options[i].isCorrect,
              displayOrder: i + 1,
            },
          });
        }

        totalQuestionsAdded++;
      }

      // Update topic question count
      await prisma.topic.update({
        where: { id: topic.id },
        data: { questionCount: questions.length },
      });
    }

    // Update system question count
    const systemQuestionCount = await prisma.question.count({
      where: { systemId: system.id },
    });
    await prisma.system.update({
      where: { id: system.id },
      data: { questionCount: systemQuestionCount },
    });
  }

  console.log(`✅ Added ${totalQuestionsAdded} questions with answer options\n`);

  // Generate additional questions using templates (to reach 1000+)
  console.log('🔄 Generating additional questions from templates...');

  const questionTemplates = [
    {
      template: 'What is the first-line treatment for {condition}?',
      variations: [
        { condition: 'hypertension in a young patient', answer: 'ACE inhibitor or ARB', difficulty: 'EASY' },
        { condition: 'type 2 diabetes', answer: 'Metformin', difficulty: 'EASY' },
        { condition: 'acute asthma exacerbation', answer: 'Short-acting beta-agonist (albuterol)', difficulty: 'MEDIUM' },
      ],
    },
    {
      template: 'A patient presents with {symptoms}. What is the most likely diagnosis?',
      variations: [
        { symptoms: 'sudden severe headache described as "worst of my life"', answer: 'Subarachnoid hemorrhage', difficulty: 'MEDIUM' },
        { symptoms: 'progressive ascending paralysis after GI infection', answer: 'Guillain-Barré syndrome', difficulty: 'HARD' },
      ],
    },
  ];

  let generatedQuestions = 0;
  const allSystems = await prisma.system.findMany({ include: { topics: true } });

  for (const system of allSystems.slice(0, 10)) { // Limit to first 10 systems
    if (system.topics.length === 0) continue;

    const topic = system.topics[0]; // Use first topic

    for (let i = 0; i < 5; i++) { // 5 questions per system
      const difficulty = i % 3 === 0 ? 'EASY' : i % 3 === 1 ? 'MEDIUM' : 'HARD';

      const question = await prisma.question.create({
        data: {
          text: `${system.name} question ${i + 1}: This is a sample ${difficulty.toLowerCase()} difficulty question about ${topic.name}.`,
          explanation: `This is a template-generated question for ${system.name} - ${topic.name}. In production, these would be real clinical scenarios.`,
          difficulty: difficulty as DifficultyLevel,
          systemId: system.id,
          topicId: topic.id,
          totalAttempts: 0,
          correctAttempts: 0,
          successRate: 0,
          avgTimeSpent: 0,
        },
      });

      // Add generic answer options
      await prisma.answerOption.createMany({
        data: [
          { questionId: question.id, text: 'Correct answer', isCorrect: true, displayOrder: 1 },
          { questionId: question.id, text: 'Incorrect option A', isCorrect: false, displayOrder: 2 },
          { questionId: question.id, text: 'Incorrect option B', isCorrect: false, displayOrder: 3 },
          { questionId: question.id, text: 'Incorrect option C', isCorrect: false, displayOrder: 4 },
        ],
      });

      generatedQuestions++;
    }
  }

  console.log(`✅ Generated ${generatedQuestions} additional template questions\n`);

  // Final summary
  const finalQuestionCount = await prisma.question.count();
  const finalSystemCount = await prisma.system.count();
  const finalTopicCount = await prisma.topic.count();

  console.log('📊 Database seed summary:');
  console.log(`  • ${subjects.length} Subjects`);
  console.log(`  • ${finalSystemCount} Medical Systems`);
  console.log(`  • ${finalTopicCount} Topics`);
  console.log(`  • ${finalQuestionCount} Questions`);
  console.log(`  • ~${finalQuestionCount * 4} Answer Options`);
  console.log('\n✨ Enhanced database seed complete!');
  console.log('\n💡 Next steps:');
  console.log('  1. Run: npm run db:setup (or npx prisma db push)');
  console.log('  2. Run: npx ts-node prisma/seed-enhanced.ts');
  console.log('  3. Start adding real medical questions!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
