-- Tests only, using deterministic synthetic digests and events.
INSERT INTO gcc_roster_guard.bot_required VALUES ('a4000000-0000-4000-8000-000000000001'),('a4000000-0000-4000-8000-000000000003');
INSERT INTO gcc_roster_guard.invite_required VALUES ('a4000000-0000-4000-8000-000000000003');
INSERT INTO gcc_roster_guard.verified_required VALUES ('a4000000-0000-4000-8000-000000000003');
INSERT INTO gcc_roster_guard.invitations(event_id,token_hash,expires_at)
 VALUES ('a4000000-0000-4000-8000-000000000003',encode(sha256(convert_to(repeat('e',64),'UTF8')),'hex'),now()+interval '1 hour');
DO $$ BEGIN
 IF has_function_privilege('anon','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')
 OR has_schema_privilege('anon','gcc_roster_guard','USAGE') THEN RAISE EXCEPTION 'Receipt issuer privilege incorrect'; END IF;
END $$;
SET ROLE service_role;
DO $$ BEGIN
 IF public.gcc_v239_issue_bot_receipt('a4000000-0000-4000-8000-000000000001',repeat('1',64)) !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Receipt format'; END IF;
 BEGIN
  PERFORM public.gcc_v239_issue_bot_receipt('a4000000-0000-4000-8000-000000000003',repeat('1',64));
  RAISE EXCEPTION 'Replayed provider challenge accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO gcc_roster_guard.bot_receipts(event_id,receipt_hash,challenge_hash,expires_at) VALUES
 ('a4000000-0000-4000-8000-000000000001',encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'),repeat('2',64),now()+interval '2 minutes'),
 ('a4000000-0000-4000-8000-000000000001',encode(sha256(convert_to(repeat('b',64),'UTF8')),'hex'),repeat('3',64),now()-interval '1 minute'),
 ('a4000000-0000-4000-8000-000000000003',encode(sha256(convert_to(repeat('c',64),'UTF8')),'hex'),repeat('4',64),now()+interval '2 minutes');
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$ BEGIN
 IF NOT public.gcc_v239_bot_policy('a4000000-0000-4000-8000-000000000001') OR public.gcc_v239_bot_policy('a4000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Wrong event policy'; END IF;
 BEGIN
  PERFORM public.gcc_test_roster_write('a4000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Legacy insert bypass';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_BOT_REQUIRED' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000001',repeat('b',64),'','T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Expired receipt';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_BOT_INVALID' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000003',repeat('a',64),'','T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Wrong-event receipt';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_BOT_INVALID' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000001',repeat('a',64),'','T','S','JP','Japan','[]','[]','[1]');
  RAISE EXCEPTION 'Expected pair failure';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Synthetic pair validation failure' THEN RAISE; END IF; END;
 PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000001',repeat('a',64),'','T','S','JP','Japan','[]','[]','[]');
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000001',repeat('a',64),'','T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Receipt reused';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_BOT_INVALID' THEN RAISE; END IF; END;
 PERFORM public.gcc_test_roster_write('a4000000-0000-4000-8000-000000000002');
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000003',repeat('c',64),repeat('e',64),'Guest Teacher','Test Philippines School','PH','Philippines','[]','[]','[]');
  RAISE EXCEPTION 'Anonymous bypassed teacher gate';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_VERIFIED_TEACHER_REQUIRED' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000003',repeat('c',64),repeat('e',64),'Guest Teacher','Test Philippines School','PH','Philippines','[]','[]','[]');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.bot_permits) OR EXISTS(SELECT 1 FROM gcc_roster_guard.admission_permits) THEN RAISE EXCEPTION 'Permit persisted'; END IF;
 IF (SELECT count(*) FROM public.gcc_session_signups WHERE event_id IN ('a4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000003'))<>2 THEN RAISE EXCEPTION 'Unexpected admission count'; END IF;
END $$;
SELECT 'PASS: trusted issuer, no legacy bypass, expiry, replay, atomic retry and combined invitation/teacher/bot checks' AS result;
