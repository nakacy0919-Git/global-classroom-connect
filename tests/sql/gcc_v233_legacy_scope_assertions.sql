-- Disposable test only, after V23.1 fixture and V23.3 compatibility patch.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE rows jsonb;
BEGIN
 rows:=public.gcc_v134_signup_overview();
 IF jsonb_array_length(rows)<>200 THEN RAISE EXCEPTION 'Legacy page size changed'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(rows) r WHERE r->>'email'='unrelated@example.invalid') THEN
  RAISE EXCEPTION 'Unrelated Auth account exposed by legacy RPC';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(rows) r WHERE r->>'email'='host@example.invalid' AND r->>'status'='approved' AND (r->>'email_confirmed')::boolean) THEN
  RAISE EXCEPTION 'Legacy host row/shape lost';
 END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM public.gcc_v134_signup_overview();
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Host access required%' THEN denied:=true; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Ordinary teacher could read legacy directory'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.gcc_v134_signup_overview()','EXECUTE') THEN
  RAISE EXCEPTION 'Anonymous legacy RPC EXECUTE';
 END IF;
END $$;
SELECT 'PASS: legacy RPC stays compatible and excludes unrelated accounts' AS result;
