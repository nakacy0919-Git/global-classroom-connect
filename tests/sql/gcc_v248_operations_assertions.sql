\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF has_schema_privilege('authenticated','gcc_ops_v248','USAGE') OR has_table_privilege('authenticated','gcc_ops_v248.rosters','SELECT') OR has_function_privilege('anon','public.gcc_v248_session_operations(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Private operations grants leaked';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$
DECLARE id uuid:='30000000-0000-0000-0000-000000000001'; s jsonb;
BEGIN
 s:=public.gcc_v248_session_operations(id);
 IF s->>'role'<>'host' OR jsonb_array_length(s->'members')<>2 OR s->>'revision'<>'0' THEN RAISE EXCEPTION 'owner view wrong';END IF;
 s:=public.gcc_v248_session_operations(id,'save_roster','{"revision":0,"students":[{"name":"Host 1"},{"name":"Host 2"}]}');
 IF s->>'revision'<>'1' THEN RAISE EXCEPTION 'revision not incremented';END IF;
 BEGIN PERFORM public.gcc_v248_session_operations(id,'arrange','{"revision":1,"room_count":2}');RAISE EXCEPTION 'TEST unexpected arrange success';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Complete all approved%' THEN RAISE;END IF;END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$
DECLARE id uuid:='30000000-0000-0000-0000-000000000001';s jsonb;
BEGIN
 s:=public.gcc_v248_session_operations(id);
 IF s->>'role'<>'participant' OR jsonb_array_length(s->'members')<>1 OR s->'chart'<>'null'::jsonb OR s->'members'->0->>'teacher_id'<>'20000000-0000-0000-0000-000000000002' THEN RAISE EXCEPTION 'participant privacy failed';END IF;
 BEGIN PERFORM public.gcc_v248_session_operations(id,'save_roster','{"revision":1,"teacher_id":"20000000-0000-0000-0000-000000000001","students":[]}');RAISE EXCEPTION 'TEST unexpected cross roster success';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'You may edit only%' THEN RAISE;END IF;END;
 BEGIN PERFORM public.gcc_v248_session_operations(id,'save_roster','{"revision":1,"students":[{"name":"a"},{"name":"b"},{"name":"c"}]}');RAISE EXCEPTION 'TEST unexpected overflow success';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Student list exceeds%' THEN RAISE;END IF;END;
 BEGIN PERFORM public.gcc_v248_session_operations(id,'publish','{"revision":1}');RAISE EXCEPTION 'TEST unexpected publish success';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Only the session owner%' THEN RAISE;END IF;END;
 s:=public.gcc_v248_session_operations(id,'save_roster','{"revision":1,"students":[{"name":"Guest 1","grade":"10"},{"name":"Guest 2"}]}');
 IF s->>'revision'<>'2' THEN RAISE EXCEPTION 'guest save failed';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
DO $$
DECLARE id uuid:='30000000-0000-0000-0000-000000000001';s jsonb;
BEGIN
 s:=public.gcc_v248_session_operations(id);
 IF s->>'role'<>'applicant' OR s ? 'members' OR s ? 'chart' THEN RAISE EXCEPTION 'outsider privacy failed';END IF;
 BEGIN PERFORM public.gcc_v248_session_operations(id,'save_roster','{"revision":2,"students":[]}');RAISE EXCEPTION 'TEST unexpected outsider write';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Only the host%' THEN RAISE;END IF;END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
DO $$ BEGIN
 BEGIN PERFORM public.gcc_v248_session_operations('30000000-0000-0000-0000-000000000001');RAISE EXCEPTION 'TEST unconfirmed access';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Confirmed active%' THEN RAISE;END IF;END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$
DECLARE id uuid:='30000000-0000-0000-0000-000000000001';s jsonb; p jsonb;
BEGIN
 BEGIN PERFORM public.gcc_v248_session_operations(id,'arrange','{"revision":1,"room_count":2}');RAISE EXCEPTION 'TEST stale revision';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Session changed%' THEN RAISE;END IF;END;
 s:=public.gcc_v248_session_operations(id,'arrange','{"revision":2,"room_count":2}');
 IF jsonb_array_length(s->'chart')<>4 OR (s->>'published')::boolean OR (SELECT count(*) FROM jsonb_array_elements(s->'chart') x WHERE (x->>'room')::int=1)<>2 THEN RAISE EXCEPTION 'arrangement not balanced';END IF;
 SELECT jsonb_agg(jsonb_build_object('teacher_id',x->>'teacher_id','student_no',x->>'student_no','room',3-(x->>'room')::integer)) INTO p FROM jsonb_array_elements(s->'chart') x;
 s:=public.gcc_v248_session_operations(id,'save_plan',jsonb_build_object('revision',3,'plan',p));
 IF s->>'revision'<>'4' THEN RAISE EXCEPTION 'manual move failed';END IF;
 s:=public.gcc_v248_session_operations(id,'publish','{"revision":4}');
 IF NOT (s->>'published')::boolean THEN RAISE EXCEPTION 'publication failed';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$
DECLARE id uuid:='30000000-0000-0000-0000-000000000001';s jsonb;
BEGIN
 s:=public.gcc_v248_session_operations(id);
 IF NOT (s->>'published')::boolean OR jsonb_array_length(s->'chart')<>4 OR jsonb_array_length(s->'members')<>1 THEN RAISE EXCEPTION 'published teacher chart wrong';END IF;
 s:=public.gcc_v248_session_operations(id,'save_roster','{"revision":5,"students":[{"name":"Guest corrected"},{"name":"Guest 2"}]}');
 IF (s->>'published')::boolean OR s->'chart'<>'null'::jsonb THEN RAISE EXCEPTION 'stale published chart still accessible';END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: owner/participant/outsider/anonymous grants, unconfirmed identity, revisions, capacity, balanced rooms, manual edits and stale-chart invalidation' AS result;
