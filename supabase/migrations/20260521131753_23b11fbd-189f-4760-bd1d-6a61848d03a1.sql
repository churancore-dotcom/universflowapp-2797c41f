REVOKE SELECT (user_id) ON public.app_reviews FROM anon, public;
GRANT  SELECT (user_id) ON public.app_reviews TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can log their own events" ON public.audit_logs;

DROP POLICY IF EXISTS "api_keys_admin_only_restrictive" ON public.api_keys;
CREATE POLICY "api_keys_admin_only_restrictive"
  ON public.api_keys
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));