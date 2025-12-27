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
    text: 'A 68-year-old man presents with palpitations and an irregular pulse. ECG shows irregular narrow complexes without P waves. What is the most likely diagnosis?',
    explanation: 'Atrial fibrillation is characterized by irregular atrial activity without discrete P waves, leading to an irregularly irregular ventricular response. It is the most common supraventricular arrhythmia.',
    difficulty: 'EASY',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Atrial fibrillation', isCorrect: true },
      { text: 'Atrial flutter', isCorrect: false },
      { text: 'Atrioventricular nodal reentrant tachycardia', isCorrect: false },
      { text: 'Sinus tachycardia', isCorrect: false },
    ],
  },
  {
    text: 'Which ion channel is primarily affected in Long QT syndrome?',
    explanation: 'Long QT syndrome is caused by dysfunction of cardiac potassium channels (KCNQ1, KCNE1) or sodium channels, leading to prolonged repolarization and risk of torsades de pointes.',
    difficulty: 'MEDIUM',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Potassium channels', isCorrect: true },
      { text: 'Sodium channels', isCorrect: false },
      { text: 'Calcium channels', isCorrect: false },
      { text: 'Chloride channels', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old woman with a history of myocardial infarction develops ventricular tachycardia 3 weeks post-MI. What is the likely mechanism?',
    explanation: 'Post-MI ventricular tachycardia is typically due to reentry around the infarct scar. The scar tissue creates heterogeneous conduction properties leading to reentrant circuits.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Reentry around infarct scar', isCorrect: true },
      { text: 'Abnormal automaticity', isCorrect: false },
      { text: 'Triggered activity from afterdepolarizations', isCorrect: false },
      { text: 'Ischemic injury to conduction system', isCorrect: false },
    ],
  },
  {
    text: 'Which ECG finding is most characteristic of Brugada syndrome?',
    explanation: 'Brugada syndrome is characterized by a distinctive type 1 ECG pattern with coved ST elevation followed by a negative T wave in V1-V3, predisposing to sudden cardiac death.',
    difficulty: 'HARD',
    subject: 'Anatomy',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Coved ST elevation in V1-V3', isCorrect: true },
      { text: 'Prolonged QT interval', isCorrect: false },
      { text: 'Short PR interval', isCorrect: false },
      { text: 'Delta waves', isCorrect: false },
    ],
  },
  {
    text: 'A patient receives adenosine for suspected AVNRT. The rhythm briefly stops then resumes. What is the mechanism of adenosine action?',
    explanation: 'Adenosine activates adenosine A1 receptors on AV nodal cells, increasing potassium conductance and hyperpolarizing the membrane, temporarily blocking AV nodal conduction.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Blocks AV nodal conduction via A1 receptor activation', isCorrect: true },
      { text: 'Blocks sodium channels', isCorrect: false },
      { text: 'Increases catecholamine release', isCorrect: false },
      { text: 'Prolongs action potential duration', isCorrect: false },
    ],
  },

  // HEART FAILURE (5 questions)
  {
    text: 'A 62-year-old man with hypertension and left ventricular hypertrophy develops dyspnea on exertion. Which ejection fraction range is most likely?',
    explanation: 'Heart failure with preserved ejection fraction (HFpEF) occurs in hypertensive patients with LVH. The ejection fraction is greater than 40-50%.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Greater than 40-50%', isCorrect: true },
      { text: 'Between 20-35%', isCorrect: false },
      { text: 'Less than 15%', isCorrect: false },
      { text: 'Variable, between 10-60%', isCorrect: false },
    ],
  },
  {
    text: 'Which mechanism is responsible for salt and water retention in heart failure?',
    explanation: 'In heart failure, decreased cardiac output triggers activation of the renin-angiotensin-aldosterone system (RAAS), leading to sodium and water retention to maintain perfusion pressure.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Activation of RAAS', isCorrect: true },
      { text: 'Increased ANP secretion', isCorrect: false },
      { text: 'Decreased sympathetic tone', isCorrect: false },
      { text: 'Increased renal perfusion', isCorrect: false },
    ],
  },
  {
    text: 'A patient with acute decompensated heart failure presents with orthopnea and pulmonary edema. Which initial drug is most appropriate?',
    explanation: 'Diuretics (particularly loop diuretics) are first-line therapy for acute heart failure with congestion, rapidly relieving pulmonary edema by promoting sodium and water excretion.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Loop diuretics', isCorrect: true },
      { text: 'Beta-blockers', isCorrect: false },
      { text: 'ACE inhibitors', isCorrect: false },
      { text: 'Positive inotropes', isCorrect: false },
    ],
  },
  {
    text: 'In systolic heart failure, which mechanism do ACE inhibitors provide benefit through?',
    explanation: 'ACE inhibitors reduce angiotensin II formation, decreasing afterload, preventing myocardial remodeling, and reducing aldosterone-mediated sodium retention.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Reducing afterload and preventing remodeling', isCorrect: true },
      { text: 'Increasing contractility', isCorrect: false },
      { text: 'Blocking beta-receptors', isCorrect: false },
      { text: 'Inhibiting phosphodiesterase', isCorrect: false },
    ],
  },
  {
    text: 'A 58-year-old woman with ejection fraction of 35% has worsening heart failure despite optimal medical therapy. Which device is indicated?',
    explanation: 'Patients with EF less than 35% despite optimal medical therapy (including beta-blockers and ACE inhibitors) for at least 40 days are candidates for ICD placement for primary prevention.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Implantable cardioverter-defibrillator', isCorrect: true },
      { text: 'Permanent pacemaker', isCorrect: false },
      { text: 'Cardiac resynchronization therapy only', isCorrect: false },
      { text: 'Left ventricular assist device', isCorrect: false },
    ],
  },

  // CORONARY HEART DISEASE (5 questions)
  {
    text: 'A 55-year-old man with typical chest pain and ST elevation in leads II, III, and aVF is brought to the catheterization lab. Which artery is likely occluded?',
    explanation: 'ST elevation in the inferior leads (II, III, aVF) indicates right coronary artery or left circumflex occlusion. The RCA is responsible for inferior wall infarction in 80-90% of cases.',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Right coronary artery', isCorrect: true },
      { text: 'Left anterior descending', isCorrect: false },
      { text: 'Left main coronary artery', isCorrect: false },
      { text: 'Diagonal artery', isCorrect: false },
    ],
  },
  {
    text: 'Which marker of myocardial injury rises first after acute MI and normalizes within 24-48 hours?',
    explanation: 'Myoglobin is the first marker to rise after MI (within 2-3 hours) but is non-specific. Troponin is more specific and remains elevated longer.',
    difficulty: 'HARD',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Myoglobin', isCorrect: true },
      { text: 'Troponin I', isCorrect: false },
      { text: 'CK-MB', isCorrect: false },
      { text: 'Lactate dehydrogenase', isCorrect: false },
    ],
  },
  {
    text: 'A patient with non-ST elevation MI receives dual antiplatelet therapy with aspirin and clopidogrel. What is the mechanism of clopidogrel?',
    explanation: 'Clopidogrel is a P2Y12 inhibitor that irreversibly blocks platelet ADP receptors, preventing platelet aggregation and thrombus formation.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'P2Y12 receptor antagonist', isCorrect: true },
      { text: 'COX-1 inhibitor', isCorrect: false },
      { text: 'Thrombin inhibitor', isCorrect: false },
      { text: 'Fibrinolytic agent', isCorrect: false },
    ],
  },
  {
    text: 'Which coronary risk factor modification provides the greatest mortality reduction in post-MI patients?',
    explanation: 'Beta-blocker therapy in post-MI patients reduces mortality by approximately 25%, making it one of the most effective interventions along with ACE inhibitors.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Beta-blocker therapy', isCorrect: true },
      { text: 'Low-dose aspirin', isCorrect: false },
      { text: 'Statin therapy', isCorrect: false },
      { text: 'Smoking cessation', isCorrect: false },
    ],
  },
  {
    text: 'A 48-year-old woman with familial hypercholesterolemia develops premature CAD. What is the pathophysiologic basis?',
    explanation: 'Familial hypercholesterolemia involves defective LDL receptors or apoB mutations, causing severe hypercholesterolemia and premature atherosclerotic plaque formation.',
    difficulty: 'HARD',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Defective LDL receptors', isCorrect: true },
      { text: 'Decreased hepatic lipase activity', isCorrect: false },
      { text: 'Increased lipoprotein(a) alone', isCorrect: false },
      { text: 'Impaired VLDL synthesis', isCorrect: false },
    ],
  },

  // ASTHMA AND COPD (5 questions)
  {
    text: 'A 35-year-old with asthma presents with severe wheezing and inability to speak full sentences. ABG shows pH 7.28, PaCO2 52. What is the primary mechanism of ventilatory failure?',
    explanation: 'Severe asthma causes air trapping from bronchospasm and mucus plugging, leading to elevated CO2 and respiratory acidosis (ventilatory failure). PaCO2 elevation is an ominous sign.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Air trapping from bronchospasm and mucus plugging', isCorrect: true },
      { text: 'Hypoxic vasoconstriction', isCorrect: false },
      { text: 'Right-to-left shunting', isCorrect: false },
      { text: 'Diffusion impairment from edema', isCorrect: false },
    ],
  },
  {
    text: 'Which medication class is used as a maintenance therapy in persistent asthma?',
    explanation: 'Long-acting beta-2 agonists (LABAs) combined with inhaled corticosteroids are standard maintenance therapy for moderate to severe persistent asthma.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Inhaled corticosteroids with long-acting beta-2 agonists', isCorrect: true },
      { text: 'Short-acting beta-2 agonists alone', isCorrect: false },
      { text: 'Anticholinergics alone', isCorrect: false },
      { text: 'Theophylline', isCorrect: false },
    ],
  },
  {
    text: 'A 62-year-old smoker with COPD has an FEV1 of 28% predicted. Which complication is most likely?',
    explanation: 'Severe COPD (FEV1 less than 30%) significantly increases risk of pulmonary hypertension due to chronic hypoxia-induced pulmonary vasoconstriction.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Pulmonary hypertension', isCorrect: true },
      { text: 'Acute coronary syndrome', isCorrect: false },
      { text: 'Acute kidney injury', isCorrect: false },
      { text: 'Disseminated intravascular coagulation', isCorrect: false },
    ],
  },
  {
    text: 'Which mechanism underlies the therapeutic effect of tiotropium (long-acting anticholinergic) in COPD?',
    explanation: 'Tiotropium blocks M3 muscarinic receptors on airway smooth muscle, preventing acetylcholine-induced bronchoconstriction and mucus secretion.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Blocks M3 muscarinic receptors on airway smooth muscle', isCorrect: true },
      { text: 'Activates beta-2 adrenergic receptors', isCorrect: false },
      { text: 'Inhibits phosphodiesterase-4', isCorrect: false },
      { text: 'Antagonizes leukotriene receptors', isCorrect: false },
    ],
  },
  {
    text: 'A patient with COPD develops acute respiratory failure and requires intubation. What is the primary goal of mechanical ventilation management?',
    explanation: 'In COPD exacerbation with CO2 retention, gentle ventilation avoiding air trapping and permissive hypercapnia is preferred to prevent barotrauma and hemodynamic compromise.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Gentle ventilation with permissive hypercapnia', isCorrect: true },
      { text: 'Aggressive hyperventilation', isCorrect: false },
      { text: 'High tidal volumes to normalize CO2 rapidly', isCorrect: false },
      { text: 'Inverse ratio ventilation', isCorrect: false },
    ],
  },

  // PNEUMONIA (5 questions)
  {
    text: 'A 72-year-old nursing home resident presents with fever, cough, and new infiltrate on CXR. Which organism is most likely?',
    explanation: 'In nursing home residents (healthcare-associated), common causative organisms include Streptococcus pneumoniae, Haemophilus influenzae, and enteric gram-negatives.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Streptococcus pneumoniae or Haemophilus influenzae', isCorrect: true },
      { text: 'Pneumocystis jirovecii', isCorrect: false },
      { text: 'Mycobacterium tuberculosis', isCorrect: false },
      { text: 'Fungal species', isCorrect: false },
    ],
  },
  {
    text: 'A patient develops pneumonia with subpleural cavitation and positive acid-fast smear. What is the diagnosis?',
    explanation: 'Acid-fast bacillus (AFB) positivity with cavitary lesions is characteristic of tuberculosis. AFB staining identifies mycobacteria like Mycobacterium tuberculosis.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Tuberculosis', isCorrect: true },
      { text: 'Community-acquired pneumonia', isCorrect: false },
      { text: 'Fungal pneumonia', isCorrect: false },
      { text: 'Aspiration pneumonia', isCorrect: false },
    ],
  },
  {
    text: 'Which antibiotic combination is first-line for community-acquired pneumonia in a hospitalized patient without severe sepsis?',
    explanation: 'For hospitalized CAP, ceftriaxone (or another third-generation cephalosporin) with azithromycin covers typical pathogens including pneumococcus and atypical organisms.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Ceftriaxone and azithromycin', isCorrect: true },
      { text: 'Penicillin alone', isCorrect: false },
      { text: 'Fluoroquinolone alone', isCorrect: false },
      { text: 'Tetracycline alone', isCorrect: false },
    ],
  },
  {
    text: 'A previously healthy 25-year-old develops bilateral hilar lymphadenopathy and pulmonary infiltrates. Biopsy shows noncaseating granulomas. What is the likely diagnosis?',
    explanation: 'Noncaseating granulomas in a young patient with bilateral hilar lymphadenopathy is classic for sarcoidosis, a systemic granulomatous disease of unknown etiology.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Sarcoidosis', isCorrect: true },
      { text: 'Tuberculosis', isCorrect: false },
      { text: 'Histoplasmosis', isCorrect: false },
      { text: 'Community-acquired pneumonia', isCorrect: false },
    ],
  },
  {
    text: 'An immunocompromised patient presents with dyspnea and nonproductive cough. CXR shows bilateral interstitial infiltrates. CD4 count is 75/uL. What is the most likely diagnosis?',
    explanation: 'Pneumocystis jirovecii pneumonia (PCP) presents with bilateral interstitial infiltrates and is opportunistic in AIDS patients with CD4 less than 200. PCP is the most common opportunistic infection.',
    difficulty: 'HARD',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Pneumocystis jirovecii pneumonia', isCorrect: true },
      { text: 'Mycobacterium avium complex', isCorrect: false },
      { text: 'Cytomegalovirus pneumonia', isCorrect: false },
      { text: 'Tuberculosis', isCorrect: false },
    ],
  },

  // STROKE (5 questions)
  {
    text: 'A 68-year-old man with hypertension develops sudden onset right-sided weakness and speech difficulty. CT head is unremarkable. What is the mechanism of stroke?',
    explanation: 'Acute ischemic stroke is most common (85% of strokes). Normal CT suggests ischemic rather than hemorrhagic stroke. Speech difficulty with right-sided weakness indicates left hemisphere involvement.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Acute ischemic stroke', isCorrect: true },
      { text: 'Intracranial hemorrhage', isCorrect: false },
      { text: 'Transient ischemic attack', isCorrect: false },
      { text: 'Todd paralysis', isCorrect: false },
    ],
  },
  {
    text: 'Which vessel occlusion causes contralateral hemiplegia, hemisensory loss, and homonymous hemianopia (Weber syndrome components)?',
    explanation: 'Middle cerebral artery occlusion causes contralateral motor and sensory deficits (internal capsule), homonymous hemianopia (optic radiations), and typically aphasia if dominant hemisphere.',
    difficulty: 'HARD',
    subject: 'Anatomy',
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
    text: 'A patient with acute ischemic stroke arrives 90 minutes after symptom onset. Which treatment is appropriate?',
    explanation: 'Intravenous tissue plasminogen activator (alteplase) is indicated for acute ischemic stroke within 4.5 hours of symptom onset. This patient is within the window.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Intravenous alteplase (tPA)', isCorrect: true },
      { text: 'Immediate heparin anticoagulation', isCorrect: false },
      { text: 'Aspirin only', isCorrect: false },
      { text: 'Observation without intervention', isCorrect: false },
    ],
  },
  {
    text: 'A patient with right-sided weakness, right facial droop, and slurred speech likely has a stroke in which vascular territory?',
    explanation: 'Right-sided motor deficit with facial involvement suggests left hemisphere stroke. Slurred speech with motor involvement indicates left dominant hemisphere stroke, typically MCA territory.',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Left middle cerebral artery', isCorrect: true },
      { text: 'Right posterior cerebral artery', isCorrect: false },
      { text: 'Basilar artery', isCorrect: false },
      { text: 'Right vertebral artery', isCorrect: false },
    ],
  },
  {
    text: 'Which antiplatelet agent is preferred for secondary stroke prevention?',
    explanation: 'Aspirin is the standard antiplatelet agent for secondary stroke prevention. Clopidogrel or aspirin-dipyridamole are alternatives for aspirin-intolerant patients.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Aspirin', isCorrect: true },
      { text: 'Warfarin', isCorrect: false },
      { text: 'Heparin', isCorrect: false },
      { text: 'Thrombin inhibitors', isCorrect: false },
    ],
  },

  // EPILEPSY (5 questions)
  {
    text: 'A 24-year-old woman with no prior seizures has a generalized tonic-clonic seizure. EEG shows 3 Hz spike-and-wave discharges. What is the diagnosis?',
    explanation: 'Absence seizures with 3 Hz spike-and-wave pattern on EEG are characteristic of childhood absence epilepsy or generalized absence seizures.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Absence seizure', isCorrect: true },
      { text: 'Partial seizure', isCorrect: false },
      { text: 'Atonic seizure', isCorrect: false },
      { text: 'Myoclonic seizure', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old with temporal lobe epilepsy has seizures characterized by olfactory aura and automatisms. What is the underlying pathology?',
    explanation: 'Temporal lobe epilepsy is most commonly caused by mesial temporal sclerosis with neuronal loss in the hippocampus, amygdala, and surrounding structures.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Mesial temporal sclerosis', isCorrect: true },
      { text: 'Cortical dysplasia', isCorrect: false },
      { text: 'Arteriovenous malformation', isCorrect: false },
      { text: 'Glioma', isCorrect: false },
    ],
  },
  {
    text: 'Which antiepileptic drug is particularly effective for absence seizures?',
    explanation: 'Ethosuximide specifically blocks T-type calcium channels in thalamic relay neurons, effectively suppressing the 3 Hz spike-and-wave activity of absence seizures.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Ethosuximide', isCorrect: true },
      { text: 'Phenytoin', isCorrect: false },
      { text: 'Carbamazepine', isCorrect: false },
      { text: 'Valproic acid', isCorrect: false },
    ],
  },
  {
    text: 'A patient on phenytoin for seizure control develops gingival hyperplasia, hirsutism, and coarsened facial features. What is the mechanism?',
    explanation: 'Phenytoin causes these effects through chronic stimulation of fibroblast proliferation and altered collagen metabolism, not allergy or toxicity.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Chronic stimulation of fibroblast proliferation', isCorrect: true },
      { text: 'Hypersensitivity reaction', isCorrect: false },
      { text: 'Teratogenic effect', isCorrect: false },
      { text: 'Drug-induced thyroid dysfunction', isCorrect: false },
    ],
  },
  {
    text: 'A 35-year-old woman on valproic acid for epilepsy is planning pregnancy. What is the major teratogenic risk?',
    explanation: 'Valproic acid is highly teratogenic with 1-2% risk of neural tube defects and significantly increased risk of developmental delay when used in pregnancy.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Neural tube defects and developmental delay', isCorrect: true },
      { text: 'Cardiac septal defects', isCorrect: false },
      { text: 'Renal dysplasia', isCorrect: false },
      { text: 'Skeletal abnormalities', isCorrect: false },
    ],
  },
];

async function seed() {
  console.log('Starting seed for batch-3 questions...');

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
        console.log(`Skipping question: Missing ${!subject ? 'subject' : !system ? 'system' : 'topic'}`);
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
