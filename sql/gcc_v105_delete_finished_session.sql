-- GCC V10.5: host-only removal of finished/draft sessions.
-- Safeguards: title confirmation, server-side timing check, private snapshot, transactional cleanup.
-- No existing session is removed by installing this migration.

CREATE SCHEMA IF NOT EXISTS gcc_maintenance;
REVOKE ALL ON SCHEMA gcc_maintenance FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS gcc_maintenance.deleted_session_archives (
  event_id uuid PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid NOT NULL,
  title text NOT NULL,
  snapshot jsonb NOT NULL
);
ALTER TABLE gcc_maintenance.deleted_session_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE gcc_maintenance.deleted_session_archives FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v105_delete_finished_session(
  p_event_id uuid,
  p_expected_title text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_event public.events%ROWTYPE;
  v_snapshot jsonb;
  v_deleted integer;
BEGIN
  -- Only a logged-in host, never a guest/teacher with a public registration link.
  PERFORM public.gcc_v6_require_host();
  IF p_event_id IS NULL OR p_expected_title IS NULL THEN
    RAISE EXCEPTION 'Session ID and exact title are required';
  END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This session no longer exists. Refresh the page.';
  END IF;
  IF v_event.title IS DISTINCT FROM p_expected_title THEN
    RAISE EXCEPTION 'Session title does not match. Nothing was deleted.';
  END IF;
  -- Event end time is not stored, so we use a conservative 2-hour buffer.
  -- Explicit drafts may be removed regardless of their planned start date.
  IF NOT (
    v_event.status = 'draft' OR
    (v_event.status IN ('published','completed')
      AND v_event.starts_at IS NOT NULL
      AND v_event.starts_at <= now() - interval '2 hours')
  ) THEN
    RAISE EXCEPTION 'Only drafts and sessions started over 2 hours ago may be deleted.';
  END IF;
  IF EXISTS (SELECT 1 FROM gcc_maintenance.deleted_session_archives WHERE event_id=p_event_id) THEN
    RAISE EXCEPTION 'This session already has an archive. Contact the host administrator.';
  END IF;

  -- Save a private recovery snapshot before removing session-specific records.
  -- Deliberately do not delete global schools, teachers or participant profiles.
  SELECT jsonb_build_object(
    'event', to_jsonb(v_event),
    'settings', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_session_settings t WHERE t.event_id=p_event_id),
    'signups', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_session_signups t WHERE t.event_id=p_event_id),
    'signup_students', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_session_signup_students t
      WHERE t.signup_id IN (SELECT id FROM public.gcc_session_signups WHERE event_id=p_event_id)),
    'facilitators', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_event_facilitators t WHERE t.event_id=p_event_id),
    'event_participants', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.event_participants t WHERE t.event_id=p_event_id),
    'rounds', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.rounds t WHERE t.event_id=p_event_id),
    'rooms', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.rooms t WHERE t.round_id IN
        (SELECT id FROM public.rounds WHERE event_id=p_event_id)),
    'room_assignments', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.room_assignments t WHERE t.round_id IN
        (SELECT id FROM public.rounds WHERE event_id=p_event_id)),
    'room_draft', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_v91_room_drafts t WHERE t.event_id=p_event_id),
    'shared_plans', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_v102_shared_plans t WHERE t.event_id=p_event_id),
    'student_codes', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_v103_student_codes t WHERE t.event_id=p_event_id),
    'shared_access', (SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)
      FROM public.gcc_v104_shared_access t WHERE t.event_id=p_event_id)
  ) INTO v_snapshot;

  INSERT INTO gcc_maintenance.deleted_session_archives
    (event_id, deleted_by, title, snapshot)
  VALUES (p_event_id, auth.uid(), v_event.title, v_snapshot);

  -- The signups FK uses RESTRICT. Remove only this session's signups first;
  -- signup_students and event_facilitators cascade from the signup records.
  DELETE FROM public.gcc_session_signups WHERE event_id = p_event_id;
  -- Other room/share/event-specific tables cascade from events.
  DELETE FROM public.events WHERE id = p_event_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 1 THEN
    RAISE EXCEPTION 'Deletion could not be verified. All changes were rolled back.';
  END IF;
  RETURN jsonb_build_object('deleted',true,'event_id',p_event_id,'title',v_event.title,'archived',true);
END
$function$;
REVOKE ALL ON FUNCTION public.gcc_v105_delete_finished_session(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v105_delete_finished_session(uuid,text) TO authenticated;
