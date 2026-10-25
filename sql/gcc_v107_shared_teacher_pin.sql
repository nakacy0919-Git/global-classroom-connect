-- GCC V10.7: one shared four-digit teacher code per session.
-- The teacher chooses a display name AFTER unlock; audit names are self-reported.
-- Does not change current participant assignments, shared 6-digit codes or existing logs.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gcc_v107_shared_teacher_codes (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
 pin_hash text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 set_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gcc_v107_shared_teacher_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_v107_shared_teacher_codes FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v107_host_set_shared_pin(p_event_id uuid,p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 PERFORM public.gcc_v6_require_host();
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id=p_event_id) THEN
  RAISE EXCEPTION 'Session not found'; END IF;
 IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
  RAISE EXCEPTION 'Choose exactly four digits'; END IF;
 INSERT INTO public.gcc_v107_shared_teacher_codes(event_id,pin_hash,enabled,set_by)
 VALUES (p_event_id,extensions.crypt(p_pin,extensions.gen_salt('bf',10)),true,auth.uid())
 ON CONFLICT(event_id) DO UPDATE SET
   pin_hash=EXCLUDED.pin_hash,enabled=true,set_by=EXCLUDED.set_by,updated_at=now();
 UPDATE public.gcc_v106_editor_attempts
 SET failures=0,window_started_at=NULL,locked_until=NULL WHERE event_id=p_event_id;
 RETURN jsonb_build_object('ok',true,'configured',true);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v107_host_disable_shared_pin(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 PERFORM public.gcc_v6_require_host();
 UPDATE public.gcc_v107_shared_teacher_codes SET enabled=false,updated_at=now()
 WHERE event_id=p_event_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'No shared code configured'; END IF;
 RETURN jsonb_build_object('ok',true,'configured',true,'enabled',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v107_host_status(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 PERFORM public.gcc_v6_require_host();
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id=p_event_id) THEN
  RAISE EXCEPTION 'Session not found'; END IF;
 RETURN jsonb_build_object(
  'configured',EXISTS(SELECT 1 FROM public.gcc_v107_shared_teacher_codes WHERE event_id=p_event_id),
  'enabled',EXISTS(SELECT 1 FROM public.gcc_v107_shared_teacher_codes WHERE event_id=p_event_id AND enabled),
  'logs',(SELECT COALESCE(jsonb_agg(jsonb_build_object('at',edited_at,'teacher',editor_name,
    'action',action,'details',details,'account',editor_account,'name_verified',editor_account IS NOT NULL)
    ORDER BY edited_at DESC),'[]'::jsonb) FROM
    (SELECT * FROM public.gcc_v106_room_edit_audit WHERE event_id=p_event_id ORDER BY edited_at DESC LIMIT 100) x)
 );
END $fn$;

-- This checks both the existing invitation + six-digit code AND the shared teacher PIN.
-- PIN failure increments return error JSON (not exceptions) so counts are committed.
CREATE OR REPLACE FUNCTION public.gcc_v107_check_pin(p_token text,p_code text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_event uuid;v_hash text;v_attempt record;v_chart jsonb;v_fail int;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR
    p_code IS NULL OR p_code !~ '^[0-9]{6}$' OR
    p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
   RETURN jsonb_build_object('ok',false,'error','Invalid invitation or teacher code.');
 END IF;
 SELECT event_id INTO v_event FROM public.gcc_v102_shared_plans
 WHERE token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND is_active;
 IF v_event IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Invitation is inactive.');END IF;
 INSERT INTO public.gcc_v106_editor_attempts(event_id) VALUES(v_event) ON CONFLICT DO NOTHING;
 SELECT * INTO v_attempt FROM public.gcc_v106_editor_attempts WHERE event_id=v_event FOR UPDATE;
 IF v_attempt.locked_until>now() THEN
   RETURN jsonb_build_object('ok',false,'error','Teacher Mode is temporarily locked (15 minutes). Ask the host.');
 END IF;
 v_chart:=public.gcc_v104_open_room_chart(p_token,p_code);
 IF v_chart IS NULL THEN
   RETURN jsonb_build_object('ok',false,'error','The session code or invitation is invalid.');
 END IF;
 SELECT pin_hash INTO v_hash FROM public.gcc_v107_shared_teacher_codes
 WHERE event_id=v_event AND enabled;
 IF v_hash IS NULL OR v_hash<>extensions.crypt(p_pin,v_hash) THEN
  v_fail:=CASE WHEN v_attempt.window_started_at IS NULL OR
   v_attempt.window_started_at<now()-interval '15 minutes' THEN 1 ELSE v_attempt.failures+1 END;
  UPDATE public.gcc_v106_editor_attempts SET failures=v_fail,
   window_started_at=CASE WHEN v_fail=1 THEN now() ELSE window_started_at END,
   locked_until=CASE WHEN v_fail>=5 THEN now()+interval '15 minutes' ELSE NULL END
  WHERE event_id=v_event;
  RETURN jsonb_build_object('ok',false,'error','The teacher code is incorrect or not configured.');
 END IF;
 UPDATE public.gcc_v106_editor_attempts SET failures=0,window_started_at=NULL,locked_until=NULL
 WHERE event_id=v_event;
 RETURN jsonb_build_object('ok',true,'event_id',v_event);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v107_open_editor(
 p_token text,p_code text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_draft record;v_members jsonb;v_pairs jsonb;
BEGIN
 v_auth:=public.gcc_v107_check_pin(p_token,p_code,p_pin);
 IF v_auth->>'ok'<>'true' THEN RETURN v_auth; END IF;
 SELECT d.revision,d.draft INTO v_draft FROM public.gcc_v91_room_drafts d
 WHERE d.event_id=(v_auth->>'event_id')::uuid;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',st.id,'name',st.display_name,
  'school',s.school_name,'country',s.country_name,'room',r.room->>'number')
  ORDER BY (r.room->>'number')::int,st.display_name),'[]'::jsonb) INTO v_members
 FROM jsonb_array_elements(v_draft.draft->'rooms') r(room),
 LATERAL jsonb_array_elements_text(r.room->'students') x(id)
 JOIN public.gcc_session_signup_students st ON st.id::text=x.id
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE s.event_id=(v_auth->>'event_id')::uuid AND s.status='approved';
 SELECT COALESCE(jsonb_agg(jsonb_build_object('a',student_a,'b',student_b)),'[]'::jsonb)
 INTO v_pairs FROM public.gcc_v106_locked_pairs WHERE event_id=(v_auth->>'event_id')::uuid;
 RETURN jsonb_build_object('ok',true,'revision',v_draft.revision,
  'editor',null,'students',v_members,'pairs',v_pairs);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v107_edit_room(
 p_token text,p_code text,p_pin text,p_editor_name text,
 p_action text,p_student_a uuid,p_student_b uuid,p_target_room integer,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_event uuid;v_editor uuid;v_teacher text;v_plan record;
 v_room record;v_id text;v_new_rooms jsonb:='[]'::jsonb;v_ids jsonb;
 v_room_a integer;v_room_b integer;v_target integer;v_partner uuid;
 v_move_ids uuid[];v_names jsonb;v_before jsonb:='[]'::jsonb;v_added jsonb:='[]'::jsonb;
 v_first uuid;v_second uuid;v_result int;v_num int;
BEGIN
 v_auth:=public.gcc_v107_check_pin(p_token,p_code,p_pin);
 IF v_auth->>'ok'<>'true' THEN RETURN v_auth; END IF;
 v_event:=(v_auth->>'event_id')::uuid;v_editor:=NULL;
 v_teacher:=btrim(p_editor_name);
 IF v_teacher IS NULL OR length(v_teacher) NOT BETWEEN 3 AND 80 OR
    v_teacher !~ '^[A-Za-z .''-]+$' THEN
   RETURN jsonb_build_object('ok',false,'error','Enter your name in English letters for the edit history.');
 END IF;
 IF p_action NOT IN ('pair','unpair','move') OR p_student_a IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','Invalid edit request.'); END IF;
 SELECT revision,draft INTO v_plan FROM public.gcc_v91_room_drafts WHERE event_id=v_event FOR UPDATE;
 IF v_plan.revision IS DISTINCT FROM p_expected_revision THEN
  RETURN jsonb_build_object('ok',false,'error','Another teacher updated these rooms. Refresh before editing.'); END IF;
 SELECT count(*) INTO v_num FROM public.gcc_session_signup_students st
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE s.event_id=v_event AND s.status='approved' AND st.id=p_student_a;
 IF v_num<>1 THEN RETURN jsonb_build_object('ok',false,'error','Student is not in this session.');END IF;
 IF p_action IN ('pair','unpair') THEN
  IF p_student_b IS NULL OR p_student_a=p_student_b THEN
   RETURN jsonb_build_object('ok',false,'error','Choose two different students.'); END IF;
  SELECT count(*) INTO v_num FROM public.gcc_session_signup_students st
  JOIN public.gcc_session_signups s ON s.id=st.signup_id
  WHERE s.event_id=v_event AND s.status='approved' AND st.id=p_student_b;
  IF v_num<>1 THEN RETURN jsonb_build_object('ok',false,'error','Second student is not in this session.'); END IF;
 END IF;
 SELECT (r.room->>'number')::int INTO v_room_a FROM jsonb_array_elements(v_plan.draft->'rooms') r(room),
   LATERAL jsonb_array_elements_text(r.room->'students') x(id) WHERE x.id=p_student_a::text;
 IF v_room_a IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Student not found in room layout.'); END IF;
 IF p_action IN ('pair','unpair') THEN
  SELECT (r.room->>'number')::int INTO v_room_b FROM jsonb_array_elements(v_plan.draft->'rooms') r(room),
    LATERAL jsonb_array_elements_text(r.room->'students') x(id) WHERE x.id=p_student_b::text;
  IF v_room_b IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Second student not found in room layout.'); END IF;
  v_first:=least(p_student_a,p_student_b);v_second:=greatest(p_student_a,p_student_b);
 END IF;
 IF p_action='unpair' THEN
  DELETE FROM public.gcc_v106_locked_pairs
    WHERE event_id=v_event AND student_a=v_first AND student_b=v_second;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','These students are not a registered pair.'); END IF;
  INSERT INTO public.gcc_v106_room_edit_audit(event_id,editor_id,editor_name,editor_account,action,details)
   VALUES(v_event,v_editor,v_teacher,auth.uid(),'unpair',jsonb_build_object('a',p_student_a,'b',p_student_b,'room',v_room_a,
    'names',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',display_name)),'[]'::jsonb)
      FROM public.gcc_session_signup_students WHERE id IN(p_student_a,p_student_b))));
  RETURN jsonb_build_object('ok',true,'revision',v_plan.revision,'message','Pair lock removed. Room positions unchanged.');
 END IF;
 IF p_action='pair' THEN
  IF EXISTS(SELECT 1 FROM public.gcc_v106_locked_pairs WHERE event_id=v_event
   AND (student_a IN(p_student_a,p_student_b) OR student_b IN(p_student_a,p_student_b))) THEN
   RETURN jsonb_build_object('ok',false,'error','A student is already in a locked pair. Remove that pair first.');
  END IF;
  v_move_ids:=ARRAY[p_student_b];v_target:=v_room_a;
  INSERT INTO public.gcc_v106_locked_pairs(event_id,student_a,student_b,created_by)
   VALUES(v_event,v_first,v_second,v_editor);
 ELSE
  SELECT CASE WHEN student_a=p_student_a THEN student_b ELSE student_a END
  INTO v_partner FROM public.gcc_v106_locked_pairs
  WHERE event_id=v_event AND (student_a=p_student_a OR student_b=p_student_a);
  v_move_ids:=CASE WHEN v_partner IS NULL THEN ARRAY[p_student_a] ELSE ARRAY[p_student_a,v_partner] END;
  v_target:=p_target_room;
  IF v_target IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_plan.draft->'rooms') r(room)
   WHERE (r.room->>'number')::int=v_target) THEN
     RETURN jsonb_build_object('ok',false,'error','Select a valid destination room.'); END IF;
 END IF;
 -- Capture individual before positions. No personally identifying data is exposed publicly in the log.
 SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id',x.id,
    'from', (r.room->>'number')::int,'to',v_target)),'[]'::jsonb)
 INTO v_before FROM jsonb_array_elements(v_plan.draft->'rooms') r(room),
 LATERAL jsonb_array_elements_text(r.room->'students') x(id)
 WHERE x.id=ANY(SELECT unnest(v_move_ids)::text);
 IF jsonb_array_length(v_before)<>array_length(v_move_ids,1) THEN
  RAISE EXCEPTION 'The saved rooms contain inconsistent student identifiers. Operation cancelled.';
 END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(x.id) ORDER BY x.ord),'[]'::jsonb) INTO v_added
 FROM jsonb_array_elements(v_plan.draft->'rooms') WITH ORDINALITY r(room,roomord),
 LATERAL jsonb_array_elements_text(r.room->'students') WITH ORDINALITY x(id,ord)
 WHERE x.id=ANY(SELECT unnest(v_move_ids)::text);
 FOR v_room IN SELECT value AS room FROM jsonb_array_elements(v_plan.draft->'rooms') LOOP
  v_ids:='[]'::jsonb;
  FOR v_id IN SELECT value FROM jsonb_array_elements_text(v_room.room->'students') LOOP
   IF NOT (v_id=ANY(SELECT unnest(v_move_ids)::text)) THEN v_ids:=v_ids||to_jsonb(v_id); END IF;
  END LOOP;
  IF (v_room.room->>'number')::int=v_target THEN v_ids:=v_ids||v_added; END IF;
  v_new_rooms:=v_new_rooms||jsonb_build_array(jsonb_set(v_room.room,'{students}',v_ids));
 END LOOP;
 UPDATE public.gcc_v91_room_drafts SET draft=jsonb_set(v_plan.draft,'{rooms}',v_new_rooms),
  revision=revision+1,updated_at=now() WHERE event_id=v_event;
 UPDATE public.gcc_v102_shared_plans SET revision=revision+1
  WHERE event_id=v_event AND is_active AND revision=v_plan.revision;
 GET DIAGNOSTICS v_result=ROW_COUNT;
 IF v_result<>1 THEN RAISE EXCEPTION 'Published chart changed unexpectedly. All edits rolled back.'; END IF;
 UPDATE public.gcc_v104_shared_access SET revision=revision+1
 WHERE event_id=v_event AND enabled AND revision=v_plan.revision;
 GET DIAGNOSTICS v_result=ROW_COUNT;
 IF v_result<>1 THEN RAISE EXCEPTION 'Session code changed unexpectedly. All edits rolled back.'; END IF;
 INSERT INTO public.gcc_v106_room_edit_audit(event_id,editor_id,editor_name,editor_account,action,details)
 VALUES(v_event,v_editor,v_teacher,auth.uid(),p_action,
  jsonb_build_object('a',p_student_a,'b',p_student_b,'before',v_before,'target_room',v_target,
    'names',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',display_name)),'[]'::jsonb)
      FROM public.gcc_session_signup_students WHERE id=ANY(v_move_ids) OR id=p_student_a)));
 RETURN jsonb_build_object('ok',true,'revision',v_plan.revision+1,'message',
    CASE WHEN p_action='pair' THEN 'Pair locked and room chart saved.' ELSE 'Room chart saved.' END);
END $fn$;

-- Disable obsolete personal-PIN routes so they cannot bypass the shared-code mode.
REVOKE ALL ON FUNCTION public.gcc_v106_open_editor(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_host_set_editor(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_host_editors_and_log(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_host_toggle_editor(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_check_pin(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_host_set_shared_pin(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_host_disable_shared_pin(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_host_status(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_open_editor(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v107_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v107_host_set_shared_pin(uuid,text),
 public.gcc_v107_host_disable_shared_pin(uuid),public.gcc_v107_host_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v107_open_editor(text,text,text),
 public.gcc_v107_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) TO anon,authenticated;
COMMIT;
