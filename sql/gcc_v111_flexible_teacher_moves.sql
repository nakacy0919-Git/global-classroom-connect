-- GCC V10.11: manual teacher room overrides while preserving school scope and fixed pairs.
-- Non-destructive: replaces one function, keeps all existing pairs, edit logs and room data.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v108_open_editor(
 p_token text,p_code text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_draft record;v_members jsonb;v_pairs jsonb;v_room_stats jsonb;
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
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'room',(rr.room->>'number')::int,
  'total',jsonb_array_length(rr.room->'students'),
  'school_students',sc.n
 ) ORDER BY (rr.room->>'number')::int),'[]'::jsonb) INTO v_room_stats
 FROM jsonb_array_elements(v_draft.draft->'rooms') rr(room)
 CROSS JOIN LATERAL (
   SELECT count(*)::int AS n FROM jsonb_array_elements_text(rr.room->'students') x(id)
   JOIN public.gcc_session_signup_students st ON st.id::text=x.id
   WHERE st.signup_id=(v_auth->>'signup_id')::uuid
 ) sc;
 RETURN jsonb_build_object('ok',true,'revision',v_draft.revision,
  'teacher',v_auth->>'teacher','school',v_auth->>'school',
  'students',v_members,'pairs',v_pairs,'room_stats',v_room_stats,'room_count',jsonb_array_length(v_draft.draft->'rooms'));
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v108_edit_room(
 p_token text,p_code text,p_pin text,p_action text,
 p_student_a uuid,p_student_b uuid,p_target_room integer,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_event uuid;v_signup uuid;v_teacher text;v_school text;
 v_plan record;v_room record;v_item text;v_room_a int;v_room_b int;v_target int;
 v_pair_a uuid;v_pair_b uuid;v_partner uuid;v_moved uuid[];
 v_ids jsonb;v_new_rooms jsonb:='[]'::jsonb;v_add jsonb:='[]'::jsonb;
 v_before jsonb;v_affected int;v_first uuid;v_second uuid;
 v_capacity int;v_school_cap int;v_total int;v_school_total int;v_room_count int;
 v_left int;v_own int;v_other int;v_best int:=2147483647;v_score int;v_found boolean:=false;
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
  v_moved:=ARRAY[p_student_a,p_student_b];v_target:=p_target_room;
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
 -- Enforce balanced room placement before any pair or draft change is written.
 SELECT count(*) INTO v_total FROM public.gcc_session_signup_students st
  WHERE st.id::text IN (SELECT x.id FROM jsonb_array_elements(v_plan.draft->'rooms') rr(room)
  CROSS JOIN LATERAL jsonb_array_elements_text(rr.room->'students') x(id));
 SELECT count(*) INTO v_school_total FROM public.gcc_session_signup_students st
  WHERE st.signup_id=v_signup AND st.id::text IN
   (SELECT x.id FROM jsonb_array_elements(v_plan.draft->'rooms') rr(room)
     CROSS JOIN LATERAL jsonb_array_elements_text(rr.room->'students') x(id));
 v_room_count:=jsonb_array_length(v_plan.draft->'rooms');
 IF v_room_count<1 THEN RAISE EXCEPTION 'Room plan is empty';END IF;
 v_capacity:=greatest(4,ceil(v_total::numeric/v_room_count)::int);
 v_school_cap:=greatest(2,ceil(v_school_total::numeric/v_room_count)::int);
 -- If pair has no explicit destination, choose a balanced international room automatically.
 IF p_action='pair' AND v_target IS NULL THEN
  FOR v_room IN SELECT value AS room FROM jsonb_array_elements(v_plan.draft->'rooms') LOOP
   SELECT count(*)::int,count(*) FILTER(WHERE st.signup_id=v_signup)::int,
          count(*) FILTER(WHERE st.signup_id<>v_signup)::int
   INTO v_left,v_own,v_other
   FROM jsonb_array_elements_text(v_room.room->'students') xx(id)
   JOIN public.gcc_session_signup_students st ON st.id::text=xx.id
   WHERE NOT(xx.id=ANY(SELECT unnest(v_moved)::text));
   -- Balance is a recommendation, never a hard limit for a teacher override.
   v_score:=(CASE WHEN v_other>0 THEN 0 ELSE 100 END)+v_own*25+v_left*4
     +(CASE WHEN v_left+cardinality(v_moved)>v_capacity THEN 160 ELSE 0 END)
     +(CASE WHEN v_own+cardinality(v_moved)>v_school_cap THEN 220 ELSE 0 END);
   IF v_score<v_best THEN v_best:=v_score;v_target:=(v_room.room->>'number')::int;END IF;
  END LOOP;
 END IF;
 IF v_target IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_plan.draft->'rooms') rr(room)
   WHERE (rr.room->>'number')::int=v_target) THEN
  RETURN jsonb_build_object('ok',false,'error','No suitable breakout room. Choose an available destination.');END IF;
 SELECT count(*)::int,count(*) FILTER(WHERE st.signup_id=v_signup)::int
 INTO v_left,v_own
 FROM jsonb_array_elements(v_plan.draft->'rooms') rr(room),
 LATERAL jsonb_array_elements_text(rr.room->'students') xx(id)
 JOIN public.gcc_session_signup_students st ON st.id::text=xx.id
 WHERE (rr.room->>'number')::int=v_target AND NOT(xx.id=ANY(SELECT unnest(v_moved)::text));
 -- Explicit manual destination is valid even when a room is crowded.
 -- All other authorization, pair integrity, concurrency, 6-digit code and audit checks remain.
 IF p_action='pair' THEN
  INSERT INTO public.gcc_v106_locked_pairs(event_id,student_a,student_b,created_by)
  VALUES(v_event,v_first,v_second,NULL);
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
COMMIT;
