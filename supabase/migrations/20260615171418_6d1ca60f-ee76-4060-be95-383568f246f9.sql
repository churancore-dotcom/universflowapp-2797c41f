REVOKE EXECUTE ON FUNCTION public.on_premium_expired_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.on_premium_expired_push() TO service_role;