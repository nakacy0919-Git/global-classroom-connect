-- GCC V19.6: teacher-scoped student display name corrections.
-- Existing student IDs, room drafts, protected pairs and publication revisions remain unchanged.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gcc_v196_student_name_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 signup_id uuid NOT NULL REFERENCES public.gcc_session_signups(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.gcc_session_signup_students(id) ON DELETE CASCADE,
 teacher_name text NOT NULL,
 old_name text NOT NULL,
 new_name text NOT NULL,
 edited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gcc_v196_student_name_audit_event_time
 ON public.gcc_v196_student_name_audit(event_id, edited_at DESC);
ALTER TABLE public.gcc_v196_student_name_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_v196_student_name_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.gcc_v196_student_name_audit_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v196_rename_student(
 p_token text, p_code text, p_pin text,
 p_student_id uuid, p_expected_name text, p_new_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_auth jsonb;
 v_event uuid;
 v_signup uuid;
 v_old text;
 v_new text := btrim(p_new_name);
BEGIN
 -- Use exactly the same three-factor, rate-limited school-scoped check as room edits.
 v_auth := public.gcc_v108_check_teacher(p_token, p_code, p_pin);
 IF v_auth->>'ok' <> 'true' THEN RETURN v_auth; END IF;
 v_event := (v_auth->>'event_id')::uuid;
 v_signup := (v_auth->>'signup_id')::uuid;

 IF p_student_id IS NULL OR p_expected_name IS NULL OR
    NOT public.gcc_v7_english_name(v_new) THEN
  RETURN jsonb_build_object('ok',false,'error',
   'Enter a student name in English letters (2–120 characters).');
 END IF;

 -- Lock the requested student and verify the exact approved signup owned by this PIN.
 SELECT st.display_name INTO v_old
 FROM public.gcc_session_signup_students st
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE st.id=p_student_id AND st.signup_id=v_signup
   AND s.event_id=v_event AND s.status='approved'
 FOR UPDATE OF st;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('ok',false,'error',
   'You can only edit students in your own approved school registration.');
 END IF;

 -- Reject stale edits without overwriting another teacher's correction.
 IF v_old IS DISTINCT FROM p_expected_name THEN
  RETURN jsonb_build_object('ok',false,'error',
   'This student name changed. Reopen Teacher Mode before saving.');
 END IF;
 IF v_old=v_new THEN
  RETURN jsonb_build_object('ok',true,'name',v_old,
   'message','The student name is unchanged.');
 END IF;

 IF EXISTS (SELECT 1 FROM public.gcc_session_signup_students st
  WHERE st.signup_id=v_signup AND st.id<>p_student_id
    AND lower(btrim(st.display_name))=lower(v_new)) THEN
  RETURN jsonb_build_object('ok',false,'error',
   'Another student in your registration already has this name.');
 END IF;

 UPDATE public.gcc_session_signup_students
 SET display_name=v_new
 WHERE id=p_student_id AND signup_id=v_signup;

 INSERT INTO public.gcc_v196_student_name_audit(
  event_id,signup_id,student_id,teacher_name,old_name,new_name
 ) VALUES(v_event,v_signup,p_student_id,v_auth->>'teacher',v_old,v_new);

 -- The published chart reads display_name live. Do not change room plan revision,
 -- shared invitation revision, protected pairs, or participant identities.
 RETURN jsonb_build_object('ok',true,'name',v_new,
  'message','Student name saved. Room assignments and pairs are unchanged.');
END $fn$;

REVOKE ALL ON FUNCTION public.gcc_v196_rename_student(
 text,text,text,uuid,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v196_rename_student(
 text,text,text,uuid,text,text
) TO anon,authenticated;

COMMIT;
