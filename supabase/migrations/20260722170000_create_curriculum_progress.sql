-- Curriculum block completion — one row per completed block per user
CREATE TABLE curriculum_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  block_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, block_id)
);

CREATE INDEX idx_curriculum_progress_user ON curriculum_progress(user_id);

ALTER TABLE curriculum_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own progress"
  ON curriculum_progress FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can view own progress"
  ON curriculum_progress FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can delete own progress"
  ON curriculum_progress FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
