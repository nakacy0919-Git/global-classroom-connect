-- GCC V10.8. Teacher-specific, school-scoped, automatically generated PINs.
-- No existing student, session, room, publication, shared six-digit code, or audit rows are changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gcc_v108_teacher_codes (
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 signup_id uuid NOT NULL REFERENCES public.gcc_session_signups(id) ON DELETE CASCADE,
 pin_hash text NOT NULL,
 pin_lookup text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 issued_at timestamptz NOT NULL DEFAULT now(),
 issued_by uuid NOT NULL REFERENCES auth.users(id),
 PRIMARY KEY(event_id,signup_id),
 UNIQUE(event_id,pin_lookup)
);
ALTER TABLE public.gcc_v108_teacher_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v108_teacher_codes FROM PUBLIC,anon,authenticated;

-- Returns each freshly generated PIN only once, to the signed-in host.
-- With no signup ID, generates only missing codes for approved registrations.
-- With a signup ID and rotate=true, regenerates that teacher's code.
CREATE OR REPLACE FUNCTION public.gcc_v108_host_generate_codes(
 p_event_id uuid,p_signup_id uuid DEFAULT NULL,p_rotate boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE s record;v_pin text;v_key text;v_try int;v_old text;
 v_new jsonb:='[]'::jsonb;v_created int:=0;
BEGIN
 PERFORM public.gcc_v6_require_host();
 IF NOT EXISTS (SELECT 1 FROM public.events WHERE id=p_event_id) THEN
  RAISE EXCEPTION 'Session not found';END IF;
 IF p_signup_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.gcc_session_signups
   WHERE event_id=p_event_id AND id=p_signup_id AND status='approved') THEN
   RAISE EXCEPTION 'This registration is not approved for the selected session';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text,108));
 FOR s IN SELECT id,teacher_name,school_name FROM public.gcc_session_signups
   WHERE event_id=p_event_id AND status='approved'
   AND (p_signup_id IS NULL OR id=p_signup_id)
   ORDER BY school_name,teacher_name,id
 LOOP
  SELECT pin_lookup INTO v_old FROM public.gcc_v108_teacher_codes
   WHERE event_id=p_event_id AND signup_id=s.id;
  IF FOUND AND (NOT p_rotate OR p_signup_id IS NULL) THEN CONTINUE;END IF;
  v_pin:=NULL;
  FOR v_try IN 1..300 LOOP
   v_pin:=lpad(( (get_byte(extensions.gen_random_bytes(2),0)*256
          +get_byte(extensions.gen_random_bytes(2),0))%10000)::text,4,'0');
   v_key:=encode(sha256(convert_to(p_event_id::text||':'||v_pin,'UTF8')),'hex');
   IF v_key IS DISTINCT FROM v_old AND NOT EXISTS(
     SELECT 1 FROM public.gcc_v108_teacher_codes
     WHERE event_id=p_event_id AND pin_lookup=v_key) THEN EXIT;END IF;
   v_pin:=NULL;
  END LOOP;
  IF v_pin IS NULL THEN RAISE EXCEPTION 'Could not generate a unique teacher code';END IF;
  INSERT INTO public.gcc_v108_teacher_codes(event_id,signup_id,pin_hash,pin_lookup,enabled,issued_by)
    VALUES(p_event_id,s.id,extensions.crypt(v_pin,extensions.gen_salt('bf',10)),v_key,true,auth.uid())
    ON CONFLICT(event_id,signup_id) DO UPDATE SET
      pin_hash=EXCLUDED.pin_hash,pin_lookup=EXCLUDED.pin_lookup,enabled=true,
      issued_at=now(),issued_by=EXCLUDED.issued_by;
  v_created:=v_created+1;
  v_new:=v_new||jsonb_build_array(jsonb_build_object('signup_id',s.id,
    'teacher',s.teacher_name,'school',s.school_name,'code',v_pin));
 END LOOP;
 UPDATE public.gcc_v106_editor_attempts SET failures=0,window_started_at=NULL,locked_until=NULL
 WHERE event_id=p_event_id;
 RETURN jsonb_build_object('ok',true,'generated',v_created,'codes',v_new,
  'note','Save or copy these codes now. For security they cannot be retrieved again.');
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v108_host_status(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 PERFORM public.gcc_v6_require_host();
 IF NOT EXISTS (SELECT 1 FROM public.events WHERE id=p_event_id) THEN
  RAISE EXCEPTION 'Session not found';END IF;
 RETURN jsonb_build_object(
 'registrations',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'signup_id',s.id,'teacher',s.teacher_name,'school',s.school_name,'country',s.country_name,
   'students',(SELECT count(*) FROM public.gcc_session_signup_students st WHERE st.signup_id=s.id),
   'issued',tc.signup_id IS NOT NULL,'enabled',COALESCE(tc.enabled,false),
   'issued_at',tc.issued_at) ORDER BY s.school_name,s.teacher_name),'[]'::jsonb)
   FROM public.gcc_session_signups s LEFT JOIN public.gcc_v108_teacher_codes tc
    ON tc.event_id=p_event_id AND tc.signup_id=s.id
   WHERE s.event_id=p_event_id AND s.status='approved'),
 'logs',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'at',edited_at,'teacher',editor_name,'action',action,'details',details)
   ORDER BY edited_at DESC),'[]'::jsonb) FROM
   (SELECT * FROM public.gcc_v106_room_edit_audit WHERE event_id=p_event_id
     ORDER BY edited_at DESC LIMIT 100) t)
 );
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v108_host_toggle_teacher(
 p_event_id uuid,p_signup_id uuid,p_enabled boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 PERFORM public.gcc_v6_require_host();
 UPDATE public.gcc_v108_teacher_codes SET enabled=p_enabled
 WHERE event_id=p_event_id AND signup_id=p_signup_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Teacher code has not been generated';END IF;
 RETURN jsonb_build_object('ok',true,'enabled',p_enabled);
END $fn$;

-- Internal credential validator; not exposed to the browser.
-- The six-digit access code and the invitation must both still be valid.
CREATE OR REPLACE FUNCTION public.gcc_v108_check_teacher(
 p_token text,p_code text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_event uuid;v_signup uuid;v_teacher text;v_school text;
 v_attempt record;v_chart jsonb;v_failed int;v_lookup text;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR
    p_code IS NULL OR p_code !~ '^[0-9]{6}$' OR p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
  RETURN jsonb_build_object('ok',false,'error','Invalid invitation or code.');END IF;
 SELECT event_id INTO v_event FROM public.gcc_v102_shared_plans
 WHERE token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND is_active;
 IF v_event IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Invitation is unavailable.');END IF;
 INSERT INTO public.gcc_v106_editor_attempts(event_id) VALUES(v_event) ON CONFLICT DO NOTHING;
 SELECT * INTO v_attempt FROM public.gcc_v106_editor_attempts WHERE event_id=v_event FOR UPDATE;
 IF v_attempt.locked_until>now() THEN
  RETURN jsonb_build_object('ok',false,'error','Too many attempts. Teacher Mode is locked for 15 minutes.');END IF;
 v_chart:=public.gcc_v104_open_room_chart(p_token,p_code);
 IF v_chart IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Session link or 6-digit code is invalid.');END IF;
 v_lookup:=encode(sha256(convert_to(v_event::text||':'||p_pin,'UTF8')),'hex');
 SELECT c.signup_id,s.teacher_name,s.school_name INTO v_signup,v_teacher,v_school
 FROM public.gcc_v108_teacher_codes c
 JOIN public.gcc_session_signups s ON s.id=c.signup_id
 WHERE c.event_id=v_event AND c.pin_lookup=v_lookup AND c.enabled
  AND s.status='approved' AND s.event_id=v_event AND
  c.pin_hash=extensions.crypt(p_pin,c.pin_hash);
 IF v_signup IS NULL THEN
  v_failed:=CASE WHEN v_attempt.window_started_at IS NULL OR
    v_attempt.window_started_at<now()-interval '15 minutes' THEN 1 ELSE v_attempt.failures+1 END;
  UPDATE public.gcc_v106_editor_attempts SET failures=v_failed,
    window_started_at=CASE WHEN v_failed=1 THEN now() ELSE window_started_at END,
    locked_until=CASE WHEN v_failed>=5 THEN now()+interval '15 minutes' ELSE NULL END
   WHERE event_id=v_event;
  RETURN jsonb_build_object('ok',false,'error','Invalid or inactive teacher code.');
 END IF;
 UPDATE public.gcc_v106_editor_attempts SET failures=0,window_started_at=NULL,locked_until=NULL
 WHERE event_id=v_event;
 RETURN jsonb_build_object('ok',true,'event_id',v_event,'signup_id',v_signup,
   'teacher',v_teacher,'school',v_school);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v108_open_editor(
 p_token text,p_code text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_draft record;v_members jsonb;v_pairs jsonb;
BEGIN
 v_auth:=public.gcc_v108_check_teacher(p_token,p_code,p_pin);
 IF v_auth->>'ok'<>'true' THEN RETURN v_auth;END IF;
 SELECT revision,draft INTO v_draft FROM public.gcc_v91_room_drafts
  WHERE event_id=(v_auth->>'event_id')::uuid;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',st.id,'name',st.display_name,
   'school',s.school_name,'country',s.country_name,'room',(r.room->>'number')::int)
   ORDER BY (r.room->>'number')::int,st.display_name),'[]'::jsonb) INTO v_members
 FROM jsonb_array_elements(v_draft.draft->'rooms') r(room),
 LATERAL jsonb_array_elements_text(r.room->'students') x(id)
 JOIN public.gcc_session_signup_students st ON st.id::text=x.id
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE s.event_id=(v_auth->>'event_id')::uuid AND s.status='approved'
  AND s.id=(v_auth->>'signup_id')::uuid;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('a',student_a,'b',student_b)),'[]'::jsonb)
 INTO v_pairs FROM public.gcc_v106_locked_pairs p
 JOIN public.gcc_session_signup_students sa ON sa.id=p.student_a
 JOIN public.gcc_session_signup_students sb ON sb.id=p.student_b
 WHERE p.event_id=(v_auth->>'event_id')::uuid
  AND sa.signup_id=(v_auth->>'signup_id')::uuid AND sb.signup_id=sa.signup_id;
 RETURN jsonb_build_object('ok',true,'revision',v_draft.revision,
  'teacher',v_auth->>'teacher','school',v_auth->>'school',
  'students',v_members,'pairs',v_pairs,'room_count',jsonb_array_length(v_draft.draft->'rooms'));
END $fn$;

-- Transactional move/pair only the logged-in teacher's registration rows.
CREATE OR REPLACE FUNCTION public.gcc_v108_edit_room(
 p_token text,p_code text,p_pin text,p_action text,
 p_student_a uuid,p_student_b uuid,p_target_room integer,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_event uuid;v_signup uuid;v_teacher text;v_school text;
 v_plan record;v_room record;v_item text;v_room_a int;v_room_b int;v_target int;
 v_pair_a uuid;v_pair_b uuid;v_partner uuid;v_moved uuid[];
 v_ids jsonb;v_new_rooms jsonb:='[]'::jsonb;v_add jsonb:='[]'::jsonb;
 v_before jsonb;v_affected int;v_first uuid;v_second uuid;
BEGIN
 v_auth:=public.gcc_v108_check_teacher(p_token,p_code,p_pin);
 IF v_auth->>'ok'<>'true' THEN RETURN v_auth;END IF;
 v_event:=(v_auth->>'event_id')::uuid;v_signup:=(v_auth->>'signup_id')::uuid;
 v_teacher:=v_auth->>'teacher';v_school:=v_auth->>'school';
 IF p_action IS NULL OR p_action NOT IN ('pair','unpair','move') OR p_student_a IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','Invalid edit request.');END IF;
 SELECT revision,draft INTO v_plan FROM public.gcc_v91_room_drafts
 WHERE event_id=v_event FOR UPDATE;
 IF v_plan.revision IS DISTINCT FROM p_expected_revision THEN
  RETURN jsonb_build_object('ok',false,'error','The chart changed. Refresh and try again.');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gcc_session_signup_students st
  WHERE st.id=p_student_a AND st.signup_id=v_signup) THEN
  RETURN jsonb_build_object('ok',false,'error','You can edit only your own school registration.');END IF;
 IF p_action IN ('pair','unpair') THEN
  IF p_student_b IS NULL OR p_student_a=p_student_b OR NOT EXISTS(
    SELECT 1 FROM public.gcc_session_signup_students st
    WHERE st.id=p_student_b AND st.signup_id=v_signup) THEN
   RETURN jsonb_build_object('ok',false,'error','Choose two students from your own school.');END IF;
 END IF;
 SELECT (r.room->>'number')::int INTO v_room_a FROM jsonb_array_elements(v_plan.draft->'rooms') r(room),
  LATERAL jsonb_array_elements_text(r.room->'students') x(id) WHERE x.id=p_student_a::text;
 IF v_room_a IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Student is not in this plan.');END IF;
 IF p_action IN ('pair','unpair') THEN
  SELECT (r.room->>'number')::int INTO v_room_b FROM jsonb_array_elements(v_plan.draft->'rooms') r(room),
   LATERAL jsonb_array_elements_text(r.room->'students') x(id) WHERE x.id=p_student_b::text;
  IF v_room_b IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Second student is not in this plan.');END IF;
  v_first:=least(p_student_a,p_student_b);v_second:=greatest(p_student_a,p_student_b);
 END IF;
 IF p_action='unpair' THEN
  DELETE FROM public.gcc_v106_locked_pairs WHERE event_id=v_event
    AND student_a=v_first AND student_b=v_second;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','These students are not a fixed pair.');END IF;
  INSERT INTO public.gcc_v106_room_edit_audit(event_id,editor_id,editor_name,editor_account,action,details)
  VALUES(v_event,NULL,v_teacher,auth.uid(),'unpair',jsonb_build_object('school',v_school,'signup_id',v_signup,
   'a',p_student_a,'b',p_student_b,'room',v_room_a,
   'names',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',display_name))
    FROM public.gcc_session_signup_students WHERE id IN(p_student_a,p_student_b))));
  RETURN jsonb_build_object('ok',true,'revision',v_plan.revision,'message','Pair released.');
 END IF;
 IF p_action='pair' THEN
  IF EXISTS(SELECT 1 FROM public.gcc_v106_locked_pairs WHERE event_id=v_event
   AND (student_a IN(p_student_a,p_student_b) OR student_b IN(p_student_a,p_student_b))) THEN
   RETURN jsonb_build_object('ok',false,'error','One of these students already has a fixed pair.');END IF;
  v_moved:=ARRAY[p_student_b];v_target:=v_room_a;
  INSERT INTO public.gcc_v106_locked_pairs(event_id,student_a,student_b,created_by)
  VALUES(v_event,v_first,v_second,NULL);
 ELSE
  SELECT CASE WHEN student_a=p_student_a THEN student_b ELSE student_a END
   INTO v_partner FROM public.gcc_v106_locked_pairs
   WHERE event_id=v_event AND (student_a=p_student_a OR student_b=p_student_a);
  IF v_partner IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.gcc_session_signup_students st
   WHERE st.id=v_partner AND st.signup_id=v_signup) THEN
    RETURN jsonb_build_object('ok',false,'error','This student belongs to a pair outside your school. Ask the host.');END IF;
  v_moved:=CASE WHEN v_partner IS NULL THEN ARRAY[p_student_a] ELSE ARRAY[p_student_a,v_partner] END;
  v_target:=p_target_room;
  IF v_target IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_plan.draft->'rooms') r(room)
   WHERE (r.room->>'number')::int=v_target) THEN
    RETURN jsonb_build_object('ok',false,'error','Choose a valid destination room.');END IF;
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id',x.id,
  'from',(r.room->>'number')::int,'to',v_target)),'[]'::jsonb)
 INTO v_before FROM jsonb_array_elements(v_plan.draft->'rooms') r(room),
 LATERAL jsonb_array_elements_text(r.room->'students') x(id)
 WHERE x.id=ANY(SELECT unnest(v_moved)::text);
 IF jsonb_array_length(v_before)<>array_length(v_moved,1) THEN
  RAISE EXCEPTION 'Inconsistent saved room data. No changes made.';END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(x.id) ORDER BY r.roomord,x.ord),'[]'::jsonb)
 INTO v_add FROM jsonb_array_elements(v_plan.draft->'rooms') WITH ORDINALITY r(room,roomord),
 LATERAL jsonb_array_elements_text(r.room->'students') WITH ORDINALITY x(id,ord)
 WHERE x.id=ANY(SELECT unnest(v_moved)::text);
 FOR v_room IN SELECT value AS room FROM jsonb_array_elements(v_plan.draft->'rooms') LOOP
  v_ids:='[]'::jsonb;
  FOR v_item IN SELECT value FROM jsonb_array_elements_text(v_room.room->'students') LOOP
   IF NOT(v_item=ANY(SELECT unnest(v_moved)::text)) THEN v_ids:=v_ids||to_jsonb(v_item);END IF;
  END LOOP;
  IF (v_room.room->>'number')::int=v_target THEN v_ids:=v_ids||v_add;END IF;
  v_new_rooms:=v_new_rooms||jsonb_build_array(jsonb_set(v_room.room,'{students}',v_ids));
 END LOOP;
 UPDATE public.gcc_v91_room_drafts SET draft=jsonb_set(v_plan.draft,'{rooms}',v_new_rooms),
  revision=revision+1,updated_at=now() WHERE event_id=v_event;
 UPDATE public.gcc_v102_shared_plans SET revision=revision+1
  WHERE event_id=v_event AND is_active AND revision=v_plan.revision;
 GET DIAGNOSTICS v_affected=ROW_COUNT;
 IF v_affected<>1 THEN RAISE EXCEPTION 'Shared plan version changed. All changes rolled back.';END IF;
 UPDATE public.gcc_v104_shared_access SET revision=revision+1
  WHERE event_id=v_event AND enabled AND revision=v_plan.revision;
 GET DIAGNOSTICS v_affected=ROW_COUNT;
 IF v_affected<>1 THEN RAISE EXCEPTION 'Six-digit access changed. All changes rolled back.';END IF;
 INSERT INTO public.gcc_v106_room_edit_audit(event_id,editor_id,editor_name,editor_account,action,details)
 VALUES(v_event,NULL,v_teacher,auth.uid(),p_action,
  jsonb_build_object('school',v_school,'signup_id',v_signup,
   'a',p_student_a,'b',p_student_b,'before',v_before,'target_room',v_target,
   'names',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',display_name)),'[]'::jsonb)
      FROM public.gcc_session_signup_students WHERE id=ANY(v_moved) OR id=p_student_a)));
 RETURN jsonb_build_object('ok',true,'revision',v_plan.revision+1,
  'message',CASE WHEN p_action='pair' THEN 'Pair saved in the same room.' ELSE 'Room change saved.' END);
END $fn$;

-- Old shared/individual Teacher Mode APIs must not be callable after migration.
REVOKE ALL ON FUNCTION public.gcc_v107_open_editor(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_host_set_shared_pin(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_host_disable_shared_pin(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_host_status(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_open_editor(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v108_check_teacher(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v108_host_generate_codes(uuid,uuid,boolean),
 public.gcc_v108_host_status(uuid),
 public.gcc_v108_host_toggle_teacher(uuid,uuid,boolean),
 public.gcc_v108_open_editor(text,text,text),
 public.gcc_v108_edit_room(text,text,text,text,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v108_host_generate_codes(uuid,uuid,boolean),
 public.gcc_v108_host_status(uuid),public.gcc_v108_host_toggle_teacher(uuid,uuid,boolean)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v108_open_editor(text,text,text),
 public.gcc_v108_edit_room(text,text,text,text,uuid,uuid,integer,integer)
 TO anon,authenticated;
COMMIT;
