
-- Tighten INSERT policy: applicant can only create rows with status='pending'
DROP POLICY IF EXISTS "artist_apps own insert" ON public.artist_applications;
CREATE POLICY "artist_apps own insert"
ON public.artist_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Tighten UPDATE policy: applicant can only keep status='pending' on updates
DROP POLICY IF EXISTS "artist_apps own update" ON public.artist_applications;
CREATE POLICY "artist_apps own update"
ON public.artist_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Insert guard: silently force status='pending' and clear reviewer fields for non-admins
CREATE OR REPLACE FUNCTION public.prevent_artist_application_privileged_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_jwt_role text;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role','postgres','supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status      := 'pending';
  NEW.admin_note  := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_artist_application_privileged_insert ON public.artist_applications;
CREATE TRIGGER trg_prevent_artist_application_privileged_insert
BEFORE INSERT ON public.artist_applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_artist_application_privileged_insert();

-- Make sure the existing BEFORE UPDATE guard is attached
DROP TRIGGER IF EXISTS trg_prevent_artist_application_privileged_change ON public.artist_applications;
CREATE TRIGGER trg_prevent_artist_application_privileged_change
BEFORE UPDATE ON public.artist_applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_artist_application_privileged_change();
