-- GCC V20.8: flexible timed agenda, host nationality for verified November listings,
-- explicit maximum total participants, safe timezone handling and search metadata.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v203_validate_plan(p jsonb,p_start timestamptz,p_end timestamptz,p_zone text)
RETURNS void LANGUAGE plpgsql SET search_path TO '' AS $fn$
DECLARE
 flow jsonb; row jsonb; last_time time; this_time time;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' OR octet_length(p::text)>13000 THEN
  RAISE EXCEPTION 'Detailed session plan must be provided (max 13 KB)';
 END IF;
 IF coalesce(p->>'session_type','') NOT IN
 ('cultural_exchange','guided_discussion','structured_debate','conversation_practice','language_exchange',
  'collaborative_project','presentation_qa','global_issues','icebreaking','other')
 OR coalesce(p->>'platform','') NOT IN ('zoom','google_meet','teams','webex','other')
 OR coalesce(p->>'breakout_mode','') NOT IN ('manual','automatic','self_select','none') THEN
  RAISE EXCEPTION 'Choose a valid educational format, platform, and breakout mode';
 END IF;
 IF (coalesce(p->>'preferred_students','')) !~ '^[0-9]{1,4}$' OR (p->>'preferred_students')::int NOT BETWEEN 1 AND 2000
  OR (coalesce(p->>'min_age','')) !~ '^[0-9]{1,2}$' OR (p->>'min_age')::int NOT BETWEEN 5 AND 30
  OR (coalesce(p->>'max_age','')) !~ '^[0-9]{1,2}$' OR (p->>'max_age')::int NOT BETWEEN (p->>'min_age')::int AND 30 THEN
  RAISE EXCEPTION 'Invalid desired participants or acceptable age range';
 END IF;
 IF char_length(btrim(coalesce(p->>'description',''))) NOT BETWEEN 25 AND 1200 THEN
  RAISE EXCEPTION 'Describe the learning objectives and preparation in 25–1200 characters';
 END IF;
 IF char_length(coalesce(p->>'preferred_countries',''))>200 OR char_length(coalesce(p->>'accepted_grades',''))>100
  OR char_length(coalesce(p->>'breakout_notes',''))>600 THEN
  RAISE EXCEPTION 'One or more descriptions exceed their maximum length';
 END IF;
 IF coalesce(p->>'registration_closes_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
    OR (p->>'registration_closes_at')::timestamptz>p_start
    OR (p->>'registration_closes_at')::timestamptz<=now() THEN
  RAISE EXCEPTION 'Registration deadline must be future and no later than session start';
 END IF;
 IF p_start<=now() OR p_end<=p_start THEN RAISE EXCEPTION 'Session must start in the future and have a valid end';END IF;
 IF p->>'meeting_url' IS NOT NULL AND p->>'meeting_url'<>'' AND p->>'meeting_url' !~ '^https://[^/[:space:]]+' THEN
  RAISE EXCEPTION 'Meeting link must use HTTPS';
 END IF;
 IF p->>'flyer_url' IS NOT NULL AND p->>'flyer_url'<>'' AND p->>'flyer_url' !~ '^https://[^/[:space:]]+' THEN
  RAISE EXCEPTION 'Flyer URL must use HTTPS';
 END IF;
 flow:=p->'flow';
 IF coalesce(jsonb_typeof(flow),'')<>'array' THEN RAISE EXCEPTION 'A complete timetable with at least two activities is required'; END IF;
 IF jsonb_array_length(flow) NOT BETWEEN 2 AND 20 THEN
  RAISE EXCEPTION 'A complete timetable with at least two activities is required';
 END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(flow) LOOP
  IF coalesce(row->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    OR char_length(btrim(coalesce(row->>'activity',''))) NOT BETWEEN 2 AND 250 THEN
    RAISE EXCEPTION 'Each agenda stage requires HH:MM and a short activity';
  END IF;
  this_time := (row->>'time')::time;
  IF last_time IS NOT NULL AND this_time<=last_time THEN RAISE EXCEPTION 'Agenda times must increase';END IF;
  IF this_time<(p_start AT TIME ZONE p_zone)::time
   OR this_time>(p_end AT TIME ZONE p_zone)::time THEN
   RAISE EXCEPTION 'Agenda activities must fit inside session time';
  END IF;
  last_time:=this_time;
 END LOOP;
END $fn$;
CREATE OR REPLACE FUNCTION public.gcc_v168_public_session_overviews()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
 'id',e.id,'title',e.title,'starts_at',e.starts_at,'ends_at',e.ends_at,
 'timezone',e.timezone,'status',e.status,'session_details',e.session_details,
 'students',coalesce(st.student_count,0),'schools',coalesce(sc.school_count,0),
 'countries',coalesce(sc.countries,'[]'::jsonb),
 'host_country_code',coalesce(e.session_details->>'host_country_code',''),
 'host_country_name',coalesce(e.session_details->>'host_country_name',''),
 'max_students',coalesce(sets.max_students,0)) ORDER BY e.starts_at),'[]'::jsonb)
 FROM (SELECT id,title,starts_at,ends_at,timezone,status,
    (session_details - 'meeting_url') AS session_details
    FROM public.events WHERE status='published' AND starts_at>now()
    AND (session_details->>'registration_closes_at' IS NULL
      OR (session_details->>'registration_closes_at')::timestamptz>now())
    ORDER BY starts_at LIMIT 50) e
 LEFT JOIN public.gcc_session_settings sets ON sets.event_id=e.id
 LEFT JOIN LATERAL (
   SELECT count(*)::integer AS school_count,
    coalesce(jsonb_agg(DISTINCT nullif(btrim(s.country_name),''))
    FILTER(WHERE nullif(btrim(s.country_name),'') IS NOT NULL),'[]'::jsonb) AS countries
   FROM public.gcc_session_signups s WHERE s.event_id=e.id AND s.status='approved') sc ON true
 LEFT JOIN LATERAL (
   SELECT count(*)::integer AS student_count FROM public.gcc_session_signup_students st
   JOIN public.gcc_session_signups s ON s.id=st.signup_id
   WHERE s.event_id=e.id AND s.status='approved') st ON true;
$fn$;
-- Do not silently pretend an overseas school is on Japan time if its timezone is missing.
CREATE OR REPLACE FUNCTION public.gcc_teacher_identity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); payload jsonb;
BEGIN
 SELECT jsonb_build_object('id',t.id,'name',t.display_name,'school',s.name,
  'country',s.country_name,'country_code',s.country_code,
  'school_level',s.school_level,'timezone',s.timezone)
 INTO payload
 FROM public.teachers t JOIN public.schools s ON s.id=t.school_id WHERE t.id=tid;
 IF payload IS NULL THEN RAISE EXCEPTION 'Please ask the host to link your school'; END IF;
 RETURN payload;
END $fn$;

-- Enforce host + partner aggregate ceiling without changing the existing offer's school-size semantics.
CREATE OR REPLACE FUNCTION public.gcc_v203_teacher_register_session(
 p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_student_count integer,
 p_room_count integer,p_age_band text,p_topic text,p_notes text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE offer uuid; basic jsonb; school_zone text;
BEGIN
 SELECT s.timezone INTO school_zone
 FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 WHERE t.id=public.gcc_current_teacher_id();
 IF school_zone IS NULL THEN RAISE EXCEPTION 'Set your school timezone before publishing'; END IF;
 IF school_zone IS DISTINCT FROM p_timezone THEN RAISE EXCEPTION 'School timezone does not match your profile'; END IF;
 PERFORM public.gcc_v203_validate_plan(p_details,p_starts_at,p_ends_at,p_timezone);
 IF coalesce(p_details->>'session_name','')='' THEN RAISE EXCEPTION 'Session title is required';END IF;
 IF coalesce(p_details->>'max_participants','') !~ '^[0-9]{1,4}$'
    OR (p_details->>'max_participants')::integer<p_student_count
    OR (p_details->>'max_participants')::integer>2000 THEN
  RAISE EXCEPTION 'Total maximum participants must include host-school students';
 END IF;
 basic:=jsonb_build_object(
   'session_name',p_details->>'session_name',
   'mode',p_details->>'mode',
   'target_levels',p_details->'target_levels',
   'sdg',p_details->'sdg',
   'language',p_details->>'language',
   'english_level',p_details->>'english_level',
   'goals',p_details->>'goals');
 offer:=public.gcc_v150_teacher_register_session(p_starts_at,p_ends_at,p_timezone,
   p_student_count,p_room_count,p_age_band,p_topic,p_notes,basic);
 UPDATE public.exchange_availability SET session_details=p_details WHERE id=offer
   AND teacher_id=public.gcc_current_teacher_id();
 IF NOT FOUND THEN RAISE EXCEPTION 'Unable to save complete session plan';END IF;
 RETURN offer;
END $fn$;

-- Only confirmed Showa/Meito host-managed events, not all Asia/Tokyo events.
UPDATE public.events e
SET session_details=coalesce(e.session_details,'{}'::jsonb) ||
 jsonb_build_object('host_country_code','JP','host_country_name','Japan') ||
 CASE WHEN sets.max_students BETWEEN 1 AND 2000
      THEN jsonb_build_object('max_participants',sets.max_students) ELSE '{}'::jsonb END
FROM public.gcc_session_settings sets
WHERE sets.event_id=e.id AND e.id IN ('26d86bc3-bef1-4c86-b2b0-5ff8c340a635'::uuid,'5c046c2f-d81c-4b36-b15b-4cc2d98ec416'::uuid,'1bd8aedc-53b0-4386-a932-0243d428960f'::uuid,'95740170-dc8d-4b67-afa7-afdc8ba890e8'::uuid,'93f67ddb-0b79-4bb5-9618-22850e9116b6'::uuid,'fcd676c4-63c6-41f5-8de2-4c127f841a4c'::uuid,'ce64dad4-adf1-477d-b071-f46831386a52'::uuid)
 AND e.timezone='Asia/Tokyo'
 AND (e.title ILIKE '%Showa%' OR e.title ILIKE '%Meito%')
 AND coalesce(e.session_details->>'host_country_code','')='';

COMMIT;
