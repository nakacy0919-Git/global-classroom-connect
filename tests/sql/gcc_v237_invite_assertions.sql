-- Keep tokens synthetic in a disposable CI database. Never print token values.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_v237_issue_invite('a2000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Ordinary teacher issued code';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Host access required' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
 IF public.gcc_v237_invite_status('a2000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Default must be open'; END IF;
 IF public.gcc_v237_issue_invite('a2000000-0000-4000-8000-000000000001') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid generated token'; END IF;
 IF NOT public.gcc_v237_invite_status('a2000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Policy not enabled'; END IF;
END $$;
RESET ROLE;
-- deterministic test-only token, not the generated code.
INSERT INTO gcc_roster_guard.invitations(event_id,token_hash,expires_at)
 VALUES ('a2000000-0000-4000-8000-000000000001',encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'),now()+interval '1 hour'),
 ('a2000000-0000-4000-8000-000000000001',encode(sha256(convert_to(repeat('b',64),'UTF8')),'hex'),now()-interval '1 hour');
DO $$ BEGIN
 IF has_schema_privilege('anon','gcc_roster_guard','USAGE') OR has_schema_privilege('authenticated','gcc_roster_guard','USAGE')
 OR has_function_privilege('anon','public.gcc_v237_issue_invite(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Private permission leak'; END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_test_roster_write('a2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Legacy route bypassed invitation';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_INVITE_REQUIRED' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v237_submit_invited_roster('a2000000-0000-4000-8000-000000000002',repeat('a',64),'T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Wrong event accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_INVITE_INVALID' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v237_submit_invited_roster('a2000000-0000-4000-8000-000000000001',repeat('b',64),'T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Expired token accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_INVITE_INVALID' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v237_submit_invited_roster('a2000000-0000-4000-8000-000000000001',repeat('a',64),'T','S','JP','Japan','[]','[]','[1]');
  RAISE EXCEPTION 'Expected pair validation failure';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Synthetic pair validation failure' THEN RAISE; END IF; END;
 PERFORM public.gcc_v237_submit_invited_roster('a2000000-0000-4000-8000-000000000001',repeat('a',64),'T','S','JP','Japan','[]','[]','[]');
 BEGIN
  PERFORM public.gcc_v237_submit_invited_roster('a2000000-0000-4000-8000-000000000001',repeat('a',64),'T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Redeemed token reused';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_INVITE_INVALID' THEN RAISE; END IF; END;
 PERFORM public.gcc_test_roster_write('a2000000-0000-4000-8000-000000000002');
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.admission_permits) THEN RAISE EXCEPTION 'Permit persisted'; END IF;
 IF (SELECT count(*) FROM public.gcc_session_signups WHERE event_id='a2000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Expected one invite registration'; END IF;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
SELECT public.gcc_v237_revoke_invites('a2000000-0000-4000-8000-000000000001');
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.invitations WHERE event_id='a2000000-0000-4000-8000-000000000001' AND redeemed_at IS NULL AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Revocation incomplete'; END IF;
END $$;
SELECT 'PASS: optional protected event, host-only issue, expiry, wrong-event denial, rollback, one-use, legacy gate, revoke' AS result;
