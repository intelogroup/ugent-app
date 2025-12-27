import { PrismaClient, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionData {
  text: string;
  explanation: string;
  difficulty: DifficultyLevel;
  subject: string;
  system: string;
  topic: string;
  answers: { text: string; isCorrect: boolean }[];
}

const questions: QuestionData[] = [
  // CARDIAC ARRHYTHMIAS (5 questions)
  {
    text: 'A 68-year-old man presents with palpitations and irregular pulse. EKG shows absent P waves and irregular ventricular rate of 120 bpm. What is the most likely diagnosis?',
    explanation: 'Atrial fibrillation presents with absent P waves, irregular ventricular rate, and RVR (rapid ventricular response). The irregular rhythm is the hallmark finding.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Atrial fibrillation', isCorrect: true },
      { text: 'Atrial flutter', isCorrect: false },
      { text: 'Sinus tachycardia', isCorrect: false },
      { text: 'Supraventricular tachycardia', isCorrect: false },
    ],
  },
  {
    text: 'Which medication is contraindicated in a patient with WPW syndrome experiencing atrial fibrillation?',
    explanation: 'AV nodal blocking agents (digoxin, beta-blockers, calcium channel blockers) are contraindicated in WPW with AFib because they can accelerate conduction via the accessory pathway, causing dangerous rapid ventricular rates.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Digoxin', isCorrect: true },
      { text: 'Procainamide', isCorrect: false },
      { text: 'Flecainide', isCorrect: false },
      { text: 'Amiodarone', isCorrect: false },
    ],
  },
  {
    text: 'A patient has a prolonged PR interval with a 2:1 AV block. Where is the block most likely located?',
    explanation: 'A 2:1 AV block with prolonged PR interval suggests an infranodal block (Mobitz II) in the His bundle or bundle branches, which carries risk of complete heart block.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'His bundle or bundle branches', isCorrect: true },
      { text: 'AV node', isCorrect: false },
      { text: 'SA node', isCorrect: false },
      { text: 'Sinoatrial tissue', isCorrect: false },
    ],
  },
  {
    text: 'Which arrhythmia is characterized by a "sawtooth" pattern on EKG?',
    explanation: 'Atrial flutter presents with a distinctive sawtooth or flutter wave pattern due to rapid atrial depolarization at 250-350 bpm, typically with 2:1 AV conduction.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Atrial flutter', isCorrect: true },
      { text: 'Atrial fibrillation', isCorrect: false },
      { text: 'Ventricular fibrillation', isCorrect: false },
      { text: 'Paroxysmal SVT', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old patient with recurrent palpitations has EKG evidence of an accessory pathway. What maneuver would help differentiate AVNRT from AVRT?',
    explanation: 'Adenosine blocks the AV node. In AVNRT, both antegrade and retrograde conduction are through the AV node, so adenosine terminates it. In AVRT with orthodromic conduction, adenosine blocks the AV node but conduction continues via the accessory pathway.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Adenosine administration', isCorrect: true },
      { text: 'Carotid massage', isCorrect: false },
      { text: 'Vagal maneuver', isCorrect: false },
      { text: 'Exercise stress test', isCorrect: false },
    ],
  },

  // HEART FAILURE (5 questions)
  {
    text: 'A 70-year-old with chronic hypertension presents with dyspnea and normal ejection fraction. What is the mechanism of heart failure in this patient?',
    explanation: 'In diastolic heart failure (HFpEF), the ventricle becomes stiff due to prolonged hypertension, impairing relaxation and filling despite normal contractility. This represents about 50% of HF cases.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Impaired ventricular relaxation', isCorrect: true },
      { text: 'Reduced myocardial contractility', isCorrect: false },
      { text: 'Mitral stenosis', isCorrect: false },
      { text: 'Aortic regurgitation', isCorrect: false },
    ],
  },
  {
    text: 'Which natriuretic peptide is more specific for heart failure diagnosis?',
    explanation: 'BNP (B-type natriuretic peptide) and NT-proBNP are more heart-specific than ANP. Both are released from ventricular myocardium in response to increased wall stress.',
    difficulty: 'MEDIUM',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'BNP and NT-proBNP', isCorrect: true },
      { text: 'ANP', isCorrect: false },
      { text: 'Troponin I', isCorrect: false },
      { text: 'Myoglobin', isCorrect: false },
    ],
  },
  {
    text: 'A patient with acute decompensated heart failure and reduced ejection fraction shows improvement in symptoms but develops hyperkalemia after ACE inhibitor initiation. What is the mechanism?',
    explanation: 'ACE inhibitors reduce angiotensin II, which decreases aldosterone production. Less aldosterone leads to reduced urinary potassium excretion, causing hyperkalemia.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Decreased aldosterone-mediated potassium excretion', isCorrect: true },
      { text: 'Direct renal tubular potassium retention', isCorrect: false },
      { text: 'Increased GFR', isCorrect: false },
      { text: 'Enhanced proximal tubule reabsorption', isCorrect: false },
    ],
  },
  {
    text: 'Which finding on physical examination suggests elevated jugular venous pressure from right heart failure?',
    explanation: 'Elevated JVP (>4 cm H2O above the sternal angle) indicates elevated right atrial pressure. It increases with abdominal pressure (hepatojugular reflex) in right heart failure.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Elevated JVP with hepatojugular reflex', isCorrect: true },
      { text: 'Decreased JVP', isCorrect: false },
      { text: 'Prominent carotid pulsations', isCorrect: false },
      { text: 'Diminished S1', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old man with heart failure and reduced ejection fraction is started on a beta-blocker. Why is this beneficial even though it decreases cardiac output acutely?',
    explanation: 'Beta-blockers reduce sympathetic overstimulation, decrease heart rate and afterload, and improve ventricular remodeling. Long-term benefits include reduced mortality and improved ejection fraction.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Reduces sympathetic overstimulation and improves remodeling', isCorrect: true },
      { text: 'Increases cardiac contractility', isCorrect: false },
      { text: 'Increases systemic vascular resistance', isCorrect: false },
      { text: 'Decreases pulmonary edema immediately', isCorrect: false },
    ],
  },

  // CORONARY HEART DISEASE (5 questions)
  {
    text: 'A 60-year-old man with history of smoking presents with acute chest pain and ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?',
    explanation: 'Inferior wall MI (ST elevation in II, III, aVF) is caused by right coronary artery (RCA) occlusion in 85% of cases; circumflex is responsible in 15%.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Right coronary artery', isCorrect: true },
      { text: 'Left anterior descending', isCorrect: false },
      { text: 'Left circumflex', isCorrect: false },
      { text: 'Left main coronary', isCorrect: false },
    ],
  },
  {
    text: 'What is the pathophysiology of acute coronary syndrome in a patient with plaque rupture?',
    explanation: 'Plaque rupture exposes thrombogenic material, activating platelets and coagulation cascade. This forms an intraluminal thrombus that may partially or completely occlude the vessel.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Thrombus formation from exposure of thrombogenic core', isCorrect: true },
      { text: 'Vasospasm without plaque involvement', isCorrect: false },
      { text: 'Gradual narrowing from collagen deposition', isCorrect: false },
      { text: 'Arterial dissection', isCorrect: false },
    ],
  },
  {
    text: 'Which risk factor modification has the strongest evidence for reducing recurrent coronary events?',
    explanation: 'Smoking cessation offers the most dramatic risk reduction for recurrent coronary events within months of stopping, with benefits exceeding those of lipid-lowering or blood pressure control.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Smoking cessation', isCorrect: true },
      { text: 'Statin therapy', isCorrect: false },
      { text: 'Blood pressure control', isCorrect: false },
      { text: 'Glucose control', isCorrect: false },
    ],
  },
  {
    text: 'A patient with NSTEMI shows persistent troponin elevation without rise-and-fall pattern. What is the most likely cause?',
    explanation: 'Troponin elevation without the typical rise-and-fall pattern may indicate chronic kidney disease, heart failure, myocarditis, sepsis, or prior MI. This requires clinical correlation.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Chronic kidney disease or heart failure', isCorrect: true },
      { text: 'Acute MI in progress', isCorrect: false },
      { text: 'Coronary vasospasm', isCorrect: false },
      { text: 'Pulmonary embolism', isCorrect: false },
    ],
  },
  {
    text: 'Which medication class reduces both mortality and reinfarction rate in post-MI patients with reduced ejection fraction?',
    explanation: 'ACE inhibitors, angiotensin II receptor blockers, and beta-blockers all reduce mortality and reinfarction in post-MI HFrEF. ACE-I are first-line and started early.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'ACE inhibitors', isCorrect: true },
      { text: 'Calcium channel blockers', isCorrect: false },
      { text: 'Nitrates', isCorrect: false },
      { text: 'Diuretics', isCorrect: false },
    ],
  },

  // ASTHMA AND COPD (5 questions)
  {
    text: 'A 35-year-old woman with asthma presents with acute dyspnea unresponsive to albuterol. Peak flow is 40% of personal best. What is the next appropriate step?',
    explanation: 'Severe asthma exacerbation (peak flow <50% predicted) with inadequate response to beta-2 agonists requires systemic corticosteroids and consideration of IV magnesium.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Administer systemic corticosteroids', isCorrect: true },
      { text: 'Increase albuterol frequency', isCorrect: false },
      { text: 'Start leukotriene inhibitor', isCorrect: false },
      { text: 'Discharge with peak flow monitoring', isCorrect: false },
    ],
  },
  {
    text: 'Which spirometry pattern is consistent with COPD?',
    explanation: 'COPD shows reduced FEV1/FVC ratio (<70%) with obstruction. FEV1 is typically reduced more than FVC due to air trapping. FVC may be normal or reduced.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Reduced FEV1/FVC ratio with reduced FEV1', isCorrect: true },
      { text: 'Reduced FVC with normal FEV1/FVC ratio', isCorrect: false },
      { text: 'Normal FEV1/FVC with reduced FVC', isCorrect: false },
      { text: 'Increased FEV1/FVC ratio', isCorrect: false },
    ],
  },
  {
    text: 'A 65-year-old COPD patient with FEV1 of 35% predicted presents with dyspnea at rest. What long-acting bronchodilator combination is most effective?',
    explanation: 'For GOLD Stage 4 (very severe COPD), dual bronchodilator therapy (LABA + LAMA) provides superior bronchodilation compared to monotherapy.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Long-acting beta-agonist + long-acting muscarinic antagonist', isCorrect: true },
      { text: 'Short-acting beta-agonist only', isCorrect: false },
      { text: 'Anticholinergic monotherapy', isCorrect: false },
      { text: 'Theophylline', isCorrect: false },
    ],
  },
  {
    text: 'What is the primary mechanism of action of inhaled corticosteroids in asthma management?',
    explanation: 'Inhaled corticosteroids reduce airway inflammation by suppressing T-cell activation, decreasing eosinophil recruitment, and reducing mucus production.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Reduce airway inflammation', isCorrect: true },
      { text: 'Directly relax airway smooth muscle', isCorrect: false },
      { text: 'Increase mucus clearance', isCorrect: false },
      { text: 'Inhibit mast cell degranulation only', isCorrect: false },
    ],
  },
  {
    text: 'A patient with asthma experiences anaphylaxis after exposure to aspirin. What is the mechanism of this reaction?',
    explanation: 'NSAIDs and aspirin in asthmatics cause shunting of arachidonic acid to leukotriene production, triggering bronchoconstriction via COX-1 inhibition. This is not IgE-mediated.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'COX-1 inhibition leading to increased leukotriene production', isCorrect: true },
      { text: 'IgE-mediated anaphylaxis', isCorrect: false },
      { text: 'Histamine release from mast cells', isCorrect: false },
      { text: 'Complement-mediated reaction', isCorrect: false },
    ],
  },

  // PNEUMONIA (5 questions)
  {
    text: 'A 72-year-old hospitalized patient on mechanical ventilation develops fever and purulent sputum on day 5 of hospitalization. What is the most likely organism?',
    explanation: 'Hospital-acquired (ventilator-associated) pneumonia typically occurs after 48 hours in ICU and is commonly caused by Pseudomonas aeruginosa, MRSA, or Acinetobacter.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Pseudomonas aeruginosa', isCorrect: true },
      { text: 'Streptococcus pneumoniae', isCorrect: false },
      { text: 'Haemophilus influenzae', isCorrect: false },
      { text: 'Legionella pneumophila', isCorrect: false },
    ],
  },
  {
    text: 'Which finding on chest X-ray is most specific for aspiration pneumonia?',
    explanation: 'Aspiration pneumonia typically affects dependent lung segments (superior segments of lower lobes). In supine patients, the right upper lobe and right lower lobe posterior segments are preferentially affected.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Infiltrate in superior segment of right lower lobe', isCorrect: true },
      { text: 'Bilateral apical infiltrates', isCorrect: false },
      { text: 'Diffuse alveolar infiltrate', isCorrect: false },
      { text: 'Pneumothorax', isCorrect: false },
    ],
  },
  {
    text: 'A 28-year-old otherwise healthy woman with community-acquired pneumonia presents with severe illness. Which organism most likely caused progression to severe pneumonia?',
    explanation: 'Streptococcus pneumoniae causes severe CAP in healthy individuals and is responsible for many fatal pneumonias. Immunocompromised patients develop atypical infections.',
    difficulty: 'HARD',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Streptococcus pneumoniae', isCorrect: true },
      { text: 'Mycoplasma pneumoniae', isCorrect: false },
      { text: 'Chlamydia psittaci', isCorrect: false },
      { text: 'Respiratory syncytial virus', isCorrect: false },
    ],
  },
  {
    text: 'What is the mechanism of hypoxemia in pneumonia?',
    explanation: 'Pneumonia causes hypoxemia through ventilation-perfusion mismatch (perfusion of non-ventilated lung) and shunting. Intrapulmonary shunting is the primary mechanism.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Ventilation-perfusion mismatch and shunting', isCorrect: true },
      { text: 'Hypoventilation', isCorrect: false },
      { text: 'Decreased diffusion capacity only', isCorrect: false },
      { text: 'Low cardiac output', isCorrect: false },
    ],
  },
  {
    text: 'A patient with severe pneumonia develops acute kidney injury. Which cytokine is primarily responsible for systemic inflammation?',
    explanation: 'TNF-alpha is the primary pro-inflammatory cytokine released during severe pneumonia and sepsis, triggering systemic inflammation and multi-organ dysfunction.',
    difficulty: 'HARD',
    subject: 'Immunology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Tumor necrosis factor-alpha', isCorrect: true },
      { text: 'Interleukin-2', isCorrect: false },
      { text: 'Transforming growth factor-beta', isCorrect: false },
      { text: 'Interleukin-10', isCorrect: false },
    ],
  },

  // STROKE (3 questions - to reach 30)
  {
    text: 'A 65-year-old woman with atrial fibrillation presents with sudden left-sided weakness and speech difficulty. Which artery is most likely occluded?',
    explanation: 'Left middle cerebral artery (MCA) stroke causes contralateral motor and sensory deficits, plus aphasia (dominant hemisphere). MCA is the most common stroke location.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Middle cerebral artery', isCorrect: true },
      { text: 'Anterior cerebral artery', isCorrect: false },
      { text: 'Posterior cerebral artery', isCorrect: false },
      { text: 'Basilar artery', isCorrect: false },
    ],
  },
  {
    text: 'What is the mechanism of stroke in a patient with carotid artery dissection?',
    explanation: 'Carotid dissection creates an intimal tear with thrombosis and embolism to distal cerebral circulation. It may also cause local stenosis or hypoperfusion.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Intimal dissection with thromboembolism', isCorrect: true },
      { text: 'Atherosclerotic plaque formation', isCorrect: false },
      { text: 'Arterial vasospasm', isCorrect: false },
      { text: 'Fibromuscular dysplasia', isCorrect: false },
    ],
  },
  {
    text: 'A patient with acute ischemic stroke presents within the thrombolytic window. What is the mechanism of action of tPA?',
    explanation: 'tPA (tissue plasminogen activator) is a serine protease that converts plasminogen to plasmin, which degrades fibrin in the thrombus.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Converts plasminogen to plasmin for fibrin degradation', isCorrect: true },
      { text: 'Directly dissolves thrombus via peptide bonds', isCorrect: false },
      { text: 'Inhibits platelet aggregation', isCorrect: false },
      { text: 'Reduces cerebral edema', isCorrect: false },
    ],
  },

  // EPILEPSY (2 questions - to reach 30)
  {
    text: 'A 4-year-old boy presents with brief episodes of staring and unresponsiveness lasting 10 seconds, occurring multiple times daily. EEG shows 3 Hz spike-and-wave discharges. What is the diagnosis?',
    explanation: 'Childhood absence epilepsy presents with brief staring spells and EEG showing characteristic 3 Hz spike-and-wave pattern. It typically begins age 4-8 and may be triggered by hyperventilation.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Childhood absence epilepsy', isCorrect: true },
      { text: 'Temporal lobe epilepsy', isCorrect: false },
      { text: 'Infantile spasms', isCorrect: false },
      { text: 'Atonic seizures', isCorrect: false },
    ],
  },
  {
    text: 'Which anti-seizure medication is contraindicated in women of childbearing age due to high teratogenicity risk?',
    explanation: 'Phenytoin, phenobarbital, and valproate cause fetal anomalies (fetal hydantoin syndrome, cardiac defects, neural tube defects). Valproate carries the highest risk for neural tube defects.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Valproate', isCorrect: true },
      { text: 'Levetiracetam', isCorrect: false },
      { text: 'Lamotrigine', isCorrect: false },
      { text: 'Lacosamide', isCorrect: false },
    ],
  },
];

async function seed() {
  console.log('Starting seed for batch 5...');

  let count = 0;
  for (const q of questions) {
    try {
      const subject = await prisma.subject.findFirst({
        where: { name: q.subject },
      });
      const system = await prisma.system.findFirst({
        where: { name: q.system },
      });
      const topic = await prisma.topic.findFirst({
        where: { name: q.topic },
      });

      if (!subject || !system || !topic) {
        console.log(
          `Skipping question: Missing ${!subject ? 'subject' : !system ? 'system' : 'topic'}`
        );
        continue;
      }

      await prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation,
          difficulty: q.difficulty,
          subjectId: subject.id,
          systemId: system.id,
          topicId: topic.id,
          options: {
            create: q.answers.map((a, idx) => ({
              text: a.text,
              isCorrect: a.isCorrect,
              displayOrder: idx,
            })),
          },
        },
      });

      count++;
      if (count % 10 === 0) {
        console.log(`Created ${count} questions...`);
      }
    } catch (error) {
      console.error(`Error creating question: ${q.text.substring(0, 50)}...`, error);
    }
  }

  console.log(`✓ Successfully seeded ${count} questions!`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
