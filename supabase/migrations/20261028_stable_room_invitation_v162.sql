-- GCC V16.2: stable published link and six-digit code for each session.
-- Existing published token hashes and code hashes are never replaced.
-- No existing credential or registration data is modified during migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v102_publish_room_plan(
  p_event_id uuid,p_expected_revision integer,p_zoom_url text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_draft jsonb;v_revision integer;v_token text;v_count integer;v_saved_count integer;v_existing record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();
  SELECT d.draft,d.revision INTO v_draft,v_revision
  FROM public.gcc_v91_room_drafts d
  WHERE d.event_id=p_event_id FOR SHARE;
  IF NOT FOUND OR v_revision<>p_expected_revision THEN
    RAISE EXCEPTION 'Save the latest room arrangement before sharing.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id=p_event_id AND status IN ('published','live')) THEN
    RAISE EXCEPTION 'Publish the session before sharing its seating plan.';
  END IF;
  IF p_zoom_url IS NULL OR length(p_zoom_url)>2000 OR
    p_zoom_url !~* '^https://([a-z0-9-]+\.)*zoom\.us(/|$)' THEN
    RAISE EXCEPTION 'Enter a valid https:// zoom.us meeting link.';
  END IF;
  SELECT count(*) INTO v_count
    FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=p_event_id AND s.status='approved';
  SELECT count(*) INTO v_saved_count
    FROM jsonb_array_elements(v_draft->'rooms') r(room),
    LATERAL jsonb_array_elements_text(r.room->'students') student(id);
  IF v_count=0 OR v_count<>v_saved_count OR EXISTS (
     SELECT st.id::text FROM public.gcc_session_signup_students st
     JOIN public.gcc_session_signups s ON s.id=st.signup_id
     WHERE s.event_id=p_event_id AND s.status='approved'
     EXCEPT
     SELECT student.id FROM jsonb_array_elements(v_draft->'rooms') r(room),
         LATERAL jsonb_array_elements_text(r.room->'students') student(id)
  ) THEN
    RAISE EXCEPTION 'Approved students have changed. Generate and save a new plan first.';
  END IF;
  -- If an invitation was already issued, never rotate its token. Advance only
  -- the published revision and Zoom URL, preserving the existing access code.
  SELECT p.revision,p.is_active,p.token_hash INTO v_existing
  FROM public.gcc_v102_shared_plans p WHERE p.event_id=p_event_id FOR UPDATE;
  IF FOUND THEN
    IF NOT v_existing.is_active THEN
      RAISE EXCEPTION 'This invitation was revoked. Contact the administrator; it cannot be silently replaced.';
    END IF;
    UPDATE public.gcc_v102_shared_plans SET revision=v_revision,zoom_url=p_zoom_url,
      published_at=now(),published_by=auth.uid() WHERE event_id=p_event_id;
    UPDATE public.gcc_v104_shared_access SET revision=v_revision
      WHERE event_id=p_event_id AND publication_hash=v_existing.token_hash;
    RETURN jsonb_build_object('token',NULL,'revision',v_revision,'published',true,
      'existing_link',true,'code_unchanged',true);
  END IF;
  v_token:=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  INSERT INTO public.gcc_v102_shared_plans(event_id,revision,token_hash,zoom_url,is_active,published_at,published_by)
  VALUES (p_event_id,v_revision,encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_zoom_url,true,now(),auth.uid())
;
  RETURN jsonb_build_object('token',v_token,'revision',v_revision,'published',true);
END $$;
CREATE OR REPLACE FUNCTION public.gcc_v104_issue_shared_code(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v record;v_existing record;v_code text;v_num bigint;v_expiry timestamptz;
        v_approved integer;v_saved integer;v_unique integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();
  SELECT p.token_hash,p.revision,p.is_active,d.revision AS draft_revision,
         d.draft,e.starts_at
  INTO v FROM public.gcc_v102_shared_plans p
  JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
  JOIN public.events e ON e.id=p.event_id
  WHERE p.event_id=p_event_id FOR UPDATE OF p;
  IF NOT FOUND OR NOT v.is_active OR v.revision<>v.draft_revision THEN
    RAISE EXCEPTION 'Publish the latest saved seating plan before issuing a code.';
  END IF;
  SELECT count(*) INTO v_approved FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=p_event_id AND s.status='approved';
  SELECT count(*),count(DISTINCT entry.id) INTO v_saved,v_unique
    FROM jsonb_array_elements(v.draft->'rooms') r(room),
      LATERAL jsonb_array_elements_text(r.room->'students') entry(id);
  IF v_approved=0 OR v_approved>2000 OR v_approved<>v_saved OR v_saved<>v_unique OR EXISTS (
    SELECT st.id::text FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=p_event_id AND s.status='approved'
    EXCEPT
    SELECT member.id FROM jsonb_array_elements(v.draft->'rooms') r(room),
      LATERAL jsonb_array_elements_text(r.room->'students') member(id)
  ) THEN RAISE EXCEPTION 'Approved students and saved room assignments do not match.'; END IF;
  -- The code hash is bound to the immutable publication token.
  -- Never generate a replacement for an existing session.
  SELECT a.enabled,a.expires_at INTO v_existing
  FROM public.gcc_v104_shared_access a WHERE a.event_id=p_event_id FOR UPDATE;
  IF FOUND THEN
    IF NOT v_existing.enabled OR v_existing.expires_at<=now() THEN
      RAISE EXCEPTION 'This session code is disabled or expired; it cannot be reissued.';
    END IF;
    RETURN jsonb_build_object('already_issued',true,'code',NULL,
      'expires_at',v_existing.expires_at);
  END IF;
  v_num:=('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint;
  v_code:=lpad((v_num % 1000000)::text,6,'0');
  v_expiry:=greatest(now()+interval '24 hours',least(now()+interval '60 days',v.starts_at+interval '1 day'));
  INSERT INTO public.gcc_v104_shared_access
    (event_id,publication_hash,revision,code_hash,enabled,expires_at,issued_at,
     failed_attempts,window_started_at,locked_until)
  VALUES (p_event_id,v.token_hash,v.revision,
    encode(sha256(convert_to(v_code||':'||v.token_hash,'UTF8')),'hex'),
    true,v_expiry,now(),0,NULL,NULL)
;
  RETURN jsonb_build_object('code',v_code,'expires_at',v_expiry);
END $$;
REVOKE ALL ON FUNCTION public.gcc_v102_publish_room_plan(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v102_publish_room_plan(uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.gcc_v104_issue_shared_code(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v104_issue_shared_code(uuid) TO authenticated;
COMMIT;
