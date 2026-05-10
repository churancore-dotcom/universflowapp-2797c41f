
-- Better activation message (warmer, branded)
CREATE OR REPLACE FUNCTION public.on_premium_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_was_premium boolean := false;
  v_is_premium  boolean;
BEGIN
  v_is_premium := NEW.status = 'active'
    AND NEW.subscription_type IN ('premium_monthly','premium_yearly')
    AND (NEW.expires_at IS NULL OR NEW.expires_at > now());

  IF TG_OP = 'UPDATE' THEN
    v_was_premium := OLD.status = 'active'
      AND OLD.subscription_type IN ('premium_monthly','premium_yearly')
      AND (OLD.expires_at IS NULL OR OLD.expires_at > now());
  END IF;

  IF v_is_premium AND (NOT v_was_premium OR NEW.expires_at IS DISTINCT FROM OLD.expires_at) THEN
    IF NEW.notif_activated_at IS NULL
       OR NEW.notif_activated_at < now() - interval '5 minutes' THEN
      PERFORM public.notify_system_push(
        ARRAY[NEW.user_id],
        '👑 Premium unlocked',
        'Welcome to Universflow Premium. Unlimited downloads, zero ads, studio-grade audio — your music, elevated.',
        '/premium'
      );
      NEW.notif_activated_at := now();
      NEW.notif_warn_3d_at := NULL;
      NEW.notif_warn_1d_at := NULL;
      NEW.notif_expired_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger (was missing!)
DROP TRIGGER IF EXISTS trg_premium_activated ON public.user_subscriptions;
CREATE TRIGGER trg_premium_activated
  BEFORE INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.on_premium_activated();

-- Better expiry messages
CREATE OR REPLACE FUNCTION public.process_premium_expiry_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_warn3 int := 0;
  v_warn1 int := 0;
  v_exp int := 0;
BEGIN
  -- 3-day warning
  FOR r IN
    SELECT user_id, expires_at
    FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL
      AND expires_at > now() + interval '1 day'
      AND expires_at <= now() + interval '3 days'
      AND notif_warn_3d_at IS NULL
  LOOP
    PERFORM public.notify_system_push(
      ARRAY[r.user_id],
      '⏳ 3 days of Premium left',
      'Your Premium ends ' || to_char(r.expires_at, 'Mon DD') || '. Renew now and keep downloads, ad-free listening and studio-grade audio rolling.',
      '/premium'
    );
    UPDATE public.user_subscriptions SET notif_warn_3d_at = now() WHERE user_id = r.user_id;
    v_warn3 := v_warn3 + 1;
  END LOOP;

  -- 1-day warning
  FOR r IN
    SELECT user_id, expires_at
    FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL
      AND expires_at > now()
      AND expires_at <= now() + interval '1 day'
      AND notif_warn_1d_at IS NULL
  LOOP
    PERFORM public.notify_system_push(
      ARRAY[r.user_id],
      '⚠️ Premium expires tomorrow',
      'Last day of Premium. Tap to renew in seconds and never lose your favourites, downloads or crystal-clear audio.',
      '/premium'
    );
    UPDATE public.user_subscriptions SET notif_warn_1d_at = now() WHERE user_id = r.user_id;
    v_warn1 := v_warn1 + 1;
  END LOOP;

  -- Expired: downgrade AND notify in the same moment
  FOR r IN
    SELECT user_id, expires_at
    FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL
      AND expires_at < now()
      AND notif_expired_at IS NULL
  LOOP
    UPDATE public.user_subscriptions
       SET status = 'expired',
           notif_expired_at = now(),
           updated_at = now()
     WHERE user_id = r.user_id;

    PERFORM public.notify_system_push(
      ARRAY[r.user_id],
      'Your Premium has ended',
      'Thanks for being Premium. Renew anytime to bring back zero ads, unlimited downloads and studio-grade audio.',
      '/premium'
    );
    v_exp := v_exp + 1;
  END LOOP;

  RETURN jsonb_build_object('warn_3d', v_warn3, 'warn_1d', v_warn1, 'expired', v_exp);
END;
$$;

-- Helpful index for verification cleanup
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at
  ON public.email_verifications(expires_at);
