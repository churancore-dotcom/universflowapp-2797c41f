
-- Explicit anon-targeted SELECT policies so the public /a/:slug page loads songs and follower counts
DROP POLICY IF EXISTS "artist_songs anon live" ON public.artist_songs;
CREATE POLICY "artist_songs anon live"
  ON public.artist_songs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'live'::public.artist_song_status);

DROP POLICY IF EXISTS "artist_followers anon count" ON public.artist_followers;
CREATE POLICY "artist_followers anon count"
  ON public.artist_followers
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "artist_profiles anon read" ON public.artist_profiles;
CREATE POLICY "artist_profiles anon read"
  ON public.artist_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);
