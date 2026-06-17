
-- ───────── Storage: stop public listing of music/covers ─────────
DROP POLICY IF EXISTS "Anyone can view cover images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view music files"  ON storage.objects;

CREATE POLICY "Admins can list cover images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'covers' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can list music files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'music' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ───────── Revoke EXECUTE on SECURITY DEFINER functions ─────────
-- Trigger / internal-only functions: revoke from anon AND authenticated.
DO $$
DECLARE r record;
DECLARE internal_only text[] := ARRAY[
  'admin_log_event','check_and_increment_rate_limit','expire_old_subscriptions',
  'grant_premium_on_approval','handle_new_user','notify_system_push',
  'on_artist_application_reviewed','on_premium_activated','on_premium_activated_push',
  'on_premium_expired_push','prevent_admin_field_change',
  'prevent_artist_profile_privileged_change','prevent_artist_song_privileged_change',
  'prevent_email_verified_change','prevent_profile_sensitive_change',
  'prevent_status_field_change','process_premium_expiry_notifications',
  'strip_anon_song_event_location','support_message_after_insert',
  'touch_viral_chart_refreshes'
];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(internal_only)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- User-callable RPCs: revoke from anon, keep authenticated.
DO $$
DECLARE r record;
DECLARE auth_only text[] := ARRAY[
  'admin_review_payment_request','consume_free_skip','find_profile_by_share_code',
  'get_friend_profile','get_user_count','get_viral_song_events','has_premium_subscription',
  'has_role','is_premium_user','is_session_host','is_session_member',
  'join_jam_room','join_listening_session','redeem_promo_code','register_device_token'
];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(auth_only)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
