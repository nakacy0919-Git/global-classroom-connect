-- GCC V10.3 - per-student private access codes.
-- Apply AFTER the V10.3 application files are installed, before accepting real students.
-- This deliberately revokes the old name+school-only public lookup.
-- Previously issued shared links remain saved, but require new student codes to work.

CREATE TABLE IF NOT EXISTS public.gcc_v103_student_codes (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.gcc_session_signup_students(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,student_id)
);
ALTER TABLE public.gcc_v103_student_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_v103_student_codes FROM PUBLIC,anon,authenticated;

-- Host can see only a code count; raw codes cannot be recovered from hashes.
CREATE OR REPLACE FUNCTION public.gcc_v103_code_status(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; approved integer; missing_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host authentication required'; END IF;
  PERFORM public.gcc_v6_require_host();
  SELECT count(*) INTO n FROM public.gcc_v103_student_codes WHERE event_id=p_event_id;
  SELECT count(*) INTO approved FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=p_event_id AND s.status='approved';
  SELECT count(*) INTO missing_count FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    LEFT JOIN public.gcc_v103_student_codes c ON c.student_id=st.id AND c.event_id=p_event_id
    WHERE s.event_id=p_event_id AND s.status='approved' AND c.student_id IS NULL;
  RETURN jsonb_build_object('issued',n,'approved',approved,'ready',n>0 AND n=approved AND missing_count=0);
END $$;

-- Only host may create/rotate ALL codes for a published CURRENT plan.
-- Returns plaintext once only. Regeneration immediately invalidates old codes.
CREATE OR REPLACE FUNCTION public.gcc_v103_issue_student_codes(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; v_code text; v_codes jsonb:='[]'::jsonb; v_revision integer; v_draft_revision integer;
        v_active boolean; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host authentication required'; END IF;
  PERFORM public.gcc_v6_require_host();
  SELECT p.revision,p.is_active,d.revision INTO v_revision,v_active,v_draft_revision
    FROM public.gcc_v102_shared_plans p
    JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
    WHERE p.event_id=p_event_id FOR UPDATE OF p;
  IF NOT FOUND OR NOT v_active OR v_revision<>v_draft_revision THEN
    RAISE EXCEPTION 'Publish the current saved seating plan before issuing student codes.';
  END IF;
  SELECT count(*) INTO v_count FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=p_event_id AND s.status='approved';
  IF v_count=0 OR v_count>2000 THEN RAISE EXCEPTION 'No valid approved students'; END IF;
  DELETE FROM public.gcc_v103_student_codes WHERE event_id=p_event_id;
  FOR r IN
    SELECT st.id, st.display_name, s.school_name, s.country_name
      FROM public.gcc_session_signup_students st
      JOIN public.gcc_session_signups s ON s.id=st.signup_id
      WHERE s.event_id=p_event_id AND s.status='approved'
      ORDER BY s.school_name,st.sort_order,st.id
  LOOP
    -- 96 bits from a cryptographic RNG. Do not use short PINs or predictable IDs.
    v_code:=upper(encode(extensions.gen_random_bytes(12),'hex'));
    INSERT INTO public.gcc_v103_student_codes(event_id,student_id,code_hash)
    VALUES(p_event_id,r.id,encode(sha256(convert_to(lower(v_code),'UTF8')),'hex'));
    v_codes:=v_codes || jsonb_build_array(jsonb_build_object(
      'school',r.school_name,'country',r.country_name,'name',r.display_name,'code',v_code));
  END LOOP;
  RETURN jsonb_build_object('codes',v_codes,'count',v_count,'message','Copy the codes now; they cannot be retrieved again.');
END $$;

-- Student self-service lookup requires the shared link token AND a strong student code.
-- The old lookup is called only server-side after student code verification.
CREATE OR REPLACE FUNCTION public.gcc_v103_find_my_room(
  p_token text, p_student_name text, p_school_name text, p_access_code text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_event_id uuid; v_matches integer;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$'
      OR p_access_code IS NULL OR p_access_code !~* '^[a-f0-9]{24}$'
      OR length(btrim(coalesce(p_student_name,''))) NOT BETWEEN 2 AND 120
      OR length(btrim(coalesce(p_school_name,''))) NOT BETWEEN 2 AND 160
  THEN RETURN NULL; END IF;
  SELECT p.event_id INTO v_event_id
    FROM public.gcc_v102_shared_plans p
    JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
    WHERE p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
      AND p.is_active=true AND p.revision=d.revision;
  IF v_event_id IS NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO v_matches
    FROM public.gcc_v103_student_codes c
    JOIN public.gcc_session_signup_students st ON st.id=c.student_id
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE c.event_id=v_event_id AND s.event_id=v_event_id AND s.status='approved'
      AND c.code_hash=encode(sha256(convert_to(lower(p_access_code),'UTF8')),'hex')
      AND lower(btrim(st.display_name))=lower(btrim(p_student_name))
      AND lower(btrim(s.school_name))=lower(btrim(p_school_name));
  IF v_matches<>1 THEN RETURN NULL; END IF;
  -- Old search function is no longer directly callable by browser users.
  RETURN public.gcc_v102_find_my_room(p_token,p_student_name,p_school_name);
END $$;

REVOKE ALL ON FUNCTION public.gcc_v103_code_status(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v103_issue_student_codes(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v103_find_my_room(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v103_code_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v103_issue_student_codes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v103_find_my_room(text,text,text,text) TO anon,authenticated;

-- Critical: disable the legacy public name+school-only lookup.
REVOKE EXECUTE ON FUNCTION public.gcc_v102_find_my_room(text,text,text) FROM PUBLIC,anon,authenticated;
