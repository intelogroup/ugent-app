// ─── Shared types for the Genetics Lab sub-labs ───────────────────────────

export type GeneticsTab =
  | 'mutation'
  | 'penetrance'
  | 'pedigree'
  | 'hardy'
  | 'ageMap'
  | 'chromosomal'
  | 'microdeletion'
  | 'diagnostic'
  | 'cancer'
  | 'nonclassical';

export type MicrodeletionType = 'williams' | 'criduchat' | 'digeorge';

// ─── Mutation Factory ──────────────────────────────────────────────────────

export interface MutationState {
  label: string;
  description: string;
  dna: string[];
  mrna: string[];
  protein: { name: string; color: string }[];
  clinicalClue: string;
}

export const MUTATIONS: Record<string, MutationState> = {
  'wild-type': {
    label: 'Wild-Type (Normal)',
    description: 'The standard DNA sequence that translates into a normal functional polypeptide.',
    dna: ['GTA', 'GTA', 'GTA', 'GTA'],
    mrna: ['CAU', 'CAU', 'CAU', 'CAU'],
    protein: [
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
    ],
    clinicalClue: 'Proteins fold perfectly. Normal physiological state.',
  },
  missense: {
    label: 'Missense Mutation',
    description:
      'A single nucleotide substitution that replaces one amino acid with another. Function may be partially preserved.',
    dna: ['GTA', 'GGA', 'GTA', 'GTA'],
    mrna: ['CAU', 'CCU', 'CAU', 'CAU'],
    protein: [
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'Pro', color: 'bg-amber-400 border-amber-600 animate-pulse' },
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
    ],
    clinicalClue:
      'Example: Sickle Cell Disease (Glu → Val substitution in β-globin). RBCs sickle under low oxygen.',
  },
  nonsense: {
    label: 'Nonsense Mutation',
    description:
      'A single nucleotide substitution that creates a premature STOP codon. The protein halts translation and is truncated.',
    dna: ['GTA', 'ATC', 'GTA', 'GTA'],
    mrna: ['CAU', 'UAG', 'CAU', 'CAU'],
    protein: [
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'STOP', color: 'bg-red-400 border-red-600 animate-bounce' },
    ],
    clinicalClue:
      'Example: Duchenne Muscular Dystrophy / Cystic Fibrosis (Class I). Complete loss of functional protein.',
  },
  frameshift: {
    label: 'Frameshift Mutation',
    description:
      'Deletion or insertion of nucleotides not in multiples of 3. This shifts the reading frame, altering all downstream codons.',
    dna: ['GTA', 'TAG', 'TAG', 'TAG'],
    mrna: ['CAU', 'AUC', 'AUC', 'AUC'],
    protein: [
      { name: 'His', color: 'bg-emerald-400 border-emerald-600' },
      { name: 'Ile', color: 'bg-rose-400 border-rose-600' },
      { name: 'Ile', color: 'bg-rose-400 border-rose-600' },
      { name: 'Ile', color: 'bg-rose-400 border-rose-600' },
    ],
    clinicalClue:
      'Example: Tay-Sachs disease (4bp insertion in HEXA gene). Completely scrambled protein, highly toxic/non-functional.',
  },
};

// ─── Pedigree ──────────────────────────────────────────────────────────────

export type PedigreeType = 'AD' | 'AR' | 'XLR' | 'Mito';

// ─── Age of Onset Map ──────────────────────────────────────────────────────

export type AgeStage = 'fetus' | 'neonate' | 'infant' | 'child' | 'adult';

export interface DiseaseInfo {
  name: string;
  inheritance: string;
  mutation: string;
  clues: string[];
  concept: string;
}

export const AGE_STAGES_DATA: Record<
  AgeStage,
  { label: string; range: string; description: string; diseases: DiseaseInfo[] }
> = {
  fetus: {
    label: 'Prenatal / Fetus',
    range: 'In Utero / Gestation',
    description:
      'Vignettes focus on fetal screening, increased nuchal translucency, quad screens, or karyotyping abnormalities.',
    diseases: [
      {
        name: 'Down Syndrome (Trisomy 21)',
        inheritance: 'Chromosomal (95% nondisjunction, 4% Robertsonian, 1% mosaicism)',
        mutation: 'Three copies of Chromosome 21',
        clues: [
          'Increased nuchal translucency on ultrasound',
          'Quad screen: elevated β-hCG and Inhibin A, decreased AFP and estriol',
          'Associated with duodenal atresia, ASD/AVSD, early Alzheimer disease',
        ],
        concept: 'Most common viable autosomal trisomy.',
      },
      {
        name: 'Edwards Syndrome (Trisomy 18)',
        inheritance: 'Chromosomal (nondisjunction)',
        mutation: 'Three copies of Chromosome 18',
        clues: [
          'Clenched fists with overlapping fingers, micrognathia, low-set ears',
          'Rocker-bottom feet, congenital heart defects (eg, VSD), omphalocele',
          'Quad screen: decreased AFP, estriol, β-hCG, and normal/decreased Inhibin A',
        ],
        concept: 'Second most common autosomal trisomy; death usually occurs by age 1.',
      },
      {
        name: 'Patau Syndrome (Trisomy 13)',
        inheritance: 'Chromosomal (nondisjunction)',
        mutation: 'Three copies of Chromosome 13',
        clues: [
          'Defect in fusion of prechordal mesoderm causing midline defects',
          'Cleft lip/palate, holoprosencephaly, microphthalmia, polydactyly',
          'Cutis aplasia (focal scalp skin defect), polycystic kidney disease',
          'First trimester: decreased free β-hCG and PAPP-A',
        ],
        concept: 'Third most common autosomal trisomy; death usually occurs by age 1.',
      },
      {
        name: 'Turner Syndrome (45,XO)',
        inheritance: 'Sex Chromosome Monosomy',
        mutation: 'Loss of paternal X chromosome',
        clues: [
          'Cystic hygroma (lymphatic neck swelling) on fetal scan',
          'Primary amenorrhea, short stature, webbed neck, shield chest',
          'Coarctation of the aorta (femoral pulse lag due to preductal narrowing)',
        ],
        concept: 'Only viable monosomy compatible with life.',
      },
    ],
  },
  neonate: {
    label: 'Neonate / Newborn',
    range: '0 to 1 Month',
    description:
      'Vignettes focus on newborn screening failure, failure to pass meconium, or hypotonia (floppy baby).',
    diseases: [
      {
        name: 'Cystic Fibrosis',
        inheritance: 'Autosomal Recessive',
        mutation: 'CFTR gene Phe508 deletion (protein folding defect)',
        clues: [
          'Meconium ileus (delayed first stool due to thick mucus plug)',
          'Failure to thrive, salty sweat, recurrent respiratory infections',
          'Exocrine pancreatic insufficiency causing steatorrhea',
        ],
        concept: 'Abnormal chloride channel transport.',
      },
      {
        name: 'DiGeorge Syndrome',
        inheritance: 'Autosomal Dominant / Sporadic microdeletion',
        mutation: '22q11 microdeletion (failure of 3rd/4th pharyngeal pouches)',
        clues: [
          'CATCH-22 mnemonic for clinical presentation',
          'Cardiac defects (conotruncal: Tetralogy of Fallot, truncus arteriosus)',
          'Thymic hypoplasia (T-cell deficiency causing recurrent viral/fungal infections)',
          'Cleft palate, abnormal facies, hypocalcemia/tetany (parathyroid aplasia)',
        ],
        concept: 'Microdeletion of chromosome 22q11 resulting in pouch development failure.',
      },
      {
        name: 'Prader-Willi Syndrome',
        inheritance: 'Imprinting (paternal deletion / maternal UPD)',
        mutation: 'Loss of paternal active genes on chromosome 15',
        clues: [
          'Floppy baby at birth with severe hypotonia and poor feeding',
          'Transitions to hyperphagia and progressive obesity in early childhood',
          'Intellectual disability, hypogonadism, and small hands/feet',
          'Maternally derived genes on chromosome 15 are normally silent (imprinted)',
        ],
        concept: 'Loss of active paternal alleles on chromosome 15 (POP: Paternal, Obesity).',
      },
      {
        name: 'Spinal Muscular Atrophy (SMA)',
        inheritance: 'Autosomal Recessive',
        mutation: 'SMN1 gene deletion (anterior horn cell degeneration)',
        clues: [
          'Floppy baby with severe generalized hypotonia',
          'Symmetric, flaccid weakness (lower > upper extremities)',
          'Tongue fasciculations',
        ],
        concept: 'Degeneration of motor neurons.',
      },
      {
        name: 'Phenylketonuria (PKU)',
        inheritance: 'Autosomal Recessive',
        mutation: 'Phenylalanine hydroxylase (PAH) deficiency',
        clues: [
          'Intellectual disability, microcephaly, seizures',
          'Musty/mousy body odor',
          'Eczema and fair skin/hair (tyrosine deficiency)',
        ],
        concept: 'Impaired conversion of phenylalanine to tyrosine.',
      },
      {
        name: 'Von Gierke Disease (GSD Type I)',
        inheritance: 'Autosomal Recessive',
        mutation: 'Glucose-6-phosphatase deficiency',
        clues: [
          'Severe fasting hypoglycemia (seizures in newborn)',
          'Hepatomegaly and renomegaly (glycogen accumulation)',
          'Increased blood lactate, triglycerides, and uric acid (gout)',
        ],
        concept: 'Impaired gluconeogenesis and glycogenolysis.',
      },
    ],
  },
  infant: {
    label: 'Infant / Toddler',
    range: '1 Month to 5 Years',
    description:
      'Vignettes focus on developmental regression, motor weakness (Gowers sign), or organomegaly.',
    diseases: [
      {
        name: 'Duchenne Muscular Dystrophy',
        inheritance: 'X-Linked Recessive',
        mutation: 'DMD gene frameshift deletion (loss of dystrophin)',
        clues: [
          'Gowers sign: walking hands up legs to stand up',
          'Onset around 2-3 years old, calf pseudohypertrophy',
          'Dilated cardiomyopathy is a major cause of death',
        ],
        concept: 'Anchors actin cytoskeleton to extracellular matrix.',
      },
      {
        name: 'Rett Syndrome',
        inheritance: 'X-Linked Dominant (almost exclusively females)',
        mutation: 'De novo mutation of MECP2 gene (lethal in males)',
        clues: [
          'Normal development until 6-18 months of age, then regression',
          'Loss of purposeful hand movements and verbal/cognitive abilities',
          'Stereotypic hand-wringing (clasping/tapping hands), ataxia, seizures',
          'Scoliosis and developmental regression ("retturn")',
        ],
        concept: 'De novo MECP2 mutation on X chromosome with clinical regression.',
      },
      {
        name: 'Lesch-Nyhan Syndrome',
        inheritance: 'X-Linked Recessive',
        mutation: 'Absent HGPRT enzyme (defective purine salvage)',
        clues: [
          'Severe hyperuricemia (orange "sand" [sodium urate] in diapers)',
          'Compensatory increase in purine synthesis (elevated PRPP amidotransferase)',
          'Self-mutilation (biting lip/fingers), aggression, gout, dystonia',
          'Treatment: xanthine oxidase inhibitors (allopurinol, febuxostat)',
        ],
        concept: 'Defective purine salvage leading to excessive uric acid.',
      },
      {
        name: 'Tay-Sachs Disease',
        inheritance: 'Autosomal Recessive',
        mutation: 'HEXA gene mutation (Hexosaminidase A deficiency)',
        clues: [
          'Developmental regression and hyperacusis (startle response)',
          'Cherry-red macula spot in retina',
          'NO hepatosplenomegaly (distinguishes from Niemann-Pick)',
        ],
        concept: 'GM2 ganglioside accumulation.',
      },
      {
        name: 'Angelman Syndrome',
        inheritance: 'Imprinting (maternal deletion / paternal UPD)',
        mutation: 'Loss of maternal active UBE3A gene on chromosome 15',
        clues: [
          'Inappropriate laughter and happy, cheerful demeanor ("happy puppet")',
          'Ataxia, hand-flapping, severe intellectual disability',
          'Seizures and minimal/absent speech',
          'Paternally derived UBE3A gene is normally silent (imprinted)',
        ],
        concept: 'Loss of active maternal alleles on chromosome 15 (MAMAS: Maternal, Ataxia).',
      },
      {
        name: 'Gaucher Disease',
        inheritance: 'Autosomal Recessive',
        mutation: 'Glucocerebrosidase deficiency',
        clues: [
          'Hepatosplenomegaly, pancytopenia (bone marrow infiltration)',
          'Avascular necrosis of the femur head, bone crises, osteoporosis',
          'Gaucher cells resembling crumpled tissue paper',
        ],
        concept: 'Most common lysosomal storage disease.',
      },
      {
        name: 'Pompe Disease (GSD Type II)',
        inheritance: 'Autosomal Recessive',
        mutation: 'Lysosomal acid α-1,4-glucosidase deficiency',
        clues: [
          'Floppy baby with severe hypertrophic cardiomyopathy',
          'Exercise intolerance, hypotonia, muscle weakness',
          'Enlarged tongue (macroglossia)',
        ],
        concept: 'Pompe trashes the pump (heart/muscle).',
      },
    ],
  },
  child: {
    label: 'Child / Adolescent',
    range: '5 to 18 Years',
    description:
      'Vignettes focus on gait ataxia, delayed puberty, learning difficulties, or hepatolenticular degeneration.',
    diseases: [
      {
        name: 'Wilson Disease',
        inheritance: 'Autosomal Recessive',
        mutation: 'ATP7B gene mutation (copper-transporting ATPase)',
        clues: [
          'Presenting with tremor, parkinsonism, dysarthria, or psychiatric symptoms',
          'Unexplained hepatitis or cirrhosis in a teenager',
          'Kayser-Fleischer rings (corneal copper deposits)',
        ],
        concept: 'Impaired copper excretion into bile.',
      },
      {
        name: 'Friedreich Ataxia',
        inheritance: 'Autosomal Recessive',
        mutation: 'FXN gene GAA trinucleotide repeat expansion',
        clues: [
          'Progressive gait ataxia and loss of position/vibration sense',
          'Hypertrophic cardiomyopathy (major cause of death)',
          'Kyphoscoliosis, hammer toes, and high arches',
        ],
        concept: 'Mitochondrial iron overload (frataxin deficiency).',
      },
      {
        name: 'Fabry Disease',
        inheritance: 'X-Linked Recessive',
        mutation: 'α-galactosidase A deficiency',
        clues: [
          'Episodic peripheral neuropathy (burning pain in hands/feet)',
          'Angiokeratomas (non-blanching dark red skin spots)',
          'Hypohidrosis (lack of sweating), progressive renal failure later',
        ],
        concept: 'Ceramide trihexoside accumulation.',
      },
      {
        name: 'Marfan Syndrome',
        inheritance: 'Autosomal Dominant (variable expression)',
        mutation: 'FBN1 mutation on Chromosome 15 (defective fibrillin-1)',
        clues: [
          'Tall stature with long extremities and arachnodactyly',
          'Ectopia lentis - upward/temporal lens subluxation ("Marfan fans out")',
          'Cystic medial necrosis of aorta, aortic dissection (main cause of death)',
          'Chest wall deformity (pectus carinatum/excavatum), normal intellect',
        ],
        concept: 'Defective fibrillin-1 glycoprotein fails to scaffold elastin and TGF-β.',
      },
      {
        name: 'Klinefelter Syndrome',
        inheritance: 'Chromosomal Nondisjunction',
        mutation: '47,XXY karyotype',
        clues: [
          'Tall male with long extremities and small, firm testes',
          'Gynecomastia and female hair distribution',
          'Learning disabilities, high LH/FSH, low testosterone',
        ],
        concept: 'Hypergonadotropic hypogonadism.',
      },
      {
        name: 'Fragile X Syndrome',
        inheritance: 'X-Linked Dominant',
        mutation: 'FMR1 gene CGG trinucleotide repeat expansion',
        clues: [
          'Post-pubertal macroorchidism (giant testes)',
          'Long face with a large jaw, large everted ears',
          'Autism, intellectual disability, mitral valve prolapse',
        ],
        concept: 'Hypermethylation of FMR1 gene leading to silencing.',
      },
    ],
  },
  adult: {
    label: 'Adulthood',
    range: '18+ Years',
    description:
      'Vignettes focus on cognitive/movement decline, difficulty releasing hand grip, or sudden cardiac/vascular dissection.',
    diseases: [
      {
        name: 'Huntington Disease',
        inheritance: 'Autosomal Dominant',
        mutation: 'CAG trinucleotide repeat expansion in HTT gene',
        clues: [
          'Presents in 30s-40s with chorea, dementia, and aggression',
          'Bilateral caudate nucleus atrophy on brain MRI',
          'Anticipation (earlier onset in subsequent generations)',
        ],
        concept: 'Polyglutamine tract toxicity (gain of function).',
      },
      {
        name: 'Myotonic Dystrophy Type 1',
        inheritance: 'Autosomal Dominant',
        mutation: 'DMPK gene CTG trinucleotide repeat expansion',
        clues: [
          'Myotonia (inability to release grip after handshake)',
          'Early cataracts, frontal balding in males, gonadal atrophy',
          'Muscle wasting and weakness',
        ],
        concept: "CTG repeat expansion in 3' UTR of DMPK.",
      },
      {
        name: 'Von Hippel-Lindau (VHL) Disease',
        inheritance: 'Autosomal Dominant',
        mutation: 'VHL tumor suppressor gene deletion (Chr 3)',
        clues: [
          'Bilateral clear cell Renal Cell Carcinomas (RCC)',
          'Hemangioblastomas in retina, brainstem, and cerebellum',
          'Pheochromocytomas',
        ],
        concept: 'Loss of VHL leads to HIF-1α stabilization.',
      },
    ],
  },
};

// ─── Chromosomal Errors ────────────────────────────────────────────────────

export type ChromosomalMode = 'robertsonian' | 'mosaicism' | 'inversion' | 'isochromosome' | 'ring';
