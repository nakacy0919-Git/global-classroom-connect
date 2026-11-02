-- GCC V20.3: structured session planning shared between host events and teacher offers.
BEGIN;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS session_details jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('gcc-session-flyers','gcc-session-flyers',true,3145728,
 ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
DROP POLICY IF EXISTS gcc203_flyer_upload ON storage.objects;
CREATE POLICY gcc203_flyer_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='gcc-session-flyers' AND (storage.foldername(name))[1]=auth.uid()::text);

CREATE OR REPLACE FUNCTION public.gcc_v203_validate_plan(p jsonb,p_start timestamptz,p_end timestamptz,p_zone text)
RETURNS void LANGUAGE plpgsql SET search_path TO '' AS $fn$
DECLARE
 flow jsonb; row jsonb; last_time time; this_time time; began time;
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
 began := (p_start AT TIME ZONE p_zone)::time;
 FOR row IN SELECT value FROM jsonb_array_elements(flow) LOOP
  IF coalesce(row->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    OR char_length(btrim(coalesce(row->>'activity',''))) NOT BETWEEN 5 AND 250 THEN
    RAISE EXCEPTION 'Each timetable stage requires HH:MM and a 5–250 character activity';
  END IF;
  this_time := (row->>'time')::time;
  IF last_time IS NULL AND this_time<>left(began::text,5)::time THEN
    RAISE EXCEPTION 'First agenda step must start when the session begins';
  END IF;
  IF last_time IS NOT NULL AND this_time<=last_time THEN RAISE EXCEPTION 'Agenda times must increase';END IF;
  IF this_time<(p_start AT TIME ZONE p_zone)::time
   OR this_time>=(p_end AT TIME ZONE p_zone)::time THEN
   RAISE EXCEPTION 'Agenda activities must fit inside session time';
  END IF;
  last_time:=this_time;
 END LOOP;
 IF (p_end AT TIME ZONE p_zone)::time-last_time>interval '25 minutes' THEN
  RAISE EXCEPTION 'Include a closing activity within 25 minutes of the session end';
 END IF;
END $fn$;

-- Publishing is enforced in PostgreSQL as well as in the UI.
-- Existing published November sessions remain valid even without a newly supplied agenda.
CREATE OR REPLACE FUNCTION public.gcc_v203_require_published_event_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 IF NEW.status='published' AND
   (TG_OP='INSERT' OR coalesce(to_jsonb(OLD)->>'status','')<>'published') THEN
   PERFORM public.gcc_v203_validate_plan(NEW.session_details,NEW.starts_at,NEW.ends_at,NEW.timezone);
 END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v203_require_published_plan ON public.events;
CREATE TRIGGER gcc_v203_require_published_plan
 BEFORE INSERT OR UPDATE OF status ON public.events
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_require_published_event_plan();

-- Teacher session creation previously inserted first and stored details second.
-- A deferred constraint validates the *final* row at transaction commit.
CREATE OR REPLACE FUNCTION public.gcc_v203_require_open_offer_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE d jsonb; begins timestamptz; finish timestamptz; zone text; state text;
BEGIN
 SELECT session_details,starts_at,ends_at,timezone,status
 INTO d,begins,finish,zone,state FROM public.exchange_availability WHERE id=NEW.id;
 IF state='open' THEN
   PERFORM public.gcc_v203_validate_plan(d,begins,finish,zone);
 END IF;
 RETURN NULL;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v203_require_open_offer_plan ON public.exchange_availability;
CREATE CONSTRAINT TRIGGER gcc_v203_require_open_offer_plan
 AFTER INSERT OR UPDATE OF status ON public.exchange_availability
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_require_open_offer_plan();

CREATE OR REPLACE FUNCTION public.gcc_v203_save_event_plan(p_event_id uuid,p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE e record;
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT id,starts_at,ends_at,timezone INTO e FROM public.events WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session not found';END IF;
 PERFORM public.gcc_v203_validate_plan(p_plan,e.starts_at,e.ends_at,e.timezone);
 UPDATE public.events SET session_details=p_plan WHERE id=e.id;
 RETURN jsonb_build_object('ok',true,'event_id',e.id);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v203_teacher_register_session(
 p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_student_count integer,
 p_room_count integer,p_age_band text,p_topic text,p_notes text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE offer uuid; basic jsonb;
BEGIN
 PERFORM public.gcc_v203_validate_plan(p_details,p_starts_at,p_ends_at,p_timezone);
 IF coalesce(p_details->>'session_name','')='' THEN RAISE EXCEPTION 'Session title is required';END IF;
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

CREATE OR REPLACE FUNCTION public.gcc_v6_public_sessions()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]'::jsonb)
 FROM (SELECT id,title,starts_at,ends_at,timezone,status,
   (session_details - 'meeting_url') AS session_details
   FROM public.events
   WHERE status='published' AND starts_at>now()
    AND (session_details->>'registration_closes_at' IS NULL
      OR (session_details->>'registration_closes_at')::timestamptz>now())
   ORDER BY starts_at LIMIT 50) x;
$fn$;

CREATE OR REPLACE FUNCTION public.gcc_v168_public_session_overviews()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
 'id',e.id,'title',e.title,'starts_at',e.starts_at,'ends_at',e.ends_at,
 'timezone',e.timezone,'status',e.status,'session_details',e.session_details,
 'students',coalesce(st.student_count,0),'schools',coalesce(sc.school_count,0),
 'countries',coalesce(sc.countries,'[]'::jsonb)) ORDER BY e.starts_at),'[]'::jsonb)
 FROM (SELECT id,title,starts_at,ends_at,timezone,status,
    (session_details - 'meeting_url') AS session_details
    FROM public.events WHERE status='published' AND starts_at>now()
    AND (session_details->>'registration_closes_at' IS NULL
      OR (session_details->>'registration_closes_at')::timestamptz>now())
    ORDER BY starts_at LIMIT 50) e
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

CREATE OR REPLACE FUNCTION public.gcc_teacher_browse_sessions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();items jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]'::jsonb) INTO items
 FROM (SELECT a.id,a.teacher_id,t.display_name as teacher_name,s.name as school_name,
 s.country_name,s.country_code,a.starts_at,a.ends_at,a.timezone,a.student_count,
 a.room_count,a.age_band,a.topic,a.status,
 (a.session_details - 'meeting_url') AS session_details,(a.teacher_id=tid) as is_mine
 FROM public.exchange_availability a
 JOIN public.teachers t ON t.id=a.teacher_id and t.is_active=true
 JOIN public.schools s ON s.id=t.school_id
 WHERE a.ends_at>now() AND (a.teacher_id=tid OR (a.status='open'
  AND (a.session_details->>'registration_closes_at' IS NULL
    OR (a.session_details->>'registration_closes_at')::timestamptz>now())))
 ORDER BY a.starts_at ASC LIMIT 300) x;
 RETURN items;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v112_open_room_chart(p_token text,p_access_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_chart jsonb;v_start timestamptz;v_end timestamptz;v_zone text;v_details jsonb;
BEGIN
 v_chart:=public.gcc_v104_open_room_chart(p_token,p_access_code);
 IF v_chart IS NULL THEN RETURN NULL; END IF;
 SELECT e.starts_at,e.ends_at,e.timezone,e.session_details INTO v_start,v_end,v_zone,v_details
 FROM public.gcc_v102_shared_plans p JOIN public.events e ON e.id=p.event_id
 WHERE p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND p.is_active=true;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN v_chart||jsonb_build_object('starts_at',v_start,'ends_at',v_end,
 'timezone',coalesce(v_zone,'Asia/Tokyo'),'session_details',v_details);
END $fn$;

-- No new student registrations after the host's specified deadline.
CREATE OR REPLACE FUNCTION public.gcc_v203_enforce_event_deadline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE d jsonb; begins timestamptz;
BEGIN
 SELECT session_details,starts_at INTO d,begins FROM public.events WHERE id=NEW.event_id;
 IF (d->>'registration_closes_at') IS NOT NULL AND
    ((d->>'registration_closes_at')::timestamptz<=now() OR begins<=now()) THEN
  RAISE EXCEPTION 'Registration is closed for this session';
 END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v203_event_deadline ON public.gcc_session_signups;
CREATE TRIGGER gcc_v203_event_deadline BEFORE INSERT ON public.gcc_session_signups
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_enforce_event_deadline();

-- Teacher-to-teacher applications use the same cutoff principle.
CREATE OR REPLACE FUNCTION public.gcc_v203_enforce_offer_deadline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE d jsonb; begins timestamptz;
BEGIN
 SELECT session_details,starts_at INTO d,begins FROM public.exchange_availability WHERE id=NEW.offer_id;
 IF (d->>'registration_closes_at') IS NOT NULL AND
    ((d->>'registration_closes_at')::timestamptz<=now() OR begins<=now()) THEN
  RAISE EXCEPTION 'This session is no longer accepting join requests';
 END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v203_offer_deadline ON public.session_join_requests;
CREATE TRIGGER gcc_v203_offer_deadline BEFORE INSERT ON public.session_join_requests
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_enforce_offer_deadline();

REVOKE ALL ON FUNCTION public.gcc_v203_save_event_plan(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v203_save_event_plan(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.gcc_v203_teacher_register_session(timestamptz,timestamptz,text,integer,integer,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v203_teacher_register_session(timestamptz,timestamptz,text,integer,integer,text,text,text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.gcc_v203_validate_plan(jsonb,timestamptz,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v203_validate_plan(jsonb,timestamptz,timestamptz,text) TO authenticated;
COMMIT;