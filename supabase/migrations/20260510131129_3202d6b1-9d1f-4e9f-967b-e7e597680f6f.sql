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