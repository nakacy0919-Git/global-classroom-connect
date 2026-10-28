-- GCC V16.8: public, privacy-preserving aggregate overview for published upcoming sessions.
-- No student, teacher, school, email, registration IDs, room charts or access codes are exposed.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v168_public_session_overviews()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',e.id,'title',e.title,'starts_at',e.starts_at,'ends_at',e.ends_at,
  'timezone',e.timezone,'status',e.status,
  'students',coalesce(st.student_count,0),
  'schools',coalesce(sc.school_count,0),
  'countries',coalesce(sc.countries,'[]'::jsonb)
 ) ORDER BY e.starts_at),'[]'::jsonb)
 FROM (SELECT id,title,starts_at,ends_at,timezone,status FROM public.events
       WHERE status='published' AND starts_at>now()
       ORDER BY starts_at LIMIT 50) e
 LEFT JOIN LATERAL (
  SELECT count(*)::integer AS school_count,
         coalesce(jsonb_agg(DISTINCT nullif(btrim(s.country_name),''))
           FILTER(WHERE nullif(btrim(s.country_name),'') IS NOT NULL),'[]'::jsonb) AS countries
  FROM public.gcc_session_signups s WHERE s.event_id=e.id AND s.status='approved'
 ) sc ON true
 LEFT JOIN LATERAL (
  SELECT count(*)::integer AS student_count
  FROM public.gcc_session_signup_students st
  JOIN public.gcc_session_signups s ON s.id=st.signup_id
  WHERE s.event_id=e.id AND s.status='approved'
 ) st ON true;
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v168_public_session_overviews() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v168_public_session_overviews() TO anon,authenticated;
COMMIT;