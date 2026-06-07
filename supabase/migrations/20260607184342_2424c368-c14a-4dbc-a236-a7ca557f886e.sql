CREATE TABLE IF NOT EXISTS public.user_eq_settings (
  user_id uuid PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_eq_settings TO authenticated;
GRANT ALL ON public.user_eq_settings TO service_role;

ALTER TABLE public.user_eq_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own eq settings" ON public.user_eq_settings;
CREATE POLICY "Users can view own eq settings"
ON public.user_eq_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own eq settings" ON public.user_eq_settings;
CREATE POLICY "Users can insert own eq settings"
ON public.user_eq_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own eq settings" ON public.user_eq_settings;
CREATE POLICY "Users can update own eq settings"
ON public.user_eq_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own eq settings" ON public.user_eq_settings;
CREATE POLICY "Users can delete own eq settings"
ON public.user_eq_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_eq_settings_updated_at ON public.user_eq_settings;
CREATE TRIGGER update_user_eq_settings_updated_at
BEFORE UPDATE ON public.user_eq_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_eq_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_eq_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'songs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stream_songs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_songs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recently_played') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recently_played;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_library') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_library;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_artist_preferences') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_artist_preferences;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'artists') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.artists;
  END IF;
END $$;