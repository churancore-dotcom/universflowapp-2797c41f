CREATE OR REPLACE FUNCTION public.register_device_token(
  _token text,
  _platform text DEFAULT 'android',
  _device_info jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(BTRIM(_token), '') = '' THEN
    RAISE EXCEPTION 'Device token required';
  END IF;

  INSERT INTO public.device_tokens (user_id, token, platform, device_info)
  VALUES (
    _uid,
    BTRIM(_token),
    COALESCE(NULLIF(BTRIM(_platform), ''), 'android'),
    COALESCE(_device_info, '{}'::jsonb) || jsonb_build_object('last_seen_at', now())
  )
  ON CONFLICT (token) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    device_info = COALESCE(public.device_tokens.device_info, '{}'::jsonb) || EXCLUDED.device_info,
    updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_device_token(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Admins view all device tokens" ON public.device_tokens;
CREATE POLICY "Admins view all device tokens"
  ON public.device_tokens
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete device tokens"
  ON public.device_tokens
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));