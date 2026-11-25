\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF has_schema_privilege('authenticated','gcc_ops_v248','USAGE') OR has_table_privilege('authenticated','gcc_ops_v248.messages_v249','SELECT') OR has_function_privilege('anon','public.gcc_v249_session_operations(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Private messaging privileges leaked';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$
DECLARE o uuid:='30000000-0000-0000-0000-000000000001';s jsonb;
BEGIN
 s:=public.gcc_v249_session_operations(o,'review','{"revision":0,"request_id":"40000000-0000-0000-0000-000000000003","decision":"approved"}');
 IF s->>'revision'<>'1' OR jsonb_array_length(s->'messages')<>1 OR NOT (s->'messages'->0->>'registration_link')::boolean THEN RAISE EXCEPTION 'acceptance invitation missing';END IF;
 s:=public.gcc_v249_session_operations(o,'save_roster','{"revision":1,"finalized":true,"students":[{"name":"Host A"},{"name":"Host B"}],"helpers":[{"name":"Adult Helper"}]}');
 s:=public.gcc_v249_session_operations(o,'save_roster','{"revision":2,"teacher_id":"20000000-0000-0000-0000-000000000002","finalized":true,"students":[{"name":"Partner A"},{"name":"Partner B"}]}');
 s:=public.gcc_v249_session_operations(o,'save_roster','{"revision":3,"teacher_id":"20000000-0000-0000-0000-000000000003","finalized":true,"students":[{"name":"Third A"},{"name":"Third B"}]}');
 IF NOT (s->>'ready')::boolean THEN RAISE EXCEPTION 'final registrations not ready';END IF;
 IF jsonb_array_length(s->'facilitator_pool')<>4 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'facilitator_pool') x WHERE x->>'name'='Adult Helper') THEN RAISE EXCEPTION 'additional adult helper missing';END IF;
 s:=public.gcc_v249_session_operations(o,'message','{"revision":4,"request_id":"40000000-0000-0000-0000-000000000001","body":"Private hello","registration_link":true}');
 IF jsonb_array_length(s->'messages')<>2 THEN RAISE EXCEPTION 'message not saved';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$
DECLARE o uuid:='30000000-0000-0000-0000-000000000001';s jsonb;
BEGIN
 s:=public.gcc_v249_session_operations(o);
 IF jsonb_array_length(s->'messages')<>1 OR s->'messages'->0->>'body'<>'Private hello' OR jsonb_array_length(s->'members')<>1 OR s->'zoom_url'<>'null'::jsonb THEN RAISE EXCEPTION 'partner thread/privacy wrong';END IF;
 BEGIN PERFORM public.gcc_v249_session_operations(o,'message','{"revision":5,"request_id":"40000000-0000-0000-0000-000000000003","body":"bad"}');RAISE EXCEPTION 'unexpected cross-thread write';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Private thread unavailable%' THEN RAISE;END IF;END;
 BEGIN PERFORM public.gcc_v249_session_operations(o,'withdraw','{"revision":5,"scope":"teacher","value":"20000000-0000-0000-0000-000000000003"}');RAISE EXCEPTION 'unexpected guest removal';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Only the session owner%' THEN RAISE;END IF;END;
 s:=public.gcc_v249_session_operations(o,'message','{"revision":5,"request_id":"40000000-0000-0000-0000-000000000001","body":"Thank you"}');
 IF jsonb_array_length(s->'messages')<>2 THEN RAISE EXCEPTION 'reply missing';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$
DECLARE o uuid:='30000000-0000-0000-0000-000000000001';s jsonb;pair jsonb; pair_a text;pair_b text; roster jsonb; plan jsonb;
BEGIN
 s:=public.gcc_v249_session_operations(o);
 SELECT x->>'id' INTO pair_a FROM jsonb_array_elements(s->'people') x WHERE x->>'name'='Host A';
 SELECT x->>'id' INTO pair_b FROM jsonb_array_elements(s->'people') x WHERE x->>'name'='Host B';
 pair:=jsonb_build_array(jsonb_build_array(pair_a,pair_b));
 s:=public.gcc_v249_session_operations(o,'save_pairs',jsonb_build_object('revision',6,'pairs',pair));
 s:=public.gcc_v249_session_operations(o,'arrange','{"revision":7,"room_count":2}');
 IF jsonb_array_length(s->'chart')<>6 OR (SELECT count(DISTINCT x->>'room') FROM jsonb_array_elements(s->'chart') x WHERE x->>'student_id' IN(pair_a,pair_b))<>1 THEN RAISE EXCEPTION 'pair split';END IF;
 SELECT jsonb_agg(jsonb_build_object('student_id',x->>'student_id','room',CASE WHEN x->>'student_id'=pair_a THEN 3-(x->>'room')::integer ELSE (x->>'room')::integer END)) INTO plan FROM jsonb_array_elements(s->'chart') x;
 BEGIN PERFORM public.gcc_v249_session_operations(o,'save_plan',jsonb_build_object('revision',8,'plan',plan));RAISE EXCEPTION 'unexpected split success';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Fixed pairs%' THEN RAISE;END IF;END;
 s:=public.gcc_v249_session_operations(o,'save_facilitators',jsonb_build_object('revision',8,'facilitators',jsonb_build_array(jsonb_build_object('teacher_id','20000000-0000-0000-0000-000000000001','room',1),jsonb_build_object('teacher_id',(SELECT x->>'id' FROM jsonb_array_elements(s->'facilitator_pool') x WHERE x->>'name'='Adult Helper'),'room',2))));
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'facilitators') x WHERE x->>'teacher'='Adult Helper' AND x->>'room'='2') THEN RAISE EXCEPTION 'helper assignment failed';END IF;
 BEGIN PERFORM public.gcc_v249_session_operations(o,'save_zoom','{"revision":9,"zoom_url":"https://zoom.us.evil.example/j/1"}');RAISE EXCEPTION 'unexpected unsafe URL';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Enter a valid HTTPS%' THEN RAISE;END IF;END;
 s:=public.gcc_v249_session_operations(o,'save_zoom','{"revision":9,"zoom_url":"https://zoom.us/j/123456789"}');
 s:=public.gcc_v249_session_operations(o,'publish','{"revision":10}');
 IF NOT (s->>'published')::boolean OR s->>'zoom_url'<>'https://zoom.us/j/123456789' THEN RAISE EXCEPTION 'publish failed';END IF;
 s:=public.gcc_v249_session_operations(o,'withdraw','{"revision":11,"scope":"teacher","value":"20000000-0000-0000-0000-000000000003"}');
 IF NOT (s->>'published')::boolean OR jsonb_array_length(s->'chart')<>4 OR s->>'zoom_url'<>'https://zoom.us/j/123456789' OR (SELECT count(DISTINCT x->>'room') FROM jsonb_array_elements(s->'chart') x WHERE x->>'student_id' IN(pair_a,pair_b))<>1 THEN RAISE EXCEPTION 'withdrawal did not preserve publication/pair';END IF;
 SELECT jsonb_agg(CASE WHEN x->>'id'=pair_a THEN x||'{"name":"Host A corrected"}'::jsonb ELSE x END) INTO roster FROM jsonb_array_elements(s->'members'->0->'students') x;
 s:=public.gcc_v249_session_operations(o,'save_roster',jsonb_build_object('revision',12,'students',roster,'finalized',true));
 IF NOT (s->>'published')::boolean OR s->'pairs'<>pair OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'chart') x WHERE x->>'student_id'=pair_a AND x->>'name'='Host A corrected') THEN RAISE EXCEPTION 'stable roster edit failed';END IF;
 BEGIN PERFORM public.gcc_v248_session_operations(o,'arrange','{"revision":13,"room_count":2}');RAISE EXCEPTION 'legacy bypass';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Please reload%' THEN RAISE;END IF;END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
DO $$
DECLARE s jsonb;
BEGIN
 s:=public.gcc_v249_session_operations('30000000-0000-0000-0000-000000000001');
 IF s->>'role'<>'applicant' OR s ? 'messages' OR s ? 'chart' OR s ? 'zoom_url' THEN RAISE EXCEPTION 'withdrawn school still has chart or message access';END IF;
END $$;
RESET ROLE;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.gcc_teacher_notifications_v212 WHERE teacher_id='20000000-0000-0000-0000-000000000002' AND title='New private message') OR NOT EXISTS(SELECT 1 FROM public.gcc_teacher_notifications_v212 WHERE teacher_id='20000000-0000-0000-0000-000000000003' AND title='New registration invitation') THEN RAISE EXCEPTION 'missing private notification';END IF;END $$;
ROLLBACK;
SELECT 'PASS V249: private messages, acceptance invitation, fixed pairs, Zoom validation, facilitator assignment, withdrawal and stable published roster edits' AS result;
