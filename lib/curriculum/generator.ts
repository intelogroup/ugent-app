import type {
  Curriculum,
  StudyBlock,
  StudyWeek,
  StudyDay,
  TopicNode,
  DependencyGraph,
} from './types';
import type { DiseaseEntry } from './analyzer';
import { FIRST_AID_MAP, PATHOMA_MAP } from './analyzer';

// Pharmacology references for each system (to pair with First Aid and Pathoma)
export const PHARMACOLOGY_MAP: Record<string, string> = {
  Neurology: 'Ch. 22 – CNS Pharmacology',
  Cardiovascular: 'Ch. 20 – Cardiovascular Pharmacology',
  Respiratory: 'Ch. 21 – Respiratory Pharmacology',
  'Hematology & Oncology': 'Ch. 23 – Hematology & Oncology Pharmacology',
  Immunology: 'Ch. 24 – Immunology Pharmacology',
  'Infectious Disease': 'Ch. 25 – Antimicrobial Agents',
  Endocrine: 'Ch. 19 – Endocrine Pharmacology',
  Integumentary: 'Ch. 26 – Dermatological Pharmacology',
  Renal: 'Ch. 18 – Renal Pharmacology',
  Reproductive: 'Ch. 27 – Reproductive Pharmacology',
  Musculoskeletal: 'Ch. 28 – Musculoskeletal Pharmacology',
  Gastrointestinal: 'Ch. 29 – GI Pharmacology',
  Psychiatry: 'Ch. 30 – Psychiatric Pharmacology',
  Genetics: 'Ch. 23 – Hematology & Oncology Pharmacology (tumor genetics)',
};

const EXAM_DATE = new Date('2026-10-10');
const START_DATE = new Date('2026-05-26');
const HOURS_PER_DAY = 2.5;
const BLOCK_MINUTES = 50;
const REST_DAY_INDEX = 6; // Sunday

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDayOfWeek(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

let blockCounter = 0;
function makeBlock(
  type: StudyBlock['type'],
  title: string,
  description: string,
  firstAid?: string,
  pathoma?: string,
  questions?: string[],
): StudyBlock {
  return {
    id: `block-${++blockCounter}`,
    type,
    title,
    description,
    durationMinutes: BLOCK_MINUTES,
    resources: { firstAid, pathoma, questions },
    completed: false,
  };
}

function makeBlocksForSystemDay(
  system: string,
  subject: string,
  topicName: string,
  topicDescription: string,
): StudyBlock[] {
  const faRef = resolveFARef(system);
  const pathomaRef = resolvePathomaRef(system);
  const pharmRef = resolvePharmaRef(system);

  const blocks: StudyBlock[] = [
    makeBlock(
      'READING',
      `First Aid: ${system}`,
      `Read ${faRef} — ${topicName}`,
      faRef,
    ),
    makeBlock(
      'VIDEO',
      `Pathoma: ${system}`,
      topicDescription,
      undefined,
      pathomaRef,
    ),
    makeBlock(
      'PHARMACOLOGY',
      `Pharmacology: ${system}`,
      `Review ${pharmRef} — ${topicName}`,
      undefined,
      pharmRef,
    ),
    makeBlock(
      'QUESTIONS',
      `Practice: ${topicName}`,
      `Answer 5-10 questions about ${topicName} from databank`,
    ),
  ];

  return blocks;
}

function resolveFARef(system: string): string {
  const parts = system.split(/ \+ |, | & /);
  const refs = parts.map(p => {
    const fa = FIRST_AID_MAP[p.trim()];
    return fa ? `${fa.chapter}: ${fa.pages}` : null;
  }).filter(Boolean);
  return refs.join(' + ') || 'General Principles: 1-93';
}

function resolvePathomaRef(system: string): string {
  const parts = system.split(/ \+ |, | & /);
  const refs = parts.map(p => {
    const ref = PATHOMA_MAP[p.trim()];
    return ref ? ref.chapter : null;
  }).filter(Boolean);
  return refs.join('; ') || 'Ch. 1 – Cell Injury, Ch. 2 – Inflammation';
}

function resolvePharmaRef(system: string): string {
  const pharm = PHARMACOLOGY_MAP[system.trim()];
  return pharm || 'Ch. 18-30 – Pharmacology (refer to relevant system chapter)';
}

function makeFoundationDayBlocks(
  topic: string,
  description: string,
  system?: string,
): StudyBlock[] {
  const faRef = system && system !== 'General' ? resolveFARef(system) : 'General Principles: 1-93';
  const pathomaRef = system && system !== 'General' ? resolvePathomaRef(system) : 'Ch. 1 – Cell Injury & Death, Ch. 2 – Inflammation';
  return [
    makeBlock('READING', system && system !== 'General' ? `First Aid: ${system}` : 'First Aid: General Principles', `Review ${topic} fundamentals`, faRef),
    makeBlock('VIDEO', system && system !== 'General' ? `Pathoma: ${pathomaRef}` : 'Pathoma: Ch. 1-2', `${description}`, undefined, pathomaRef),
    makeBlock('QUESTIONS', `Practice: ${topic}`, `Answer questions testing ${topic}`),
  ];
}

function makeReviewDayBlocks(system: string): StudyBlock[] {
  const faRef = resolveFARef(system);
  return [
    makeBlock(
      'REVIEW',
      `Review: ${system}`,
      `Rapid review of ${system} — focus on weak areas`,
      `${faRef}: spot-check`,
    ),
    makeBlock(
      'QUESTIONS',
      `Mixed Questions: ${system}`,
      `20 mixed questions covering all ${system} topics`,
    ),
    makeBlock(
      'REVIEW',
      `Missed Questions: ${system}`,
      `Review explanations for incorrect answers`,
    ),
  ];
}

export function generateCurriculum(
  graph: DependencyGraph,
  frequencyStats: {
    diseases: { name: string; count: number }[];
    systems: { name: string; count: number }[];
    subjects: { name: string; count: number }[];
    totalQuestions: number;
    totalTopics: number;
    dependencyDepth: number;
  },
  systemDiseaseMap: Record<string, DiseaseEntry[]>,
): Curriculum {
  const weeks: StudyWeek[] = [];

  // Group nodes by system
  const nodesBySystem = new Map<string, TopicNode[]>();
  for (const node of graph.nodes) {
    const sys = node.system || 'General';
    if (!nodesBySystem.has(sys)) nodesBySystem.set(sys, []);
    nodesBySystem.get(sys)!.push(node);
  }

  // Phase 1: Foundations (weeks 1-6)
  let currentDate = new Date(START_DATE);
  let weekNum = 1;

  function nextDay(): Date {
    const d = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    return d;
  }

  function skipRestDays() {
    while (currentDate.getDay() === REST_DAY_INDEX) {
      nextDay();
    }
  }

  function createWeek(phase: StudyWeek['phase'], phaseLabel: string): StudyWeek {
    const startOfWeek = new Date(currentDate);
    const days: StudyDay[] = [];
    let totalMin = 0;

    for (let d = 0; d < 6; d++) {
      skipRestDays();
      const date = nextDay();
      const isRestDay = date.getDay() === REST_DAY_INDEX;
      if (isRestDay) { d--; continue; }

      days.push({
        date: formatDate(date),
        dayOfWeek: getDayOfWeek(date),
        blocks: [],
        totalMinutes: 0,
        completed: false,
        system: '',
        subject: '',
      });
    }

    const endOfWeek = new Date(currentDate);
    endOfWeek.setDate(endOfWeek.getDate() - 1);

    return {
      weekNumber: weekNum++,
      startDate: formatDate(startOfWeek),
      endDate: formatDate(endOfWeek),
      phase,
      phaseLabel,
      days,
      totalMinutes: totalMin,
      completedDays: 0,
      totalDays: days.length,
    };
  }

  // ======= PHASE 1: FOUNDATIONS (Weeks 1-7) =======
  const foundationPhase = [
    // Week 1: Basic Sciences (Biochem, Molecular, Cell, Genetics)
    {
      label: 'Basic Sciences: Biochem, Molecular, Cell, Genetics',
      days: [
        { system: 'General', subject: 'General', topic: 'Biochemistry I', desc: 'Carbohydrates, lipids, proteins, enzymes' },
        { system: 'General', subject: 'General', topic: 'Biochemistry II', desc: 'Nucleic acids, vitamins, metabolism' },
        { system: 'General', subject: 'General', topic: 'Molecular Biology', desc: 'DNA replication, transcription, translation' },
        { system: 'General', subject: 'General', topic: 'Cell Biology', desc: 'Organelles, membrane transport, cytoskeleton' },
        { system: 'Genetics', subject: 'Genetics', topic: 'Genetics I: Inheritance Patterns', desc: 'AD vs AR vs X-linked (CF, Huntington, Duchenne, NF1, hemophilia), pedigrees, penetrance, expressivity, anticipation (trinucleotide)' },
        { system: 'Genetics', subject: 'Genetics', topic: 'Genetics II: Chromosomal & Cancer Genetics', desc: 'Nondisjunction (trisomy 21/18/13), translocations (BCR-ABL, Burkitt), oncogenes vs tumor suppressors (p53, Rb, BRCA), imprinting (Prader-Willi/Angelman), mosaicism, LOH' },
      ],
    },
    // Week 2: Basic Principles (Biostats, Epidemiology, Ethics, General)
    {
      label: 'Basic Principles: Biostats, Ethics, General',
      days: [
        { system: 'General', subject: 'Biostatistics & Epidemiology', topic: 'Study Designs', desc: 'Case-control, cohort, RCT, meta-analysis' },
        { system: 'General', subject: 'Biostatistics & Epidemiology', topic: 'Diagnostic Testing', desc: 'Sensitivity, specificity, PPV, NPV, likelihood ratios' },
        { system: 'General', subject: 'Biostatistics & Epidemiology', topic: 'Measures of Effect', desc: 'RR, OR, ARR, NNT, NNH' },
        { system: 'General', subject: 'Behavioral Science', topic: 'Ethics & Patient Communication', desc: 'Informed consent, capacity, confidentiality' },
        { system: 'General', subject: 'General', topic: 'Cell Injury & Death', desc: 'Necrosis, apoptosis, autophagy' },
        { system: 'General', subject: 'General', topic: 'Inflammation & Wound Healing', desc: 'Acute/chronic inflammation, mediators, repair' },
      ],
    },
    // Week 3: Cardiovascular + Respiratory Physiology
    {
      label: 'Cardiovascular & Respiratory Physiology',
      days: [
        { system: 'Cardiovascular', subject: 'Physiology', topic: 'Cardiac Physiology', desc: 'Cardiac cycle, output, Starling, action potentials' },
        { system: 'Cardiovascular', subject: 'Physiology', topic: 'Vascular Physiology', desc: 'Resistance, BP regulation, RAAS' },
        { system: 'Cardiovascular', subject: 'Anatomy', topic: 'Cardiovascular Anatomy', desc: 'Heart chambers, valves, coronary arteries' },
        { system: 'Respiratory', subject: 'Physiology', topic: 'Respiratory Physiology', desc: 'Mechanics, volumes, compliance' },
        { system: 'Respiratory', subject: 'Physiology', topic: 'Gas Exchange', desc: 'V/Q matching, O2-Hb curve, CO2 transport' },
        { system: 'Respiratory', subject: 'Anatomy', topic: 'Respiratory Anatomy', desc: 'Airways, lung lobes, pleura, diaphragm' },
      ],
    },
    // Week 4: Renal + GI Physiology
    {
      label: 'Renal & GI Physiology',
      days: [
        { system: 'Renal', subject: 'Physiology', topic: 'Renal Physiology I', desc: 'GFR, renal plasma flow, clearance' },
        { system: 'Renal', subject: 'Physiology', topic: 'Renal Physiology II', desc: 'Tubular reabsorption, secretion, countercurrent' },
        { system: 'Renal', subject: 'Physiology', topic: 'Acid-Base Balance', desc: 'Compensation, anion gap, delta-delta' },
        { system: 'Gastrointestinal', subject: 'Physiology', topic: 'GI Physiology I', desc: 'Motility, secretion (acid, enzymes, bile)' },
        { system: 'Gastrointestinal', subject: 'Physiology', topic: 'GI Physiology II', desc: 'Digestion, absorption of nutrients' },
        { system: 'Gastrointestinal', subject: 'Anatomy', topic: 'GI Anatomy', desc: 'Foregut, midgut, hindgut, blood supply' },
      ],
    },
    // Week 5: Endocrine + Neuro Physiology
    {
      label: 'Endocrine + Neuro Physiology',
      days: [
        { system: 'Endocrine', subject: 'Physiology', topic: 'H-P Axis & Anterior Pituitary', desc: 'GnRH, TSH, ACTH, GH, prolactin' },
        { system: 'Endocrine', subject: 'Physiology', topic: 'Glucose & Insulin', desc: 'Insulin, glucagon, somatostatin, metabolism' },
        { system: 'Endocrine', subject: 'Physiology', topic: 'Thyroid, Calcium & Adrenal', desc: 'T3/T4, PTH, vitamin D, cortisol, aldosterone' },
        { system: 'Neurology', subject: 'Physiology', topic: 'Action Potential & Synapses', desc: 'Depol/repol, neurotransmitters, receptors' },
        { system: 'Neurology', subject: 'Physiology', topic: 'ANS: Sympathetic & Parasympathetic', desc: 'Receptors, effects, neurotransmitters' },
        { system: 'Neurology', subject: 'Anatomy', topic: 'Neuroanatomy I', desc: 'Brainstem, cranial nerves, spinal cord tracts' },
      ],
    },
    // Week 6: Heme + Immuno + Micro Basics
    {
      label: 'Hematology, Immunology & Microbiology Basics',
      days: [
        { system: 'Hematology & Oncology', subject: 'Physiology', topic: 'Hematopoiesis & RBC', desc: 'Erythropoiesis, hemoglobin, iron' },
        { system: 'Hematology & Oncology', subject: 'Physiology', topic: 'Coagulation & Platelets', desc: 'Coagulation cascade, platelet function' },
        { system: 'Immunology', subject: 'Immunology', topic: 'Innate & Adaptive Immunity', desc: 'T cells, B cells, MHC, antibodies' },
        { system: 'Immunology', subject: 'Immunology', topic: 'Hypersensitivity & Complement', desc: 'Types I-IV, complement cascade' },
        { system: 'Infectious Disease', subject: 'Microbiology', topic: 'Bacteria: Gram+ & Gram-', desc: 'Classification, toxins, resistance' },
        { system: 'Infectious Disease', subject: 'Microbiology', topic: 'Viruses, Fungi, Parasites', desc: 'Structure, replication, classification' },
      ],
    },
    // Week 7: MSK + Repro + Integumentary + Pharmacology Basics
    {
      label: 'MSK, Repro, Skin & Pharmacology Basics',
      days: [
        { system: 'Musculoskeletal', subject: 'Physiology', topic: 'Muscle & Bone Physiology', desc: 'Contraction, bone remodeling, joints' },
        { system: 'Reproductive', subject: 'Physiology', topic: 'Reproductive Physiology', desc: 'Menstrual cycle, spermatogenesis, pregnancy' },
        { system: 'Integumentary', subject: 'Anatomy', topic: 'Skin & Wound Healing', desc: 'Layers, keratinization, healing phases' },
        { system: 'Pharmacology', subject: 'Pharmacology', topic: 'Pharmacokinetics & Dynamics', desc: 'ADME, potency, efficacy, therapeutic index' },
        { system: 'Pharmacology', subject: 'Pharmacology', topic: 'ANS Pharmacology', desc: 'Cholinergic, adrenergic agonists/antagonists' },
        { system: 'General', subject: 'Review', topic: 'Foundation Review', desc: 'Review weakest foundation areas, take 20 mixed questions' },
      ],
    },
  ];

  for (const phase of foundationPhase) {
    const week = createWeek('FOUNDATIONS', phase.label);
    for (let i = 0; i < phase.days.length && i < week.days.length; i++) {
      const plan = phase.days[i];
      const day = week.days[i];
      day.system = plan.system;
      day.subject = plan.subject;
      day.blocks = makeFoundationDayBlocks(plan.topic, plan.desc, plan.system);
      day.totalMinutes = day.blocks.reduce((s, b) => s + b.durationMinutes, 0);
    }
    week.totalMinutes = week.days.reduce((s, d) => s + d.totalMinutes, 0);
    weeks.push(week);
  }

  // ======= PHASE 2: ORGAN SYSTEMS (8 weeks, data-driven from enriched bank) =======
  const MAX_ORGAN_SYSTEM_WEEKS = 8;

  const ENRICHED_TO_FA_SYSTEM: Record<string, string> = {
    'Nervous System': 'Neurology',
    'Immune System': 'Immunology',
    'Public Health': 'General',
    'Endocrine System': 'Endocrine',
    'Respiratory System': 'Respiratory',
    'Digestive System': 'Gastrointestinal',
    'Hematologic System': 'Hematology & Oncology',
    'Hematologic': 'Hematology & Oncology',
    'Reproductive System': 'Reproductive',
    'Hepatic': 'Gastrointestinal',
    'Hepatobiliary': 'Gastrointestinal',
    'Urinary System': 'Renal',
    'Integumentary System': 'Integumentary',
    'Psychiatric': 'Psychiatry',
    'Cellular and Molecular Biology': 'Genetics',
    'Cellular': 'General',
    'Metabolic': 'Endocrine',
    'Metabolic Pathways': 'Endocrine',
    'Head and Neck': 'Neurology',
    'Neoplasms': 'Hematology & Oncology',
    'Neoplasia': 'Hematology & Oncology',
    'Genetic/Molecular': 'Genetics',
    'Genetic Information': 'Genetics',
    'Genetic/Metabolic': 'Genetics',
    'Genetic': 'Genetics',
    'Genetic / Developmental': 'Genetics',
    'Genetic / Reproductive': 'Genetics',
    'Genetic Information Flow': 'Genetics',
    'Genetic Information Processing': 'Genetics',
    'Genetic Regulation': 'Genetics',
    'Genetic and Evolutionary Systems': 'Genetics',
    'Genetic/Cellular': 'Genetics',
    'Molecular Biology': 'General',
    'Lymphatic System': 'Hematology & Oncology',
    'Behavioral Health': 'Psychiatry',
    'Autonomic Nervous System': 'Neurology',
    'Visual System': 'Neurology',
    'Auditory System': 'Neurology',
    'Breast': 'Reproductive',
    'Urinary Tract': 'Renal',
    'Musculoskeletal System': 'Musculoskeletal',
    'Healthcare System': 'General',
    'Endocrine/Metabolic': 'Endocrine',
    'Endocrine/Reproductive': 'Reproductive',
    'Vascular System': 'Cardiovascular',
    'Vascular': 'Cardiovascular',
    'Connective Tissue': 'Musculoskeletal',
    'Urinary': 'Renal',
    'Hematopoietic System': 'Hematology & Oncology',
    'Reticuloendothelial System': 'Hematology & Oncology',
    'Lymphatic/Hematopoietic': 'Hematology & Oncology',
    'Multiple systems (fetal development)': 'Reproductive',
  };

  function normalizeSystem(raw: string): string {
    // Direct match
    const mapped = ENRICHED_TO_FA_SYSTEM[raw];
    if (mapped) return mapped;
    if (FIRST_AID_MAP[raw]) return raw;

    // Try splitting compound system names and matching parts
    const parts = raw.split(/\s*[\/,&]+\s*|\s+and\s+/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const partMapped = ENRICHED_TO_FA_SYSTEM[part];
      if (partMapped) return partMapped;
      if (FIRST_AID_MAP[part]) return part;
    }

    // Partial substring match against FA map keys
    for (const key of Object.keys(FIRST_AID_MAP)) {
      if (raw.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(raw.toLowerCase())) {
        return key;
      }
    }

    return 'General';
  }

  // Aggregate disease question counts per system
  const systemScores: { system: string; totalQuestions: number; diseases: { name: string; count: number; mechanism: string }[] }[] = [];

  for (const [rawSystem, entries] of Object.entries(systemDiseaseMap)) {
    const system = normalizeSystem(rawSystem);
    const totalQuestions = entries.reduce((s, e) => s + e.questionCount, 0);
    const diseases = entries
      .filter(e => e.questionCount > 0)
      .sort((a, b) => b.questionCount - a.questionCount)
      .map(e => ({ name: e.diseaseName, count: e.questionCount, mechanism: e.mechanism }));

    if (diseases.length === 0) continue;

    const existing = systemScores.find(s => s.system === system);
    if (existing) {
      existing.totalQuestions += totalQuestions;
      // Merge diseases (retain highest count per name)
      for (const d of diseases) {
        const existingD = existing.diseases.find(ed => ed.name === d.name);
        if (existingD) existingD.count = Math.max(existingD.count, d.count);
        else existing.diseases.push(d);
      }
    } else {
      systemScores.push({ system, totalQuestions, diseases });
    }
  }

  // Sort systems by total questions (descending), then allocate weeks proportionally
  systemScores.sort((a, b) => b.totalQuestions - a.totalQuestions);
  const grandTotal = systemScores.reduce((s, sys) => s + sys.totalQuestions, 0);

  const allocatedWeeks: { system: string; diseasePairs: string[][]; weekCount: number }[] = [];
  let weeksRemaining = MAX_ORGAN_SYSTEM_WEEKS;

    for (const sys of systemScores) {
      if (weeksRemaining <= 0) break;
      
      // Tier diseases by frequency to prevent over-weighting rare diseases
      // With 764 diseases and max count ~10, linear scaling over-emphasizes noise
      const tier = sys.diseases[0].count >= 6 ? 'high' : 
                   sys.diseases[0].count >= 3 ? 'medium' : 'low';
      const tierWeights = { high: 1.5, medium: 1.0, low: 0.5 };
      
      const baseProportion = sys.totalQuestions / grandTotal;
      const tieredProportion = baseProportion * tierWeights[tier];
      
      let wks = Math.round(tieredProportion * MAX_ORGAN_SYSTEM_WEEKS);
      if (wks < 1) wks = 1;
      if (wks > weeksRemaining) wks = weeksRemaining;

    // Pair adjacent diseases from frequency list
    const diseases = sys.diseases.sort((a, b) => b.count - a.count);
    const pairs: string[][] = [];
    for (let i = 0; i < diseases.length; i += 2) {
      const a = diseases[i];
      const b = diseases[i + 1];
      if (b) {
        pairs.push([
          `${a.name} & ${b.name}`,
          `${a.count}x + ${b.count}x questions. ${a.mechanism || a.name} / ${b.mechanism || b.name}`,
        ]);
      } else {
        pairs.push([
          a.name,
          `${a.count}x questions. ${a.mechanism || a.name}`,
        ]);
      }
    }

    allocatedWeeks.push({ system: sys.system, diseasePairs: pairs, weekCount: wks });
    weeksRemaining -= wks;
  }

  // Generate organ system weeks from allocated plan
  for (const plan of allocatedWeeks) {
    const totalPairs = plan.diseasePairs.length;
    const daysPerWeek = 6;
    const weeksNeeded = Math.ceil(totalPairs / daysPerWeek);
    const actualWeeks = Math.min(weeksNeeded, plan.weekCount);

    for (let w = 0; w < actualWeeks; w++) {
      const isGeneral = plan.system === 'General';
      const label = isGeneral
        ? 'High-Yield Foundations: Biostats, Ethics, Genetics'
        : actualWeeks > 1
          ? `${plan.system} (${w + 1}/${actualWeeks})`
          : plan.system;
      const week = createWeek('ORGAN_SYSTEMS', label);
      const startIdx = w * daysPerWeek;

      for (let d = 0; d < week.days.length && startIdx + d < totalPairs; d++) {
        const pair = plan.diseasePairs[startIdx + d];
        const day = week.days[d];
        day.system = plan.system;
        day.subject = isGeneral ? 'Foundations' : 'Pathology';
        if (isGeneral) {
          day.blocks = [
            makeBlock('REVIEW', `Foundations Review: ${pair[0]}`, pair[1]),
            makeBlock('QUESTIONS', `Practice: ${pair[0]}`, `Answer 5-10 questions on ${pair[0]}`),
            makeBlock('READING', 'First Aid: General Principles', 'Review high-yield biostats/ethics/genetics pages', 'General Principles: 1-93'),
          ];
        } else {
          day.blocks = makeBlocksForSystemDay(plan.system, 'Pathology', pair[0], pair[1]);
        }
        day.totalMinutes = day.blocks.reduce((s, b) => s + b.durationMinutes, 0);
      }

      // Fill remaining days with review
      for (let rd = Math.min(week.days.length, totalPairs - startIdx); rd < week.days.length; rd++) {
        const day = week.days[rd];
        day.system = plan.system;
        day.subject = 'Review';
        day.blocks = isGeneral
          ? [makeBlock('REVIEW', 'Comprehensive Foundations Review', 'Review all general principles: biostats, ethics, genetics, cell biology'), makeBlock('QUESTIONS', 'Mixed Foundations Questions', '20 mixed questions across all foundation topics'), makeBlock('READING', 'First Aid: General Principles', 'Final pass through weak foundation areas', 'General Principles: 1-93')]
          : makeReviewDayBlocks(plan.system);
        day.totalMinutes = day.blocks.reduce((s, b) => s + b.durationMinutes, 0);
      }

      week.totalMinutes = week.days.reduce((s, d) => s + d.totalMinutes, 0);
      weeks.push(week);
    }
  }

  // ======= PHASE 3: INTEGRATION (3 weeks, data-driven from enriched bank) =======
  const integrationSystemGroups = [
    ['Cardiovascular', 'Renal', 'Respiratory'],
    ['Neurology', 'Psychiatry', 'Endocrine'],
    ['Gastrointestinal', 'Hematology & Oncology', 'Infectious Disease', 'Reproductive'],
  ];
  const integrationLabels = [
    'Integration: Cardio + Renal + Resp',
    'Integration: Neuro + Psych + Endo',
    'Integration: GI + Heme + ID + Repro',
  ];

  function findSystemForDiseasePair(pairName: string, targetSystems: string[]): string {
    for (const sys of systemScores) {
      if (targetSystems.includes(sys.system)) {
        for (const disease of sys.diseases) {
          if (pairName.includes(disease.name)) return sys.system;
        }
      }
    }
    return targetSystems[0];
  }

  for (let i = 0; i < integrationSystemGroups.length; i++) {
    const targetSystems = integrationSystemGroups[i];
    const week = createWeek('INTEGRATION', integrationLabels[i]);

    // Collect diseases from target systems
    const collected: { name: string; count: number; mechanism: string }[] = [];
    for (const sys of systemScores) {
      if (targetSystems.includes(sys.system)) {
        collected.push(...sys.diseases);
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const unique: typeof collected = [];
    for (const d of collected.sort((a, b) => b.count - a.count)) {
      if (!seen.has(d.name)) { seen.add(d.name); unique.push(d); }
    }

    // Create disease pairs
    const pairs: string[][] = [];
    for (let j = 0; j < unique.length; j += 2) {
      const a = unique[j];
      const b = unique[j + 1];
      if (b) {
        pairs.push([`${a.name} & ${b.name}`, `${a.count}x + ${b.count}x questions. ${a.mechanism || a.name} / ${b.mechanism || b.name}`]);
      } else {
        pairs.push([a.name, `${a.count}x questions. ${a.mechanism || a.name}`]);
      }
    }

    for (let d = 0; d < week.days.length; d++) {
      const day = week.days[d];
      if (d < pairs.length) {
        const pair = pairs[d];
        const matchedSystem = findSystemForDiseasePair(pair[0], targetSystems);
        day.system = matchedSystem;
        day.subject = 'Pathology';
        day.blocks = makeBlocksForSystemDay(matchedSystem, 'Pathology', pair[0], pair[1]);
        for (const b of day.blocks) b.topic = pair[0];
      } else {
        day.system = targetSystems[0];
        day.subject = 'Review';
        day.blocks = makeReviewDayBlocks(targetSystems.join(' + '));
      }
      day.totalMinutes = day.blocks.reduce((s, b) => s + b.durationMinutes, 0);
    }

    week.totalMinutes = week.days.reduce((s, d) => s + d.totalMinutes, 0);
    weeks.push(week);
  }

  // ======= PHASE 4: FINAL REVIEW (2 weeks) =======
  const topDiseasesAll = frequencyStats.diseases.map(d => d.name);
  const chunks: string[][] = [];
  for (let ci = 0; ci < topDiseasesAll.length; ci += 10) {
    chunks.push(topDiseasesAll.slice(ci, ci + 10));
  }

  for (let i = 0; i < 2; i++) {
    const weekLabel = i === 0 ? 'Final Review I: NBME Simulation + Weak Areas' : 'Final Review II: NBME Simulation + Last Pass';
    const week = createWeek('FINAL_REVIEW', weekLabel);

    for (let d = 0; d < week.days.length; d++) {
      const day = week.days[d];
      day.system = 'General';
      day.subject = 'Review';

      if (d < 3) {
        day.blocks = [
          makeBlock('QUESTIONS', d === 0 ? 'NBME Simulation (Block 1)' : 'NBME Simulation (Full)', '40 timed questions simulating exam conditions'),
          makeBlock('REVIEW', 'Review Simulation', 'Review all incorrect and flagged answers'),
          makeBlock('READING', 'Targeted Review', 'First Aid sections for missed topics', 'Missed topic FA sections'),
        ];
      } else if (d < 5) {
        const chunkIdx = i * 2 + (d - 3);
        const diseases = chunks[chunkIdx] || topDiseasesAll.slice(0, 10);
        const topicStr = diseases.join(', ');
        day.blocks = [
          makeBlock('REVIEW', `High-Yield Sprint: ${diseases.slice(0, 5).join(', ')}`, `Rapid review of top tested diseases: ${topicStr}`),
          makeBlock('QUESTIONS', 'Mixed High-Yield Questions', `30 questions targeting high-yield topics: ${topicStr}`),
          makeBlock('REVIEW', 'Discriminator Final Drill', `Review discriminators between key diseases: ${topicStr}`),
        ];
        for (const b of day.blocks) b.topic = diseases.slice(0, 3).join(', ');
      } else {
        day.blocks = [
          makeBlock('REVIEW', 'Light Review', 'Light reading through summary pages, relax and consolidate'),
          makeBlock('REVIEW', 'Formula/Mnemonic Review', 'Quick refresh of key formulas, mnemonics, and buzzwords'),
          makeBlock('REVIEW', 'Mental Preparation', 'Review test-day strategy, timing, break plan'),
        ];
      }
      day.totalMinutes = day.blocks.reduce((s, b) => s + b.durationMinutes, 0);
    }

    week.totalMinutes = week.days.reduce((s, d) => s + d.totalMinutes, 0);
    weeks.push(week);
  }

  const totalDays = weeks.reduce((s, w) => s + w.days.length, 0);
  const totalHours = Math.round(totalDays * HOURS_PER_DAY);

  return {
    examDate: formatDate(EXAM_DATE),
    startDate: formatDate(START_DATE),
    totalDays,
    totalHours,
    hoursPerDay: HOURS_PER_DAY,
    weeks,
    overview: {
      topDiseases: frequencyStats.diseases.slice(0, 15),
      topSystems: frequencyStats.systems.slice(0, 10),
      topSubjects: frequencyStats.subjects.slice(0, 10),
      dependencyDepth: frequencyStats.dependencyDepth,
      totalTopics: frequencyStats.totalTopics,
      totalQuestions: frequencyStats.totalQuestions,
    },
  };
}
