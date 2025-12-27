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
    text: 'A 68-year-old man with hypertension presents with palpitations and dyspnea. ECG shows a heart rate of 150 bpm with narrow QRS complexes and a sawtooth pattern in leads II, III, and aVF. What is the most likely diagnosis?',
    explanation: 'Atrial flutter characteristically presents with a sawtooth (F wave) pattern best seen in the inferior leads. The narrow QRS complex indicates supraventricular origin.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Atrial flutter', isCorrect: true },
      { text: 'Atrial fibrillation', isCorrect: false },
      { text: 'Supraventricular tachycardia', isCorrect: false },
      { text: 'Ventricular tachycardia', isCorrect: false },
    ],
  },
  {
    text: 'Which medication is contraindicated in a patient with Wolff-Parkinson-White syndrome presenting with atrial fibrillation?',
    explanation: 'AV nodal blocking agents (like verapamil, diltiazem, adenosine) can accelerate conduction through the accessory pathway, increasing ventricular rate and causing deterioration.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Adenosine', isCorrect: true },
      { text: 'Procainamide', isCorrect: false },
      { text: 'Amiodarone', isCorrect: false },
      { text: 'Sotalol', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old patient with COPD presents with irregular pulse and palpitations. ECG shows irregular RR intervals with no visible P waves. What is the primary mechanism leading to this arrhythmia?',
    explanation: 'Atrial fibrillation results from multiple reentrant circuits in the atria. COPD causes atrial dilation due to pulmonary hypertension, predisposing to AF.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Multiple reentrant circuits in atria', isCorrect: true },
      { text: 'Complete heart block', isCorrect: false },
      { text: 'Ectopic focus in ventricle', isCorrect: false },
      { text: 'AV nodal reentry', isCorrect: false },
    ],
  },
  {
    text: 'A 35-year-old woman with palpitations has ECG findings of a short PR interval and delta wave. During an episode of palpitations, the ECG shows rapid narrow complexes. What is the mechanism of tachycardia?',
    explanation: 'In WPW syndrome with orthodromic reentry, conduction goes down the AV node (creating narrow complex) and returns via the accessory pathway.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Orthodromic reentry through accessory pathway', isCorrect: true },
      { text: 'Antidromic reentry', isCorrect: false },
      { text: 'Ectopic automaticity', isCorrect: false },
      { text: 'Afterdepolarization', isCorrect: false },
    ],
  },
  {
    text: 'Which class of antiarrhythmic drugs works primarily by blocking sodium channels?',
    explanation: 'Class IA and IB drugs block sodium channels. Class IA (quinidine, procainamide) have the most prominent effect. Class IC (flecainide) has even stronger effect but less used.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Cardiac arrhythmias',
    answers: [
      { text: 'Class I', isCorrect: true },
      { text: 'Class II', isCorrect: false },
      { text: 'Class III', isCorrect: false },
      { text: 'Class IV', isCorrect: false },
    ],
  },

  // HEART FAILURE (5 questions)
  {
    text: 'A 72-year-old man with a history of myocardial infarction presents with orthopnea and elevated JVP. Physical exam shows an S3 gallop. What is the primary compensatory mechanism initially activated in acute decompensation?',
    explanation: 'In acute heart failure, the Frank-Starling mechanism is the primary compensatory response, where increased preload stretches myocardial fibers to increase contractility.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Frank-Starling mechanism', isCorrect: true },
      { text: 'Baroreceptor reflex', isCorrect: false },
      { text: 'Aldosterone secretion', isCorrect: false },
      { text: 'Sympathetic activation', isCorrect: false },
    ],
  },
  {
    text: 'A patient with systolic heart failure is started on an ACE inhibitor. How does this medication improve outcomes in heart failure?',
    explanation: 'ACE inhibitors decrease afterload by blocking angiotensin II production, preventing ventricular remodeling and reducing aldosterone-mediated sodium retention.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Reduces afterload and prevents remodeling', isCorrect: true },
      { text: 'Increases contractility directly', isCorrect: false },
      { text: 'Increases heart rate', isCorrect: false },
      { text: 'Reduces preload only', isCorrect: false },
    ],
  },
  {
    text: 'A 65-year-old woman with diastolic heart failure has normal ejection fraction but impaired relaxation on echocardiogram. What is the primary pathophysiology?',
    explanation: 'Diastolic heart failure involves impaired ventricular relaxation and increased chamber stiffness, commonly seen in hypertension and hypertrophic cardiomyopathy.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Impaired relaxation and increased stiffness', isCorrect: true },
      { text: 'Reduced systolic contractility', isCorrect: false },
      { text: 'Valvular regurgitation', isCorrect: false },
      { text: 'Pericardial constriction', isCorrect: false },
    ],
  },
  {
    text: 'In acute decompensated heart failure, which finding would be expected in the pulmonary system due to elevated left ventricular end-diastolic pressure?',
    explanation: 'Elevated LVEDP increases pulmonary venous and capillary pressures, causing pulmonary edema with crackles on auscultation and Kerley B lines on chest X-ray.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Pulmonary edema with crackles', isCorrect: true },
      { text: 'Pneumothorax', isCorrect: false },
      { text: 'Pleural effusion only', isCorrect: false },
      { text: 'Pulmonary embolism', isCorrect: false },
    ],
  },
  {
    text: 'Which beta-blocker has been shown to improve mortality in systolic heart failure patients?',
    explanation: 'Carvedilol and metoprolol succinate (extended release) have shown mortality benefit in systolic HF. They reduce sympathetic tone and prevent remodeling.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Carvedilol or metoprolol succinate', isCorrect: true },
      { text: 'Atenolol', isCorrect: false },
      { text: 'Propranolol', isCorrect: false },
      { text: 'Labetalol', isCorrect: false },
    ],
  },

  // CORONARY HEART DISEASE (6 questions)
  {
    text: 'A 58-year-old man presents with chest pain radiating to the left arm and dyspnea. Troponin I is 2.3 ng/mL (normal <0.04). ECG shows ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?',
    explanation: 'ST elevation in the inferior leads (II, III, aVF) indicates inferior wall MI, typically caused by right coronary artery occlusion (dominant in ~85% of people).',
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
    text: 'What is the primary mechanism of plaque rupture leading to acute myocardial infarction?',
    explanation: 'Plaque rupture occurs when the fibrous cap of an atherosclerotic lesion breaks, exposing the thrombogenic lipid core. This triggers thrombus formation and vessel occlusion.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Rupture of fibrous cap exposing lipid core', isCorrect: true },
      { text: 'Gradual narrowing of lumen', isCorrect: false },
      { text: 'Vasospasm from smooth muscle contraction', isCorrect: false },
      { text: 'Embolization from left atrium', isCorrect: false },
    ],
  },
  {
    text: 'A 70-year-old patient with CAD is found to have elevated lipoprotein(a) levels. How does this contribute to atherosclerotic disease risk?',
    explanation: 'Lipoprotein(a) increases atherosclerosis risk through proinflammatory effects and interference with fibrinolysis, increasing thrombotic tendency.',
    difficulty: 'HARD',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Promotes inflammation and impairs fibrinolysis', isCorrect: true },
      { text: 'Directly blocks coronary vessels', isCorrect: false },
      { text: 'Increases HDL production', isCorrect: false },
      { text: 'Decreases LDL oxidation', isCorrect: false },
    ],
  },
  {
    text: 'Which ECG finding in the immediate post-MI period indicates the best prognosis for left ventricular function recovery?',
    explanation: 'ST segment elevation indicates transmural myocardial injury, which paradoxically indicates complete arterial occlusion suitable for revascularization, leading to better outcomes than NSTEMI.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Hyperacute T wave changes and ST elevation', isCorrect: true },
      { text: 'T wave inversion', isCorrect: false },
      { text: 'ST segment depression', isCorrect: false },
      { text: 'Pathologic Q waves', isCorrect: false },
    ],
  },
  {
    text: 'A patient post-MI is noted to have a new cardiac murmur on day 3. Which mechanical complication is most likely?',
    explanation: 'Papillary muscle rupture occurs typically 3-7 days post-MI and causes acute severe mitral regurgitation with a pansystolic murmur best heard at the apex.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Papillary muscle rupture', isCorrect: true },
      { text: 'Ventricular free wall rupture', isCorrect: false },
      { text: 'Acute aortic regurgitation', isCorrect: false },
      { text: 'Septal defect', isCorrect: false },
    ],
  },
  {
    text: 'How does aspirin reduce cardiovascular events in CAD patients?',
    explanation: 'Aspirin irreversibly inhibits platelet COX-1, preventing thromboxane A2 synthesis and reducing platelet aggregation and thrombosis.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Inhibits platelet aggregation via COX-1 blockade', isCorrect: true },
      { text: 'Directly dissolves thrombi', isCorrect: false },
      { text: 'Increases HDL cholesterol', isCorrect: false },
      { text: 'Blocks beta receptors', isCorrect: false },
    ],
  },

  // ASTHMA AND COPD (5 questions)
  {
    text: 'A 6-year-old child presents with acute-onset wheezing, cough, and dyspnea. Peak expiratory flow is 45% of predicted. What is the most appropriate initial treatment?',
    explanation: 'Acute asthma exacerbations are treated with short-acting beta-2 agonists (albuterol) as first-line, often combined with systemic corticosteroids.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Short-acting beta-2 agonist and corticosteroids', isCorrect: true },
      { text: 'Long-acting beta agonist', isCorrect: false },
      { text: 'Ipratropium alone', isCorrect: false },
      { text: 'Leukotriene antagonist', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old heavy smoker with COPD has severe dyspnea at rest. Spirometry shows FEV1/FVC ratio of 0.42. What is the pathophysiologic basis for airflow obstruction in COPD?',
    explanation: 'COPD involves loss of elastic recoil from emphysema and increased airway resistance from small airway disease and mucus plugging.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Loss of elastic recoil and small airway disease', isCorrect: true },
      { text: 'Smooth muscle hypertrophy only', isCorrect: false },
      { text: 'Acute bronchospasm', isCorrect: false },
      { text: 'Pleural effusion', isCorrect: false },
    ],
  },
  {
    text: 'Which medication is most effective for maintaining long-term control of persistent asthma?',
    explanation: 'Inhaled corticosteroids are the most effective long-term control medication for asthma, reducing inflammation and hyperresponsiveness.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Inhaled corticosteroids', isCorrect: true },
      { text: 'Short-acting beta agonists', isCorrect: false },
      { text: 'Antihistamines', isCorrect: false },
      { text: 'Decongestants', isCorrect: false },
    ],
  },
  {
    text: 'A patient with COPD presents with acute dyspnea and copious purulent sputum. ABG shows pH 7.25, pCO2 55. What is the primary acid-base disturbance?',
    explanation: 'Acute COPD exacerbation with CO2 retention and respiratory acidosis. The elevated pCO2 with low pH indicates respiratory acidosis.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Respiratory acidosis', isCorrect: true },
      { text: 'Respiratory alkalosis', isCorrect: false },
      { text: 'Metabolic acidosis', isCorrect: false },
      { text: 'Metabolic alkalosis', isCorrect: false },
    ],
  },
  {
    text: 'Anticholinergic agents like ipratropium are particularly beneficial in COPD because they block which receptor?',
    explanation: 'Anticholinergics block M3 muscarinic receptors on airway smooth muscle, preventing acetylcholine-induced bronchoconstriction.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'M3 muscarinic receptors', isCorrect: true },
      { text: 'Beta-2 adrenergic receptors', isCorrect: false },
      { text: 'H1 histamine receptors', isCorrect: false },
      { text: 'Cysteinyl leukotriene receptors', isCorrect: false },
    ],
  },

  // PNEUMONIA (5 questions)
  {
    text: 'A 45-year-old man with COPD presents with fever, cough, and purulent sputum. Gram stain shows gram-positive cocci in pairs. Which organism is most likely?',
    explanation: 'Streptococcus pneumoniae is gram-positive cocci in pairs (diplococci), the most common CAP pathogen in patients with COPD.',
    difficulty: 'EASY',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Streptococcus pneumoniae', isCorrect: true },
      { text: 'Haemophilus influenzae', isCorrect: false },
      { text: 'Pseudomonas aeruginosa', isCorrect: false },
      { text: 'Mycoplasma pneumoniae', isCorrect: false },
    ],
  },
  {
    text: 'A 72-year-old nursing home resident with aspiration risk develops fever and left lower lobe infiltrate. Which organisms are most likely to be involved?',
    explanation: 'Aspiration pneumonia in elderly typically involves anaerobes (Bacteroides, Peptostreptococcus, Fusobacterium) along with gram-negatives from oral flora.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Anaerobes and gram-negative rods', isCorrect: true },
      { text: 'Streptococcus pneumoniae alone', isCorrect: false },
      { text: 'Mycobacterium tuberculosis', isCorrect: false },
      { text: 'Fungal organisms', isCorrect: false },
    ],
  },
  {
    text: 'A healthy 25-year-old woman presents with subacute cough, malaise, and headache. Chest X-ray shows minimal infiltrates despite severe symptoms. Which organism should be considered?',
    explanation: 'Mycoplasma pneumoniae causes atypical pneumonia with prominent systemic symptoms but minimal CXR findings (walking pneumonia). Cold agglutinins are often positive.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Mycoplasma pneumoniae', isCorrect: true },
      { text: 'Streptococcus pneumoniae', isCorrect: false },
      { text: 'Staphylococcus aureus', isCorrect: false },
      { text: 'Klebsiella pneumoniae', isCorrect: false },
    ],
  },
  {
    text: 'Which mechanism allows Streptococcus pneumoniae to cause invasive disease?',
    explanation: 'S. pneumoniae has a polysaccharide capsule that inhibits phagocytosis and complement deposition, allowing it to evade innate immunity.',
    difficulty: 'HARD',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Polysaccharide capsule inhibits phagocytosis', isCorrect: true },
      { text: 'Produces exotoxins', isCorrect: false },
      { text: 'Intracellular survival', isCorrect: false },
      { text: 'Biofilm formation', isCorrect: false },
    ],
  },
  {
    text: 'A patient on broad-spectrum antibiotics develops fever and diarrhea. Stool testing is positive for Clostridium difficile toxins. What is the pathophysiologic mechanism of disease?',
    explanation: 'C. difficile produces toxins A and B that damage the intestinal epithelium, causing inflammatory colitis and pseudomembrane formation.',
    difficulty: 'HARD',
    subject: 'Microbiology',
    system: 'Gastrointestinal System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Toxin-mediated mucosal damage', isCorrect: true },
      { text: 'Bacterial invasion of lamina propria', isCorrect: false },
      { text: 'Immune complex deposition', isCorrect: false },
      { text: 'Malabsorption of bile salts', isCorrect: false },
    ],
  },

  // STROKE (4 questions)
  {
    text: 'A 68-year-old man with atrial fibrillation presents with acute-onset right hemiparesis and aphasia. CT shows no hypodensity. What is the most appropriate next step?',
    explanation: 'Clinical presentation suggests left MCA stroke. CT rules out hemorrhage. This patient is a candidate for thrombolytic therapy (tPA) within 3-4.5 hours of symptom onset.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'MRI and consider IV tPA', isCorrect: true },
      { text: 'Start anticoagulation immediately', isCorrect: false },
      { text: 'Obtain carotid ultrasound', isCorrect: false },
      { text: 'Observe without intervention', isCorrect: false },
    ],
  },
  {
    text: 'Which finding on carotid imaging in a stroke patient would indicate the highest surgical risk from carotid endarterectomy?',
    explanation: 'Severe contralateral carotid stenosis increases perioperative stroke risk in CEA as blood flow is dependent on the remaining patent vessel.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Severe contralateral stenosis', isCorrect: true },
      { text: 'Ipsilateral ulcerated plaque', isCorrect: false },
      { text: 'Long segment of stenosis', isCorrect: false },
      { text: 'Calcification of plaque', isCorrect: false },
    ],
  },
  {
    text: 'A patient with lacunar stroke in the posterior limb of the internal capsule would present with which clinical syndrome?',
    explanation: 'Lacunar strokes in the posterior limb of internal capsule cause pure motor stroke affecting corticospinal tract fibers.',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Pure motor stroke', isCorrect: true },
      { text: 'Pure sensory stroke', isCorrect: false },
      { text: 'Ataxic hemiparesis', isCorrect: false },
      { text: 'Dysarthria-clumsy hand', isCorrect: false },
    ],
  },
  {
    text: 'What is the primary mechanism of tissue damage in acute ischemic stroke?',
    explanation: 'Acute ischemia causes ATP depletion, leading to failure of Na/K ATPase, cellular edema, and excitotoxicity from glutamate accumulation.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'ATP depletion and excitotoxicity', isCorrect: true },
      { text: 'Direct microvascular occlusion', isCorrect: false },
      { text: 'Inflammatory cell infiltration', isCorrect: false },
      { text: 'Apoptosis activation alone', isCorrect: false },
    ],
  },

  // EPILEPSY (5 questions)
  {
    text: 'A 4-year-old child with fever presents with brief episodes of jerking of the extremities. During examination, the child seems confused. Parents report the seizure lasted 30 seconds. EEG during the episode shows generalized spike-and-wave discharges. What type of seizure is this?',
    explanation: 'Brief generalized tonic-clonic seizures triggered by fever in young children indicate febrile seizures, usually generalized onset.',
    difficulty: 'EASY',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Generalized tonic-clonic seizure', isCorrect: true },
      { text: 'Complex focal seizure', isCorrect: false },
      { text: 'Absence seizure', isCorrect: false },
      { text: 'Status epilepticus', isCorrect: false },
    ],
  },
  {
    text: 'A patient with temporal lobe epilepsy has recurrent seizures characterized by olfactory hallucinations followed by lip smacking and post-ictal confusion. What is the seizure semiology indicating?',
    explanation: 'Olfactory aura and oral automatisms (lip smacking) indicate mesial temporal lobe seizures, typically from hippocampal sclerosis.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Mesial temporal lobe origin', isCorrect: true },
      { text: 'Frontal lobe seizure', isCorrect: false },
      { text: 'Occipital lobe seizure', isCorrect: false },
      { text: 'Generalized absence seizure', isCorrect: false },
    ],
  },
  {
    text: 'Which anti-epileptic drug should be avoided in women of childbearing age due to significant teratogenic effects?',
    explanation: 'Valproic acid is highly teratogenic (neural tube defects, developmental delay) and should be avoided in pregnancy unless no other options exist.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Valproic acid', isCorrect: true },
      { text: 'Levetiracetam', isCorrect: false },
      { text: 'Lamotrigine', isCorrect: false },
      { text: 'Oxcarbazepine', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old patient with newly diagnosed epilepsy is started on phenytoin. After 2 weeks, the patient develops fever, rash, and lymphadenopathy. What is the likely diagnosis?',
    explanation: 'Phenytoin can cause DRESS syndrome (Drug Reaction with Eosinophilia and Systemic Symptoms) presenting with fever, rash, and systemic symptoms.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'DRESS syndrome', isCorrect: true },
      { text: 'Stevens-Johnson syndrome', isCorrect: false },
      { text: 'Toxic epidermal necrolysis', isCorrect: false },
      { text: 'Viral exanthem', isCorrect: false },
    ],
  },
  {
    text: 'What is the mechanism of action of gabapentin in treating seizures?',
    explanation: 'Gabapentin binds to alpha-2-delta subunits of voltage-gated calcium channels, reducing calcium influx and neurotransmitter release.',
    difficulty: 'HARD',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Blocks voltage-gated calcium channels', isCorrect: true },
      { text: 'Enhances GABA transmission', isCorrect: false },
      { text: 'Blocks sodium channels', isCorrect: false },
      { text: 'Inhibits NMDA receptors', isCorrect: false },
    ],
  },
];

async function seed() {
  console.log('Starting seed for batch 2...');

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

  console.log(`Successfully seeded ${count} questions!`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
