-- Run this in Supabase SQL editor (https://supabase.com/dashboard/project/_/sql/new)

-- Clea chat history — one row per chat thread. Replaces local-disk persistence
-- (lib/clea-chat-store.ts), which broke on Vercel's read-only serverless FS.
CREATE TABLE clea_chats (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_text TEXT NOT NULL DEFAULT '',
  summary_up_to INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clea_chats_user ON clea_chats(user_id);

ALTER TABLE clea_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own chats"
  ON clea_chats FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can view own chats"
  ON clea_chats FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can update own chats"
  ON clea_chats FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can delete own chats"
  ON clea_chats FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
