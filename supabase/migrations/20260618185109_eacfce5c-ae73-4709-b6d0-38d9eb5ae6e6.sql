
-- The legacy "artist_songs public live" policy called has_role() in its USING clause,
-- which anon cannot execute. PostgREST returned 42501 → HTTP 401 for the public artist page.
DROP POLICY IF EXISTS "artist_songs public live" ON public.artist_songs;
DROP POLICY IF EXISTS "artist_songs anon live"   ON public.artist_songs;

CREATE POLICY "artist_songs read anon live"
  ON public.artist_songs
  FOR SELECT
  TO anon
  USING (status = 'live'::public.artist_song_status);

CREATE POLICY "artist_songs read authed"
  ON public.artist_songs
  FOR SELECT
  TO authenticated
  USING (
    status = 'live'::public.artist_song_status
    OR auth.uid() = artist_user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
