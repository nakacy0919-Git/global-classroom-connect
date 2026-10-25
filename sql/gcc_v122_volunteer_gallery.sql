-- GCC V12.2: private, opt-in, approved teacher facilitator gallery.
-- Already applied safely via Supabase migration tool on 2026-10-25.
-- The file is included as the canonical deployment record, not to be re-applied.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v122_volunteer_gallery()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE people jsonb;
BEGIN
  PERFORM public.gcc_current_teacher_id();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name',t.display_name,'title',t.job_title,'bio',t.bio,'photo_path',t.photo_path,
    'school',s.name,'city',s.city,'country',s.country_name,'country_code',s.country_code,
    'school_level',s.school_level,'facilitator',t.volunteer_facilitator,'gc_host',t.volunteer_host,
    'website',t.website_url,'instagram',t.instagram_url,'facebook',t.facebook_url
  ) ORDER BY s.country_name,t.display_name),'[]'::jsonb)
  INTO people FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
  WHERE t.is_active IS TRUE AND s.is_active IS TRUE AND t.directory_visible IS TRUE
    AND NULLIF(btrim(t.photo_path),'') IS NOT NULL
    AND (t.volunteer_facilitator IS TRUE OR t.volunteer_host IS TRUE);
  RETURN people;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v122_volunteer_gallery() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v122_volunteer_gallery() TO authenticated;
COMMIT;
