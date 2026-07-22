-- Move book_pages from whole-page embeddings to paragraph-chunk embeddings.
-- Whole-page embeddings diluted niche one-liners into the page's dominant
-- topic (verified: "psammoma bodies" and "hyperacute transplant rejection"
-- queries returned unrelated top hits with low similarity, <0.4). Chunking
-- gives each fact its own embedding instead of averaging it into ~2000
-- chars of unrelated page content.
ALTER TABLE book_pages DROP CONSTRAINT book_pages_book_page_key;
ALTER TABLE book_pages ADD COLUMN chunk_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE book_pages ADD CONSTRAINT book_pages_book_page_chunk_key UNIQUE (book, page, chunk_index);

CREATE OR REPLACE FUNCTION match_book_pages(
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
