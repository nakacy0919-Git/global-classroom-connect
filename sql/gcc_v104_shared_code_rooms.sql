-- GCC V10.4 | One session code; one read-only complete room chart.
-- Preserves events, registration, V9.1 drafts, published share links and V10.3 codes.
-- IMPORTANT: apply ONLY after frontend V10.4 is installed; V10.3 room lookup is revoked.
CREATE TABLE IF NOT EXISTS public.gcc_v104_shared_access (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  publication_hash text NOT NULL CHECK (publication_hash ~ '^[a-f0-9]{64}$'),
  revision integer NOT NULL CHECK (revision > 0),
  code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 12),
  window_started_at timestamptz,
  locked_until timestamptz
);
ALTER TABLE public.gcc_v104_shared_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v104_shared_access FROM PUBLIC, anon, authenticated;

-- Host-only state. Never exposes the code, token, or hash.
CREATE OR REPLACE FUNCTION public.gcc_v104_code_status(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();
  SELECT a.enabled, a.issued_at, a.expires_at, a.revision, a.publication_hash,
         p.revision AS published_revision, p.token_hash, p.is_active,
         d.revision AS draft_revision
    INTO v FROM public.gcc_v104_shared_access a
    LEFT JOIN public.gcc_v102_shared_plans p ON p.event_id=a.event_id
    LEFT JOIN public.gcc_v91_room_drafts d ON d.event_id=a.event_id
    WHERE a.event_id=p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'issued',false); END IF;
  RETURN jsonb_build_object('issued',true,
    'ready', v.enabled AND v.expires_at>now() AND v.is_active
      AND v.revision=v.published_revision AND v.revision=v.draft_revision
      AND v.publication_hash=v.token_hash,
    'expires_at',v.expires_at,'issued_at',v.issued_at);
END $$;

-- Auto-generates a six-digit numeric code. Returns it ONE time; only a salted
-- (publication-token-bound) hash is persisted. New issuance revokes old code.
CREATE OR REPLACE FUNCTION public.gcc_v104_issue_shared_code(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v record;v_code text;v_num bigint;v_expiry timestamptz;
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
  v_num:=('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint;
  v_code:=lpad((v_num % 1000000)::text,6,'0');
  v_expiry:=greatest(now()+interval '24 hours',least(now()+interval '60 days',v.starts_at+interval '1 day'));
  INSERT INTO public.gcc_v104_shared_access
    (event_id,publication_hash,revision,code_hash,enabled,expires_at,issued_at,
     failed_attempts,window_started_at,locked_until)
  VALUES (p_event_id,v.token_hash,v.revision,
    encode(sha256(convert_to(v_code||':'||v.token_hash,'UTF8')),'hex'),
    true,v_expiry,now(),0,NULL,NULL)
  ON CONFLICT(event_id) DO UPDATE SET publication_hash=EXCLUDED.publication_hash,
    revision=EXCLUDED.revision,code_hash=EXCLUDED.code_hash,enabled=true,
    expires_at=EXCLUDED.expires_at,issued_at=now(),failed_attempts=0,
    window_started_at=NULL,locked_until=NULL;
  RETURN jsonb_build_object('code',v_code,'expires_at',v_expiry);
END $$;

CREATE OR REPLACE FUNCTION public.gcc_v104_disable_shared_code(p_event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();
  UPDATE public.gcc_v104_shared_access SET enabled=false WHERE event_id=p_event_id;
  RETURN FOUND;
END $$;

-- The guest submits one shared code and the unguessable private link.
-- On failure increment a serialized session-wide counter; 12 failed attempts
-- within 15m lock the lookup for 15m. This is NOT a replacement for IP/WAF
-- rate limiting in production, and can be abused for a denial of service.
CREATE OR REPLACE FUNCTION public.gcc_v104_open_room_chart(p_token text,p_access_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v record;g record;v_room_rec record;v_approved integer;v_saved integer;v_unique integer;
        v_rooms jsonb:='[]'::jsonb;v_students jsonb;v_facilitators jsonb;
        v_attempts integer;v_start timestamptz;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR
     p_access_code IS NULL OR p_access_code !~ '^[0-9]{6}$'
  THEN RETURN NULL; END IF;
  SELECT p.event_id,p.token_hash,p.zoom_url,p.revision,p.is_active,
         d.revision AS current_revision,d.draft,e.title
  INTO v FROM public.gcc_v102_shared_plans p
  JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
  JOIN public.events e ON e.id=p.event_id
  WHERE p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
    AND p.is_active=true AND p.revision=d.revision;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO g FROM public.gcc_v104_shared_access a
    WHERE a.event_id=v.event_id FOR UPDATE;
  IF NOT FOUND OR NOT g.enabled OR g.expires_at<=now() OR
     g.publication_hash<>v.token_hash OR g.revision<>v.revision OR
     (g.locked_until IS NOT NULL AND g.locked_until>now())
  THEN RETURN NULL; END IF;
  IF encode(sha256(convert_to(p_access_code||':'||v.token_hash,'UTF8')),'hex')<>g.code_hash THEN
    v_start:=CASE WHEN g.window_started_at IS NULL OR g.window_started_at<now()-interval '15 minutes'
      THEN now() ELSE g.window_started_at END;
    v_attempts:=CASE WHEN g.window_started_at IS NULL OR g.window_started_at<now()-interval '15 minutes'
      THEN 1 ELSE least(12,g.failed_attempts+1) END;
    UPDATE public.gcc_v104_shared_access
      SET failed_attempts=v_attempts, window_started_at=v_start,
          locked_until=CASE WHEN v_attempts>=12 THEN now()+interval '15 minutes' ELSE NULL END
      WHERE event_id=v.event_id;
    RETURN NULL;
  END IF;
  UPDATE public.gcc_v104_shared_access
    SET failed_attempts=0, window_started_at=NULL,locked_until=NULL WHERE event_id=v.event_id;
  SELECT count(*) INTO v_approved FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=v.event_id AND s.status='approved';
  SELECT count(*),count(DISTINCT entry.id) INTO v_saved,v_unique
    FROM jsonb_array_elements(v.draft->'rooms') r(room),
      LATERAL jsonb_array_elements_text(r.room->'students') entry(id);
  IF v_approved=0 OR v_approved<>v_saved OR v_saved<>v_unique OR EXISTS (
    SELECT st.id::text FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=v.event_id AND s.status='approved'
    EXCEPT
    SELECT member.id FROM jsonb_array_elements(v.draft->'rooms') r(room),
      LATERAL jsonb_array_elements_text(r.room->'students') member(id)
  ) THEN RETURN NULL; END IF;
  FOR v_room_rec IN SELECT value AS room FROM jsonb_array_elements(v.draft->'rooms') LOOP
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name',st.display_name,'school',s.school_name,'country',s.country_name)
       ORDER BY st.sort_order),'[]'::jsonb)
    INTO v_students FROM jsonb_array_elements_text(v_room_rec.room->'students') member(id)
    JOIN public.gcc_session_signup_students st ON st.id::text=member.id
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=v.event_id AND s.status='approved';
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name',f.name,'school',s.school_name)
      ORDER BY f.ord),'[]'::jsonb) INTO v_facilitators
    FROM jsonb_array_elements_text(v_room_rec.room->'facilitators') role(id)
    JOIN public.gcc_session_signups s ON s.event_id=v.event_id AND s.status='approved'
    JOIN LATERAL (SELECT member.value AS name,member.ordinality AS ord
      FROM jsonb_array_elements_text(s.facilitators) WITH ORDINALITY member(value,ordinality)) f
      ON role.id=(s.id::text || ':fac:' || (f.ord-1)::text);
    v_rooms:=v_rooms||jsonb_build_array(jsonb_build_object(
      'room_number',(v_room_rec.room->>'number')::integer,
      'students',v_students,'facilitators',v_facilitators));
  END LOOP;
  RETURN jsonb_build_object('session',v.title,'rooms',v_rooms,
    'zoom_url',v.zoom_url,'expires_at',g.expires_at);
END $$;

REVOKE ALL ON FUNCTION public.gcc_v104_code_status(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v104_issue_shared_code(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v104_disable_shared_code(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v104_open_room_chart(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v104_code_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v104_issue_shared_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v104_disable_shared_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v104_open_room_chart(text,text) TO anon,authenticated;
-- Explicitly disable EVERY earlier browser lookup path. Keep underlying tables untouched.
REVOKE EXECUTE ON FUNCTION public.gcc_v102_find_my_room(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.gcc_v103_find_my_room(text,text,text,text) FROM PUBLIC,anon,authenticated;
-- No longer issue per-student codes to ordinary host clients.
REVOKE EXECUTE ON FUNCTION public.gcc_v103_issue_student_codes(uuid) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.gcc_v103_code_status(uuid) FROM PUBLIC,anon,authenticated;
