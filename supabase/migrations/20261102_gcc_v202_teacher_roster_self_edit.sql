-- GCC V20.2: authenticated teacher self-service additions, corrections, and removals.
-- Teacher identity is verified by the existing session link, six-digit chart code,
-- and per-school four-digit PIN. All changes are scoped to the approved signup.
-- Draft/public access revisions advance together; existing room members do not move.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gcc_v202_roster_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  signup_id uuid NOT NULL REFERENCES public.gcc_session_signups(id) ON DELETE CASCADE,
  student_id uuid,
  action text NOT NULL CHECK (action IN ('add','edit','remove')),
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gcc_v202_roster_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v202_roster_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.gcc_v202_roster_audit_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v202_edit_student(
  p_token text, p_code text, p_pin text,
  p_action text, p_student_id uuid,
  p_expected_name text, p_name text, p_grade text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_auth jsonb;
  v_event uuid;
  v_signup uuid;
  v_school uuid;
  v_teacher uuid;
  v_original record;
  v_student_id uuid;
  v_participant uuid;
  v_name text := btrim(coalesce(p_name,''));
  v_grade text := btrim(coalesce(p_grade,''));
  v_count integer;
  v_capacity integer;
  v_saved record;
  v_share record;
  v_access record;
  v_rooms jsonb;
  v_room jsonb;
  v_rebuilt jsonb := '[]'::jsonb;
  v_updated_members jsonb;
  v_member text;
  v_new_revision integer;
  v_old_count integer;
  v_total integer;
  v_room_idx integer;
  v_target integer := NULL;
  v_smallest integer := 2147483647;
  v_school_count integer;
  v_pair_removed boolean := false;
BEGIN
  v_auth := public.gcc_v108_check_teacher(p_token,p_code,p_pin);
  IF v_auth->>'ok'<>'true' THEN RETURN v_auth; END IF;
  v_event := (v_auth->>'event_id')::uuid;
  v_signup := (v_auth->>'signup_id')::uuid;
  IF p_action NOT IN ('add','edit','remove') THEN
    RETURN jsonb_build_object('ok',false,'error','Unknown roster action.');
  END IF;
  -- Registration closes when the event begins. Teacher room edits are separate.
  PERFORM 1 FROM public.events
   WHERE id=v_event AND starts_at>now() AND status='published' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Student roster editing has closed for this session.'); END IF;
  PERFORM 1 FROM public.gcc_session_signups
   WHERE id=v_signup AND event_id=v_event AND status='approved' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Your approved registration was not found.');END IF;
  SELECT count(*) INTO v_count FROM public.gcc_session_signup_students WHERE signup_id=v_signup;
  IF v_count<1 THEN RAISE EXCEPTION 'Existing roster is empty: contact the host';END IF;

  IF p_action IN ('add','edit') THEN
    IF NOT public.gcc_v7_english_name(v_name) OR char_length(v_grade)>40 THEN
      RETURN jsonb_build_object('ok',false,'error','Enter a valid English student name (2-120 characters) and grade (up to 40).');
    END IF;
    IF EXISTS (SELECT 1 FROM public.gcc_session_signup_students
      WHERE signup_id=v_signup AND (p_action='add' OR id<>p_student_id)
        AND lower(btrim(display_name))=lower(v_name)) THEN
      RETURN jsonb_build_object('ok',false,'error','A student with this name is already on your list.');
    END IF;
  END IF;
  IF p_action='add' AND v_count>=500 THEN
    RETURN jsonb_build_object('ok',false,'error','A school may register at most 500 students.');
  END IF;
  IF p_action='remove' AND v_count<=1 THEN
    RETURN jsonb_build_object('ok',false,'error','A registration must keep at least one student.');
  END IF;

  SELECT st.id,st.display_name,st.grade,st.imported_participant_id
   INTO v_original
   FROM public.gcc_session_signup_students st
   WHERE st.id=p_student_id AND st.signup_id=v_signup FOR UPDATE;
  IF p_action<>'add' THEN
    IF NOT FOUND OR v_original.imported_participant_id IS NULL THEN
      RETURN jsonb_build_object('ok',false,'error','This student does not belong to your registration.');
    END IF;
    IF v_original.display_name IS DISTINCT FROM p_expected_name THEN
      RETURN jsonb_build_object('ok',false,'error','The roster changed. Reopen Teacher Mode and try again.');
    END IF;
    v_student_id := v_original.id;
    v_participant := v_original.imported_participant_id;
  ELSIF p_student_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok',false,'error','A new student must not have an existing student ID.');
  END IF;

  IF p_action='edit' THEN
    UPDATE public.gcc_session_signup_students
       SET display_name=v_name,grade=v_grade WHERE id=v_student_id AND signup_id=v_signup;
    UPDATE public.participants SET display_name=v_name,grade=nullif(v_grade,'')
       WHERE id=v_participant;
    INSERT INTO public.gcc_v202_roster_audit(event_id,signup_id,student_id,action)
       VALUES(v_event,v_signup,v_student_id,'edit');
    RETURN jsonb_build_object('ok',true,'message','Student details saved. Room and pair assignments are unchanged.');
  END IF;

  SELECT d.draft,d.revision INTO v_saved FROM public.gcc_v91_room_drafts d
    WHERE d.event_id=v_event FOR UPDATE;
  SELECT p.revision,p.token_hash,p.is_active INTO v_share
    FROM public.gcc_v102_shared_plans p WHERE p.event_id=v_event FOR UPDATE;
  SELECT a.revision,a.publication_hash,a.enabled INTO v_access
    FROM public.gcc_v104_shared_access a WHERE a.event_id=v_event FOR UPDATE;
  IF v_saved.draft IS NULL OR v_share.token_hash IS NULL OR NOT coalesce(v_share.is_active,false)
      OR NOT coalesce(v_access.enabled,false)
      OR v_saved.revision<>v_share.revision OR v_saved.revision<>v_access.revision
      OR v_access.publication_hash<>v_share.token_hash THEN
    RETURN jsonb_build_object('ok',false,'error','Room chart changed. Ask the host to refresh or publish the latest rooms.');
  END IF;
  v_rooms := v_saved.draft->'rooms';
  IF jsonb_typeof(v_rooms)<>'array' OR jsonb_array_length(v_rooms) NOT BETWEEN 1 AND 60
      OR v_saved.draft->>'version'<>'1' THEN
    RAISE EXCEPTION 'Room plan is not valid; changes were not saved';
  END IF;
  SELECT count(*) INTO v_old_count FROM jsonb_array_elements(v_rooms) r(room)
    CROSS JOIN LATERAL jsonb_array_elements_text(r.room->'students') x(member);
  SELECT count(*) INTO v_total FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=v_event AND s.status='approved';
  IF v_old_count<>v_total OR EXISTS(
    SELECT x.member FROM jsonb_array_elements(v_rooms) r(room)
      CROSS JOIN LATERAL jsonb_array_elements_text(r.room->'students') x(member)
    EXCEPT
    SELECT st.id::text FROM public.gcc_session_signup_students st
      JOIN public.gcc_session_signups s ON s.id=st.signup_id
      WHERE s.event_id=v_event AND s.status='approved'
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','Room chart is out of sync. Ask the host to synchronize it first.');
  END IF;

  IF p_action='add' THEN
    SELECT max_students INTO v_capacity FROM public.gcc_session_settings WHERE event_id=v_event;
    IF v_total>=coalesce(v_capacity,150) THEN
      RETURN jsonb_build_object('ok',false,'error','The session has reached its student capacity. Ask the host.');
    END IF;
    -- Use the teacher/school identity of this approved signup only.
    SELECT min(p.school_id::text)::uuid,min(p.teacher_id::text)::uuid,
           count(distinct p.school_id),count(distinct p.teacher_id)
      INTO v_school,v_teacher,v_school_count,v_count
    FROM public.gcc_session_signup_students st
      JOIN public.participants p ON p.id=st.imported_participant_id
    WHERE st.signup_id=v_signup;
    IF v_school_count<>1 OR v_count<>1 OR v_school IS NULL OR v_teacher IS NULL THEN
      RAISE EXCEPTION 'School or teacher identity is inconsistent';
    END IF;
    INSERT INTO public.participants(school_id,teacher_id,display_name,grade,is_active)
      VALUES(v_school,v_teacher,v_name,nullif(v_grade,''),true) RETURNING id INTO v_participant;
    SELECT coalesce(max(sort_order),0)+1 INTO v_count
      FROM public.gcc_session_signup_students WHERE signup_id=v_signup;
    INSERT INTO public.gcc_session_signup_students(
      signup_id,display_name,grade,sort_order,imported_participant_id
    ) VALUES (v_signup,v_name,v_grade,v_count,v_participant) RETURNING id INTO v_student_id;
    INSERT INTO public.event_participants(event_id,participant_id,role)
      VALUES(v_event,v_participant,'participant');
    -- Assign the added student to the least occupied room, keeping every old assignment.
    FOR v_room_idx IN 0..jsonb_array_length(v_rooms)-1 LOOP
      v_count:=jsonb_array_length(v_rooms->v_room_idx->'students');
      IF v_count<v_smallest THEN v_smallest:=v_count;v_target:=v_room_idx;END IF;
    END LOOP;
    v_rooms:=jsonb_set(v_rooms,ARRAY[v_target::text,'students'],
       (v_rooms->v_target->'students')||to_jsonb(v_student_id::text),false);
  ELSE
    -- Removing someone releases pairs containing that student; other pairs remain fixed.
    SELECT EXISTS(SELECT 1 FROM public.gcc_v106_locked_pairs
      WHERE event_id=v_event AND (student_a=v_student_id OR student_b=v_student_id))
      INTO v_pair_removed;
    v_rebuilt:='[]'::jsonb;
    FOR v_room IN SELECT value FROM jsonb_array_elements(v_rooms) LOOP
      v_updated_members:='[]'::jsonb;
      FOR v_member IN SELECT value FROM jsonb_array_elements_text(v_room->'students') LOOP
        IF v_member<>v_student_id::text THEN
          v_updated_members:=v_updated_members||to_jsonb(v_member);
        END IF;
      END LOOP;
      v_rebuilt:=v_rebuilt||jsonb_build_array(jsonb_set(v_room,'{students}',v_updated_members,false));
    END LOOP;
    v_rooms:=v_rebuilt;
    DELETE FROM public.gcc_v106_locked_pairs
      WHERE event_id=v_event AND (student_a=v_student_id OR student_b=v_student_id);
    DELETE FROM public.gcc_v165_pair_requests
      WHERE signup_id=v_signup AND (student_a=v_student_id OR student_b=v_student_id);
    DELETE FROM public.gcc_session_signup_students WHERE id=v_student_id AND signup_id=v_signup;
    DELETE FROM public.event_participants WHERE event_id=v_event AND participant_id=v_participant;
    -- The same participant may be reused in another session: never deactivate it there.
    IF NOT EXISTS(SELECT 1 FROM public.event_participants WHERE participant_id=v_participant)
      AND NOT EXISTS(SELECT 1 FROM public.gcc_session_signup_students
                     WHERE imported_participant_id=v_participant) THEN
      UPDATE public.participants SET is_active=false WHERE id=v_participant;
    END IF;
  END IF;
  SELECT count(*) INTO v_total FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=v_event AND s.status='approved';
  SELECT count(*) INTO v_count FROM jsonb_array_elements(v_rooms) r(room)
    CROSS JOIN LATERAL jsonb_array_elements_text(r.room->'students') x(member);
  IF v_total<>v_count OR EXISTS(
    SELECT x.member FROM jsonb_array_elements(v_rooms) r(room)
      CROSS JOIN LATERAL jsonb_array_elements_text(r.room->'students') x(member)
    EXCEPT
    SELECT st.id::text FROM public.gcc_session_signup_students st
      JOIN public.gcc_session_signups s ON s.id=st.signup_id
      WHERE s.event_id=v_event AND s.status='approved'
  ) THEN RAISE EXCEPTION 'Roster/room validation failed; no changes were saved'; END IF;
  v_new_revision:=v_saved.revision+1;
  UPDATE public.gcc_v91_room_drafts SET
     draft=jsonb_set(v_saved.draft,'{rooms}',v_rooms,false),
     revision=v_new_revision,updated_at=now()
     WHERE event_id=v_event AND revision=v_saved.revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'Concurrent room update, please retry'; END IF;
  UPDATE public.gcc_v102_shared_plans SET revision=v_new_revision,published_at=now()
     WHERE event_id=v_event AND is_active AND revision=v_saved.revision
       AND token_hash=v_share.token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shared room update conflict'; END IF;
  UPDATE public.gcc_v104_shared_access SET revision=v_new_revision
     WHERE event_id=v_event AND enabled AND revision=v_saved.revision
       AND publication_hash=v_share.token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'Six-digit code update conflict';END IF;
  INSERT INTO public.gcc_v202_roster_audit(event_id,signup_id,student_id,action)
    VALUES(v_event,v_signup,v_student_id,p_action);
  RETURN jsonb_build_object('ok',true,'student_id',v_student_id,
    'revision',v_new_revision,'removed_pair',v_pair_removed,
    'message',CASE WHEN p_action='add'
      THEN 'Student added and placed in a breakout room. Existing assignments remain unchanged.'
      WHEN v_pair_removed THEN 'Student removed and their fixed pair released.'
      ELSE 'Student removed. Existing assignments remain unchanged.' END);
END $fn$;

REVOKE ALL ON FUNCTION public.gcc_v202_edit_student(
  text,text,text,text,uuid,text,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v202_edit_student(
  text,text,text,text,uuid,text,text,text
) TO anon,authenticated;
COMMIT;
