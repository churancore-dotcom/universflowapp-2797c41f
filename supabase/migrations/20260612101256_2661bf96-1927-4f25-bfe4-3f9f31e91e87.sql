DROP POLICY IF EXISTS "Clients can read non-sensitive app settings" ON public.app_settings;

CREATE POLICY "Clients can read public app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY[
  'premium_price_quarterly_inr',
  'premium_price_bimonthly_inr',
  'premium_price_monthly_inr',
  'premium_price_inr',
  'premium_enabled',
  'feature_downloads',
  'feature_comments',
  'feature_social_sharing',
  'feature_lyrics',
  'feature_dedications',
  'feature_reactions',
  'ads_enabled',
  'ads_frequency',
  'accent_color',
  'primary_color',
  'max_upload_size_mb',
  'new_user_welcome_message',
  'app_name',
  'app_tagline',
  'maintenance_mode',
  'maintenance_message'
]::text[]));