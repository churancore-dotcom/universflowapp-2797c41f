DROP POLICY IF EXISTS "Admins can manage artists" ON public.artists;
CREATE POLICY "Admins can manage artists"
ON public.artists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage all playlists" ON public.playlists;
CREATE POLICY "Admins can manage all playlists"
ON public.playlists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can do everything with songs" ON public.songs;
CREATE POLICY "Admins can do everything with songs"
ON public.songs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view visible songs" ON public.songs;
DROP POLICY IF EXISTS "Anyone can view visible free songs" ON public.songs;
DROP POLICY IF EXISTS "Signed-in users can view entitled visible songs" ON public.songs;

CREATE POLICY "Anyone can view visible free songs"
ON public.songs
FOR SELECT
TO anon, authenticated
USING (is_visible = true AND is_premium_only = false);

CREATE POLICY "Signed-in users can view entitled visible songs"
ON public.songs
FOR SELECT
TO authenticated
USING (is_visible = true AND (is_premium_only = false OR public.has_premium_subscription(auth.uid())));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_premium_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_premium_subscription(uuid) TO authenticated;