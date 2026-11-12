-- GCC V22.5: hosts can resize published breakout rooms without rotating access credentials.
-- Both the saved plan and published revision are committed atomically.
-- Existing fixed-pair trigger and roster validation remain authoritative.
BEGIN;

CREATE OR REPLACE FUNCTION public.gcc_v225_locked_room_pairs(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  PERFORM public.gcc_v6_require_host();
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
    RAISE EXCEPTION 'Unknown session';
  END IF;
  RETURN (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('a', student_a, 'b', student_b) ORDER BY student_a, student_b),
      '[]'::jsonb
    )
    FROM public.gcc_v106_locked_pairs
    WHERE event_id = p_event_id
  );
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v225_resize_room_plan(
  p_event_id uuid, p_expected_revision integer, p_draft jsonb, p_target_rooms integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_previous integer;
  v_saved jsonb;
  v_revision integer;
  v_shared record;
  v_hash text;
  v_published boolean := false;
BEGIN
  -- Never trust client-side host screens or room-count limits alone.
  PERFORM public.gcc_v6_require_host();
  IF p_target_rooms IS NULL OR p_target_rooms NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Choose between 1 and 60 breakout rooms';
  END IF;
  IF p_draft IS NULL OR jsonb_typeof(p_draft->'rooms') <> 'array'
    OR jsonb_array_length(p_draft->'rooms') <> p_target_rooms
    OR (p_draft->'prefs'->>'rooms')::integer IS DISTINCT FROM p_target_rooms THEN
    RAISE EXCEPTION 'Room count does not match the updated plan';
  END IF;
  SELECT revision INTO v_previous FROM public.gcc_v91_room_drafts
  WHERE event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Save an initial room plan before resizing'; END IF;
  IF v_previous IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Another room edit was saved. Refresh and try again';
  END IF;

  -- A revoked invitation must remain revoked; do not silently reactivate it.
  SELECT is_active, token_hash INTO v_shared
    FROM public.gcc_v102_shared_plans WHERE event_id = p_event_id FOR UPDATE;
  IF FOUND AND NOT v_shared.is_active THEN
    RAISE EXCEPTION 'This session invitation was revoked; contact the administrator';
  END IF;

  -- Existing RPC verifies every approved student, every facilitator, revision,
  -- and the pair-lock trigger. Failure rolls back ALL updates in this function.
  v_saved := public.gcc_v91_save_room_draft(p_event_id, p_draft, p_expected_revision);
  v_revision := (v_saved->>'revision')::integer;
  UPDATE public.gcc_session_settings
    SET breakout_rooms = p_target_rooms, updated_at = now()
    WHERE event_id = p_event_id;
  IF NOT FOUND THEN
    INSERT INTO public.gcc_session_settings(event_id, breakout_rooms, max_students, facilitators_per_room)
    VALUES(p_event_id, p_target_rooms, 150, (p_draft->'prefs'->>'facilitatorsPerRoom')::integer);
  END IF;

  -- In the same transaction, make the existing published URL/code show the
  -- new room count. Do NOT replace token_hash, code_hash, publication_hash,
  -- expiry, enable/disable flags, or saved Zoom URL.
  UPDATE public.gcc_v102_shared_plans
     SET revision = v_revision, published_at = now(), published_by = auth.uid()
     WHERE event_id = p_event_id AND is_active = true
     RETURNING token_hash INTO v_hash;
  IF FOUND THEN
    UPDATE public.gcc_v104_shared_access
      SET revision = v_revision
      WHERE event_id = p_event_id AND publication_hash = v_hash;
    v_published := true;
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'revision', v_revision,
    'rooms', p_target_rooms,
    'published', v_published,
    'same_permanent_link', true,
    'same_six_digit_code', true
  );
END $fn$;

REVOKE ALL ON FUNCTION public.gcc_v225_locked_room_pairs(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gcc_v225_resize_room_plan(uuid,integer,jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v225_locked_room_pairs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v225_resize_room_plan(uuid,integer,jsonb,integer) TO authenticated;
COMMIT;
