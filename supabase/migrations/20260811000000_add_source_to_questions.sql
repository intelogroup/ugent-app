ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'medicospira';
ALTER TABLE enriched_questions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'medicospira';
