
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.email_verifications (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (edge functions) may access.

-- Backfill: existing users who confirmed via Supabase get auto-marked verified
UPDATE public.profiles p
SET email_verified = true, email_verified_at = COALESCE(email_verified_at, now())
FROM auth.users u
WHERE p.user_id = u.id AND u.email_confirmed_at IS NOT NULL AND p.email_verified = false;
