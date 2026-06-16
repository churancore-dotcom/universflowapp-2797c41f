INSERT INTO public.app_settings (key, value, description) VALUES
  ('upi_id', '"shashankyadav12367@okhdfcbank"'::jsonb, 'UPI VPA where premium payments are sent'),
  ('upi_payee_name', '"Universflow"'::jsonb, 'Name shown on the UPI app')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_review_payment_request(p_request_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.payment_requests%ROWTYPE;
  v_expires timestamptz;
  v_type public.subscription_type;
  v_base timestamptz;
  v_label text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;

  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment request not found'; END IF;

  PERFORM set_config('request.skip_payment_grant', '1', true);

  UPDATE public.payment_requests
  SET status = p_status, reviewed_at = COALESCE(reviewed_at, now()), updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  IF p_status = 'approved' THEN
    SELECT GREATEST(now(), COALESCE(us.expires_at, now()))
      INTO v_base FROM public.user_subscriptions us WHERE us.user_id = v_req.user_id LIMIT 1;
    v_base := COALESCE(v_base, now());

    IF v_req.plan = 'lifetime' THEN
      v_expires := '2099-12-31 23:59:59+00'::timestamptz;
      v_type := 'premium_yearly'::public.subscription_type;
      v_label := 'Lifetime';
    ELSIF v_req.plan = 'quarterly' THEN
      v_expires := v_base + interval '90 days';
      v_type := 'premium_yearly'::public.subscription_type;
      v_label := '3 months';
    ELSIF v_req.plan = 'bimonthly' THEN
      v_expires := v_base + interval '60 days';
      v_type := 'premium_monthly'::public.subscription_type;
      v_label := '2 months';
    ELSE
      v_expires := v_base + interval '30 days';
      v_type := 'premium_monthly'::public.subscription_type;
      v_label := '1 month';
    END IF;

    INSERT INTO public.user_subscriptions (user_id, subscription_type, status, expires_at, platform)
    VALUES (v_req.user_id, v_type, 'active', v_expires, 'web')
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_type = EXCLUDED.subscription_type,
      status = 'active',
      expires_at = GREATEST(public.user_subscriptions.expires_at, EXCLUDED.expires_at),
      platform = 'web',
      updated_at = now();

    BEGIN
      PERFORM public.notify_system_push(
        ARRAY[v_req.user_id]::uuid[],
        'Premium unlocked',
        'Your ' || v_label || ' plan is active. Enjoy ad-free music, downloads & studio audio.',
        '/premium'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'notify_system_push (approved) failed: %', SQLERRM;
    END;
  ELSE
    BEGIN
      PERFORM public.notify_system_push(
        ARRAY[v_req.user_id]::uuid[],
        'Payment could not be verified',
        'We could not verify your UPI transaction. Reopen Premium to retry or contact support.',
        '/premium'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'notify_system_push (rejected) failed: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_status, 'user_id', v_req.user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_premium_activated_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active'
     AND NEW.subscription_type IS DISTINCT FROM 'free'
     AND (TG_OP = 'INSERT'
          OR OLD.status IS DISTINCT FROM 'active'
          OR OLD.subscription_type IS DISTINCT FROM NEW.subscription_type)
  THEN
    BEGIN
      PERFORM public.notify_system_push(
        ARRAY[NEW.user_id]::uuid[],
        'Premium active',
        'You are Premium now — ad-free music, offline downloads & studio audio.',
        '/premium'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'on_premium_activated_push failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.on_premium_activated_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.on_premium_activated_push() TO service_role;

DROP TRIGGER IF EXISTS trg_premium_activated_push ON public.user_subscriptions;
CREATE TRIGGER trg_premium_activated_push
  AFTER INSERT OR UPDATE OF status, subscription_type ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.on_premium_activated_push();