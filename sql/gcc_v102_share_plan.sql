-- Global Classroom Connect V10.2: Private, revocable seating-plan sharing.
-- Existing V9.1 drafts and legacy rooms/rosters are NOT modified.
-- Execute once in project ayrflycncfbvizlfchce in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.gcc_v102_shared_plans (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
  zoom_url text NOT NULL CHECK (length(zoom_url) BETWEEN 15 AND 2000),
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE public.gcc_v102_shared_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v102_shared_plans FROM PUBLIC, anon, authenticated;

-- A host can inspect the published state, but cannot recover a secret token.
CREATE OR REPLACE FUNCTION public.gcc_v102_host_share_status(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();
  SELECT p.revision, p.zoom_url, p.is_active, p.published_at,
         d.revision AS current_revision
  INTO v FROM public.gcc_v102_shared_plans p
  LEFT JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
  WHERE p.event_id=p_event_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('revision',v.revision,'zoom_url',v.zoom_url,
    'is_active',v.is_active,'published_at',v.published_at,
    'up_to_date',COALESCE(v.current_revision=v.revision,false));
END $$;

-- Publish a specific saved draft revision, replacing (revoking) the old link.
-- Only the new one-time access token is returned to the host.
CREATE OR REPLACE FUNCTION public.gcc_v102_publish_room_plan(
  p_event_id uuid,p_expected_revision integer,p_zoom_url text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_draft jsonb;v_revision integer;v_token text;v_count integer;v_saved_count integer;
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
  v_token:=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  INSERT INTO public.gcc_v102_shared_plans(event_id,revision,token_hash,zoom_url,is_active,published_at,published_by)
  VALUES (p_event_id,v_revision,encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_zoom_url,true,now(),auth.uid())
  ON CONFLICT(event_id) DO UPDATE SET revision=EXCLUDED.revision,token_hash=EXCLUDED.token_hash,
    zoom_url=EXCLUDED.zoom_url,is_active=true,published_at=now(),published_by=auth.uid();
  RETURN jsonb_build_object('token',v_token,'revision',v_revision,'published',true);
END $$;

-- Explicitly turn off any previously shared access link.
CREATE OR REPLACE FUNCTION public.gcc_v102_revoke_room_plan(p_event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();
  UPDATE public.gcc_v102_shared_plans SET is_active=false WHERE event_id=p_event_id;
  RETURN FOUND;
END $$;

-- Privacy: no roster listing. Only an exact student name AND school match reveal
-- that student's room, their ROOMMATES and the Zoom URL, with an unguessable link.
CREATE OR REPLACE FUNCTION public.gcc_v102_find_my_room(
  p_token text,p_student_name text,p_school_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v record;v_draft jsonb;v_student_id text;v_matches integer;v_room jsonb;
        v_members jsonb;v_facilitators jsonb;v_count integer;v_saved_count integer;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' OR
     length(btrim(coalesce(p_student_name,''))) NOT BETWEEN 2 AND 120 OR
     length(btrim(coalesce(p_school_name,''))) NOT BETWEEN 2 AND 160
  THEN RETURN NULL; END IF;
  SELECT p.event_id,p.revision,p.zoom_url,d.draft,d.revision AS current_revision
  INTO v FROM public.gcc_v102_shared_plans p
  JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
  WHERE p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND p.is_active=true;
  IF NOT FOUND OR v.revision<>v.current_revision THEN RETURN NULL; END IF;
  v_draft:=v.draft;
  -- A changed roster invalidates the published snapshot, rather than exposing old names.
  SELECT count(*) INTO v_count FROM public.gcc_session_signup_students st
  JOIN public.gcc_session_signups s ON s.id=st.signup_id
  WHERE s.event_id=v.event_id AND s.status='approved';
  SELECT count(*) INTO v_saved_count FROM jsonb_array_elements(v_draft->'rooms') r(room),
  LATERAL jsonb_array_elements_text(r.room->'students') st(id);
  IF v_count<>v_saved_count OR EXISTS (
    SELECT st.id::text FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
    WHERE s.event_id=v.event_id AND s.status='approved'
    EXCEPT
    SELECT st.id FROM jsonb_array_elements(v_draft->'rooms') r(room),
      LATERAL jsonb_array_elements_text(r.room->'students') st(id)
  ) THEN RETURN NULL; END IF;
  SELECT count(*),min(st.id::text) INTO v_matches,v_student_id
  FROM public.gcc_session_signup_students st
  JOIN public.gcc_session_signups s ON s.id=st.signup_id
  WHERE s.event_id=v.event_id AND s.status='approved'
    AND lower(btrim(st.display_name))=lower(btrim(p_student_name))
    AND lower(btrim(s.school_name))=lower(btrim(p_school_name));
  -- 0 matches or ambiguous duplicate names return the same generic response.
  IF v_matches<>1 THEN RETURN NULL; END IF;
  SELECT r.room INTO v_room
  FROM jsonb_array_elements(v_draft->'rooms') r(room),
    LATERAL jsonb_array_elements_text(r.room->'students') st(id)
  WHERE st.id=v_student_id LIMIT 1;
  IF v_room IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name',st.display_name,'school',s.school_name,'country',s.country_name)
    ORDER BY st.sort_order),'[]'::jsonb)
  INTO v_members FROM jsonb_array_elements_text(v_room->'students') member(id)
  JOIN public.gcc_session_signup_students st ON st.id::text=member.id
  JOIN public.gcc_session_signups s ON s.id=st.signup_id
  WHERE s.event_id=v.event_id AND s.status='approved';
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name',f.name,'school',s.school_name)
    ORDER BY f.ord),'[]'::jsonb) INTO v_facilitators
  FROM jsonb_array_elements_text(v_room->'facilitators') role(id)
  JOIN public.gcc_session_signups s ON s.event_id=v.event_id AND s.status='approved'
  JOIN LATERAL (SELECT member.value AS name,member.ordinality AS ord
        FROM jsonb_array_elements_text(s.facilitators) WITH ORDINALITY member(value,ordinality)) f
    ON role.id=(s.id::text || ':fac:' || (f.ord-1)::text);
  RETURN jsonb_build_object('room_number',(v_room->>'number')::integer,
    'students',v_members,'facilitators',v_facilitators,'zoom_url',v.zoom_url);
END $$;

REVOKE ALL ON FUNCTION public.gcc_v102_host_share_status(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v102_publish_room_plan(uuid,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v102_revoke_room_plan(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v102_find_my_room(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v102_host_share_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v102_publish_room_plan(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v102_revoke_room_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v102_find_my_room(text,text,text) TO anon,authenticated;
