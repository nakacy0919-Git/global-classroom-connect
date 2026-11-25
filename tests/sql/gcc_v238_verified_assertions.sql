-- All data is synthetic. Real policy and trigger, stub signup RPC.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 IF public.gcc_v238_my_roster_identity()->>'school'<>'Test Philippines School' THEN RAISE EXCEPTION 'Wrong own profile'; END IF;
 BEGIN
  PERFORM public.gcc_v238_require_verified('a3000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Teacher enabled admin policy';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Host access required' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
SELECT public.gcc_v238_require_verified('a3000000-0000-4000-8000-000000000001');
RESET ROLE;
DO $$ BEGIN
 IF has_schema_privilege('anon','gcc_roster_guard','USAGE')
 OR has_function_privilege('anon','public.gcc_v238_my_roster_identity()','EXECUTE')
 OR has_function_privilege('anon','public.gcc_v238_require_verified(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected client permission'; END IF;
END $$;
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$ BEGIN
 IF NOT public.gcc_v238_roster_policy('a3000000-0000-4000-8000-000000000001') OR public.gcc_v238_roster_policy('a3000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Wrong event policy'; END IF;
 BEGIN
  PERFORM public.gcc_test_verified_write('a3000000-0000-4000-8000-000000000001','Guest Teacher','Test Philippines School','PH','b1000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Anonymous legacy route accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_VERIFIED_TEACHER_REQUIRED' THEN RAISE; END IF; END;
 PERFORM public.gcc_test_verified_write('a3000000-0000-4000-8000-000000000002','Other Teacher','Other School','JP');
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_test_verified_write('a3000000-0000-4000-8000-000000000001','Guest Teacher','Other School','PH');
  RAISE EXCEPTION 'Unlinked school accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_ROSTER_IDENTITY_MISMATCH' THEN RAISE; END IF; END;
 PERFORM public.gcc_test_verified_write('a3000000-0000-4000-8000-000000000001','Guest Teacher','Test Philippines School','PH');
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.gcc_session_signups WHERE event_id='a3000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Unexpected admission'; END IF;
 IF (SELECT country_name FROM public.gcc_session_signups WHERE event_id='a3000000-0000-4000-8000-000000000001')<>'Philippines' THEN RAISE EXCEPTION 'Country label not canonical'; END IF;
END $$;
UPDATE auth.users SET email_confirmed_at=NULL WHERE id='10000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN
 IF public.gcc_v238_my_roster_identity() IS NOT NULL THEN RAISE EXCEPTION 'Unconfirmed email accepted'; END IF;
 BEGIN
  PERFORM public.gcc_test_verified_write('a3000000-0000-4000-8000-000000000001','Guest Teacher','Test Philippines School','PH');
  RAISE EXCEPTION 'Unconfirmed teacher admitted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_VERIFIED_TEACHER_REQUIRED' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
UPDATE auth.users SET email_confirmed_at=now(),banned_until=now()+interval '1 hour' WHERE id='10000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN IF public.gcc_v238_my_roster_identity() IS NOT NULL THEN RAISE EXCEPTION 'Banned user accepted'; END IF; END $$;
RESET ROLE;
UPDATE auth.users SET banned_until=NULL WHERE id='10000000-0000-4000-8000-000000000002';
UPDATE public.schools SET is_active=false WHERE id='30000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN IF public.gcc_v238_my_roster_identity() IS NOT NULL THEN RAISE EXCEPTION 'Inactive school accepted'; END IF; END $$;
RESET ROLE;
UPDATE public.schools SET is_active=true WHERE id='30000000-0000-4000-8000-000000000002';
UPDATE public.teachers SET is_active=false WHERE id='20000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN IF public.gcc_v238_my_roster_identity() IS NOT NULL THEN RAISE EXCEPTION 'Inactive teacher accepted'; END IF; END $$;
RESET ROLE;
UPDATE public.teachers SET is_active=true WHERE id='20000000-0000-4000-8000-000000000002';
SELECT set_config('request.jwt.claim.sub','',false);
SELECT 'PASS: approved account and school match, no anonymous/legacy bypass, email and active checks' AS result;
