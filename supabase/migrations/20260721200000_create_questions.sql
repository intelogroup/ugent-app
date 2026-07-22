-- Question bank, ported from data/classified-questions.jsonl
CREATE TABLE questions (
  id TEXT PRIMARY KEY, -- textHash
  text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options JSONB NOT NULL, -- [{text, isCorrect}]
  explanation TEXT,
  subject TEXT,
  system TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_filter ON questions(subject, system, difficulty);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);
