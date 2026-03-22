# USMLE Pareto Engine: Stage 1 Research Pipeline Design

## Overview
The USMLE Pareto Engine is a research-focused pipeline designed to extract high-leverage medical intelligence from 3,000+ USMLE questions and explanations. The goal is to identify the "essential 30%" of medical patterns (clues, context, and dependencies) that provide 90% of the knowledge needed to pass the exams.

This specification covers **Stage 1: Research Ingestion & Intelligence Extraction**, which focuses on the automated ingestion of raw question data and its transformation into structured medical intelligence using GPT-5.

## Architecture: Pure Convex
To eliminate architectural complexity and enable real-time research feedback, the system will move to a **Pure Convex** architecture.
*   **Database**: Convex (Managed Document Store).
*   **Backend**: Convex Functions (Queries, Mutations, and Actions).
*   **Frontend**: Next.js (App Router) using the Convex client for real-time reactivity.
*   **Legacy Removal**: Prisma and Postgres will be completely removed. Existing question seeds will be migrated to Convex.

## Data Schema (Convex)

### `ingestions`
Stores raw data blobs provided by the researcher.
*   `_id`: ID
*   `rawText`: string (The full QCM + journey + explanation blob)
*   `status`: "pending" | "processing" | "completed" | "failed"
*   `error`: optional string
*   `createdAt`: number

### `questions` (The "Clean" Library)
*   `text`: string
*   `correctAnswer`: string
*   `options`: array of `{ text: string, isCorrect: boolean }`
*   `explanation`: string
*   `educationalObjective`: string (Extracted from explanation)
*   `subject`: string (e.g., "Pharmacology", "Pathology")
*   `system`: string (e.g., "Cardiovascular", "Renal")
*   `ingestionId`: v.id("ingestions")

### `extracted_patterns` (The Intelligence Layer)
*   `questionId`: v.id("questions")
*   `diseaseName`: string (The "Gold Standard" diagnosis)
*   `mechanism`: string (The core mechanism/pathophysiology behind the presentation)
*   `highLeverageClues`: array of strings (Pathognomonic terms, unique identifiers)
*   `discriminators`: array of `{ distractor: string, ruleOutFact: string }` (The specific fact that rules out each common misdiagnosis)
*   `nextBestStep`: v.optional(string) (The management or diagnostic step most frequently tested for this condition)
*   `clinicalContext`: object { `age`, `gender`, `physiologyState`, `onsetPattern` }
*   `keySymptoms`: array of strings (Non-specific symptoms like fever/pain)
*   `prerequisites`: array of strings (Fundamental concepts or pharmacology hooks needed to understand this question)
*   `tableData`: v.optional(v.array(v.any())) (Structured data distilled from Markdown tables in the explanation)

### `pattern_frequencies` (The Frequency Engine)
*   `type`: "DISEASE" | "CLUE" | "SUBJECT" | "SYSTEM" | "CONTEXT"
*   `name`: string
*   `count`: number
*   `lastSeenAt`: number

### `knowledge_dependencies` (The Dependency Graph)
*   `from`: string (Prerequisite concept)
*   `to`: string (Target concept/disease)
*   `strength`: number (Frequency of the link across the dataset)

## AI Extraction Logic (GPT-5 Action)

The `ai:extractIntelligence` Convex Action is the core of the pipeline. It uses GPT-5 with a **strict Zod-defined JSON schema** to perform a **Triple-Pass Distillation**:

### Pass 1: Clinical Fact Extraction (The "Stem" Pass)
*   **Demographics**: Extracts Age, Gender, BMI, and Physiology state (e.g., "2nd Trimester Pregnancy").
*   **Temporal Pattern**: Onset speed (acute/chronic) and duration.
*   **Clue Classification**: Identifies "Cardinal Clues" (e.g., "nodular liver", "hard and pellet-like") and filters out "Symptomatic Noise" (e.g., "confusion", "abdominal pain").

### Pass 2: Discriminator Analysis (The "Distractor" Pass)
*   For each distractor choice (B, C, D, E), the AI must extract the **Primary Discriminator** from the explanation paragraphs.
*   **Logic**: Identifies the specific clinical fact that rules out the distractor (e.g., "Neurologic disorders only" rules out "Parasympathetic input" in a healthy pregnant patient).

### Pass 3: Systematic Synthesis (The "Knowledge" Pass)
*   **Mechanism (Why)**: The core pathophysiology (e.g., "Progesterone inhibits colonic smooth muscle").
*   **Dependency Mapping**: Extracts prerequisites from the "Educational Objective" and Markdown tables, creating links between concepts (e.g., `Progesterone -> Smooth Muscle -> Constipation`).
*   **Noise Filtering**: Explicitly ignores pedagogical filler ("You're doing great!", "Keep studying!").
*   **Bulk Handling**: The action can process multiple questions from a single `rawText` blob by splitting on a standard delimiter (e.g., `---NEXT-QUESTION---`).

## Research Dashboard Features
A dedicated interface at `/research/ingest` for Stage 1 operations:
*   **Streaming Ingestion**: Real-time display of extraction results as the AI processes the 3k questions.
*   **Pattern Radar**: Instant analytics showing the most frequent clues and diseases in the current dataset.
*   **Dependency Explorer**: A visual representation of the prerequisites identified across the question bank.

## Migration Strategy
1.  **Schema Preparation**: Deploy the new Convex schema.
2.  **Seed Migration**: Write a **local Node.js script** to parse existing Prisma `prisma/seed-*.ts` files and upload them to Convex via the CLI or a specialized ingestion mutation (as Convex functions cannot access the local filesystem).
3.  **Environment Cleanup**: Remove `prisma/`, `lib/prisma.ts`, and relevant dependencies from `package.json`.
4.  **Batch Ingestion**: Enable the researcher to begin pasting the 3,000 "Gold Standard" question blobs.

## Success Criteria
*   Successful extraction of structured JSON patterns from 100% of the first 100 manual ingestions.
*   Automatic updating of `pattern_frequencies` without data race conditions.
*   Real-time UI updates in the Research Dashboard showing the growth of the Knowledge Graph.
