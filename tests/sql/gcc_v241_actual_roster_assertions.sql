-- CI-only actual function bodies loaded from catalog snapshot, then V241 patch.
ALTER FUNCTION public.gcc_v7_english_name(text) SET search_path TO '';
REVOKE ALL ON FUNCTION public.gcc_v165_store_pair_requests(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v8_submit_roster(uuid,text,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v8_submit_roster(uuid,text,text,text,text,jsonb,jsonb) TO anon,authenticated;
CREATE TRIGGER gcc_v7_validate_signup_trigger BEFORE INSERT OR UPDATE ON public.gcc_session_signups FOR EACH ROW EXECUTE FUNCTION public.gcc_v7_validate_signup();
CREATE TRIGGER gcc_v7_validate_student_trigger BEFORE INSERT OR UPDATE ON public.gcc_session_signup_students FOR EACH ROW EXECUTE FUNCTION public.gcc_v7_validate_student();
CREATE TRIGGER gcc_v203_event_deadline BEFORE INSERT ON public.gcc_session_signups FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_enforce_event_deadline();
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$ BEGIN
 PERFORM public.gcc_v6_submit_signup(repeat('a',32),'a6000000-0000-4000-8000-000000000001','Legacy Teacher','Legacy School','JP','Japan','[{"name":"Student One"}]','[]');
 BEGIN
  PERFORM public.gcc_v8_submit_roster('a6000000-0000-4000-8000-000000000001','Legacy Teacher','Legacy School','JP','Japan','[{"name":"Student Two"}]','[]');
  RAISE EXCEPTION 'Cross-route duplicate accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%already registered for this session%' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v6_submit_signup(repeat('b',32),'a6000000-0000-4000-8000-000000000001','Other Teacher','Other School','PH','Philippines','[{"name":"Student Two"},{"name":"Student Three"}]','[]');
  RAISE EXCEPTION 'Legacy capacity bypass';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'This session has reached its registration capacity' THEN RAISE; END IF; END;
 PERFORM public.gcc_v165_submit_roster('a6000000-0000-4000-8000-000000000001','Other Teacher','Other School','PH','Philippines','[{"name":"Student Two"}]','[]','[]');
 BEGIN
  PERFORM public.gcc_v6_submit_signup(repeat('a',32),'a6000000-0000-4000-8000-000000000005','Different Teacher','Different School','JP','Japan','[{"name":"Student One"}]','[]');
  RAISE EXCEPTION 'Legacy code reassignment accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%already associated%' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v6_submit_signup(repeat('c',32),'a6000000-0000-4000-8000-000000000005','Legacy Teacher','Legacy School','JP','Japan','[{"name":"Student One"}]','[]');
  RAISE EXCEPTION 'Revoked legacy code accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Invitation code has expired or is invalid' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v6_submit_signup(repeat('a',32),'a6000000-0000-4000-8000-000000000004','Legacy Teacher','Legacy School','JP','Japan','[{"name":"Student One"}]','[]');
  RAISE EXCEPTION 'Deadline bypassed';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Registration is closed for this session' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v6_submit_signup(repeat('a',32),'a6000000-0000-4000-8000-000000000003','Legacy Teacher','Legacy School','JP','Japan','[{"name":"Student One"}]','[]');
  RAISE EXCEPTION 'Legacy route bypassed protected event';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_INVITE_REQUIRED' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a6000000-0000-4000-8000-000000000003',repeat('9',64),repeat('f',64),'Guest Teacher','Test Philippines School','PH','Philippines','[{"name":"Student One"},{"name":"Student Two"}]','[]','[{"a":0,"b":0,"room":1}]');
  RAISE EXCEPTION 'Invalid pair accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%Pair members must be different students%' THEN RAISE; END IF; END;
 PERFORM public.gcc_v239_submit_protected_roster('a6000000-0000-4000-8000-000000000003',repeat('9',64),repeat('f',64),'Guest Teacher','Test Philippines School','PH','Philippines','[{"name":"Student One"},{"name":"Student Two"}]','[]','[{"a":0,"b":1,"room":1}]');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.gcc_session_signup_students st JOIN public.gcc_session_signups s ON s.id=st.signup_id WHERE s.event_id='a6000000-0000-4000-8000-000000000001')<>2 THEN RAISE EXCEPTION 'Capacity parity failed'; END IF;
 IF (SELECT count(*) FROM public.gcc_session_signup_students st JOIN public.gcc_session_signups s ON s.id=st.signup_id WHERE s.event_id='a6000000-0000-4000-8000-000000000003')<>2 THEN RAISE EXCEPTION 'Stacked roster rollback failed'; END IF;
 IF (SELECT count(*) FROM public.gcc_v165_pair_requests)<>1 THEN RAISE EXCEPTION 'Expected one actual pair'; END IF;
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.bot_permits) OR EXISTS(SELECT 1 FROM gcc_roster_guard.admission_permits) THEN RAISE EXCEPTION 'Permit leaked'; END IF;
END $$;
SELECT 'PASS: actual V6/V8/V165 bodies, shared capacity, deadline, code association, combined admission and real pair rollback' AS result;
