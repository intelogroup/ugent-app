-- Drill card per-user feedback — replaces localStorage-only persistence
-- (flag/comment/liked/mastered + last card position). RLS-scoped like clea_chats/curriculum_progress.

CREATE TABLE IF NOT EXISTS drill_card_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  card_id TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'qbank',
  flagged BOOLEAN NOT NULL DEFAULT false,
  liked BOOLEAN NOT NULL DEFAULT false,
  mastered BOOLEAN NOT NULL DEFAULT false,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_drill_card_feedback_user ON drill_card_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_card_feedback_card ON drill_card_feedback(card_id);

ALTER TABLE drill_card_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own feedback"
  ON drill_card_feedback FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can view own feedback"
  ON drill_card_feedback FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can update own feedback"
  ON drill_card_feedback FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can delete own feedback"
  ON drill_card_feedback FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Last-viewed card position per user (for relog resume)
CREATE TABLE IF NOT EXISTS drill_card_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  last_qbank_card_id TEXT,
  last_concept_card_id TEXT,
  last_subtab TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drill_card_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can upsert own drill state"
  ON drill_card_state FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
