-- GCC V23.6: staged short-window roster admission guard.
-- Manual release candidate ONLY. Review policy and test in isolated Supabase before applying.
-- Covers every INSERT, including V8, V165->V8, and V6 legacy invitation registration.
-- Limits committed school registration batches, NOT students or IP addresses.
BEGIN;
CREATE SCHEMA IF NOT EXISTS gcc_roster_guard;
REVOKE ALL ON SCHEMA gcc_roster_guard FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS gcc_roster_guard.event_limits (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
 max_batches integer NOT NULL CHECK(max_batches BETWEEN 1 AND 120)
);
CREATE TABLE IF NOT EXISTS gcc_roster_guard.event_windows (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
 window_started_at timestamptz NOT NULL,
 accepted_count integer NOT NULL CHECK(accepted_count BETWEEN 1 AND 120)
);
ALTER TABLE gcc_roster_guard.event_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_roster_guard.event_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE gcc_roster_guard.event_limits,gcc_roster_guard.event_windows FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION gcc_roster_guard.enforce_roster_burst()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_limit integer;
 v_now timestamptz;
 v_count integer;
BEGIN
 -- Serialize by event, in the same lock order as the existing V8 capacity check.
 -- Each event has only one counter. No school name, student name or address is stored.
 PERFORM 1 FROM public.events e WHERE e.id=NEW.event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session is unavailable'; END IF;
 SELECT l.max_batches INTO v_limit FROM gcc_roster_guard.event_limits l WHERE l.event_id=NEW.event_id;
 v_limit:=coalesce(v_limit,24);
 v_now:=clock_timestamp();
 INSERT INTO gcc_roster_guard.event_windows AS w(event_id,window_started_at,accepted_count)
 VALUES(NEW.event_id,v_now,1)
 ON CONFLICT(event_id) DO UPDATE SET
  window_started_at=CASE WHEN w.window_started_at<=v_now-interval '5 minutes' THEN v_now ELSE w.window_started_at END,
  accepted_count=CASE WHEN w.window_started_at<=v_now-interval '5 minutes' THEN 1 ELSE w.accepted_count+1 END
 WHERE w.window_started_at<=v_now-interval '5 minutes' OR w.accepted_count<v_limit
 RETURNING accepted_count INTO v_count;
 IF NOT FOUND THEN
  RAISE EXCEPTION USING ERRCODE='P0001',
   MESSAGE='GCC_ROSTER_BUSY',
   DETAIL='This session is receiving many registrations. Please wait a few minutes and try again, or contact your host.';
 END IF;
 -- If a later insert, validation, or pair-request operation fails, this counter rolls back too.
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION gcc_roster_guard.enforce_roster_burst() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gcc_v236_roster_burst ON public.gcc_session_signups;
CREATE TRIGGER gcc_v236_roster_burst
 BEFORE INSERT ON public.gcc_session_signups
 FOR EACH ROW EXECUTE FUNCTION gcc_roster_guard.enforce_roster_burst();
COMMIT;
