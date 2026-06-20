
-- Revoke any prior column grants on artist_applications from public roles, then
-- re-grant SELECT on every column EXCEPT admin_note. The SECURITY DEFINER
-- helpers (get_my_artist_application_note / admin_get_artist_application_note)
-- continue to work because they run as the function owner.

REVOKE SELECT ON public.artist_applications FROM anon, authenticated;

GRANT SELECT (
  id, user_id, stage_name, real_name, phone, country_code, social_links,
  id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path,
  artist_photo_path, status, reviewed_by, reviewed_at, created_at, updated_at
) ON public.artist_applications TO authenticated;

-- admin_note intentionally NOT granted to anon/authenticated.
GRANT ALL ON public.artist_applications TO service_role;
