-- Add share_token to playlists
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_playlists_share_token ON public.playlists(share_token) WHERE share_token IS NOT NULL;

-- Public read of shared playlists
DROP POLICY IF EXISTS "Anyone can view shared playlists" ON public.playlists;
CREATE POLICY "Anyone can view shared playlists"
ON public.playlists FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);

-- Public read of songs inside shared playlists
DROP POLICY IF EXISTS "Anyone can view songs of shared playlists" ON public.playlist_songs;
CREATE POLICY "Anyone can view songs of shared playlists"
ON public.playlist_songs FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_songs.playlist_id
      AND p.share_token IS NOT NULL
  )
);

-- Generate or fetch share token (owner only)
CREATE OR REPLACE FUNCTION public.get_or_create_playlist_share_token(p_playlist_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_token text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT share_token INTO v_token
  FROM public.playlists
  WHERE id = p_playlist_id AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not your playlist';
  END IF;

  IF v_token IS NULL THEN
    v_token := encode(gen_random_bytes(9), 'base64');
    v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');
    UPDATE public.playlists SET share_token = v_token WHERE id = p_playlist_id;
  END IF;

  RETURN v_token;
END;
$$;

-- Import a shared playlist into the caller's library (Premium only)
CREATE OR REPLACE FUNCTION public.import_shared_playlist(p_share_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_src_id uuid;
  v_title text;
  v_cover text;
  v_desc text;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_premium_subscription(v_user) THEN
    RAISE EXCEPTION 'Premium required';
  END IF;

  SELECT id, title, cover_url, description
    INTO v_src_id, v_title, v_cover, v_desc
  FROM public.playlists
  WHERE share_token = p_share_token
  LIMIT 1;

  IF v_src_id IS NULL THEN
    RAISE EXCEPTION 'Shared playlist not found';
  END IF;

  INSERT INTO public.playlists (user_id, title, cover_url, description, is_public)
  VALUES (v_user, v_title, v_cover, v_desc, false)
  RETURNING id INTO v_new_id;

  INSERT INTO public.playlist_songs (playlist_id, song_id, position, track_source)
  SELECT v_new_id, song_id, position, track_source
  FROM public.playlist_songs
  WHERE playlist_id = v_src_id;

  RETURN v_new_id;
END;
$$;

-- Drop unused tables (song_requests, donations) — full feature removal
DROP TABLE IF EXISTS public.song_requests CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;