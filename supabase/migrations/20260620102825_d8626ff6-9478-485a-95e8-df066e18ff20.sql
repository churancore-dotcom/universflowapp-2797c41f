-- 1) artist_applications.admin_note — revoke column from owner/anon access via Data API.
--    Owners still get other columns through the existing owner SELECT policy, but admin_note
--    is now only reachable via admin_get_artist_application_note / get_my_artist_application_note RPCs.
REVOKE SELECT (admin_note) ON public.artist_applications FROM anon;
REVOKE SELECT (admin_note) ON public.artist_applications FROM authenticated;
GRANT SELECT (admin_note) ON public.artist_applications TO service_role;

-- 2) viral_picks — allow anonymous home-screen viewers to read active picks.
CREATE POLICY "Anyone can view active viral picks"
  ON public.viral_picks
  FOR SELECT
  TO anon
  USING (is_active = true);

GRANT SELECT ON public.viral_picks TO anon;