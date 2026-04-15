
-- 1. Fix donations INSERT: require user_id matches auth.uid() or is NULL
DROP POLICY IF EXISTS "Authenticated users can insert donations" ON public.donations;
CREATE POLICY "Authenticated users can insert donations"
  ON public.donations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- 2. Fix promo_codes: remove broad SELECT that leaks all active codes
DROP POLICY IF EXISTS "Authenticated users can validate promo codes" ON public.promo_codes;

-- 3. Fix user_subscriptions: prevent self-upgrade by removing user UPDATE policy
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- 4. Fix storage policies: replace profiles.is_admin with has_role()
DROP POLICY IF EXISTS "Admins can upload music" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update music" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete music" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete covers" ON storage.objects;

CREATE POLICY "Admins can upload music" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'music' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update music" ON storage.objects FOR UPDATE
  USING (bucket_id = 'music' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete music" ON storage.objects FOR DELETE
  USING (bucket_id = 'music' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload covers" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update covers" ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete covers" ON storage.objects FOR DELETE
  USING (bucket_id = 'covers' AND has_role(auth.uid(), 'admin'::app_role));

-- 5. Fix premium songs: hide audio_url for premium songs from non-subscribers
-- We need a helper function first
CREATE OR REPLACE FUNCTION public.has_premium_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND subscription_type IN ('premium_monthly', 'premium_yearly')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
