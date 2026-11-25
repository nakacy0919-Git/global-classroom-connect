-- Actual V21.8 contact RPCs and V21.9 outbox migrations, disposable fixture only.
INSERT INTO public.session_join_requests(id,offer_id,requested_students,status,requesting_teacher_id) VALUES
 ('81000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',5,'approved','20000000-0000-4000-8000-000000000001'),
 ('81000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001',5,'pending','20000000-0000-4000-8000-000000000003'),
 ('81000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000001',5,'approved','20000000-0000-4000-8000-000000000001'),
 ('81000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000002',5,'pending','20000000-0000-4000-8000-000000000001');
UPDATE public.session_join_requests SET status='declined' WHERE id='81000000-0000-4000-8000-000000000004';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.gcc_v219_request_email_jobs)<>2 THEN RAISE EXCEPTION 'Outbox must contain one job per pending insert'; END IF;
 IF (SELECT status FROM public.gcc_v219_request_email_jobs WHERE request_id='81000000-0000-4000-8000-000000000004')<>'skipped' THEN RAISE EXCEPTION 'Reviewed pending email was not skipped'; END IF;
 IF has_table_privilege('authenticated','public.gcc_v218_partner_contacts','SELECT')
 OR has_table_privilege('anon','public.gcc_v218_partner_contacts','SELECT')
 OR has_table_privilege('authenticated','public.gcc_v219_request_email_jobs','SELECT')
 OR has_table_privilege('anon','public.gcc_v219_request_email_jobs','SELECT')
 OR has_function_privilege('anon','public.gcc_v218_partner_contacts(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.gcc_v218_set_partner_contact(uuid,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.gcc_v219_claim_request_emails(integer)','EXECUTE')
 OR has_function_privilege('anon','public.gcc_v219_claim_request_emails(integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected client grant'; END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE result jsonb; denied boolean:=false;
BEGIN
 result:=public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000001');
 IF result->'mine' IS DISTINCT FROM 'null'::jsonb OR result->'partner' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Contact should be private by default'; END IF;
 PERFORM public.gcc_v218_set_partner_contact('81000000-0000-4000-8000-000000000001','email','host@example.invalid');
 BEGIN PERFORM public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000003');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%Approved session partner access required%' THEN denied:=true; ELSE RAISE; END IF; END;
 IF NOT denied THEN RAISE EXCEPTION 'Expired contact visible'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE result jsonb; denied boolean:=false;
BEGIN
 result:=public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000001');
 IF result->'partner'->>'value' IS DISTINCT FROM 'host@example.invalid' THEN RAISE EXCEPTION 'Approved counterpart cannot see shared value'; END IF;
 PERFORM public.gcc_v218_set_partner_contact('81000000-0000-4000-8000-000000000001','line','Test school account');
 BEGIN PERFORM public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000002');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%Approved session partner access required%' THEN denied:=true; ELSE RAISE; END IF; END;
 IF NOT denied THEN RAISE EXCEPTION 'Pending request contact visible'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
DO $$
DECLARE denied boolean:=false; denied_write boolean:=false;
BEGIN
 BEGIN PERFORM public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000001');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%Approved session partner access required%' THEN denied:=true; ELSE RAISE; END IF; END;
 BEGIN PERFORM public.gcc_v218_set_partner_contact('81000000-0000-4000-8000-000000000001','email','third@example.invalid');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%Approved session partner access required%' THEN denied_write:=true; ELSE RAISE; END IF; END;
 IF NOT denied OR NOT denied_write THEN RAISE EXCEPTION 'Unrelated approved teacher accessed another pairing'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
 IF public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000001')->'partner'->>'value' IS DISTINCT FROM 'Test school account' THEN RAISE EXCEPTION 'Mutual share failed'; END IF;
 PERFORM public.gcc_v218_set_partner_contact('81000000-0000-4000-8000-000000000001','','');
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 IF public.gcc_v218_partner_contacts('81000000-0000-4000-8000-000000000001')->'partner' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Revoked contact still visible'; END IF;
END $$;
RESET ROLE;

SET ROLE service_role;
DO $$
DECLARE job record; n integer;
BEGIN
 SELECT * INTO job FROM public.gcc_v219_claim_request_emails(5);
 IF job.request_id IS DISTINCT FROM '81000000-0000-4000-8000-000000000002'::uuid OR job.recipient_email IS DISTINCT FROM 'guest@example.invalid' THEN RAISE EXCEPTION 'Wrong verified host mail recipient'; END IF;
 SELECT count(*) INTO n FROM public.gcc_v219_claim_request_emails(5);
 IF n<>0 THEN RAISE EXCEPTION 'Active lease was claimed twice'; END IF;
 IF public.gcc_v219_finish_request_email(job.request_id,gen_random_uuid(),'sent','fake-receipt',NULL) THEN RAISE EXCEPTION 'Invalid lease accepted'; END IF;
 IF NOT public.gcc_v219_finish_request_email(job.request_id,job.lease_token,'sent','fake-receipt',NULL) THEN RAISE EXCEPTION 'Valid lease rejected'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.gcc_v219_request_email_jobs WHERE request_id='81000000-0000-4000-8000-000000000002' AND status='sent' AND attempts=1 AND provider_email_id='fake-receipt' AND sent_at IS NOT NULL) THEN RAISE EXCEPTION 'Accepted receipt not recorded'; END IF;
END $$;
SELECT 'PASS: approved partner consent, cross-school denial, revocation, expiry and isolated mail queue/lease checks' AS result;
