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
    text: 'A 68-year-old male presents with palpitations and syncope. ECG reveals a heart rate of 180 bpm with a wide QRS complex (>120ms). Which is the most likely diagnosis?',
    explanation: 'Ventricular tachycardia typically presents with a wide QRS complex (>120ms), rapid heart rate, and hemodynamic instability. It is a life-threatening arrhythmia requiring immediate intervention.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Ventricular tachycardia', isCorrect: true },
      { text: 'Supraventricular tachycardia', isCorrect: false },
      { text: 'Atrial flutter', isCorrect: false },
      { text: 'Sinus tachycardia', isCorrect: false },
    ],
  },
  {
    text: 'Which medication is the first-line treatment for acute supraventricular tachycardia in a hemodynamically stable patient?',
    explanation: 'Adenosine is the first-line medication for acute SVT as it transiently blocks AV node conduction, terminating reentrant arrhythmias. It has a very short half-life.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Adenosine', isCorrect: true },
      { text: 'Propranolol', isCorrect: false },
      { text: 'Amiodarone', isCorrect: false },
      { text: 'Digoxin', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old woman with atrial fibrillation presents for anticoagulation counseling. She has a CHA2DS2-VASc score of 4. What is the appropriate management?',
    explanation: 'A CHA2DS2-VASc score of 4 indicates high stroke risk. All patients with a score ≥2 (female) or ≥1 (male) should be anticoagulated with warfarin or DOACs.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Anticoagulation with warfarin or DOAC', isCorrect: true },
      { text: 'Aspirin monotherapy', isCorrect: false },
      { text: 'No anticoagulation needed', isCorrect: false },
      { text: 'Clopidogrel alone', isCorrect: false },
    ],
  },
  {
    text: 'Which electrolyte abnormality is most likely to prolong the QT interval and increase the risk of torsades de pointes?',
    explanation: 'Hypokalemia prolongs the QT interval by increasing the action potential duration. This increases susceptibility to triggered activity and torsades de pointes, especially in the setting of QT-prolonging medications.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Hypokalemia', isCorrect: true },
      { text: 'Hyperkalemia', isCorrect: false },
      { text: 'Hypercalcemia', isCorrect: false },
      { text: 'Hypomagnesemia (alone)', isCorrect: false },
    ],
  },
  {
    text: 'A patient with Wolff-Parkinson-White syndrome experiences atrial fibrillation. Why is AV nodal blocking agents contraindicated?',
    explanation: 'In WPW, AV nodal blocking agents (like adenosine) block the AV node but allow conduction down the accessory pathway, potentially accelerating ventricular rate and causing hemodynamic collapse or VF.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'They allow preferential conduction down the accessory pathway', isCorrect: true },
      { text: 'They increase AV nodal conduction velocity', isCorrect: false },
      { text: 'They cause irreversible bradycardia', isCorrect: false },
      { text: 'They are protein-bound and ineffective', isCorrect: false },
    ],
  },

  // HEART FAILURE (5 questions)
  {
    text: 'A 72-year-old male with a history of hypertension and diabetes presents with dyspnea and peripheral edema. Echocardiography shows an ejection fraction of 35%. Which medication class provides mortality benefit in systolic heart failure?',
    explanation: 'ACE inhibitors reduce mortality in systolic heart failure by decreasing afterload and preventing ventricular remodeling through inhibition of the renin-angiotensin system.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'ACE inhibitors', isCorrect: true },
      { text: 'Calcium channel blockers', isCorrect: false },
      { text: 'Alpha-blockers', isCorrect: false },
      { text: 'Loop diuretics alone', isCorrect: false },
    ],
  },
  {
    text: 'What is the primary pathophysiologic mechanism of diastolic heart failure?',
    explanation: 'Diastolic heart failure results from impaired left ventricular relaxation and increased stiffness, making the ventricle unable to fill adequately despite normal systolic function.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Impaired ventricular relaxation and increased stiffness', isCorrect: true },
      { text: 'Decreased contractility', isCorrect: false },
      { text: 'Mitral stenosis', isCorrect: false },
      { text: 'Aortic regurgitation', isCorrect: false },
    ],
  },
  {
    text: 'A 65-year-old woman with heart failure and chronic kidney disease (eGFR 30) presents with dyspnea. Which diuretic is contraindicated?',
    explanation: 'Thiazide diuretics are ineffective in advanced renal disease (eGFR <30) because they require glomerular filtration to reach their site of action in the distal tubule.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Thiazide diuretics', isCorrect: true },
      { text: 'Loop diuretics', isCorrect: false },
      { text: 'Potassium-sparing diuretics', isCorrect: false },
      { text: 'Osmotic diuretics', isCorrect: false },
    ],
  },
  {
    text: 'Which compensatory mechanism initially helps maintain cardiac output in heart failure but eventually becomes maladaptive?',
    explanation: 'The Frank-Starling mechanism increases preload and contractility initially, but chronic elevation leads to ventricular remodeling, fibrosis, and progression of heart failure.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Increased preload and Frank-Starling mechanism', isCorrect: true },
      { text: 'Decreased afterload', isCorrect: false },
      { text: 'Reduced sympathetic tone', isCorrect: false },
      { text: 'Increased parasympathetic activity', isCorrect: false },
    ],
  },
  {
    text: 'A patient with acute decompensated heart failure presents with orthopnea and crackles on exam. What is the pathophysiologic basis for pulmonary edema?',
    explanation: 'Elevated pulmonary venous pressure exceeds the colloid osmotic pressure, causing fluid transudation into the alveolar space and pulmonary edema.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Elevated pulmonary venous pressure exceeds colloid osmotic pressure', isCorrect: true },
      { text: 'Decreased plasma albumin', isCorrect: false },
      { text: 'Increased capillary permeability', isCorrect: false },
      { text: 'Lymphatic obstruction', isCorrect: false },
    ],
  },

  // CORONARY HEART DISEASE (5 questions)
  {
    text: 'A 58-year-old male smoker presents with chest pain, ST elevation in leads II, III, and aVF. Which vessel is occluded?',
    explanation: 'ST elevation in the inferior leads (II, III, aVF) indicates an inferior wall MI, most commonly due to right coronary artery occlusion (80% of cases).',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Right coronary artery', isCorrect: true },
      { text: 'Left anterior descending artery', isCorrect: false },
      { text: 'Left circumflex artery', isCorrect: false },
      { text: 'Left main coronary artery', isCorrect: false },
    ],
  },
  {
    text: 'Which is the most common cause of acute myocardial infarction?',
    explanation: 'Atherosclerotic plaque rupture with subsequent thrombosis is the most common cause of acute MI. Spontaneous coronary artery dissection and coronary vasospasm are less common.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Atherosclerotic plaque rupture with thrombosis', isCorrect: true },
      { text: 'Coronary vasospasm', isCorrect: false },
      { text: 'Spontaneous coronary artery dissection', isCorrect: false },
      { text: 'Coronary embolism from endocarditis', isCorrect: false },
    ],
  },
  {
    text: 'A 70-year-old patient has a history of anterior wall MI with reduced ejection fraction. He develops angina with minimal exertion. What is the mechanism?',
    explanation: 'In post-MI remodeling, the infarcted region becomes dyskinetic or akinetic, increasing wall stress in adjacent viable myocardium. This increases oxygen demand in a fixed coronary system.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Wall stress increases in viable myocardium after infarction', isCorrect: true },
      { text: 'Collagen deposition improves contractility', isCorrect: false },
      { text: 'Angiogenesis decreases oxygen supply', isCorrect: false },
      { text: 'Nitric oxide production increases', isCorrect: false },
    ],
  },
  {
    text: 'Which medication class reduces myocardial infarction recurrence in stable CAD through antiplatelet effects?',
    explanation: 'Aspirin irreversibly inhibits platelet COX-1, preventing thromboxane A2 synthesis and platelet aggregation. It reduces recurrent MI and stent thrombosis.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Aspirin', isCorrect: true },
      { text: 'Metoprolol', isCorrect: false },
      { text: 'Lisinopril', isCorrect: false },
      { text: 'Atorvastatin', isCorrect: false },
    ],
  },
  {
    text: 'A 62-year-old female with hyperlipidemia is started on atorvastatin. What is the mechanism of LDL reduction?',
    explanation: 'Statins inhibit HMG-CoA reductase, the rate-limiting enzyme of cholesterol synthesis, reducing hepatic LDL production and upregulating LDL receptor expression.',
    difficulty: 'MEDIUM',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Inhibition of HMG-CoA reductase and increased LDL receptor expression', isCorrect: true },
      { text: 'Inhibition of lipoprotein lipase', isCorrect: false },
      { text: 'Direct LDL scavenging', isCorrect: false },
      { text: 'VLDL reductase inhibition', isCorrect: false },
    ],
  },

  // ASTHMA AND COPD (5 questions)
  {
    text: 'A 32-year-old female with asthma experiences acute bronchospasm triggered by exercise. Which medication provides rapid relief?',
    explanation: 'Short-acting beta-2 agonists (SABAs) like albuterol provide rapid bronchodilation through beta-2 receptor activation and smooth muscle relaxation within minutes.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Albuterol (short-acting beta-2 agonist)', isCorrect: true },
      { text: 'Salmeterol', isCorrect: false },
      { text: 'Fluticasone propionate', isCorrect: false },
      { text: 'Theophylline', isCorrect: false },
    ],
  },
  {
    text: 'What is the primary pathophysiologic difference between asthma and COPD?',
    explanation: 'Asthma involves reversible airflow obstruction with inflammation; COPD involves largely irreversible obstruction due to emphysema (alveolar destruction) and chronic bronchitis.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Asthma is reversible; COPD involves irreversible alveolar destruction', isCorrect: true },
      { text: 'COPD involves allergic responses; asthma is infectious', isCorrect: false },
      { text: 'Asthma requires genetic predisposition; COPD is always acquired', isCorrect: false },
      { text: 'Both are equally reversible with treatment', isCorrect: false },
    ],
  },
  {
    text: 'A 68-year-old male with COPD has an FEV1 of 28% predicted. Which complications are common?',
    explanation: 'Severe COPD (FEV1 <30%) is associated with pulmonary hypertension, cor pulmonale, and right heart failure due to chronic hypoxemia and vasoconstriction.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Pulmonary hypertension and cor pulmonale', isCorrect: true },
      { text: 'Aortic stenosis', isCorrect: false },
      { text: 'Mitral stenosis', isCorrect: false },
      { text: 'Tricuspid regurgitation only', isCorrect: false },
    ],
  },
  {
    text: 'Which medication reduces asthma exacerbations and should be added to a SABA in patients with persistent symptoms?',
    explanation: 'Inhaled corticosteroids reduce airway inflammation and prevent exacerbations. They are the preferred controller medication for persistent asthma.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Inhaled corticosteroids', isCorrect: true },
      { text: 'Anticholinergics alone', isCorrect: false },
      { text: 'Leukotriene receptor antagonists alone', isCorrect: false },
      { text: 'Systemic antibiotics', isCorrect: false },
    ],
  },
  {
    text: 'A COPD patient is prescribed tiotropium. What is its mechanism of action?',
    explanation: 'Tiotropium is a long-acting anticholinergic that blocks muscarinic receptors, preventing acetylcholine-induced bronchoconstriction and providing 24-hour bronchodilation.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Blockade of muscarinic receptors causing sustained bronchodilation', isCorrect: true },
      { text: 'Inhibition of phosphodiesterase-4', isCorrect: false },
      { text: 'Beta-3 receptor agonism', isCorrect: false },
      { text: 'Leukotriene receptor antagonism', isCorrect: false },
    ],
  },

  // PNEUMONIA (5 questions)
  {
    text: 'A 45-year-old hospitalized patient develops fever and productive cough on day 5 of admission. Chest X-ray shows bilateral infiltrates. Which organism is most likely?',
    explanation: 'Hospital-acquired pneumonia (HAP) typically presents after 48 hours of hospitalization. Common organisms include Pseudomonas aeruginosa and MRSA in healthcare settings.',
    difficulty: 'HARD',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Pseudomonas aeruginosa or MRSA', isCorrect: true },
      { text: 'Streptococcus pneumoniae', isCorrect: false },
      { text: 'Mycoplasma pneumoniae', isCorrect: false },
      { text: 'Legionella pneumophila', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old male presents with productive cough and fever. Sputum culture grows Streptococcus pneumoniae. Which is the first-line antibiotic?',
    explanation: 'For community-acquired pneumonia caused by Streptococcus pneumoniae, beta-lactams (amoxicillin, ceftriaxone) are first-line unless resistance is suspected.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Beta-lactams (amoxicillin or ceftriaxone)', isCorrect: true },
      { text: 'Fluoroquinolones only', isCorrect: false },
      { text: 'Macrolides only', isCorrect: false },
      { text: 'Trimethoprim-sulfamethoxazole', isCorrect: false },
    ],
  },
  {
    text: 'An immunocompromised patient develops Pneumocystis jirovecii pneumonia. What is the primary treatment?',
    explanation: 'Trimethoprim-sulfamethoxazole is first-line for PCP. Alternative agents include pentamidine and dapsone with pyrimethamine in sulfa-allergic patients.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Trimethoprim-sulfamethoxazole', isCorrect: true },
      { text: 'Azithromycin', isCorrect: false },
      { text: 'Ciprofloxacin', isCorrect: false },
      { text: 'Doxycycline', isCorrect: false },
    ],
  },
  {
    text: 'A 70-year-old develops lobar pneumonia with rusty sputum and fever. Which organism is most likely?',
    explanation: 'Streptococcus pneumoniae classically causes lobar pneumonia with rusty (blood-tinged) sputum due to alveolar consolidation in a lobar distribution.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Streptococcus pneumoniae', isCorrect: true },
      { text: 'Haemophilus influenzae', isCorrect: false },
      { text: 'Klebsiella pneumoniae', isCorrect: false },
      { text: 'Staphylococcus aureus', isCorrect: false },
    ],
  },
  {
    text: 'An atypical pneumonia in a young adult presents with cough, malaise, and normal chest X-ray initially. Which organism is most common?',
    explanation: 'Mycoplasma pneumoniae causes atypical pneumonia with prominent systemic symptoms and CXR findings that are minimal compared to symptoms.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Mycoplasma pneumoniae', isCorrect: true },
      { text: 'Streptococcus pyogenes', isCorrect: false },
      { text: 'Clostridium pneumoniae', isCorrect: false },
      { text: 'Enterococcus faecalis', isCorrect: false },
    ],
  },

  // STROKE (5 questions)
  {
    text: 'A 68-year-old presents with acute left-sided weakness and facial droop. MRI shows an acute infarct in the right middle cerebral artery territory. What is the mechanism?',
    explanation: 'MCA occlusion typically results from atherothrombotic disease or cardioembolism, causing contralateral weakness (right MCA affects left side), aphasia (if dominant), and neglect.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Atherothrombotic occlusion or cardioembolism', isCorrect: true },
      { text: 'Lacunar infarction', isCorrect: false },
      { text: 'Vertebral artery dissection', isCorrect: false },
      { text: 'Subclavian steal syndrome', isCorrect: false },
    ],
  },
  {
    text: 'Which finding on physical examination suggests a cerebellar stroke?',
    explanation: 'Cerebellar strokes present with ataxia, nystagmus, dysmetria, and dysdiadochokinesia. "DANISH" helps remember these signs.',
    difficulty: 'HARD',
    subject: 'Anatomy',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Ataxia, nystagmus, dysmetria, and dysdiadochokinesia', isCorrect: true },
      { text: 'Spasticity and increased reflexes', isCorrect: false },
      { text: 'Flaccidity and absent reflexes', isCorrect: false },
      { text: 'Cognitive impairment only', isCorrect: false },
    ],
  },
  {
    text: 'A patient with acute ischemic stroke presents 2 hours after symptom onset. What is the time window for thrombolytic therapy?',
    explanation: 'Intravenous tissue plasminogen activator (tPA) is indicated within 4.5 hours of symptom onset. Earlier treatment has better outcomes with lower risk of hemorrhagic transformation.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: '4.5 hours', isCorrect: true },
      { text: '6 hours', isCorrect: false },
      { text: '8 hours', isCorrect: false },
      { text: '24 hours', isCorrect: false },
    ],
  },
  {
    text: 'Which medication is effective for secondary stroke prevention in patients with recent ischemic stroke?',
    explanation: 'Aspirin reduces recurrent stroke risk by inhibiting platelet aggregation. In high-risk patients, dual antiplatelet therapy (aspirin + clopidogrel) may be used initially.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Aspirin', isCorrect: true },
      { text: 'Morphine', isCorrect: false },
      { text: 'Labetalol alone', isCorrect: false },
      { text: 'Mannitol alone', isCorrect: false },
    ],
  },
  {
    text: 'A patient presents with "locked-in syndrome" after basilar artery occlusion. What is the clinical finding?',
    explanation: 'Locked-in syndrome results from bilateral ventral pontine infarction, causing complete paralysis with preserved consciousness. Patients can only move eyes vertically.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Complete paralysis with preserved consciousness and vertical eye movements only', isCorrect: true },
      { text: 'Vegetative state', isCorrect: false },
      { text: 'Coma', isCorrect: false },
      { text: 'Aphasia with preserved movement', isCorrect: false },
    ],
  },

  // EPILEPSY (5 questions)
  {
    text: 'A 24-year-old female with new-onset generalized tonic-clonic seizures is started on antiepileptic therapy. Which medication has teratogenic potential and requires careful monitoring in pregnancy?',
    explanation: 'Phenytoin is known for fetal hydantoin syndrome (cleft palate, cardiac defects). Valproic acid carries high teratogenic risk. Lamotrigine and levetiracetam are safer options.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Phenytoin and valproic acid', isCorrect: true },
      { text: 'Lamotrigine', isCorrect: false },
      { text: 'Levetiracetam', isCorrect: false },
      { text: 'Lacosamide', isCorrect: false },
    ],
  },
  {
    text: 'A patient with focal seizures resistant to two antiepileptic drugs is considered for surgical evaluation. What is the next step?',
    explanation: 'Drug-resistant epilepsy (seizures uncontrolled by two appropriate antiepileptics) warrants evaluation for epilepsy surgery. Long-term EEG monitoring and structural imaging identify the seizure focus.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Long-term EEG monitoring and structural imaging to localize seizure focus', isCorrect: true },
      { text: 'Increase the dose of the current medication', isCorrect: false },
      { text: 'Switch to a different GABA agonist', isCorrect: false },
      { text: 'Start benzodiazepines indefinitely', isCorrect: false },
    ],
  },
  {
    text: 'What is the mechanism of action of valproic acid in epilepsy?',
    explanation: 'Valproic acid increases GABA levels by inhibiting GABA transaminase and enhances GABA synthesis. It may also inhibit sodium and calcium channels.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Increases GABA levels by inhibiting GABA transaminase', isCorrect: true },
      { text: 'Blocks NMDA receptors exclusively', isCorrect: false },
      { text: 'Inhibits GABA receptors', isCorrect: false },
      { text: 'Increases glutamate transmission', isCorrect: false },
    ],
  },
  {
    text: 'A 35-year-old male with juvenile myoclonic epilepsy presents with myoclonic jerks on awakening. Which antiepileptic is the first-line treatment?',
    explanation: 'Valproic acid is highly effective for juvenile myoclonic epilepsy (JME) and is considered first-line. Levetiracetam and lamotrigine are alternatives.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Valproic acid', isCorrect: true },
      { text: 'Phenytoin', isCorrect: false },
      { text: 'Carbamazepine', isCorrect: false },
      { text: 'Gabapentin', isCorrect: false },
    ],
  },
  {
    text: 'Status epilepticus is defined as continuous seizure activity lasting longer than what duration?',
    explanation: 'Status epilepticus is defined as ≥5 minutes of continuous seizure activity or two or more seizures without full consciousness between them. It is a neurological emergency.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: '5 minutes', isCorrect: true },
      { text: '10 minutes', isCorrect: false },
      { text: '15 minutes', isCorrect: false },
      { text: '30 minutes', isCorrect: false },
    ],
  },
];

async function seed() {
  console.log('Starting seed...');

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
