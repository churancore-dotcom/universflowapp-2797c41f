
-- 1. Guard artist_profiles privileged columns
CREATE OR REPLACE FUNCTION public.prevent_artist_profile_privileged_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_jwt_role text;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role','postgres','supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.is_verified := OLD.is_verified;
  NEW.total_plays := OLD.total_plays;
  NEW.total_likes := OLD.total_likes;
  NEW.total_followers := OLD.total_followers;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_artist_profile_privileged_change ON public.artist_profiles;
CREATE TRIGGER trg_prevent_artist_profile_privileged_change
BEFORE UPDATE ON public.artist_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_artist_profile_privileged_change();

-- 2. Guard artist_songs status + stats + takedown_reason; also clear takedown_reason when live
CREATE OR REPLACE FUNCTION public.prevent_artist_song_privileged_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_jwt_role text; v_privileged boolean;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  v_privileged := v_jwt_role = 'service_role'
    OR current_user IN ('service_role','postgres','supabase_admin')
    OR public.has_role(auth.uid(), 'admin'::public.app_role);

  IF NOT v_privileged THEN
    NEW.status := OLD.status;
    NEW.takedown_reason := OLD.takedown_reason;
    NEW.play_count := OLD.play_count;
    NEW.like_count := OLD.like_count;
    NEW.download_count := OLD.download_count;
  END IF;

  -- Never leak takedown_reason for live songs (defense in depth for public SELECT)
  IF NEW.status = 'live'::public.artist_song_status THEN
    NEW.takedown_reason := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_artist_song_privileged_change ON public.artist_songs;
CREATE TRIGGER trg_prevent_artist_song_privileged_change
BEFORE UPDATE ON public.artist_songs
FOR EACH ROW EXECUTE FUNCTION public.prevent_artist_song_privileged_change();

-- Sanitize any existing live rows that may carry a stale takedown_reason
UPDATE public.artist_songs
SET takedown_reason = NULL
WHERE status = 'live'::public.artist_song_status AND takedown_reason IS NOT NULL;

-- 3. Restrict Realtime broadcast/presence channels (app uses postgres_changes only)
DROP POLICY IF EXISTS "Realtime broadcast admins only" ON realtime.messages;
CREATE POLICY "Realtime broadcast admins only"
ON realtime.messages
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
