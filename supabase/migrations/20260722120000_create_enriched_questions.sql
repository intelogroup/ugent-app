-- Enriched question bank, ported from data/medicospira-enriched.jsonl
CREATE TABLE enriched_questions (
  id TEXT PRIMARY KEY, -- textHash
  question_text TEXT NOT NULL,
  correct_answer TEXT,
  options JSONB,
  explanation TEXT,
  educational_objective TEXT,
  subject TEXT,
  system TEXT,
  disease_name TEXT,
  topic_type TEXT,
  mechanism TEXT,
  high_leverage_clues JSONB,
  discriminators JSONB,
  next_best_step TEXT,
  clinical_context TEXT,
  key_symptoms JSONB,
  prerequisites JSONB,
  table_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enriched_questions_disease ON enriched_questions(disease_name);

ALTER TABLE enriched_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read enriched_questions"
  ON enriched_questions FOR SELECT
  TO authenticated
  USING (true);
