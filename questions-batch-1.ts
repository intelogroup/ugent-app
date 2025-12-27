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
  // PHYSIOLOGY QUESTIONS (6)
  {
    text: 'A 45-year-old man presents with dyspnea and chest pain. His arterial blood gas shows pH 7.35, pCO2 48, and pO2 65. Which respiratory parameter is most affected?',
    explanation: 'The elevated pCO2 and decreased pH indicate respiratory acidosis with hypoxemia. This represents hypoventilation, primarily affecting the ability to eliminate CO2.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Hypoventilation with CO2 retention', isCorrect: true },
      { text: 'Hyperventilation with CO2 loss', isCorrect: false },
      { text: 'Normal ventilation with oxygen diffusion defect', isCorrect: false },
      { text: 'Increased dead space ventilation', isCorrect: false },
    ],
  },
  {
    text: 'During cardiac catheterization, a patient\'s pulmonary capillary wedge pressure (PCWP) is found to be 25 mmHg (normal <18). What does this indicate?',
    explanation: 'Elevated PCWP indicates increased left ventricular end-diastolic pressure, reflecting left-sided heart failure or mitral stenosis. PCWP estimates left atrial pressure.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Heart failure',
    answers: [
      { text: 'Left ventricular dysfunction and elevated LVEDP', isCorrect: true },
      { text: 'Right ventricular dysfunction', isCorrect: false },
      { text: 'Hypertension', isCorrect: false },
      { text: 'Decreased cardiac output', isCorrect: false },
    ],
  },
  {
    text: 'A 62-year-old woman with chronic kidney disease has a GFR of 35 mL/min/1.73m2. What happens to serum creatinine levels?',
    explanation: 'As GFR decreases, the kidneys cannot adequately filter creatinine, causing it to accumulate in blood. Serum creatinine is inversely related to GFR and increases when nephron function declines.',
    difficulty: 'EASY',
    subject: 'Physiology',
    system: 'Renal System',
    topic: 'Chronic kidney disease',
    answers: [
      { text: 'Increases due to reduced clearance', isCorrect: true },
      { text: 'Decreases due to protein loss', isCorrect: false },
      { text: 'Remains unchanged', isCorrect: false },
      { text: 'Decreases proportionally to GFR', isCorrect: false },
    ],
  },
  {
    text: 'During septic shock, which mechanism best explains the initial widened arteriovenous oxygen difference (A-VO2)?',
    explanation: 'In early sepsis, peripheral vasodilatation causes maldistribution of blood flow, resulting in some tissues experiencing hypoperfusion while others are overperfused. This creates regional shunting and increased oxygen extraction.',
    difficulty: 'HARD',
    subject: 'Physiology',
    system: 'Cardiovascular System',
    topic: 'Septic shock',
    answers: [
      { text: 'Maldistribution of cardiac output with regional hypoperfusion', isCorrect: true },
      { text: 'Decreased cardiac output', isCorrect: false },
      { text: 'Increased hemoglobin', isCorrect: false },
      { text: 'Pulmonary edema', isCorrect: false },
    ],
  },
  {
    text: 'A patient on mechanical ventilation shows increased airway resistance but normal lung compliance. Which pathophysiology is most likely?',
    explanation: 'Increased airway resistance with normal compliance indicates a problem with the airways themselves, such as bronchospasm, secretions, or bronchial obstruction, rather than lung tissue disease.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Pneumonia',
    answers: [
      { text: 'Airway obstruction or bronchospasm', isCorrect: true },
      { text: 'Pulmonary fibrosis', isCorrect: false },
      { text: 'Pneumothorax', isCorrect: false },
      { text: 'Pulmonary edema', isCorrect: false },
    ],
  },
  {
    text: 'In metabolic acidosis secondary to diarrhea, how does the respiratory system compensate?',
    explanation: 'In metabolic acidosis, the respiratory center is stimulated by low pH, causing hyperventilation to eliminate CO2 and raise pH. This is Kussmaul respiration when severe.',
    difficulty: 'MEDIUM',
    subject: 'Physiology',
    system: 'Respiratory System',
    topic: 'Asthma and COPD',
    answers: [
      { text: 'Hyperventilation to decrease pCO2', isCorrect: true },
      { text: 'Hypoventilation to increase pCO2', isCorrect: false },
      { text: 'No respiratory compensation', isCorrect: false },
      { text: 'Increased tidal volume without change in rate', isCorrect: false },
    ],
  },

  // BIOCHEMISTRY QUESTIONS (6)
  {
    text: 'A 3-year-old child presents with developmental delay and hepatosplenomegaly. Laboratory findings show elevated glucose, fasting hypoglycemia, and lactic acidosis. What enzyme is likely deficient?',
    explanation: 'These clinical findings are consistent with Glycogen Storage Disease Type I (Von Gierke disease), caused by glucose-6-phosphatase deficiency. This enzyme is crucial for the final step of both gluconeogenesis and glycogenolysis.',
    difficulty: 'HARD',
    subject: 'Biochemistry',
    system: 'Gastrointestinal System',
    topic: 'Metabolic disorders',
    answers: [
      { text: 'Glucose-6-phosphatase', isCorrect: true },
      { text: 'Glycogen phosphorylase', isCorrect: false },
      { text: 'Hexokinase', isCorrect: false },
      { text: 'Pyruvate kinase', isCorrect: false },
    ],
  },
  {
    text: 'A patient on statin therapy presents with unexplained muscle pain and elevated creatine kinase (CK). What is the most likely mechanism?',
    explanation: 'Statins inhibit HMG-CoA reductase, reducing cholesterol synthesis. However, they also reduce ubiquinone (CoQ10) synthesis, leading to impaired mitochondrial energy production in muscles, causing myopathy.',
    difficulty: 'MEDIUM',
    subject: 'Biochemistry',
    system: 'Musculoskeletal System',
    topic: 'Statin-induced myopathy',
    answers: [
      { text: 'Reduced CoQ10 and impaired ATP production', isCorrect: true },
      { text: 'Direct myotoxin formation', isCorrect: false },
      { text: 'Increased protein synthesis', isCorrect: false },
      { text: 'Mitochondrial DNA mutation', isCorrect: false },
    ],
  },
  {
    text: 'Which factor decreases hemoglobin\'s oxygen affinity, shifting the oxygen-hemoglobin dissociation curve to the right?',
    explanation: 'The Bohr effect describes how increased 2,3-DPG, decreased pH, increased pCO2, and increased temperature decrease hemoglobin\'s oxygen affinity, facilitating oxygen delivery to tissues.',
    difficulty: 'MEDIUM',
    subject: 'Biochemistry',
    system: 'Hematologic System',
    topic: 'Anemia',
    answers: [
      { text: '2,3-DPG, decreased pH, increased pCO2', isCorrect: true },
      { text: 'Increased pH and decreased temperature', isCorrect: false },
      { text: 'Fetal hemoglobin', isCorrect: false },
      { text: 'Carbon monoxide', isCorrect: false },
    ],
  },
  {
    text: 'A 45-year-old man with chronic alcohol abuse presents with hypoglycemia and encephalopathy. What is the biochemical defect?',
    explanation: 'Alcohol inhibits glycolysis and gluconeogenesis. It also depletes NAD+, shifting the lactate:pyruvate ratio and impairing gluconeogenesis. Combined with liver disease, this causes severe hypoglycemia and lactic acidosis.',
    difficulty: 'HARD',
    subject: 'Biochemistry',
    system: 'Gastrointestinal System',
    topic: 'Liver disease',
    answers: [
      { text: 'Impaired gluconeogenesis and NAD+ depletion', isCorrect: true },
      { text: 'Decreased glycogen synthesis', isCorrect: false },
      { text: 'Increased insulin secretion', isCorrect: false },
      { text: 'Increased lipolysis only', isCorrect: false },
    ],
  },
  {
    text: 'In familial hypercholesterolemia, which LDL receptor pathway is impaired?',
    explanation: 'Familial hypercholesterolemia is caused by mutations in the LDL receptor gene, reducing the number of functional LDL receptors on cells. This impairs receptor-mediated endocytosis of LDL particles.',
    difficulty: 'MEDIUM',
    subject: 'Biochemistry',
    system: 'Cardiovascular System',
    topic: 'Coronary heart disease',
    answers: [
      { text: 'Receptor-mediated endocytosis of LDL', isCorrect: true },
      { text: 'Bile acid synthesis', isCorrect: false },
      { text: 'HDL-mediated reverse cholesterol transport', isCorrect: false },
      { text: 'Hepatic lipase activity', isCorrect: false },
    ],
  },
  {
    text: 'A newborn with severe jaundice at 48 hours is found to have elevated unconjugated bilirubin. Which enzyme deficiency causes Crigler-Najjar syndrome?',
    explanation: 'Crigler-Najjar syndrome results from deficiency of UDP-glucuronosyltransferase (UGT1A1), the enzyme responsible for conjugating bilirubin. Type I is severe and autosomal recessive.',
    difficulty: 'HARD',
    subject: 'Biochemistry',
    system: 'Gastrointestinal System',
    topic: 'Biliary disorders',
    answers: [
      { text: 'UDP-glucuronosyltransferase (UGT1A1)', isCorrect: true },
      { text: 'Alkaline phosphatase', isCorrect: false },
      { text: 'Gamma-glutamyl transferase', isCorrect: false },
      { text: '5-nucleotidase', isCorrect: false },
    ],
  },

  // PATHOLOGY QUESTIONS (7)
  {
    text: 'A 68-year-old smoker presents with hemoptysis and a 3 cm spiculated lung nodule in the upper lobe. Histology shows nests of small blue cells with scant cytoplasm. Which is the most likely diagnosis?',
    explanation: 'Small cell lung cancer (SCLC) classically presents with small, round cells with scant cytoplasm and high mitotic activity in the upper lobes of smokers. SCLC has aggressive behavior and early metastasis.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Respiratory System',
    topic: 'Lung cancer',
    answers: [
      { text: 'Small cell lung cancer', isCorrect: true },
      { text: 'Adenocarcinoma', isCorrect: false },
      { text: 'Squamous cell carcinoma', isCorrect: false },
      { text: 'Large cell carcinoma', isCorrect: false },
    ],
  },
  {
    text: 'A 55-year-old man with cirrhosis presents with ascites and splenomegaly. Portal pressure is measured at 20 mmHg (normal <12). What is the primary pathophysiologic mechanism?',
    explanation: 'In cirrhosis, architectural distortion and replacement of hepatic parenchyma with fibrosis increases intrahepatic resistance. This causes portal hypertension, leading to ascites formation through splanchnic vasodilation and activation of RAAS.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Gastrointestinal System',
    topic: 'Liver disease',
    answers: [
      { text: 'Increased intrahepatic vascular resistance', isCorrect: true },
      { text: 'Increased hepatic artery flow', isCorrect: false },
      { text: 'Decreased albumin synthesis alone', isCorrect: false },
      { text: 'Increased splanchnic venous pressure only', isCorrect: false },
    ],
  },
  {
    text: 'A 42-year-old woman with SLE presents with acute renal insufficiency. Kidney biopsy shows "wire-loop" lesions and immune complex deposition in a granular pattern. What WHO class is this?',
    explanation: 'Wire-loop lesions and granular immune complex deposition are characteristic of WHO Class IV (diffuse proliferative) lupus nephritis, which is the most severe form and carries the worst prognosis.',
    difficulty: 'HARD',
    subject: 'Pathology',
    system: 'Renal System',
    topic: 'Lupus nephritis',
    answers: [
      { text: 'Class IV (diffuse proliferative)', isCorrect: true },
      { text: 'Class III (focal proliferative)', isCorrect: false },
      { text: 'Class V (membranous)', isCorrect: false },
      { text: 'Class II (mesangial)', isCorrect: false },
    ],
  },
  {
    text: 'A 38-year-old man presents with acute myocardial infarction. Autopsy reveals occlusion of the left anterior descending artery with an infarct extending through the full thickness of the myocardium. What type of infarct is this?',
    explanation: 'A transmural infarction affecting the full thickness of myocardium indicates occlusion of an epicardial coronary artery. This causes ST elevation on ECG (Q-wave MI) and is associated with higher mortality.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Cardiovascular System',
    topic: 'Myocardial Infarction',
    answers: [
      { text: 'Transmural Q-wave infarction', isCorrect: true },
      { text: 'Subendocardial non-Q-wave infarction', isCorrect: false },
      { text: 'Epicardial infarction', isCorrect: false },
      { text: 'Focal necrosis', isCorrect: false },
    ],
  },
  {
    text: 'A 60-year-old man with stage 3 hypertension for 10 years develops acute stroke. Brain imaging shows an area of liquefactive necrosis with cavitation. What type of necrosis occurred?',
    explanation: 'In ischemic stroke, the brain undergoes liquefactive necrosis because of its high lipid content and enzymatic digestion. This contrasts with coagulative necrosis seen in cardiac and renal infarcts.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Liquefactive necrosis', isCorrect: true },
      { text: 'Coagulative necrosis', isCorrect: false },
      { text: 'Caseous necrosis', isCorrect: false },
      { text: 'Fibrinoid necrosis', isCorrect: false },
    ],
  },
  {
    text: 'A 7-year-old boy presents with hematuria and proteinuria following a streptococcal infection. Kidney biopsy shows IgA deposition in a mesangial pattern. Which is the diagnosis?',
    explanation: 'IgA nephropathy presents with hematuria (often macroscopic), variable proteinuria, and mesangial IgA deposition on immunofluorescence. It\'s the most common primary glomerulonephritis worldwide.',
    difficulty: 'MEDIUM',
    subject: 'Pathology',
    system: 'Renal System',
    topic: 'Glomerulonephritis',
    answers: [
      { text: 'IgA nephropathy', isCorrect: true },
      { text: 'Post-streptococcal GN', isCorrect: false },
      { text: 'Focal segmental glomerulosclerosis', isCorrect: false },
      { text: 'Membranoproliferative GN', isCorrect: false },
    ],
  },

  // PHARMACOLOGY QUESTIONS (6)
  {
    text: 'A 55-year-old man on warfarin for atrial fibrillation presents with INR of 9.2 and no bleeding. Which action is most appropriate?',
    explanation: 'With INR >4 and no bleeding, warfarin should be held and vitamin K1 (5-10 mg IV) administered. Fresh frozen plasma or PCC is reserved for serious bleeding or INR >20.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Hematologic System',
    topic: 'Anticoagulation',
    answers: [
      { text: 'Hold warfarin and give vitamin K1 IV', isCorrect: true },
      { text: 'Continue warfarin and monitor INR', isCorrect: false },
      { text: 'Give fresh frozen plasma immediately', isCorrect: false },
      { text: 'Start heparin concurrently', isCorrect: false },
    ],
  },
  {
    text: 'A 62-year-old woman with heart failure is started on lisinopril. After 2 weeks, her serum creatinine rises by 30% and potassium increases to 5.8 mEq/L. What is the mechanism?',
    explanation: 'ACE inhibitors decrease angiotensin II, which normally maintains glomerular filtration pressure and promotes potassium excretion. This leads to acute decrease in GFR and hyperkalemia.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Renal System',
    topic: 'Chronic kidney disease',
    answers: [
      { text: 'Reduced glomerular filtration pressure and decreased K+ excretion', isCorrect: true },
      { text: 'Direct tubular toxicity', isCorrect: false },
      { text: 'Increased renin secretion', isCorrect: false },
      { text: 'Allergic interstitial nephritis', isCorrect: false },
    ],
  },
  {
    text: 'A 48-year-old man presents with tremor, rigidity, and altered mental status after starting metoclopramide for nausea. What is the most likely diagnosis?',
    explanation: 'Metoclopramide blocks dopamine D2 receptors, which can cause acute dystonia, akathisia, and neuroleptic malignant syndrome. The triad of muscle rigidity, hyperthermia, and altered consciousness defines NMS.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Drug toxicity',
    answers: [
      { text: 'Neuroleptic malignant syndrome', isCorrect: true },
      { text: 'Parkinsonism', isCorrect: false },
      { text: 'Benign essential tremor', isCorrect: false },
      { text: 'Tardive dyskinesia', isCorrect: false },
    ],
  },
  {
    text: 'A 34-year-old woman with newly diagnosed tuberculosis is started on isoniazid. She develops peripheral neuropathy. Which vitamin should be co-administered?',
    explanation: 'Isoniazid causes vitamin B6 (pyridoxine) depletion, leading to peripheral neuropathy. Co-administration of B6 (25-50 mg daily) prevents this complication.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Nervous System',
    topic: 'Tuberculosis',
    answers: [
      { text: 'Vitamin B6 (pyridoxine)', isCorrect: true },
      { text: 'Vitamin B12 (cobalamin)', isCorrect: false },
      { text: 'Vitamin B1 (thiamine)', isCorrect: false },
      { text: 'Vitamin C (ascorbic acid)', isCorrect: false },
    ],
  },
  {
    text: 'A 28-year-old woman on oral contraceptives is prescribed rifampicin for tuberculosis. What is the expected clinical consequence?',
    explanation: 'Rifampicin is a potent CYP450 enzyme inducer, increasing metabolism of oral contraceptives. This leads to decreased contraceptive levels and increased risk of breakthrough bleeding and unintended pregnancy.',
    difficulty: 'MEDIUM',
    subject: 'Pharmacology',
    system: 'Endocrine System',
    topic: 'Contraception',
    answers: [
      { text: 'Reduced contraceptive efficacy and unintended pregnancy risk', isCorrect: true },
      { text: 'Increased estrogen levels', isCorrect: false },
      { text: 'Enhanced contraceptive effect', isCorrect: false },
      { text: 'No interaction', isCorrect: false },
    ],
  },
  {
    text: 'A 71-year-old man with benign prostatic hyperplasia on tamsulosin presents with orthostatic hypotension. Why?',
    explanation: 'Tamsulosin is an alpha-1 adrenergic antagonist that causes vasodilation and reduces vascular resistance, leading to hypotension, particularly orthostatic hypotension.',
    difficulty: 'EASY',
    subject: 'Pharmacology',
    system: 'Cardiovascular System',
    topic: 'Hypertension',
    answers: [
      { text: 'Alpha-1 blockade causes vasodilation', isCorrect: true },
      { text: 'Direct myocardial depression', isCorrect: false },
      { text: 'Increased parasympathetic tone', isCorrect: false },
      { text: 'Beta-adrenergic blockade', isCorrect: false },
    ],
  },

  // MICROBIOLOGY QUESTIONS (4)
  {
    text: 'A 32-year-old immunocompromised patient develops a fungal infection with septate hyphae branching at 45-degree angles. What is the organism?',
    explanation: 'Aspergillus fumigatus is a ubiquitous fungus with septate hyphae branching at acute (45-degree) angles. It causes aspergillosis in immunocompromised hosts and ABPA in asthmatics.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Respiratory System',
    topic: 'Aspergillosis',
    answers: [
      { text: 'Aspergillus fumigatus', isCorrect: true },
      { text: 'Rhizopus species', isCorrect: false },
      { text: 'Candida albicans', isCorrect: false },
      { text: 'Cryptococcus neoformans', isCorrect: false },
    ],
  },
  {
    text: 'A 24-year-old college student presents with meningitis. CSF analysis shows elevated protein, low glucose, and gram-negative diplococci. What is the organism and appropriate therapy?',
    explanation: 'Neisseria meningitidis causes meningitis with gram-negative kidney bean-shaped diplococci. Treatment is ceftriaxone 2g IV Q12h or meropenem if penicillin-allergic.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Nervous System',
    topic: 'Bacterial meningitis',
    answers: [
      { text: 'Neisseria meningitidis; treat with cephalosporin', isCorrect: true },
      { text: 'Streptococcus pneumoniae; treat with vancomycin only', isCorrect: false },
      { text: 'Escherichia coli; treat with ampicillin', isCorrect: false },
      { text: 'Haemophilus influenzae; treat with penicillin', isCorrect: false },
    ],
  },
  {
    text: 'A 56-year-old man with cirrhosis develops spontaneous bacterial peritonitis. Blood cultures grow gram-negative rods. Which organism is most common?',
    explanation: 'Spontaneous bacterial peritonitis in cirrhotic patients is usually caused by gram-negative organisms, most commonly E. coli, followed by Klebsiella. Treatment includes ceftriaxone and albumin.',
    difficulty: 'MEDIUM',
    subject: 'Microbiology',
    system: 'Gastrointestinal System',
    topic: 'Peritonitis',
    answers: [
      { text: 'Escherichia coli', isCorrect: true },
      { text: 'Streptococcus pneumoniae', isCorrect: false },
      { text: 'Anaerobic bacteria', isCorrect: false },
      { text: 'Clostridium difficile', isCorrect: false },
    ],
  },
  {
    text: 'A 39-year-old man with untreated HIV (CD4 <50) develops visual disturbances and floaters. Fundoscopy shows "cottage cheese and ketchup" appearance. What is the diagnosis?',
    explanation: 'CMV retinitis presents with granular infiltrates and hemorrhages (cottage cheese and ketchup appearance) and requires IV ganciclovir or valganciclovir and immune reconstitution with antiretroviral therapy.',
    difficulty: 'HARD',
    subject: 'Microbiology',
    system: 'Nervous System',
    topic: 'CMV infection',
    answers: [
      { text: 'CMV retinitis', isCorrect: true },
      { text: 'Toxoplasma retinitis', isCorrect: false },
      { text: 'Herpes simplex retinitis', isCorrect: false },
      { text: 'Varicella zoster retinitis', isCorrect: false },
    ],
  },

  // ANATOMY QUESTIONS (6)
  {
    text: 'A 45-year-old man suffers a right-sided stroke affecting the middle cerebral artery distribution. Which motor and sensory deficits would be expected?',
    explanation: 'The MCA supplies the motor and sensory cortex for the face, arm, and hand. Right MCA stroke causes left-sided hemiparesis with facial droop and hemisensory loss.',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Nervous System',
    topic: 'Stroke',
    answers: [
      { text: 'Left hemiparesis and hemisensory loss', isCorrect: true },
      { text: 'Right hemiparesis and hemisensory loss', isCorrect: false },
      { text: 'Bilateral lower extremity weakness', isCorrect: false },
      { text: 'Loss of vision only', isCorrect: false },
    ],
  },
  {
    text: 'Which coronary artery occlusion causes inferior myocardial infarction in 80% of patients?',
    explanation: 'The right coronary artery supplies the inferior wall of the left ventricle in approximately 80% of people (right-dominant system). RCA occlusion causes inferior MI.',
    difficulty: 'EASY',
    subject: 'Anatomy',
    system: 'Cardiovascular System',
    topic: 'Myocardial Infarction',
    answers: [
      { text: 'Right coronary artery', isCorrect: true },
      { text: 'Left anterior descending artery', isCorrect: false },
      { text: 'Left circumflex artery', isCorrect: false },
      { text: 'Diagonal branch', isCorrect: false },
    ],
  },
  {
    text: 'A patient develops pneumothorax. At which rib level would you perform a chest tube insertion?',
    explanation: 'Chest tubes are placed at the 4th-5th intercostal space at the mid-axillary line to avoid neurovascular structures. This is above the 6th rib where the neurovascular bundle runs inferiorly.',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Respiratory System',
    topic: 'Pneumothorax',
    answers: [
      { text: '4th-5th intercostal space, mid-axillary line', isCorrect: true },
      { text: '1st-2nd intercostal space', isCorrect: false },
      { text: '8th-9th intercostal space', isCorrect: false },
      { text: '2nd intercostal space, mid-clavicular line', isCorrect: false },
    ],
  },
  {
    text: 'Injury to the recurrent laryngeal nerve causes paralysis of which muscle?',
    explanation: 'The recurrent laryngeal nerve innervates all intrinsic laryngeal muscles except the cricothyroid (superior laryngeal nerve). RLN injury causes vocal cord paralysis in the paramedian position.',
    difficulty: 'HARD',
    subject: 'Anatomy',
    system: 'Respiratory System',
    topic: 'Vocal cord paralysis',
    answers: [
      { text: 'All intrinsic laryngeal muscles except cricothyroid', isCorrect: true },
      { text: 'Only the posterior cricoarytenoid', isCorrect: false },
      { text: 'Only the cricothyroid', isCorrect: false },
      { text: 'All laryngeal and pharyngeal muscles', isCorrect: false },
    ],
  },
  {
    text: 'Which muscle is responsible for abduction of the hip beyond 15 degrees?',
    explanation: 'The gluteus medius and minimus abduct the hip. The gluteus medius is the primary abductor, and weakness causes Trendelenburg sign.',
    difficulty: 'MEDIUM',
    subject: 'Anatomy',
    system: 'Musculoskeletal System',
    topic: 'Hip anatomy',
    answers: [
      { text: 'Gluteus medius and minimus', isCorrect: true },
      { text: 'Gluteus maximus', isCorrect: false },
      { text: 'Adductor longus', isCorrect: false },
      { text: 'Tensor fasciae latae alone', isCorrect: false },
    ],
  },
  {
    text: 'A 38-year-old woman with diabetes develops a foot ulcer on the plantar surface. Which is the blood supply to the plantar aspect of the foot?',
    explanation: 'The plantar foot is supplied by the posterior tibial artery, which divides into medial and lateral plantar arteries. Diabetic foot ulcers commonly occur due to peripheral vascular disease.',
    difficulty: 'HARD',
    subject: 'Anatomy',
    system: 'Musculoskeletal System',
    topic: 'Diabetic foot ulcer',
    answers: [
      { text: 'Posterior tibial artery and its branches', isCorrect: true },
      { text: 'Anterior tibial artery', isCorrect: false },
      { text: 'Peroneal artery only', isCorrect: false },
      { text: 'Dorsalis pedis artery', isCorrect: false },
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
