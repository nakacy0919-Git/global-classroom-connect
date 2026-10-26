-- GCC V13.4 additive: host-only registration lifecycle overview, no account mutation.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v134_signup_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE result jsonb;
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'email',u.email,
  'created_at',u.created_at,
  'email_confirmed',u.email_confirmed_at IS NOT NULL,
  'name',coalesce(a.teacher_name,t.display_name,''),
  'school',coalesce(a.school_name,s.name,''),
  'status',CASE
   WHEN a.status IN ('approved','rejected','pending') THEN a.status
   WHEN t.id IS NOT NULL THEN 'approved'
   WHEN u.email_confirmed_at IS NULL THEN 'email_unconfirmed'
   ELSE 'profile_incomplete'
  END
 ) ORDER BY u.created_at DESC),'[]'::jsonb) INTO result
 FROM (SELECT id,email,created_at,email_confirmed_at FROM auth.users ORDER BY created_at DESC LIMIT 200) u
 LEFT JOIN public.gcc_v120_applications a ON a.user_id=u.id
 LEFT JOIN LATERAL (
  SELECT id,display_name,school_id FROM public.teachers
  WHERE auth_user_id=u.id AND is_active IS TRUE LIMIT 1
 ) t ON TRUE
 LEFT JOIN public.schools s ON s.id=t.school_id;
 RETURN result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v134_signup_overview() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v134_signup_overview() TO authenticated;
COMMIT;
