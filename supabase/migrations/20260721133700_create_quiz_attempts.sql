-- Run this in Supabase SQL editor (https://supabase.com/dashboard/project/_/sql/new)

-- Quiz attempts — one row per completed quiz
CREATE TABLE quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT,
  system TEXT,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Per-question answers within an attempt
CREATE TABLE quiz_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  selected_answer TEXT,
  is_correct BOOLEAN,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  subject TEXT,
  system TEXT,
  difficulty TEXT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_answers_attempt ON quiz_answers(attempt_id);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own answers"
  ON quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = (SELECT auth.uid()))
  );

CREATE POLICY "users can view own answers"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = (SELECT auth.uid()))
  );
