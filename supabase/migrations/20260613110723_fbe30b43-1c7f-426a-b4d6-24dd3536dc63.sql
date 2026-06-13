CREATE OR REPLACE FUNCTION public.prevent_email_verified_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_jwt_role text;
BEGIN
  -- Identify privileged callers: service-role JWT (edge functions) OR the
  -- Postgres service_role/postgres login. Older check (`current_user`-only)
  -- silently failed under PostgREST in this project, which made every
  -- verification get reverted — emails arrived, link worked, profile never flipped.
  BEGIN
    v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.email_verified IS DISTINCT FROM OLD.email_verified
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at THEN
    NEW.email_verified := OLD.email_verified;
    NEW.email_verified_at := OLD.email_verified_at;
  END IF;
  RETURN NEW;
END;
$$;

-- Same root cause exists in the broader profile-sensitive trigger; fix it too
-- so email/share_code/is_admin edits from edge functions stop getting reverted.
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_jwt_role text;
BEGIN
  BEGIN
    v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email := OLD.email;
  END IF;
  IF NEW.share_code IS DISTINCT FROM OLD.share_code THEN
    NEW.share_code := OLD.share_code;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: anyone whose token has been "successfully" consumed already
-- (no row in email_verifications) but who got stuck unverified gets flipped now.
UPDATE public.profiles p
SET email_verified = true,
    email_verified_at = COALESCE(email_verified_at, now())
WHERE p.email_verified = false
  AND NOT EXISTS (SELECT 1 FROM public.email_verifications ev WHERE ev.user_id = p.user_id);