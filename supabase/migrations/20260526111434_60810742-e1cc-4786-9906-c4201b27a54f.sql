
-- 1) app_reviews: revoke user_id column from anon/public; keep authenticated able to read it for ownership UI
REVOKE SELECT (user_id) ON public.app_reviews FROM anon, public;
GRANT SELECT (id, rating, comment, display_name, created_at, updated_at) ON public.app_reviews TO anon;

-- 2) app_settings: restrict sensitive keys to authenticated users via restrictive RLS
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Public can read non-sensitive app settings"
ON public.app_settings FOR SELECT
TO anon
USING (key NOT IN ('upi_id', 'upi_payee_name', 'edge_send_system_push_url'));

CREATE POLICY "Authenticated can read all app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- 3) realtime.messages: require authenticated for channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
