
-- 1. app_settings: replace authenticated permissive policy with key-filtered one
DROP POLICY IF EXISTS "Authenticated can read all app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read non-sensitive app settings" ON public.app_settings;

CREATE POLICY "Clients can read non-sensitive app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key <> ALL (ARRAY['upi_id'::text, 'upi_payee_name'::text, 'edge_send_system_push_url'::text]));

-- 2. internal_secrets: convert deny policy to RESTRICTIVE
DROP POLICY IF EXISTS "Deny all client access to internal_secrets" ON public.internal_secrets;

CREATE POLICY "Deny all client access to internal_secrets"
ON public.internal_secrets
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 3. Remove user-correlated tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_library;
ALTER PUBLICATION supabase_realtime DROP TABLE public.recently_played;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_artist_preferences;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_eq_settings;
