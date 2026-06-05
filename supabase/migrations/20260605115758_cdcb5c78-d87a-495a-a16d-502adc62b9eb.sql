-- 1) Hide email column from regular client roles (admins keep access via SECURITY DEFINER + RLS bypass via service_role)
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- 2) Revoke EXECUTE on internal SECURITY DEFINER helpers — these are only meant to run from triggers / pg_net / SQL admin paths
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_field_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_status_field_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_premium_activated() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_premium_on_approval() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_viral_chart_refreshes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.support_message_after_insert() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_system_push(uuid[], text, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_old_subscriptions() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_premium_expiry_notifications() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_log_event(text, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_review_payment_request(uuid, text) FROM anon, PUBLIC;

-- Ensure trigger owner (postgres / service_role) keeps execute
GRANT EXECUTE ON FUNCTION public.admin_log_event(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_payment_request(uuid, text) TO authenticated, service_role;

-- 3) Rotate system push secret: insert a dedicated random token, remove service role key from DB
INSERT INTO public.internal_secrets(key, value, updated_at)
VALUES ('system_push_token', encode(gen_random_bytes(32), 'hex'), now())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

DELETE FROM public.internal_secrets WHERE key = 'service_role_key';

-- Update notify_system_push to send the dedicated token in the request body
CREATE OR REPLACE FUNCTION public.notify_system_push(_user_ids uuid[], _title text, _body text, _deep_link text DEFAULT '/premium'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_token text;
BEGIN
  SELECT (value #>> '{}') INTO v_url FROM public.app_settings WHERE key = 'edge_send_system_push_url';
  SELECT value INTO v_token FROM public.internal_secrets WHERE key = 'system_push_token';

  IF v_url IS NULL OR v_token IS NULL THEN
    RAISE NOTICE 'notify_system_push: URL or token not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_ids', to_jsonb(_user_ids),
      'title', _title,
      'body', _body,
      'deep_link', _deep_link,
      'system_token', v_token
    )
  );
END;
$function$;

-- Re-revoke after recreate
REVOKE EXECUTE ON FUNCTION public.notify_system_push(uuid[], text, text, text) FROM anon, authenticated, PUBLIC;

-- 4) Welcome-email throttle table
CREATE TABLE IF NOT EXISTS public.welcome_email_sends (
  email text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  send_count integer NOT NULL DEFAULT 1
);
GRANT ALL ON public.welcome_email_sends TO service_role;
ALTER TABLE public.welcome_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny client access to welcome_email_sends"
ON public.welcome_email_sends
AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);