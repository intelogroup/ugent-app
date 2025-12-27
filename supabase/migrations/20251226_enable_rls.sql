-- Enable Row Level Security on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Test" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Answer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TestSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningPath" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PerformanceSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningPattern" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserLeaderboard" ENABLE ROW LEVEL SECURITY;

-- User table policies
CREATE POLICY "Users can view their own profile"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id);

-- Test table policies
CREATE POLICY "Users can view their own tests"
  ON "Test" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own tests"
  ON "Test" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own tests"
  ON "Test" FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own tests"
  ON "Test" FOR DELETE
  USING (auth.uid()::text = "userId");

-- Answer table policies
CREATE POLICY "Users can view their own answers"
  ON "Answer" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own answers"
  ON "Answer" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own answers"
  ON "Answer" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Progress table policies
CREATE POLICY "Users can view their own progress"
  ON "Progress" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own progress"
  ON "Progress" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own progress"
  ON "Progress" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- StudyNote table policies
CREATE POLICY "Users can view their own notes"
  ON "StudyNote" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own notes"
  ON "StudyNote" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own notes"
  ON "StudyNote" FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own notes"
  ON "StudyNote" FOR DELETE
  USING (auth.uid()::text = "userId");

-- UserInteraction table policies
CREATE POLICY "Users can view their own interactions"
  ON "UserInteraction" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own interactions"
  ON "UserInteraction" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- TestSession table policies
CREATE POLICY "Users can view their own sessions"
  ON "TestSession" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own sessions"
  ON "TestSession" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own sessions"
  ON "TestSession" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- ReviewHistory table policies
CREATE POLICY "Users can view their own review history"
  ON "ReviewHistory" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own review history"
  ON "ReviewHistory" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- LearningPath table policies
CREATE POLICY "Users can view their own learning path"
  ON "LearningPath" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own learning path"
  ON "LearningPath" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own learning path"
  ON "LearningPath" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- AIInsight table policies
CREATE POLICY "Users can view their own insights"
  ON "AIInsight" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own insights"
  ON "AIInsight" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- PerformanceSummary table policies
CREATE POLICY "Users can view their own performance summary"
  ON "PerformanceSummary" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own performance summary"
  ON "PerformanceSummary" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- LearningPattern table policies
CREATE POLICY "Users can view their own learning pattern"
  ON "LearningPattern" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own learning pattern"
  ON "LearningPattern" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- UserLeaderboard table policies
CREATE POLICY "Users can view all leaderboard entries"
  ON "UserLeaderboard" FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own leaderboard entry"
  ON "UserLeaderboard" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Public tables (no RLS needed, everyone can read)
-- System, Topic, Subject, Question, AnswerOption, TestQuestion
-- These are shared resources that all users can access

-- Function to automatically create User record on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create User record when auth.users record is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
