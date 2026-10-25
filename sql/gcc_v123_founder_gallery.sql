-- V12.3: opt-in Founder display and automatic volunteer gallery after guided signup.
-- Adds no administrative privileges and changes no event, room or student data.
BEGIN;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS gcc_founder boolean NOT NULL DEFAULT false;

DO $check$
DECLARE matches integer;
BEGIN
 SELECT count(*) INTO matches FROM public.teachers t
 JOIN public.profiles p ON p.id=t.auth_user_id
 JOIN public.schools s ON s.id=t.school_id
 WHERE p.role='host' AND t.is_active AND s.is_active
   AND s.country_code='JP' AND lower(t.display_name)='kohei nakashima'
   AND t.photo_path IS NOT NULL;
 IF matches<>1 THEN RAISE EXCEPTION 'Expected exactly one verified founder; found %',matches; END IF;
END $check$;
-- The founder explicitly requested public display to approved teachers.
-- Crucially: only the *activated* photo-bearing host account gets the flag.
UPDATE public.teachers t SET gcc_founder=true,directory_visible=true,updated_at=now()
FROM public.profiles p,public.schools s
WHERE p.id=t.auth_user_id AND s.id=t.school_id AND p.role='host'
  AND t.is_active AND s.is_active AND s.country_code='JP'
  AND lower(t.display_name)='kohei nakashima' AND t.photo_path IS NOT NULL;

-- Keep the original RPC route to preserve existing clients.
CREATE OR REPLACE FUNCTION public.gcc_v122_volunteer_gallery()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE people jsonb;
BEGIN
  -- Required: anonymous and pending accounts cannot browse this directory.
  PERFORM public.gcc_current_teacher_id();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name',t.display_name,'title',t.job_title,'bio',t.bio,'photo_path',t.photo_path,
    'school',s.name,'city',s.city,'country',s.country_name,'country_code',s.country_code,
    'school_level',s.school_level,'founder',t.gcc_founder,
    'facilitator',t.volunteer_facilitator,'gc_host',t.volunteer_host,
    'website',t.website_url,'instagram',t.instagram_url,'facebook',t.facebook_url
  ) ORDER BY t.gcc_founder DESC,s.country_name,t.display_name),'[]'::jsonb)
  INTO people FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
  WHERE t.is_active IS TRUE AND s.is_active IS TRUE AND t.directory_visible IS TRUE
    AND NULLIF(btrim(t.photo_path),'') IS NOT NULL
    AND (t.gcc_founder IS TRUE OR t.volunteer_facilitator IS TRUE OR t.volunteer_host IS TRUE);
  RETURN people;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v122_volunteer_gallery() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v122_volunteer_gallery() TO authenticated;
COMMIT;
