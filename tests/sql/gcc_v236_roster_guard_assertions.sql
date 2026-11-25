-- Real guard function and trigger, with synthetic INSERT paths only.
INSERT INTO gcc_roster_guard.event_limits VALUES
 ('a1000000-0000-4000-8000-000000000001',2),
 ('a1000000-0000-4000-8000-000000000002',1),
 ('a1000000-0000-4000-8000-000000000003',1);
DO $$ BEGIN
 IF has_schema_privilege('anon','gcc_roster_guard','USAGE')
 OR has_schema_privilege('authenticated','gcc_roster_guard','USAGE')
 OR has_table_privilege('anon','gcc_roster_guard.event_windows','SELECT')
 OR has_table_privilege('authenticated','gcc_roster_guard.event_limits','UPDATE')
 OR has_function_privilege('anon','gcc_roster_guard.enforce_roster_burst()','EXECUTE')
 OR has_function_privilege('authenticated','gcc_roster_guard.enforce_roster_burst()','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected client grant on private guard'; END IF;
END $$;
SET ROLE anon;
SELECT public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000001',NULL,true);
  RAISE EXCEPTION 'Expected synthetic failure did not occur';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'Synthetic pair validation failure' THEN RAISE; END IF;
 END;
END $$;
-- One successful legacy invitation-style insert uses the same budget.
SELECT public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001');
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Third signup escaped the burst guard';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_ROSTER_BUSY' THEN RAISE; END IF; END;
END $$;
SELECT public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000002');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT accepted_count FROM gcc_roster_guard.event_windows WHERE event_id='a1000000-0000-4000-8000-000000000001')<>2 THEN RAISE EXCEPTION 'Counter incorrect after rollback'; END IF;
 IF (SELECT count(*) FROM public.gcc_session_signups WHERE event_id='a1000000-0000-4000-8000-000000000001')<>2 THEN RAISE EXCEPTION 'Unexpected registration inserted'; END IF;
END $$;
-- Simulated expiry, never a real wait.
UPDATE gcc_roster_guard.event_windows SET window_started_at=now()-interval '6 minutes'
 WHERE event_id='a1000000-0000-4000-8000-000000000001';
SET ROLE anon;
SELECT public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000001');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT accepted_count FROM gcc_roster_guard.event_windows WHERE event_id='a1000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Window did not reopen'; END IF;
END $$;
SELECT 'PASS: common insert guard, private grants, rollback, independent event and expiry' AS result;

-- Confirm proposed default without an event override.
SET ROLE anon;
DO $$ BEGIN
 FOR i IN 1..24 LOOP
  PERFORM public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000004');
 END LOOP;
 BEGIN
  PERFORM public.gcc_test_roster_write('a1000000-0000-4000-8000-000000000004');
  RAISE EXCEPTION 'Default allowance exceeded';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_ROSTER_BUSY' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT accepted_count FROM gcc_roster_guard.event_windows WHERE event_id='a1000000-0000-4000-8000-000000000004')<>24 THEN RAISE EXCEPTION 'Default allowance incorrect'; END IF;
END $$;
SELECT 'PASS: proposed default is enforced without event override' AS result;
