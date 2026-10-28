-- GCC V16.3: host can lock/unlock a same-school pair, with an optional target room.
-- Requires the existing host management code AND the unchanged chart link/code.
-- Existing student assignments, codes, tokens, and teacher permissions are preserved.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v163_host_pair(
 p_token text,p_code text,p_pin text,p_school text,
 p_student_a uuid,p_student_b uuid,p_action text,p_target_room integer,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a jsonb;e uuid;d record;sa record;sb record;v_first uuid;v_second uuid;
        v_room_a integer;v_room_b integer;v_target integer;v_moved jsonb;
BEGIN
 a:=public.gcc_v113_host_auth(p_token,p_code,p_pin);
 IF a->>'ok'<>'true' THEN RETURN a;END IF;
 e:=(a->>'event_id')::uuid;
 IF p_action NOT IN ('pair','unpair') OR p_school IS NULL OR btrim(p_school)=''
   OR p_student_a IS NULL OR p_student_b IS NULL OR p_student_a=p_student_b THEN
   RETURN jsonb_build_object('ok',false,'error','Select a school and two different students.');END IF;
 SELECT revision,draft INTO d FROM public.gcc_v91_room_drafts WHERE event_id=e FOR UPDATE;
 IF NOT FOUND OR d.revision IS DISTINCT FROM p_expected_revision THEN
   RETURN jsonb_build_object('ok',false,'error','The chart changed. Refresh and try again.');END IF;
 SELECT st.signup_id,s.school_name,s.status INTO sa FROM public.gcc_session_signup_students st
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE st.id=p_student_a AND s.event_id=e;
 SELECT st.signup_id,s.school_name,s.status INTO sb FROM public.gcc_session_signup_students st
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE st.id=p_student_b AND s.event_id=e;
 IF sa.status IS DISTINCT FROM 'approved' OR sb.status IS DISTINCT FROM 'approved'
    OR sa.signup_id IS DISTINCT FROM sb.signup_id
    OR sa.school_name IS DISTINCT FROM p_school OR sb.school_name IS DISTINCT FROM p_school THEN
   RETURN jsonb_build_object('ok',false,'error','Choose two approved students from the same school registration.');END IF;
 SELECT (r.room->>'number')::integer INTO v_room_a FROM jsonb_array_elements(d.draft->'rooms') r(room),
 LATERAL jsonb_array_elements_text(r.room->'students') m(id) WHERE m.id=p_student_a::text;
 SELECT (r.room->>'number')::integer INTO v_room_b FROM jsonb_array_elements(d.draft->'rooms') r(room),
 LATERAL jsonb_array_elements_text(r.room->'students') m(id) WHERE m.id=p_student_b::text;
 IF v_room_a IS NULL OR v_room_b IS NULL THEN
   RETURN jsonb_build_object('ok',false,'error','Both students must be assigned to the saved chart.');END IF;
 v_first:=least(p_student_a,p_student_b);v_second:=greatest(p_student_a,p_student_b);
 IF p_action='unpair' THEN
   DELETE FROM public.gcc_v106_locked_pairs
   WHERE event_id=e AND student_a=v_first AND student_b=v_second;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','That pair is not locked.');END IF;
   INSERT INTO public.gcc_v106_room_edit_audit(event_id,editor_id,editor_name,editor_account,action,details)
   VALUES(e,NULL,'Host management code',auth.uid(),'host_unpair',
    jsonb_build_object('school',p_school,'a',p_student_a,'b',p_student_b,
      'names',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',display_name))
      FROM public.gcc_session_signup_students WHERE id IN(p_student_a,p_student_b))));
   RETURN jsonb_build_object('ok',true,'revision',d.revision,'message','Pair unlocked.');
 END IF;
 IF EXISTS(SELECT 1 FROM public.gcc_v106_locked_pairs WHERE event_id=e AND
   (student_a IN(p_student_a,p_student_b) OR student_b IN(p_student_a,p_student_b))) THEN
   RETURN jsonb_build_object('ok',false,'error','One student already belongs to a fixed pair.');END IF;
 v_target:=coalesce(p_target_room,v_room_a);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.draft->'rooms') r(room)
   WHERE (r.room->>'number')::integer=v_target) THEN
   RETURN jsonb_build_object('ok',false,'error','Choose an existing room.');END IF;
 INSERT INTO public.gcc_v106_locked_pairs(event_id,student_a,student_b,created_by)
 VALUES(e,v_first,v_second,NULL);
 -- Existing host move is authoritative for revisions, audit and credential preservation.
 -- Move each student to the same room; the pair is already locked so both move together.
 v_moved:=public.gcc_v113_host_move(p_token,p_code,p_pin,p_student_a,v_target,d.revision);
 IF v_moved->>'ok'<>'true' THEN
   RAISE EXCEPTION 'Could not save pair: %',coalesce(v_moved->>'error','unknown error');
 END IF;
 INSERT INTO public.gcc_v106_room_edit_audit(event_id,editor_id,editor_name,editor_account,action,details)
 VALUES(e,NULL,'Host management code',auth.uid(),'host_pair',
  jsonb_build_object('school',p_school,'a',p_student_a,'b',p_student_b,'target_room',v_target,
   'names',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',display_name))
    FROM public.gcc_session_signup_students WHERE id IN(p_student_a,p_student_b))));
 RETURN jsonb_build_object('ok',true,'revision',(v_moved->>'revision')::integer,
   'message','Pair locked together in Room '||v_target,'moved',2);
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v163_host_pair(text,text,text,text,uuid,uuid,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v163_host_pair(text,text,text,text,uuid,uuid,text,integer,integer) TO anon,authenticated;
COMMIT;
