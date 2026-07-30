-- book_pages holds only public reference text (Pathoma/First Aid excerpts),
-- not user data. The "authenticated can read" policy from
-- 20260722130000_create_book_pages.sql left anon (logged-out chat, and any
-- request path using the anon key) with zero rows from match_book_pages()
-- since it's plain SQL, not SECURITY DEFINER, and inherits caller RLS.
CREATE POLICY "anon can read book_pages"
  ON book_pages FOR SELECT
  TO anon
  USING (true);
