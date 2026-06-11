export type TopicType = 'DISEASE' | 'PRINCIPLE' | 'DRUG' | 'PATHOGEN' | 'SYNDROME' | 'CONCEPT';

export type Subject =
  | 'Physiology' | 'Pathology' | 'Anatomy' | 'Pharmacology'
  | 'Microbiology' | 'Immunology' | 'Biostatistics & Epidemiology'
  | 'Psychiatry' | 'Dermatology' | 'Neurology' | 'Endocrinology'
  | 'Obstetrics' | 'Pediatrics' | 'Pulmonology' | 'General'
  | 'Behavioral Science' | 'Genetics';

export type System =
  | 'Neurology' | 'Respiratory' | 'Pharmacology' | 'Gastrointestinal'
  | 'Cardiovascular' | 'Hematology & Oncology' | 'Immunology'
  | 'Infectious Disease' | 'Endocrine' | 'Integumentary'
  | 'Renal' | 'Reproductive' | 'Musculoskeletal' | 'Psychiatry'
  | 'Pediatrics' | 'General' | 'Nervous System' | 'Immune System'
  | 'Public Health' | 'Genetics';

export interface QuestionData {
  text: string;
  correctAnswer: string;
  explanation: string;
  educationalObjective?: string;
  subject?: Subject;
  system?: System;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  textHash: string;
}

export interface EnrichedData {
  questionText: string;
  correctAnswer: string;
  explanation: string;
  educationalObjective: string;
  subject: string;
  system: string;
  diseaseName: string;
  topicType: TopicType;
  mechanism: string;
  highLeverageClues: string[];
  discriminators: { distractor: string; ruleOutFact: string }[];
  nextBestStep: string;
  clinicalContext: { age?: string; sex?: string; setting?: string };
  keySymptoms: string[];
  prerequisites: string[];
}

export interface TopicNode {
  id: string;
  name: string;
  type: TopicType;
  subject: string;
  system: string;
  questionCount: number;
  prerequisites: string[]; // IDs of prerequisite topics
  dependsOn: string[];     // same as prerequisites, for graph edges
  questionIds: string[];   // textHash references
  discriminators: string[];
  highLeverageClues: string[];
}

export interface DependencyEdge {
  from: string; // prerequisite
  to: string;   // dependent topic
}

export interface DependencyGraph {
  nodes: TopicNode[];
  edges: DependencyEdge[];
  topologicalOrder: string[];
  rootNodes: string[];     // topics with no prerequisites
  leafNodes: string[];     // topics nothing depends on
}

export interface StudyBlock {
  id: string;
  type: 'READING' | 'VIDEO' | 'QUESTIONS' | 'REVIEW' | 'PHARMACOLOGY';
  title: string;
  description: string;
  durationMinutes: number;
  resources: {
    firstAid?: string;
    pathoma?: string;
    questions?: string[];
  };
  completed: boolean;
  topic?: string;
}

export interface StudyDay {
  date: string;
  dayOfWeek: string;
  blocks: StudyBlock[];
  totalMinutes: number;
  completed: boolean;
  system: string;
  subject: string;
}

export interface StudyWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  phase: 'FOUNDATIONS' | 'ORGAN_SYSTEMS' | 'INTEGRATION' | 'FINAL_REVIEW';
  phaseLabel: string;
  days: StudyDay[];
  totalMinutes: number;
  completedDays: number;
  totalDays: number;
}

export interface Curriculum {
  examDate: string;
  startDate: string;
  totalDays: number;
  totalHours: number;
  hoursPerDay: number;
  weeks: StudyWeek[];
  overview: {
    topDiseases: { name: string; count: number }[];
    topSystems: { name: string; count: number }[];
    topSubjects: { name: string; count: number }[];
    dependencyDepth: number;
    totalTopics: number;
    totalQuestions: number;
  };
}
