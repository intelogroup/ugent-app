import { z } from "zod";

export const ClinicalContextSchema = z.object({
  age: z.string().optional().describe("Age of the patient (e.g., '65-year-old', 'newborn')"),
  gender: z.string().optional().describe("Gender of the patient"),
  physiologyState: z.string().optional().describe("Relevant physiology state (e.g., '2nd Trimester Pregnancy', 'Postmenopausal', 'Athletic')"),
  onsetPattern: z.string().optional().describe("Temporal pattern of onset (e.g., 'Acute', 'Chronic', 'Subacute', 'Intermittent')"),
});

export const DiscriminatorSchema = z.object({
  distractor: z.string().describe("The incorrect option text or name"),
  ruleOutFact: z.string().describe("The specific clinical fact or logic that rules out this distractor"),
});

export const ExtractedIntelligenceSchema = z.object({
  // Base Question Data (if extracted/refined)
  questionText: z.string().describe("The main question stem text"),
  correctAnswer: z.string().describe("The correct answer choice"),
  options: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean(),
  })).describe("All answer choices with correctness indicated"),
  explanation: z.string().describe("Comprehensive explanation for the answer"),
  educationalObjective: z.string().describe("The primary learning point (one sentence)"),
  subject: z.string().describe("Medical subject (e.g., Pharmacology, Pathology)"),
  system: z.string().describe("Organ system (e.g., Cardiovascular, Renal)"),

  // Intelligence Layer
  diseaseName: z.string().describe("The definitive diagnosis or core condition"),
  mechanism: z.string().describe("The core pathophysiology behind the presentation"),
  highLeverageClues: z.array(z.string()).describe("Pathognomonic terms or unique identifiers from the stem"),
  discriminators: z.array(DiscriminatorSchema).describe("List of rule-out facts for common distractors"),
  nextBestStep: z.string().optional().describe("The management or diagnostic step most frequently tested for this condition"),
  clinicalContext: ClinicalContextSchema,
  keySymptoms: z.array(z.string()).describe("Non-specific symptoms present (e.g., fever, pain)"),
  prerequisites: z.array(z.string()).describe("Fundamental concepts or prior knowledge needed to solve this"),
  tableData: z.array(z.any()).optional().describe("Structured data distilled from Markdown tables in the explanation"),
});

export type ExtractedIntelligence = z.infer<typeof ExtractedIntelligenceSchema>;
