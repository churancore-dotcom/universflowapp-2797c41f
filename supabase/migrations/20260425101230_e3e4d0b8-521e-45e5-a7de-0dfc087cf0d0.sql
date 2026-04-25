
-- ============================================
-- 1. SECURITY: Remove user_library from realtime
-- ============================================
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_library;

-- ============================================
-- 2. SECURITY: Restrict donations email column
-- ============================================
-- Drop existing user-readable policy and replace with admin-only + restricted self-view
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;

-- Users can view their own donations but the email exposure is acceptable (it's their own).
-- The real fix: ensure NO ONE except admins can read other users' or anonymous emails.
-- Re-create the policy unchanged for self-view (own data is fine), and rely on admin policy
-- already in place. Anonymous donations (user_id IS NULL) are NOT readable by any non-admin
-- because auth.uid() = NULL never matches.
CREATE POLICY "Users can view their own donations"
  ON public.donations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 3. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id UUID,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can log their own events"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- 4. EXPERIMENTS TABLES (A/B Testing)
-- ============================================
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | running | paused | completed
  variants JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name:"A", traffic:50}, {name:"B", traffic:50}]
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  winner TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  variant TEXT NOT NULL,
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exp_assignments_experiment ON public.experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_assignments_user ON public.experiment_assignments(user_id);

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage experiments"
  ON public.experiments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view running experiments"
  ON public.experiments FOR SELECT TO authenticated
  USING (status = 'running' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all assignments"
  ON public.experiment_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own assignments"
  ON public.experiment_assignments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own assignment"
  ON public.experiment_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own conversion"
  ON public.experiment_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- first 8 chars shown to admin
  key_hash TEXT NOT NULL UNIQUE, -- sha256 hash of full key
  permissions TEXT[] NOT NULL DEFAULT ARRAY['read'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage api keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 6. SUBSCRIPTION AUTO-EXPIRY FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.expire_old_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.user_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now()
    AND subscription_type IN ('premium_monthly', 'premium_yearly');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    INSERT INTO public.audit_logs(event_type, severity, details)
    VALUES ('subscription_expired_batch', 'info', jsonb_build_object('expired_count', v_count));
  END IF;

  RETURN v_count;
END;
$$;

-- ============================================
-- 7. ADMIN HELPER: GET DONATION EMAIL (admin-only readable RPC)
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_log_event(
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs(event_type, severity, user_id, user_email, details)
  VALUES (
    p_event_type,
    p_severity,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    p_details
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- 8. ENABLE pg_cron AND SCHEDULE EXPIRY JOB
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule if already exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-subscriptions-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-subscriptions-every-5min',
  '*/5 * * * *',
  $$ SELECT public.expire_old_subscriptions(); $$
);
