-- Restored disposable copy: prove that sensitive gates remain effective.
BEGIN;
DO $$ BEGIN
 IF has_schema_privilege('anon','gcc_roster_guard','USAGE')
 OR has_schema_privilege('authenticated','gcc_roster_guard','USAGE')
 OR has_table_privilege('anon','public.gcc_session_signups','SELECT')
 OR has_table_privilege('authenticated','public.gcc_session_signups','SELECT')
 OR has_function_privilege('anon','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Restored grants incorrect'; END IF;
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.bot_permits) OR EXISTS(SELECT 1 FROM gcc_roster_guard.admission_permits)
 THEN RAISE EXCEPTION 'Transaction permits survived'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gcc_v219_request_email_jobs WHERE status='sent' AND provider_email_id='fake-receipt' AND attempts=1)
 THEN RAISE EXCEPTION 'Restored sent receipt missing'; END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.gcc_test_roster_write('a4000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Restored gate bypassed';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_BOT_REQUIRED' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.gcc_v239_submit_protected_roster('a4000000-0000-4000-8000-000000000001',repeat('a',64),'','T','S','JP','Japan','[]','[]','[]');
  RAISE EXCEPTION 'Previously consumed receipt accepted after restore';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'GCC_BOT_INVALID' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: restored private grants, spent receipts, registration gates and sent mail state' AS result;
