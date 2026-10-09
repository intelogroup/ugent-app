export type FindingType = 'sign' | 'symptom' | 'lab' | 'imaging' | 'path' | 'course' | 'size' | 'geography';
export type FindingWeight = 'pathognomonic' | 'classic' | 'common';

export interface Finding {
  id: string;
  label: string;
  type: FindingType;
  systems: string[];
  weight: FindingWeight;
  sourceHashes: string[];
  /** 'notes' = stated in a qbank row (sourceHashes set); 'knowledge' = standard textbook finding, no row cites it. */
  source?: 'notes' | 'knowledge';
}

export interface DiseaseFindings {
  disease: string;
  topicType: string;
  findings: Finding[];
}

export interface Pick {
  id: string;
  state: 'present' | 'absent';
}

export interface Ranked {
  disease: string;
  score: number;
  matched: number;
  contradicted: boolean;
}
