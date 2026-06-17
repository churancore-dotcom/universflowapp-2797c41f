
-- ============================================================
-- 1. ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.artist_app_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.id_doc_type AS ENUM ('voter_id','pan','passport','drivers_license','national_id');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.artist_song_status AS ENUM ('live','taken_down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. artist_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artist_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  real_name text NOT NULL,
  phone text NOT NULL,
  country_code text NOT NULL,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  id_doc_type public.id_doc_type NOT NULL,
  id_doc_front_path text,
  id_doc_back_path text,
  selfie_path text,
  artist_photo_path text,
  status public.artist_app_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.artist_applications TO authenticated;
GRANT ALL ON public.artist_applications TO service_role;

ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_apps own select"
  ON public.artist_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "artist_apps own insert"
  ON public.artist_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artist_apps own update"
  ON public.artist_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artist_apps admin update"
  ON public.artist_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 3. artist_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  avatar_url text,
  banner_url text,
  country_code text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_verified boolean NOT NULL DEFAULT true,
  total_plays bigint NOT NULL DEFAULT 0,
  total_likes bigint NOT NULL DEFAULT 0,
  total_followers bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.artist_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.artist_profiles TO authenticated;
GRANT ALL ON public.artist_profiles TO service_role;

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_profiles public select"
  ON public.artist_profiles FOR SELECT USING (true);

CREATE POLICY "artist_profiles owner update"
  ON public.artist_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artist_profiles admin manage"
  ON public.artist_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 4. artist_songs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  stream_url text NOT NULL,
  duration integer,
  play_count bigint NOT NULL DEFAULT 0,
  like_count bigint NOT NULL DEFAULT 0,
  download_count bigint NOT NULL DEFAULT 0,
  status public.artist_song_status NOT NULL DEFAULT 'live',
  takedown_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_songs_artist_idx ON public.artist_songs(artist_user_id);
CREATE INDEX IF NOT EXISTS artist_songs_status_idx ON public.artist_songs(status);

GRANT SELECT ON public.artist_songs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.artist_songs TO authenticated;
GRANT ALL ON public.artist_songs TO service_role;

ALTER TABLE public.artist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_songs public live"
  ON public.artist_songs FOR SELECT
  USING (status = 'live' OR auth.uid() = artist_user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "artist_songs owner insert"
  ON public.artist_songs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artist_user_id AND public.has_role(auth.uid(), 'artist'::public.app_role));

CREATE POLICY "artist_songs owner update"
  ON public.artist_songs FOR UPDATE TO authenticated
  USING (auth.uid() = artist_user_id)
  WITH CHECK (auth.uid() = artist_user_id);

CREATE POLICY "artist_songs owner delete"
  ON public.artist_songs FOR DELETE TO authenticated
  USING (auth.uid() = artist_user_id);

CREATE POLICY "artist_songs admin"
  ON public.artist_songs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.validate_artist_song_url()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE u text := lower(coalesce(NEW.stream_url,''));
BEGIN
  IF u !~ '^https?://' THEN
    RAISE EXCEPTION 'stream_url must be a valid http(s) URL';
  END IF;
  IF u ~ '(youtube\.com|youtu\.be|music\.youtube|jiosaavn|spotify\.com|soundcloud\.com)' THEN
    RAISE EXCEPTION 'Platform URLs are not allowed. Use a direct audio URL you own.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_artist_song_url ON public.artist_songs;
CREATE TRIGGER trg_validate_artist_song_url
  BEFORE INSERT OR UPDATE OF stream_url ON public.artist_songs
  FOR EACH ROW EXECUTE FUNCTION public.validate_artist_song_url();

DROP TRIGGER IF EXISTS trg_artist_songs_updated_at ON public.artist_songs;
CREATE TRIGGER trg_artist_songs_updated_at
  BEFORE UPDATE ON public.artist_songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. artist_followers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artist_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_user_id, follower_user_id)
);

CREATE INDEX IF NOT EXISTS artist_followers_artist_idx ON public.artist_followers(artist_user_id);

GRANT SELECT ON public.artist_followers TO anon, authenticated;
GRANT INSERT, DELETE ON public.artist_followers TO authenticated;
GRANT ALL ON public.artist_followers TO service_role;

ALTER TABLE public.artist_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_followers public select"
  ON public.artist_followers FOR SELECT USING (true);

CREATE POLICY "artist_followers own insert"
  ON public.artist_followers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_user_id);

CREATE POLICY "artist_followers own delete"
  ON public.artist_followers FOR DELETE TO authenticated
  USING (auth.uid() = follower_user_id);

-- ============================================================
-- 6. Review trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_artist_application_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug text;
  v_base text;
  v_i int := 0;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.user_id, 'artist'::public.app_role)
    ON CONFLICT DO NOTHING;

    v_base := regexp_replace(lower(coalesce(NEW.stage_name,'artist')), '[^a-z0-9]+', '-', 'g');
    v_base := trim(both '-' from v_base);
    IF v_base = '' THEN v_base := 'artist'; END IF;
    v_slug := v_base;
    WHILE EXISTS (SELECT 1 FROM public.artist_profiles WHERE slug = v_slug) LOOP
      v_i := v_i + 1;
      v_slug := v_base || '-' || v_i::text;
    END LOOP;

    INSERT INTO public.artist_profiles(user_id, stage_name, slug, avatar_url, country_code, social_links, is_verified)
    VALUES (NEW.user_id, NEW.stage_name, v_slug,
            NEW.artist_photo_path,
            NEW.country_code, NEW.social_links, true)
    ON CONFLICT (user_id) DO UPDATE
      SET stage_name = EXCLUDED.stage_name,
          is_verified = true,
          updated_at = now();

    NEW.id_doc_front_path := NULL;
    NEW.id_doc_back_path  := NULL;
    NEW.selfie_path       := NULL;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());

    BEGIN
      PERFORM public.notify_system_push(
        ARRAY[NEW.user_id]::uuid[],
        'You''re a verified artist ✓',
        'Welcome to Universflow Artists. Open your Studio to upload songs.',
        '/artist/studio'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;

  ELSIF NEW.status = 'rejected' THEN
    NEW.id_doc_front_path := NULL;
    NEW.id_doc_back_path  := NULL;
    NEW.selfie_path       := NULL;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());

    BEGIN
      PERFORM public.notify_system_push(
        ARRAY[NEW.user_id]::uuid[],
        'Artist application update',
        COALESCE(NEW.admin_note, 'Your application needs changes. Reopen to resubmit.'),
        '/artist/status'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_artist_app_reviewed ON public.artist_applications;
CREATE TRIGGER trg_artist_app_reviewed
  BEFORE UPDATE OF status ON public.artist_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_artist_application_reviewed();

DROP TRIGGER IF EXISTS trg_artist_apps_updated_at ON public.artist_applications;
CREATE TRIGGER trg_artist_apps_updated_at
  BEFORE UPDATE ON public.artist_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_artist_profiles_updated_at ON public.artist_profiles;
CREATE TRIGGER trg_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Realtime
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_songs;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_followers;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================================
-- 8. Storage policies for artist-kyc bucket
-- ============================================================
DROP POLICY IF EXISTS "artist-kyc owner insert" ON storage.objects;
CREATE POLICY "artist-kyc owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artist-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "artist-kyc read" ON storage.objects;
CREATE POLICY "artist-kyc read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'artist-kyc'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

DROP POLICY IF EXISTS "artist-kyc delete" ON storage.objects;
CREATE POLICY "artist-kyc delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'artist-kyc'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
