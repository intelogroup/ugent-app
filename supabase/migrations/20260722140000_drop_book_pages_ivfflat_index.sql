-- ivfflat (lists=100) on only 1079 vectors returns 0 rows for exact-limit
-- queries: default probes=1 frequently probes a list that holds none of the
-- rows matching the WHERE book = ... filter, so match_book_pages silently
-- returned empty hits. Dataset is far too small (<10k vectors) to need an
-- approximate index anyway — exact scan costs <1ms. Drop it.
DROP INDEX IF EXISTS idx_book_pages_embedding;
