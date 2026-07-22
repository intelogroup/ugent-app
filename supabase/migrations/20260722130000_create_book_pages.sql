-- Pathoma / First Aid scanned-page text + embeddings, ported from
-- data/pathoma_text.jsonl, data/firstaid_text.jsonl, data/.embeddings/*.json
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE book_pages (
  id BIGSERIAL PRIMARY KEY,
  book TEXT NOT NULL CHECK (book IN ('pathoma', 'firstaid')),
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  UNIQUE (book, page)
);

CREATE INDEX idx_book_pages_embedding ON book_pages
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE book_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read book_pages"
  ON book_pages FOR SELECT
  TO authenticated
  USING (true);

-- Cosine-similarity top-k search, called via supabase.rpc('match_book_pages', ...)
CREATE FUNCTION match_book_pages(
  p_book TEXT,
  query_embedding VECTOR(1536),
  match_count INT
)
RETURNS TABLE (page INTEGER, text TEXT, similarity FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT book_pages.page, book_pages.text, 1 - (book_pages.embedding <=> query_embedding) AS similarity
  FROM book_pages
  WHERE book_pages.book = p_book
  ORDER BY book_pages.embedding <=> query_embedding
  LIMIT match_count;
$$;
