-- GCC v10.6: audited, teacher-specific PIN-backed room changes.
-- Does not change existing events, students or published room plans when installed.
-- Requires pgcrypto in extensions (Supabase default).
BEGIN;
CREATE TABLE IF NOT EXISTS public.gcc_v106_editors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  name_key text GENERATED ALWAYS AS (lower(btrim(display_name))) STORED,
  pin_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, name_key)
);
CREATE TABLE IF NOT EXISTS public.gcc_v106_editor_attempts (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  failures int NOT NULL DEFAULT 0,
  window_started_at timestamptz,
  locked_until timestamptz
);
CREATE TABLE IF NOT EXISTS public.gcc_v106_locked_pairs (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  student_a uuid NOT NULL REFERENCES public.gcc_session_signup_students(id) ON DELETE CASCADE,
  student_b uuid NOT NULL REFERENCES public.gcc_session_signup_students(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.gcc_v106_editors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,student_a,student_b),
  CONSTRAINT gcc_v106_pair_sorted CHECK (student_a < student_b)
);
CREATE TABLE IF NOT EXISTS public.gcc_v106_room_edit_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  editor_id uuid REFERENCES public.gcc_v106_editors(id) ON DELETE SET NULL,
  editor_name text NOT NULL,
  editor_account uuid,
  action text NOT NULL CHECK(action IN ('pair','unpair','move')),
  details jsonb NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gcc_v106_audit_event_time ON public.gcc_v106_room_edit_audit(event_id,edited_at DESC);
CREATE INDEX IF NOT EXISTS gcc_v106_pairs_student_b ON public.gcc_v106_locked_pairs(event_id,student_b);

ALTER TABLE public.gcc_v106_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_v106_editor_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_v106_locked_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_v106_room_edit_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v106_editors,public.gcc_v106_editor_attempts,
  public.gcc_v106_locked_pairs,public.gcc_v106_room_edit_audit FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v106_host_set_editor(
  p_event_id uuid,p_name text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_name text:=btrim(p_name);
BEGIN
  PERFORM public.gcc_v6_require_host();
  IF NOT EXISTS(SELECT 1 FROM public.events WHERE id=p_event_id) THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 3 AND 80 OR v_name !~ '^[A-Za-z .''-]+$'
    THEN RAISE EXCEPTION 'Enter the teacher name in English letters (3–80 characters)'; END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'A four-digit PIN is required'; END IF;
  INSERT INTO public.gcc_v106_editors(event_id,display_name,pin_hash)
  VALUES(p_event_id,v_name,extensions.crypt(p_pin,extensions.gen_salt('bf',10)))
  ON CONFLICT(event_id,name_key) DO UPDATE
    SET display_name=EXCLUDED.display_name,pin_hash=EXCLUDED.pin_hash,enabled=true;
  RETURN jsonb_build_object('ok',true,'teacher',v_name);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v106_host_editors_and_log(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  PERFORM public.gcc_v6_require_host();
  RETURN jsonb_build_object(
    'editors',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',display_name,'enabled',enabled)
          ORDER BY display_name),'[]'::jsonb) FROM public.gcc_v106_editors WHERE event_id=p_event_id),
    'logs',(SELECT COALESCE(jsonb_agg(jsonb_build_object('at',edited_at,'teacher',editor_name,
        'action',action,'details',details,'account',editor_account)
        ORDER BY edited_at DESC),'[]'::jsonb) FROM
        (SELECT * FROM public.gcc_v106_room_edit_audit WHERE event_id=p_event_id
          ORDER BY edited_at DESC LIMIT 100) x)
  );
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v106_host_toggle_editor(p_event_id uuid,p_editor_id uuid,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  PERFORM public.gcc_v6_require_host();
  UPDATE public.gcc_v106_editors SET enabled=p_enabled
    WHERE id=p_editor_id AND event_id=p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Teacher not found'; END IF;
  RETURN jsonb_build_object('ok',true);
END $fn$;

-- Internal. Returns an error object rather than raising for incorrect credentials,
-- so failed-attempt counters and V10.4's 6-digit lockout are not rolled back.
CREATE OR REPLACE FUNCTION public.gcc_v106_check_editor(
 p_token text,p_code text,p_name text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_event uuid;v_e record;v_attempt record;v_chart jsonb;v_fail int;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR
    p_code IS NULL OR p_code !~ '^[0-9]{6}$' OR
    p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 3 AND 80 OR
    p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
      RETURN jsonb_build_object('ok',false,'error','Invalid invitation or teacher credentials.');
 END IF;
 SELECT event_id INTO v_event FROM public.gcc_v102_shared_plans
  WHERE token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND is_active=true;
 IF v_event IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Invitation is not active.'); END IF;
 INSERT INTO public.gcc_v106_editor_attempts(event_id) VALUES(v_event) ON CONFLICT DO NOTHING;
 SELECT * INTO v_attempt FROM public.gcc_v106_editor_attempts WHERE event_id=v_event FOR UPDATE;
 IF v_attempt.locked_until>now() THEN
  RETURN jsonb_build_object('ok',false,'error','Teacher mode is temporarily locked. Ask the host.');
 END IF;
 -- This validates the current published version and existing shared 6-digit code.
 v_chart:=public.gcc_v104_open_room_chart(p_token,p_code);
 IF v_chart IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','Session code is invalid or the chart is not available.');
 END IF;
 SELECT id,display_name INTO v_e FROM public.gcc_v106_editors
  WHERE event_id=v_event AND name_key=lower(btrim(p_name)) AND enabled=true
    AND pin_hash=extensions.crypt(p_pin,pin_hash);
 IF NOT FOUND THEN
  v_fail:=CASE WHEN v_attempt.window_started_at IS NULL OR
    v_attempt.window_started_at<now()-interval '15 minutes' THEN 1 ELSE v_attempt.failures+1 END;
  UPDATE public.gcc_v106_editor_attempts
    SET failures=v_fail,
        window_started_at=CASE WHEN v_fail=1 THEN now() ELSE window_started_at END,
        locked_until=CASE WHEN v_fail>=5 THEN now()+interval '15 minutes' ELSE NULL END
    WHERE event_id=v_event;
  RETURN jsonb_build_object('ok',false,'error','Teacher name or PIN is incorrect.');
 END IF;
 UPDATE public.gcc_v106_editor_attempts SET failures=0,window_started_at=NULL,locked_until=NULL
 WHERE event_id=v_event;
 RETURN jsonb_build_object('ok',true,'event_id',v_event,'editor_id',v_e.id,'editor_name',v_e.display_name);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v106_open_editor(
 p_token text,p_code text,p_name text,p_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_draft record;v_members jsonb;v_pairs jsonb;
BEGIN
 v_auth:=public.gcc_v106_check_editor(p_token,p_code,p_name,p_pin);
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
  'editor',v_auth->>'editor_name','students',v_members,'pairs',v_pairs);
END $fn$;

-- Server-side constraint protects registered pairs from being split later by the host room planner.
CREATE OR REPLACE FUNCTION public.gcc_v106_guard_pairs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_pair record;v_room_a int;v_room_b int;
BEGIN
 FOR v_pair IN SELECT student_a,student_b FROM public.gcc_v106_locked_pairs WHERE event_id=NEW.event_id LOOP
  SELECT (r.room->>'number')::int INTO v_room_a FROM
    jsonb_array_elements(NEW.draft->'rooms') r(room),
    LATERAL jsonb_array_elements_text(r.room->'students') x(id)
    WHERE x.id=v_pair.student_a::text;
  SELECT (r.room->>'number')::int INTO v_room_b FROM
    jsonb_array_elements(NEW.draft->'rooms') r(room),
    LATERAL jsonb_array_elements_text(r.room->'students') x(id)
    WHERE x.id=v_pair.student_b::text;
  IF v_room_a IS NULL OR v_room_b IS NULL OR v_room_a<>v_room_b THEN
    RAISE EXCEPTION 'A locked teacher pair would be split. Release that pair first in Teacher Mode.';
  END IF;
 END LOOP;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v106_guard_pairs_trigger ON public.gcc_v91_room_drafts;
CREATE TRIGGER gcc_v106_guard_pairs_trigger BEFORE UPDATE OF draft
 ON public.gcc_v91_room_drafts FOR EACH ROW EXECUTE FUNCTION public.gcc_v106_guard_pairs();

CREATE OR REPLACE FUNCTION public.gcc_v106_edit_room(
 p_token text,p_code text,p_name text,p_pin text,
 p_action text,p_student_a uuid,p_student_b uuid,p_target_room integer,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_auth jsonb;v_event uuid;v_editor uuid;v_teacher text;v_plan record;
 v_room record;v_id text;v_new_rooms jsonb:='[]'::jsonb;v_ids jsonb;
 v_room_a integer;v_room_b integer;v_target integer;v_partner uuid;
 v_move_ids uuid[];v_names jsonb;v_before jsonb:='[]'::jsonb;v_added jsonb:='[]'::jsonb;
 v_first uuid;v_second uuid;v_result int;v_num int;
BEGIN
 v_auth:=public.gcc_v106_check_editor(p_token,p_code,p_name,p_pin);
 IF v_auth->>'ok'<>'true' THEN RETURN v_auth; END IF;
 v_event:=(v_auth->>'event_id')::uuid;v_editor:=(v_auth->>'editor_id')::uuid;
 v_teacher:=v_auth->>'editor_name';
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

REVOKE ALL ON FUNCTION public.gcc_v106_check_editor(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_guard_pairs() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_host_set_editor(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_host_editors_and_log(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_host_toggle_editor(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_open_editor(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v106_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v106_host_set_editor(uuid,text,text),
 public.gcc_v106_host_editors_and_log(uuid),
 public.gcc_v106_host_toggle_editor(uuid,uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v106_open_editor(text,text,text,text),
 public.gcc_v106_edit_room(text,text,text,text,text,uuid,uuid,integer,integer) TO anon,authenticated;

-- Preserve the human-readable edit history when V10.5 archives a deleted session.
CREATE OR REPLACE FUNCTION gcc_maintenance.gcc_v106_archive_teacher_edits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  NEW.snapshot:=NEW.snapshot||jsonb_build_object(
    'teacher_pairs',(SELECT COALESCE(jsonb_agg(to_jsonb(p)),'[]'::jsonb)
      FROM public.gcc_v106_locked_pairs p WHERE event_id=NEW.event_id),
    'teacher_edit_log',(SELECT COALESCE(jsonb_agg(to_jsonb(a)),'[]'::jsonb)
      FROM public.gcc_v106_room_edit_audit a WHERE event_id=NEW.event_id));
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v106_archive_teacher_edits_trigger
  ON gcc_maintenance.deleted_session_archives;
CREATE TRIGGER gcc_v106_archive_teacher_edits_trigger BEFORE INSERT
  ON gcc_maintenance.deleted_session_archives
  FOR EACH ROW EXECUTE FUNCTION gcc_maintenance.gcc_v106_archive_teacher_edits();
REVOKE ALL ON FUNCTION gcc_maintenance.gcc_v106_archive_teacher_edits() FROM PUBLIC,anon,authenticated;

COMMIT;
