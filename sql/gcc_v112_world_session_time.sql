-- GCC V11.2: host-controlled explicit end time and secure world clocks.
-- Existing sessions retain their starts_at and NULL end unless host updates it.
BEGIN;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ends_at timestamptz;
DO $checks$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gcc_v112_event_duration_valid' AND conrelid='public.events'::regclass) THEN
   ALTER TABLE public.events ADD CONSTRAINT gcc_v112_event_duration_valid
   CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at>starts_at AND ends_at<=starts_at+interval '8 hours'));
 END IF;
END $checks$;
-- Existing events RLS still applies. The new column is available to the authenticated host.
GRANT SELECT (ends_at), INSERT (ends_at), UPDATE (ends_at) ON public.events TO authenticated;
CREATE OR REPLACE FUNCTION public.gcc_v112_open_room_chart(p_token text,p_access_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_chart jsonb;v_start timestamptz;v_end timestamptz;v_zone text;
BEGIN
  -- This function preserves original token+6-digit authorization, rate limiting, revisions and room set.
  v_chart:=public.gcc_v104_open_room_chart(p_token,p_access_code);
  IF v_chart IS NULL THEN RETURN NULL; END IF;
  SELECT e.starts_at,e.ends_at,e.timezone INTO v_start,v_end,v_zone
  FROM public.gcc_v102_shared_plans p JOIN public.events e ON e.id=p.event_id
  WHERE p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND p.is_active=true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN v_chart||jsonb_build_object('starts_at',v_start,'ends_at',v_end,'timezone',COALESCE(v_zone,'Asia/Tokyo'));
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v112_open_room_chart(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v112_open_room_chart(text,text) TO anon,authenticated;
COMMIT;
