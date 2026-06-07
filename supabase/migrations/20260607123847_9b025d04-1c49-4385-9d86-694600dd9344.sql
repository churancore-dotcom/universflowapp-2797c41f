
-- Fix 1: audit_logs restrictive ALL policy blocks admin SELECT. Replace with INSERT/UPDATE/DELETE-only restrictive policies.
DROP POLICY IF EXISTS "Deny client writes to audit logs" ON public.audit_logs;

CREATE POLICY "Deny client inserts to audit logs"
  ON public.audit_logs AS RESTRICTIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates to audit logs"
  ON public.audit_logs AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes to audit logs"
  ON public.audit_logs AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (false);

-- Fix 2: Remove songs from realtime publication to prevent leaking premium audio_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'songs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.songs';
  END IF;
END $$;

-- Fix 3: Restrict app_reviews SELECT to authenticated only (hide user_id from anon)
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.app_reviews;

CREATE POLICY "Authenticated users can view reviews"
  ON public.app_reviews FOR SELECT
  TO authenticated
  USING (true);
