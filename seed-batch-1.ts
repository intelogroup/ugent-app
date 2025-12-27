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
  // Cardiovascular System (10 questions)
  {
    text: 'A 58-year-old woman presents with progressive dyspnea and orthopnea. Physical exam reveals a loud S1, opening snap, and diastolic rumble at the apex. What is the most likely diagnosis?',
    explanation: 'Mitral stenosis classically presents with a loud S1 (closure of stenotic valve), opening snap (sudden opening of stenotic valve), and diastolic rumble (turbulent flow across narrowed valve). This is most commonly caused by rheumatic heart disease.',
    difficulty: 'MEDIUM',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Valvular Heart Disease',
    answers: [
      { text: 'Mitral stenosis', isCorrect: true },
      { text: 'Mitral regurgitation', isCorrect: false },
      { text: 'Aortic stenosis', isCorrect: false },
      { text: 'Tricuspid regurgitation', isCorrect: false },
    ],
  },
  {
    text: 'A 42-year-old man with Marfan syndrome develops sudden severe chest pain radiating to the back. CT angiography shows a Stanford type A dissection. What is the immediate management?',
    explanation: 'Stanford type A aortic dissection (involving ascending aorta) requires emergency surgical repair due to high risk of rupture, cardiac tamponade, and acute aortic regurgitation. Medical management with beta-blockers is used as a bridge to surgery.',
    difficulty: 'HARD',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Aortic Dissection',
    answers: [
      { text: 'Emergency surgical repair', isCorrect: true },
      { text: 'Medical management with beta-blockers only', isCorrect: false },
      { text: 'Thrombolysis', isCorrect: false },
      { text: 'Observation', isCorrect: false },
    ],
  },
  {
    text: 'A newborn is noted to have differential cyanosis (lower body more cyanotic than upper body). What congenital heart defect is most likely?',
    explanation: 'Differential cyanosis with more cyanosis in the lower body suggests patent ductus arteriosus (PDA) with reversed shunting due to pulmonary hypertension (Eisenmenger syndrome). Deoxygenated blood from the pulmonary artery flows through the PDA to the descending aorta, causing lower body cyanosis.',
    difficulty: 'HARD',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Congenital Heart Disease',
    answers: [
      { text: 'Patent ductus arteriosus with pulmonary hypertension', isCorrect: true },
      { text: 'Tetralogy of Fallot', isCorrect: false },
      { text: 'Transposition of great arteries', isCorrect: false },
      { text: 'Coarctation of the aorta', isCorrect: false },
    ],
  },
  {
    text: 'A 65-year-old diabetic man has an acute MI. ECG shows ST elevations in leads II, III, and aVF. Which coronary artery is most likely occluded?',
    explanation: 'ST elevations in the inferior leads (II, III, aVF) indicate inferior wall MI, which is typically caused by occlusion of the right coronary artery (RCA) in 80% of cases. The RCA supplies the inferior wall of the left ventricle.',
    difficulty: 'EASY',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Myocardial Infarction',
    answers: [
      { text: 'Right coronary artery', isCorrect: true },
      { text: 'Left anterior descending artery', isCorrect: false },
      { text: 'Left circumflex artery', isCorrect: false },
      { text: 'Left main coronary artery', isCorrect: false },
    ],
  },
  {
    text: 'A 28-year-old woman develops bilateral lower extremity edema, hypoalbuminemia, and proteinuria after starting oral contraceptives. Doppler ultrasound confirms deep vein thrombosis. What inherited thrombophilia should be suspected?',
    explanation: 'Factor V Leiden is the most common inherited thrombophilia in Caucasians. Oral contraceptives increase thrombosis risk, and when combined with Factor V Leiden, significantly increase DVT risk. The mutation causes resistance to activated protein C.',
    difficulty: 'MEDIUM',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Thrombosis',
    answers: [
      { text: 'Factor V Leiden mutation', isCorrect: true },
      { text: 'Protein C deficiency', isCorrect: false },
      { text: 'Antithrombin III deficiency', isCorrect: false },
      { text: 'Prothrombin G20210A mutation', isCorrect: false },
    ],
  },
  {
    text: 'A 70-year-old man presents with exertional syncope and angina. Echocardiogram shows severe calcific aortic stenosis with a valve area of 0.7 cm². What is the definitive treatment?',
    explanation: 'Symptomatic severe aortic stenosis (valve area <1.0 cm²) requires aortic valve replacement (surgical or transcatheter) as medical therapy does not improve outcomes. Symptoms indicate high risk of sudden cardiac death.',
    difficulty: 'EASY',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Aortic Stenosis',
    answers: [
      { text: 'Aortic valve replacement', isCorrect: true },
      { text: 'Beta-blockers', isCorrect: false },
      { text: 'ACE inhibitors', isCorrect: false },
      { text: 'Observation', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old man with long-standing hypertension develops acute onset of severe tearing chest pain. His blood pressure is 180/110 mmHg in the right arm and 140/90 mmHg in the left arm. What imaging study should be ordered first?',
    explanation: 'CT angiography is the first-line imaging for suspected aortic dissection in hemodynamically stable patients. It provides rapid, accurate visualization of the dissection and its extent. Blood pressure differential between arms suggests aortic dissection.',
    difficulty: 'MEDIUM',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Aortic Dissection',
    answers: [
      { text: 'CT angiography of chest', isCorrect: true },
      { text: 'Chest X-ray', isCorrect: false },
      { text: 'Echocardiography', isCorrect: false },
      { text: 'Coronary angiography', isCorrect: false },
    ],
  },
  {
    text: 'A 32-year-old woman presents with palpitations. ECG shows narrow-complex tachycardia at 180 bpm. Vagal maneuvers terminate the arrhythmia. What is the most likely diagnosis?',
    explanation: 'Atrioventricular nodal reentrant tachycardia (AVNRT) is the most common paroxysmal supraventricular tachycardia. It presents as regular narrow-complex tachycardia that terminates with vagal maneuvers (which slow AV node conduction and break the reentry circuit).',
    difficulty: 'EASY',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Arrhythmias',
    answers: [
      { text: 'Atrioventricular nodal reentrant tachycardia (AVNRT)', isCorrect: true },
      { text: 'Ventricular tachycardia', isCorrect: false },
      { text: 'Atrial fibrillation', isCorrect: false },
      { text: 'Sinus tachycardia', isCorrect: false },
    ],
  },
  {
    text: 'A 68-year-old man with heart failure has an ejection fraction of 25%. Despite maximal medical therapy, he continues to have dyspnea and fatigue. ECG shows LBBB with QRS duration of 160 ms. What device therapy is indicated?',
    explanation: 'Cardiac resynchronization therapy (CRT/biventricular pacing) is indicated for symptomatic heart failure with LVEF ≤35%, LBBB, and QRS ≥150 ms despite optimal medical therapy. CRT improves ventricular synchrony and outcomes.',
    difficulty: 'MEDIUM',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Heart Failure',
    answers: [
      { text: 'Cardiac resynchronization therapy (CRT)', isCorrect: true },
      { text: 'Implantable cardioverter-defibrillator (ICD) only', isCorrect: false },
      { text: 'Permanent pacemaker', isCorrect: false },
      { text: 'No device therapy needed', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old woman develops fever, new heart murmur, and splinter hemorrhages one week after dental extraction. Blood cultures grow Streptococcus viridans. What is the diagnosis?',
    explanation: 'Infective endocarditis caused by Streptococcus viridans (alpha-hemolytic streptococci from oral flora) is common after dental procedures, especially in patients with valvular abnormalities. Classic findings include fever, new murmur, and peripheral stigmata (splinter hemorrhages, Osler nodes, Janeway lesions).',
    difficulty: 'EASY',
    subject: 'Cardiology',
    system: 'Cardiovascular System',
    topic: 'Endocarditis',
    answers: [
      { text: 'Infective endocarditis', isCorrect: true },
      { text: 'Acute rheumatic fever', isCorrect: false },
      { text: 'Pericarditis', isCorrect: false },
      { text: 'Myocarditis', isCorrect: false },
    ],
  },

  // Respiratory System (10 questions)
  {
    text: 'A 25-year-old man presents with acute onset pleuritic chest pain and dyspnea. He is tall and thin. Chest X-ray shows a 30% pneumothorax. What is the most appropriate initial management?',
    explanation: 'Primary spontaneous pneumothorax >20% in a symptomatic patient requires intervention. Needle aspiration or chest tube thoracostomy is indicated. Small (<20%) asymptomatic pneumothoraces can be observed. Tall, thin young males are at highest risk for primary spontaneous pneumothorax.',
    difficulty: 'MEDIUM',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Pneumothorax',
    answers: [
      { text: 'Needle aspiration or chest tube placement', isCorrect: true },
      { text: 'Observation only', isCorrect: false },
      { text: 'High-flow oxygen', isCorrect: false },
      { text: 'Immediate thoracotomy', isCorrect: false },
    ],
  },
  {
    text: 'A 60-year-old smoker has progressive dyspnea. Pulmonary function tests show FEV1/FVC ratio of 0.65 and increased total lung capacity. What is the diagnosis?',
    explanation: 'Chronic obstructive pulmonary disease (COPD) is characterized by airflow obstruction (FEV1/FVC <0.70) that is not fully reversible. Increased total lung capacity indicates hyperinflation typical of emphysema. Smoking is the primary risk factor.',
    difficulty: 'EASY',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'COPD',
    answers: [
      { text: 'Chronic obstructive pulmonary disease (COPD)', isCorrect: true },
      { text: 'Asthma', isCorrect: false },
      { text: 'Interstitial lung disease', isCorrect: false },
      { text: 'Pulmonary embolism', isCorrect: false },
    ],
  },
  {
    text: 'A 35-year-old woman with asthma presents with fever, productive cough with brown mucus plugs, and wheezing. Chest X-ray shows transient pulmonary infiltrates. Sputum shows eosinophils and Aspergillus. What is the diagnosis?',
    explanation: 'Allergic bronchopulmonary aspergillosis (ABPA) is a hypersensitivity reaction to Aspergillus in asthmatic patients. Classic findings include transient pulmonary infiltrates, eosinophilia, elevated IgE, and brown mucus plugs. It does not represent true infection.',
    difficulty: 'HARD',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Allergic Bronchopulmonary Aspergillosis',
    answers: [
      { text: 'Allergic bronchopulmonary aspergillosis (ABPA)', isCorrect: true },
      { text: 'Invasive aspergillosis', isCorrect: false },
      { text: 'Bacterial pneumonia', isCorrect: false },
      { text: 'Tuberculosis', isCorrect: false },
    ],
  },
  {
    text: 'A 28-year-old pregnant woman develops sudden dyspnea and chest pain. She is tachycardic and hypoxic. ECG shows sinus tachycardia and S1Q3T3 pattern. What is the most likely diagnosis?',
    explanation: 'Pulmonary embolism is more common in pregnancy due to hypercoagulable state. S1Q3T3 pattern (S wave in lead I, Q wave and T wave inversion in lead III) is a classic but uncommon ECG finding in PE. Pregnancy is a major risk factor for venous thromboembolism.',
    difficulty: 'MEDIUM',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Pulmonary Embolism',
    answers: [
      { text: 'Pulmonary embolism', isCorrect: true },
      { text: 'Pneumonia', isCorrect: false },
      { text: 'Asthma exacerbation', isCorrect: false },
      { text: 'Pneumothorax', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old coal miner presents with progressive dyspnea and cough. Chest X-ray shows multiple small nodules in upper lobes with "eggshell" calcifications of hilar lymph nodes. What is the diagnosis?',
    explanation: 'Silicosis from coal dust exposure causes upper lobe nodules and characteristic "eggshell" calcifications of hilar lymph nodes. It is a restrictive lung disease that increases risk of tuberculosis and progressive massive fibrosis.',
    difficulty: 'MEDIUM',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Pneumoconiosis',
    answers: [
      { text: 'Silicosis', isCorrect: true },
      { text: 'Sarcoidosis', isCorrect: false },
      { text: 'Tuberculosis', isCorrect: false },
      { text: 'Lung cancer', isCorrect: false },
    ],
  },
  {
    text: 'A 50-year-old man with alcoholism develops fever, productive cough with foul-smelling sputum, and night sweats. Chest X-ray shows a cavitary lesion in the right lower lobe. What organism is most likely?',
    explanation: 'Aspiration pneumonia with lung abscess commonly occurs in alcoholics due to impaired gag reflex and oral anaerobic bacteria. Foul-smelling sputum and cavitation are characteristic. Common organisms include anaerobes (Bacteroides, Fusobacterium, Peptostreptococcus).',
    difficulty: 'EASY',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Lung Abscess',
    answers: [
      { text: 'Anaerobic bacteria', isCorrect: true },
      { text: 'Streptococcus pneumoniae', isCorrect: false },
      { text: 'Mycobacterium tuberculosis', isCorrect: false },
      { text: 'Staphylococcus aureus', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old woman with progressive dyspnea has bibasilar crackles on exam. High-resolution CT shows honeycombing and reticular opacities. Pulmonary function tests show restrictive pattern. What is the most likely diagnosis?',
    explanation: 'Idiopathic pulmonary fibrosis (IPF) presents with progressive dyspnea, bibasilar crackles, restrictive physiology, and honeycomb pattern on HRCT. It typically affects middle-aged to elderly patients and has a poor prognosis.',
    difficulty: 'MEDIUM',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Interstitial Lung Disease',
    answers: [
      { text: 'Idiopathic pulmonary fibrosis', isCorrect: true },
      { text: 'COPD', isCorrect: false },
      { text: 'Pneumonia', isCorrect: false },
      { text: 'Pulmonary edema', isCorrect: false },
    ],
  },
  {
    text: 'A 8-year-old child has recurrent respiratory infections, chronic cough, and failure to thrive. Sweat chloride test is 75 mEq/L (normal <40). What is the underlying genetic defect?',
    explanation: 'Cystic fibrosis is caused by mutations in the CFTR gene (chromosome 7), most commonly ΔF508 deletion. CFTR is a chloride channel, and its dysfunction leads to thick secretions affecting lungs, pancreas, and sweat glands. Elevated sweat chloride (>60 mEq/L) is diagnostic.',
    difficulty: 'EASY',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Cystic Fibrosis',
    answers: [
      { text: 'CFTR gene mutation', isCorrect: true },
      { text: 'Alpha-1 antitrypsin deficiency', isCorrect: false },
      { text: 'Surfactant protein deficiency', isCorrect: false },
      { text: 'Primary ciliary dyskinesia', isCorrect: false },
    ],
  },
  {
    text: 'A 62-year-old smoker presents with hemoptysis and weight loss. Chest X-ray shows a central lung mass. Biopsy shows small cells with scant cytoplasm and neuroendocrine markers. What paraneoplastic syndrome is most commonly associated?',
    explanation: 'Small cell lung cancer commonly causes SIADH (syndrome of inappropriate ADH) leading to hyponatremia. Other paraneoplastic syndromes include Cushing syndrome (ectopic ACTH), Lambert-Eaton myasthenic syndrome, and cerebellar degeneration.',
    difficulty: 'MEDIUM',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Lung Cancer',
    answers: [
      { text: 'SIADH (syndrome of inappropriate ADH)', isCorrect: true },
      { text: 'Hypercalcemia', isCorrect: false },
      { text: 'Hypertrophic osteoarthropathy', isCorrect: false },
      { text: 'Polycythemia', isCorrect: false },
    ],
  },
  {
    text: 'A 30-year-old man with asthma has an acute exacerbation. Arterial blood gas shows pH 7.48, PaCO2 28 mmHg, PaO2 65 mmHg. What does this indicate?',
    explanation: 'Respiratory alkalosis (high pH, low PaCO2) with hypoxemia indicates hyperventilation in response to hypoxia during asthma exacerbation. This is an early/moderate exacerbation. Normal or elevated PaCO2 in asthma suggests impending respiratory failure and need for mechanical ventilation.',
    difficulty: 'HARD',
    subject: 'Pulmonology',
    system: 'Respiratory System',
    topic: 'Asthma',
    answers: [
      { text: 'Respiratory alkalosis with hypoxemia - moderate exacerbation', isCorrect: true },
      { text: 'Respiratory acidosis - severe exacerbation', isCorrect: false },
      { text: 'Metabolic alkalosis', isCorrect: false },
      { text: 'Normal blood gas', isCorrect: false },
    ],
  },

  // Nervous System (10 questions)
  {
    text: 'A 70-year-old man develops sudden right-sided weakness and aphasia. CT head shows no hemorrhage. He presents 2 hours after symptom onset. What is the most appropriate immediate treatment?',
    explanation: 'Acute ischemic stroke within 4.5 hours of onset (and meeting criteria) should receive IV tissue plasminogen activator (tPA) after excluding hemorrhage with CT. Early reperfusion improves outcomes. Time is brain - rapid treatment is critical.',
    difficulty: 'EASY',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'IV tissue plasminogen activator (tPA)', isCorrect: true },
      { text: 'Aspirin only', isCorrect: false },
      { text: 'Anticoagulation with heparin', isCorrect: false },
      { text: 'Observation', isCorrect: false },
    ],
  },
  {
    text: 'A 25-year-old woman has episodes of unilateral throbbing headache preceded by visual aura (zigzag lines). Headaches last 8 hours and are associated with nausea and photophobia. What is the diagnosis?',
    explanation: 'Migraine with aura (classic migraine) presents with focal neurological symptoms (typically visual) lasting 5-60 minutes before headache onset. Headaches are unilateral, throbbing, moderate-to-severe, and associated with nausea and photophobia/phonophobia.',
    difficulty: 'EASY',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Headache',
    answers: [
      { text: 'Migraine with aura', isCorrect: true },
      { text: 'Cluster headache', isCorrect: false },
      { text: 'Tension headache', isCorrect: false },
      { text: 'Subarachnoid hemorrhage', isCorrect: false },
    ],
  },
  {
    text: 'A 60-year-old man has resting tremor, bradykinesia, and cogwheel rigidity. Symptoms improve with levodopa. What is the underlying pathology?',
    explanation: 'Parkinson disease is caused by degeneration of dopaminergic neurons in the substantia nigra pars compacta. This leads to decreased dopamine in the basal ganglia, causing classic motor symptoms (resting tremor, bradykinesia, rigidity, postural instability). Lewy bodies are the pathologic hallmark.',
    difficulty: 'MEDIUM',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Movement Disorders',
    answers: [
      { text: 'Degeneration of substantia nigra dopaminergic neurons', isCorrect: true },
      { text: 'Cerebellar atrophy', isCorrect: false },
      { text: 'Basal ganglia hemorrhage', isCorrect: false },
      { text: 'Frontal lobe dementia', isCorrect: false },
    ],
  },
  {
    text: 'A 20-year-old woman has recurrent episodes of vision loss and weakness in different limbs over several months. MRI shows periventricular white matter lesions. CSF shows oligoclonal bands. What is the diagnosis?',
    explanation: 'Multiple sclerosis presents with relapsing-remitting neurological deficits separated in time and space. MRI shows demyelinating plaques (periventricular white matter lesions). CSF oligoclonal bands indicate intrathecal IgG production. MS is an autoimmune demyelinating disease of CNS.',
    difficulty: 'MEDIUM',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Demyelinating Disease',
    answers: [
      { text: 'Multiple sclerosis', isCorrect: true },
      { text: 'Guillain-Barré syndrome', isCorrect: false },
      { text: 'Myasthenia gravis', isCorrect: false },
      { text: 'Brain tumor', isCorrect: false },
    ],
  },
  {
    text: 'A 5-year-old child has brief episodes of staring and eye fluttering lasting 5-10 seconds multiple times per day. EEG shows 3-Hz spike-and-wave discharges. What type of seizure is this?',
    explanation: 'Absence seizures (petit mal) are characterized by brief episodes of impaired consciousness with staring, eye fluttering, and automatic behavior. Classic EEG shows 3-Hz spike-and-wave pattern. Most common in children aged 4-8 years. First-line treatment is ethosuximide or valproic acid.',
    difficulty: 'EASY',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Epilepsy',
    answers: [
      { text: 'Absence seizure', isCorrect: true },
      { text: 'Complex partial seizure', isCorrect: false },
      { text: 'Myoclonic seizure', isCorrect: false },
      { text: 'Tonic-clonic seizure', isCorrect: false },
    ],
  },
  {
    text: 'A 35-year-old woman develops ascending paralysis and areflexia 2 weeks after a respiratory infection. CSF shows elevated protein with normal cell count. What is the diagnosis?',
    explanation: 'Guillain-Barré syndrome is an acute inflammatory demyelinating polyneuropathy causing ascending weakness and areflexia, typically following infection. CSF shows albuminocytologic dissociation (elevated protein, normal WBC). It is caused by autoimmune attack on peripheral nerve myelin.',
    difficulty: 'MEDIUM',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Peripheral Neuropathy',
    answers: [
      { text: 'Guillain-Barré syndrome', isCorrect: true },
      { text: 'Myasthenia gravis', isCorrect: false },
      { text: 'Multiple sclerosis', isCorrect: false },
      { text: 'Botulism', isCorrect: false },
    ],
  },
  {
    text: 'A 50-year-old man with sudden severe "thunderclap" headache develops nuchal rigidity. CT head shows hyperdensity in basal cisterns. What is the most likely diagnosis?',
    explanation: 'Subarachnoid hemorrhage classically presents with sudden severe "worst headache of life" (thunderclap headache) and meningismus. CT shows blood in subarachnoid spaces (basal cisterns, sulci). Most commonly caused by ruptured berry aneurysm. LP shows xanthochromia if CT negative.',
    difficulty: 'EASY',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Subarachnoid Hemorrhage',
    answers: [
      { text: 'Subarachnoid hemorrhage', isCorrect: true },
      { text: 'Migraine', isCorrect: false },
      { text: 'Meningitis', isCorrect: false },
      { text: 'Tension headache', isCorrect: false },
    ],
  },
  {
    text: 'A 28-year-old woman has progressive muscle weakness that worsens with repetitive use and improves with rest. Edrophonium test is positive. What antibodies are most likely present?',
    explanation: 'Myasthenia gravis is characterized by fatigable muscle weakness due to antibodies against acetylcholine receptors at the neuromuscular junction. Edrophonium (short-acting anticholinesterase) temporarily improves weakness. Anti-AChR antibodies are present in 85% of cases.',
    difficulty: 'MEDIUM',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Neuromuscular Junction Disorders',
    answers: [
      { text: 'Anti-acetylcholine receptor antibodies', isCorrect: true },
      { text: 'Anti-voltage-gated calcium channel antibodies', isCorrect: false },
      { text: 'Anti-myelin antibodies', isCorrect: false },
      { text: 'Anti-GAD antibodies', isCorrect: false },
    ],
  },
  {
    text: 'A 65-year-old man has progressive memory loss and behavioral changes. MRI shows frontal and temporal lobe atrophy. Pathology would most likely show what?',
    explanation: 'Frontotemporal dementia (Pick disease) causes personality changes, behavioral disinhibition, and language problems before memory loss. Frontal and temporal atrophy is characteristic. Pathology shows Pick bodies (tau-positive inclusions) and knife-blade atrophy of frontal/temporal lobes.',
    difficulty: 'HARD',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Dementia',
    answers: [
      { text: 'Pick bodies (tau inclusions)', isCorrect: true },
      { text: 'Lewy bodies', isCorrect: false },
      { text: 'Neurofibrillary tangles and amyloid plaques', isCorrect: false },
      { text: 'Prion proteins', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old man develops sudden diplopia and facial numbness. MRI shows demyelinating lesion in pons. This is the second episode; first was optic neuritis 6 months ago. What is the most appropriate long-term treatment?',
    explanation: 'Relapsing-remitting multiple sclerosis requires disease-modifying therapy to reduce relapse rate and delay disability progression. First-line options include interferon-beta, glatiramer acetate, or oral agents (fingolimod, dimethyl fumarate). Acute relapses are treated with IV methylprednisolone.',
    difficulty: 'MEDIUM',
    subject: 'Neurology',
    system: 'Nervous System',
    topic: 'Multiple Sclerosis',
    answers: [
      { text: 'Disease-modifying therapy (interferon-beta or other DMT)', isCorrect: true },
      { text: 'Aspirin only', isCorrect: false },
      { text: 'Chronic corticosteroids', isCorrect: false },
      { text: 'No treatment needed', isCorrect: false },
    ],
  },
];

async function main() {
  console.log('Starting seed batch 1 (30 questions)...');

  let created = 0;
  let skipped = 0;

  for (const q of questions) {
    try {
      // Find existing subject, system, and topic
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
        skipped++;
        continue;
      }

      // Check if question already exists
      const existing = await prisma.question.findFirst({
        where: { text: q.text },
      });

      if (existing) {
        console.log(`Question already exists: "${q.text.substring(0, 50)}..."`);
        skipped++;
        continue;
      }

      // Create question with answers
      await prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation,
          difficulty: q.difficulty,
          systemId: system.id,
          topicId: topic.id,
          subjectId: subject.id,
          options: {
            create: q.answers.map((answer, index) => ({
              text: answer.text,
              isCorrect: answer.isCorrect,
              displayOrder: index,
            })),
          },
        },
      });

      created++;
      if (created % 10 === 0) {
        console.log(`Created ${created} questions...`);
      }
    } catch (error) {
      console.error(`Error creating question: ${q.text.substring(0, 50)}...`, error);
      skipped++;
    }
  }

  console.log(`\n✓ Batch 1 completed!`);
  console.log(`  Created: ${created} questions`);
  console.log(`  Skipped: ${skipped} questions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
