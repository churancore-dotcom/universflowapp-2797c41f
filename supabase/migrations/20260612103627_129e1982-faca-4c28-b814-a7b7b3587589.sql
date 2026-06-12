CREATE OR REPLACE FUNCTION public.prevent_email_verified_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role (used by the verification edge function) to flip the
  -- email_verified flag. Block every other path so clients cannot mark
  -- themselves verified.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.email_verified IS DISTINCT FROM OLD.email_verified
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at THEN
    NEW.email_verified := OLD.email_verified;
    NEW.email_verified_at := OLD.email_verified_at;
  END IF;
  RETURN NEW;
END;
$function$;