-- Run this in Supabase SQL editor to patch the live DB to match supabase/migration.sql
-- Adds TO authenticated to existing policies (defense in depth vs predicate-only checks)

DROP POLICY IF EXISTS "users can insert own attempts" ON quiz_attempts;
CREATE POLICY "users can insert own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can view own attempts" ON quiz_attempts;
CREATE POLICY "users can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can insert own answers" ON quiz_answers;
CREATE POLICY "users can insert own answers"
  ON quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "users can view own answers" ON quiz_answers;
CREATE POLICY "users can view own answers"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = (SELECT auth.uid()))
  );
