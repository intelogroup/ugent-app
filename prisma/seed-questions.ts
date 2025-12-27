import { PrismaClient, DifficultyLevel } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed questions...\n');

  // First, let's create some subjects if they don't exist
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { name: 'Anatomy' },
      update: {},
      create: { name: 'Anatomy', displayOrder: 1, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Physiology' },
      update: {},
      create: { name: 'Physiology', displayOrder: 2, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Biochemistry' },
      update: {},
      create: { name: 'Biochemistry', displayOrder: 3, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Pathology' },
      update: {},
      create: { name: 'Pathology', displayOrder: 4, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Pharmacology' },
      update: {},
      create: { name: 'Pharmacology', displayOrder: 5, questionCount: 0 },
    }),
    prisma.subject.upsert({
      where: { name: 'Microbiology' },
      update: {},
      create: { name: 'Microbiology', displayOrder: 6, questionCount: 0 },
    }),
  ]);

  console.log(`✅ Created/verified ${subjects.length} subjects\n`);

  // Create systems with topics
  const cardioSystem = await prisma.system.upsert({
    where: { name: 'Cardiovascular System' },
    update: {},
    create: {
      name: 'Cardiovascular System',
      description: 'Heart and blood vessels',
      displayOrder: 1,
      questionCount: 0,
    },
  });

  const cardioTopics = await Promise.all([
    prisma.topic.upsert({
      where: { systemId_name: { systemId: cardioSystem.id, name: 'Coronary heart disease' } },
      update: {},
      create: {
        systemId: cardioSystem.id,
        name: 'Coronary heart disease',
        displayOrder: 1,
        questionCount: 0,
      },
    }),
    prisma.topic.upsert({
      where: { systemId_name: { systemId: cardioSystem.id, name: 'Heart failure' } },
      update: {},
      create: {
        systemId: cardioSystem.id,
        name: 'Heart failure',
        displayOrder: 2,
        questionCount: 0,
      },
    }),
    prisma.topic.upsert({
      where: { systemId_name: { systemId: cardioSystem.id, name: 'Cardiac arrhythmias' } },
      update: {},
      create: {
        systemId: cardioSystem.id,
        name: 'Cardiac arrhythmias',
        displayOrder: 3,
        questionCount: 0,
      },
    }),
  ]);

  const respiratorySystem = await prisma.system.upsert({
    where: { name: 'Respiratory System' },
    update: {},
    create: {
      name: 'Respiratory System',
      description: 'Lungs and airways',
      displayOrder: 2,
      questionCount: 0,
    },
  });

  const respiratoryTopics = await Promise.all([
    prisma.topic.upsert({
      where: { systemId_name: { systemId: respiratorySystem.id, name: 'Asthma and COPD' } },
      update: {},
      create: {
        systemId: respiratorySystem.id,
        name: 'Asthma and COPD',
        displayOrder: 1,
        questionCount: 0,
      },
    }),
    prisma.topic.upsert({
      where: { systemId_name: { systemId: respiratorySystem.id, name: 'Pneumonia' } },
      update: {},
      create: {
        systemId: respiratorySystem.id,
        name: 'Pneumonia',
        displayOrder: 2,
        questionCount: 0,
      },
    }),
  ]);

  const nervousSystem = await prisma.system.upsert({
    where: { name: 'Nervous System' },
    update: {},
    create: {
      name: 'Nervous System',
      description: 'Brain, spinal cord, and nerves',
      displayOrder: 3,
      questionCount: 0,
    },
  });

  const nervousTopics = await Promise.all([
    prisma.topic.upsert({
      where: { systemId_name: { systemId: nervousSystem.id, name: 'Stroke' } },
      update: {},
      create: {
        systemId: nervousSystem.id,
        name: 'Stroke',
        displayOrder: 1,
        questionCount: 0,
      },
    }),
    prisma.topic.upsert({
      where: { systemId_name: { systemId: nervousSystem.id, name: 'Epilepsy' } },
      update: {},
      create: {
        systemId: nervousSystem.id,
        name: 'Epilepsy',
        displayOrder: 2,
        questionCount: 0,
      },
    }),
  ]);

  console.log(`✅ Created/verified systems and topics\n`);

  // Helper function to create a question
  async function createQuestion(data: {
    text: string;
    explanation: string;
    difficulty: DifficultyLevel;
    subjectId?: string;
    systemId?: string;
    topicId?: string;
    options: Array<{ text: string; isCorrect: boolean }>;
  }) {
    return await prisma.question.create({
      data: {
        text: data.text,
        explanation: data.explanation,
        difficulty: data.difficulty,
        subjectId: data.subjectId,
        systemId: data.systemId,
        topicId: data.topicId,
        options: {
          createMany: {
            data: data.options.map((opt, idx) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              displayOrder: idx,
            })),
          },
        },
      },
    });
  }

  // Create diverse questions across subjects and topics
  const questions = [];

  // Cardiovascular + Anatomy questions
  questions.push(
    await createQuestion({
      text: 'Which chamber of the heart receives oxygenated blood from the lungs?',
      explanation: 'The left atrium receives oxygenated blood from the pulmonary veins returning from the lungs.',
      difficulty: 'EASY',
      subjectId: subjects[0].id, // Anatomy
      systemId: cardioSystem.id,
      topicId: cardioTopics[0].id,
      options: [
        { text: 'Right atrium', isCorrect: false },
        { text: 'Left atrium', isCorrect: true },
        { text: 'Right ventricle', isCorrect: false },
        { text: 'Left ventricle', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the primary cause of myocardial infarction?',
      explanation: 'Myocardial infarction is primarily caused by thrombotic occlusion of a coronary artery, often due to atherosclerotic plaque rupture.',
      difficulty: 'MEDIUM',
      subjectId: subjects[3].id, // Pathology
      systemId: cardioSystem.id,
      topicId: cardioTopics[0].id,
      options: [
        { text: 'Coronary artery thrombosis', isCorrect: true },
        { text: 'Ventricular hypertrophy', isCorrect: false },
        { text: 'Atrial fibrillation', isCorrect: false },
        { text: 'Pulmonary embolism', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'Which medication class is first-line for treating chronic heart failure with reduced ejection fraction?',
      explanation: 'ACE inhibitors are first-line therapy for heart failure with reduced ejection fraction, improving survival and reducing hospitalizations.',
      difficulty: 'MEDIUM',
      subjectId: subjects[4].id, // Pharmacology
      systemId: cardioSystem.id,
      topicId: cardioTopics[1].id,
      options: [
        { text: 'Calcium channel blockers', isCorrect: false },
        { text: 'ACE inhibitors', isCorrect: true },
        { text: 'Alpha blockers', isCorrect: false },
        { text: 'Thiazide diuretics alone', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the most common cause of atrial fibrillation?',
      explanation: 'Hypertension is the most common underlying condition associated with atrial fibrillation, followed by coronary artery disease and valvular heart disease.',
      difficulty: 'EASY',
      subjectId: subjects[3].id, // Pathology
      systemId: cardioSystem.id,
      topicId: cardioTopics[2].id,
      options: [
        { text: 'Hypertension', isCorrect: true },
        { text: 'Diabetes mellitus', isCorrect: false },
        { text: 'Hyperthyroidism alone', isCorrect: false },
        { text: 'Obesity alone', isCorrect: false },
      ],
    })
  );

  // Respiratory + Physiology questions
  questions.push(
    await createQuestion({
      text: 'What is the primary muscle of respiration?',
      explanation: 'The diaphragm is the primary muscle of respiration, responsible for 70-80% of the work of breathing during quiet respiration.',
      difficulty: 'EASY',
      subjectId: subjects[0].id, // Anatomy
      systemId: respiratorySystem.id,
      topicId: respiratoryTopics[0].id,
      options: [
        { text: 'External intercostals', isCorrect: false },
        { text: 'Diaphragm', isCorrect: true },
        { text: 'Scalene muscles', isCorrect: false },
        { text: 'Abdominal muscles', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'In COPD, what is the primary pathophysiologic mechanism of airflow limitation?',
      explanation: 'In COPD, airflow limitation is primarily caused by small airway disease (bronchiolitis) and parenchymal destruction (emphysema), leading to loss of elastic recoil and airway collapse.',
      difficulty: 'HARD',
      subjectId: subjects[3].id, // Pathology
      systemId: respiratorySystem.id,
      topicId: respiratoryTopics[0].id,
      options: [
        { text: 'Bronchospasm alone', isCorrect: false },
        { text: 'Mucus hypersecretion alone', isCorrect: false },
        { text: 'Loss of elastic recoil and small airway disease', isCorrect: true },
        { text: 'Pulmonary hypertension', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the most common bacterial cause of community-acquired pneumonia?',
      explanation: 'Streptococcus pneumoniae is the most common bacterial pathogen causing community-acquired pneumonia across all age groups.',
      difficulty: 'EASY',
      subjectId: subjects[5].id, // Microbiology
      systemId: respiratorySystem.id,
      topicId: respiratoryTopics[1].id,
      options: [
        { text: 'Streptococcus pneumoniae', isCorrect: true },
        { text: 'Haemophilus influenzae', isCorrect: false },
        { text: 'Staphylococcus aureus', isCorrect: false },
        { text: 'Klebsiella pneumoniae', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'Which of the following best describes the oxygen-hemoglobin dissociation curve shift in acidosis?',
      explanation: 'Acidosis causes a rightward shift of the oxygen-hemoglobin dissociation curve (Bohr effect), decreasing hemoglobin affinity for oxygen and promoting oxygen release to tissues.',
      difficulty: 'MEDIUM',
      subjectId: subjects[1].id, // Physiology
      systemId: respiratorySystem.id,
      topicId: respiratoryTopics[0].id,
      options: [
        { text: 'Leftward shift, increased oxygen affinity', isCorrect: false },
        { text: 'Rightward shift, decreased oxygen affinity', isCorrect: true },
        { text: 'No change in the curve', isCorrect: false },
        { text: 'Curve becomes linear', isCorrect: false },
      ],
    })
  );

  // Nervous System questions
  questions.push(
    await createQuestion({
      text: 'What is the most common cause of ischemic stroke?',
      explanation: 'Atherosclerotic thrombosis and thromboembolism from cardiac sources (especially atrial fibrillation) are the most common causes of ischemic stroke.',
      difficulty: 'EASY',
      subjectId: subjects[3].id, // Pathology
      systemId: nervousSystem.id,
      topicId: nervousTopics[0].id,
      options: [
        { text: 'Arterial thrombosis or embolism', isCorrect: true },
        { text: 'Venous thrombosis', isCorrect: false },
        { text: 'Vasculitis', isCorrect: false },
        { text: 'Arteriovenous malformation', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'Which neurotransmitter is primarily involved in the pathophysiology of epilepsy?',
      explanation: 'Epilepsy involves an imbalance between excitatory (glutamate) and inhibitory (GABA) neurotransmission, with decreased GABAergic inhibition playing a key role.',
      difficulty: 'MEDIUM',
      subjectId: subjects[1].id, // Physiology
      systemId: nervousSystem.id,
      topicId: nervousTopics[1].id,
      options: [
        { text: 'Dopamine', isCorrect: false },
        { text: 'Serotonin', isCorrect: false },
        { text: 'GABA and Glutamate', isCorrect: true },
        { text: 'Acetylcholine', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the mechanism of action of tissue plasminogen activator (tPA) in acute ischemic stroke?',
      explanation: 'tPA converts plasminogen to plasmin, which breaks down fibrin clots, restoring blood flow in occluded cerebral arteries.',
      difficulty: 'MEDIUM',
      subjectId: subjects[4].id, // Pharmacology
      systemId: nervousSystem.id,
      topicId: nervousTopics[0].id,
      options: [
        { text: 'Blocks platelet aggregation', isCorrect: false },
        { text: 'Converts plasminogen to plasmin', isCorrect: true },
        { text: 'Inhibits thrombin', isCorrect: false },
        { text: 'Activates protein C', isCorrect: false },
      ],
    })
  );

  // Biochemistry questions
  questions.push(
    await createQuestion({
      text: 'Which enzyme is deficient in phenylketonuria (PKU)?',
      explanation: 'PKU is caused by deficiency of phenylalanine hydroxylase, leading to accumulation of phenylalanine and its metabolites.',
      difficulty: 'EASY',
      subjectId: subjects[2].id, // Biochemistry
      options: [
        { text: 'Tyrosine hydroxylase', isCorrect: false },
        { text: 'Phenylalanine hydroxylase', isCorrect: true },
        { text: 'Homogentisate oxidase', isCorrect: false },
        { text: 'DOPA decarboxylase', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the rate-limiting enzyme of glycolysis?',
      explanation: 'Phosphofructokinase-1 (PFK-1) catalyzes the conversion of fructose-6-phosphate to fructose-1,6-bisphosphate and is the rate-limiting step of glycolysis.',
      difficulty: 'MEDIUM',
      subjectId: subjects[2].id, // Biochemistry
      options: [
        { text: 'Hexokinase', isCorrect: false },
        { text: 'Phosphofructokinase-1', isCorrect: true },
        { text: 'Pyruvate kinase', isCorrect: false },
        { text: 'Glucose-6-phosphate dehydrogenase', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'Which vitamin deficiency causes megaloblastic anemia?',
      explanation: 'Deficiency of vitamin B12 (cobalamin) or folate causes megaloblastic anemia due to impaired DNA synthesis.',
      difficulty: 'EASY',
      subjectId: subjects[2].id, // Biochemistry
      options: [
        { text: 'Vitamin B6', isCorrect: false },
        { text: 'Vitamin B12 or Folate', isCorrect: true },
        { text: 'Vitamin K', isCorrect: false },
        { text: 'Vitamin D', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the primary mechanism by which statins lower cholesterol?',
      explanation: 'Statins inhibit HMG-CoA reductase, the rate-limiting enzyme in cholesterol synthesis, leading to increased LDL receptor expression and decreased serum cholesterol.',
      difficulty: 'MEDIUM',
      subjectId: subjects[4].id, // Pharmacology
      options: [
        { text: 'Inhibit HMG-CoA reductase', isCorrect: true },
        { text: 'Inhibit cholesterol absorption', isCorrect: false },
        { text: 'Increase bile acid excretion', isCorrect: false },
        { text: 'Activate lipoprotein lipase', isCorrect: false },
      ],
    })
  );

  // Microbiology questions
  questions.push(
    await createQuestion({
      text: 'Which bacteria is the most common cause of urinary tract infections?',
      explanation: 'Escherichia coli is responsible for approximately 80-85% of community-acquired urinary tract infections.',
      difficulty: 'EASY',
      subjectId: subjects[5].id, // Microbiology
      options: [
        { text: 'Staphylococcus saprophyticus', isCorrect: false },
        { text: 'Escherichia coli', isCorrect: true },
        { text: 'Klebsiella pneumoniae', isCorrect: false },
        { text: 'Proteus mirabilis', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What is the mechanism of action of beta-lactam antibiotics?',
      explanation: 'Beta-lactam antibiotics (penicillins, cephalosporins) inhibit bacterial cell wall synthesis by binding to penicillin-binding proteins and preventing peptidoglycan cross-linking.',
      difficulty: 'MEDIUM',
      subjectId: subjects[5].id, // Microbiology
      options: [
        { text: 'Inhibit protein synthesis', isCorrect: false },
        { text: 'Inhibit cell wall synthesis', isCorrect: true },
        { text: 'Inhibit DNA replication', isCorrect: false },
        { text: 'Disrupt cell membrane', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'Which virus is associated with Burkitt lymphoma?',
      explanation: 'Epstein-Barr virus (EBV) is strongly associated with endemic Burkitt lymphoma, particularly in Africa.',
      difficulty: 'MEDIUM',
      subjectId: subjects[5].id, // Microbiology
      options: [
        { text: 'Human papillomavirus', isCorrect: false },
        { text: 'Epstein-Barr virus', isCorrect: true },
        { text: 'Cytomegalovirus', isCorrect: false },
        { text: 'Hepatitis B virus', isCorrect: false },
      ],
    })
  );

  // Additional Anatomy questions
  questions.push(
    await createQuestion({
      text: 'Which cranial nerve is responsible for lateral eye movement?',
      explanation: 'The abducens nerve (CN VI) innervates the lateral rectus muscle, which is responsible for lateral (abduction) movement of the eye.',
      difficulty: 'EASY',
      subjectId: subjects[0].id, // Anatomy
      options: [
        { text: 'Oculomotor (CN III)', isCorrect: false },
        { text: 'Trochlear (CN IV)', isCorrect: false },
        { text: 'Abducens (CN VI)', isCorrect: true },
        { text: 'Optic (CN II)', isCorrect: false },
      ],
    })
  );

  questions.push(
    await createQuestion({
      text: 'What structure connects the two cerebral hemispheres?',
      explanation: 'The corpus callosum is the largest white matter structure in the brain, containing commissural fibers that connect the two cerebral hemispheres.',
      difficulty: 'EASY',
      subjectId: subjects[0].id, // Anatomy
      systemId: nervousSystem.id,
      options: [
        { text: 'Fornix', isCorrect: false },
        { text: 'Corpus callosum', isCorrect: true },
        { text: 'Internal capsule', isCorrect: false },
        { text: 'Anterior commissure', isCorrect: false },
      ],
    })
  );

  // Update question counts for subjects
  for (const subject of subjects) {
    const count = await prisma.question.count({
      where: { subjectId: subject.id },
    });
    await prisma.subject.update({
      where: { id: subject.id },
      data: { questionCount: count },
    });
  }

  // Update question counts for systems
  const systems = [cardioSystem, respiratorySystem, nervousSystem];
  for (const system of systems) {
    const count = await prisma.question.count({
      where: { systemId: system.id },
    });
    await prisma.system.update({
      where: { id: system.id },
      data: { questionCount: count },
    });
  }

  // Update question counts for topics
  const allTopics = [...cardioTopics, ...respiratoryTopics, ...nervousTopics];
  for (const topic of allTopics) {
    const count = await prisma.question.count({
      where: { topicId: topic.id },
    });
    await prisma.topic.update({
      where: { id: topic.id },
      data: { questionCount: count },
    });
  }

  console.log(`\n✅ Successfully created ${questions.length} questions!`);
  console.log(`\n📊 Question distribution by subject:`);

  for (const subject of subjects) {
    const count = await prisma.question.count({
      where: { subjectId: subject.id },
    });
    console.log(`   - ${subject.name}: ${count} questions`);
  }

  console.log(`\n📊 Question distribution by system:`);
  for (const system of systems) {
    const count = await prisma.question.count({
      where: { systemId: system.id },
    });
    console.log(`   - ${system.name}: ${count} questions`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
