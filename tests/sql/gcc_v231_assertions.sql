-- Execute only in the disposable GitHub Actions postgres container.
-- psql must use ON_ERROR_STOP=1, with prior fixture and staged SQL files applied.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE
 response jsonb; after_start timestamptz:=NULL; after_id uuid:=NULL;
 final_row jsonb; n integer; total integer:=0; page_count integer:=0;
 reported_count integer;
BEGIN
 LOOP
  response:=public.gcc_v231_teacher_browse_sessions_page(after_start,after_id,100);
  n:=jsonb_array_length(response->'items');
  IF n<1 OR n>100 THEN RAISE EXCEPTION 'Bad page length: %',n; END IF;
  page_count:=page_count+1;
  total:=total+n;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(response->'items') item
             WHERE item->'session_details' ? 'meeting_url')
   THEN RAISE EXCEPTION 'Private meeting link leaked'; END IF;
  SELECT item INTO final_row
  FROM jsonb_array_elements(response->'items') WITH ORDINALITY e(item,position)
  ORDER BY position DESC LIMIT 1;
  after_start:=(final_row->>'starts_at')::timestamptz;
  after_id:=(final_row->>'id')::uuid;
  EXIT WHEN (response->>'has_more')::boolean=false;
  IF page_count>10 THEN RAISE EXCEPTION 'Pagination did not terminate'; END IF;
 END LOOP;
 IF total<>326 OR page_count<>4 THEN
  RAISE EXCEPTION 'Expected 326 sessions across 4 pages, got % in %',total,page_count;
 END IF;
 response:=public.gcc_v226_registration_console(1,10,'','','');
 IF jsonb_array_length(response->'items')<>10 THEN
  RAISE EXCEPTION 'Admin first page did not return 10 users'; END IF;
 IF (response->'stats'->>'total')::integer<>252 OR
    (response->>'total_matches')::integer<>252 THEN
  RAISE EXCEPTION 'Admin registration totals are incomplete'; END IF;
 response:=public.gcc_v226_registration_console(2,50,'profile_incomplete','','');
 IF (response->>'total_matches')::integer<>250 OR
    jsonb_array_length(response->'items')<>50 THEN
  RAISE EXCEPTION 'Registration status pagination failed'; END IF;
 response:=public.gcc_v226_registration_console(1,10,'','JP','');
 IF (response->>'total_matches')::integer<>1 THEN
  RAISE EXCEPTION 'Registration country filter failed'; END IF;
END
$$;
-- An ordinary, approved teacher can see open partners but not closed host sessions.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE page jsonb; denied boolean:=false;
BEGIN
 page:=public.gcc_v231_teacher_browse_sessions_page(NULL,NULL,100);
 IF (page->'items'->0->>'id')='60000000-0000-4000-8000-000000000001'
 THEN RAISE EXCEPTION 'Other school closed session leaked'; END IF;
 BEGIN
  PERFORM public.gcc_v226_registration_console(1,10,'','','');
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Host access required%' THEN denied:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Teacher read host account directory'; END IF;
END
$$;
-- No JWT: approved-teacher browse must reject access.
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.gcc_v231_teacher_browse_sessions_page(NULL,NULL,100);
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Teacher sign-in required%' THEN denied:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Anonymous user accessed session directory'; END IF;
END
$$;
RESET ROLE;
-- Anonymous may not execute the privileged functions even with forged input.
SET ROLE anon;
DO $$
DECLARE permitted boolean;
BEGIN
 SELECT has_function_privilege(current_user,
  'public.gcc_v231_teacher_browse_sessions_page(timestamptz,uuid,integer)','EXECUTE')
 INTO permitted;
 IF permitted THEN RAISE EXCEPTION 'Anonymous EXECUTE grant on teacher browse'; END IF;
 SELECT has_function_privilege(current_user,
  'public.gcc_v226_registration_console(integer,integer,text,text,text)','EXECUTE')
 INTO permitted;
 IF permitted THEN RAISE EXCEPTION 'Anonymous EXECUTE grant on admin console'; END IF;
END
$$;
RESET ROLE;
-- Hardened name validator retains its functionality and catalog search path.
DO $$
DECLARE settings text[];
BEGIN
 SELECT p.proconfig INTO settings
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='gcc_v7_english_name';
 IF NOT ('search_path=pg_catalog'=ANY(settings)) THEN
  RAISE EXCEPTION 'English name search_path hardening missing'; END IF;
 IF public.gcc_v7_english_name('Maria Santos') IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Name validation behavior changed'; END IF;
END
$$;
SELECT 'PASS: isolated V23.1 SQL authorization, pagination and hardening tests' AS result;
