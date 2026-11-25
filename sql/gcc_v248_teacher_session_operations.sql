-- GCC V24.8: teacher-owned session operations, isolated from admin-managed events.
-- Additive only. Existing offers, approvals, admin room charts and Auth are unchanged.
BEGIN;
CREATE SCHEMA IF NOT EXISTS gcc_ops_v248;
REVOKE ALL ON SCHEMA gcc_ops_v248 FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS gcc_ops_v248.workspace (
 offer_id uuid PRIMARY KEY REFERENCES public.exchange_availability(id) ON DELETE CASCADE,
 revision bigint NOT NULL DEFAULT 0,
 room_count integer CHECK(room_count BETWEEN 1 AND 100),
 plan jsonb,
 plan_signature text,
 published boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS gcc_ops_v248.rosters (
 offer_id uuid NOT NULL REFERENCES public.exchange_availability(id) ON DELETE CASCADE,
 teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
 students jsonb NOT NULL CHECK(jsonb_typeof(students)='array'),
 PRIMARY KEY(offer_id,teacher_id)
);
ALTER TABLE gcc_ops_v248.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_ops_v248.rosters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA gcc_ops_v248 FROM PUBLIC,anon,authenticated;
-- Require a confirmed, active, unambiguous identity and an active school.
CREATE OR REPLACE FUNCTION gcc_ops_v248.active_teacher(p_teacher uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(
 SELECT 1 FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 JOIN public.profiles p ON p.id=t.auth_user_id JOIN auth.users u ON u.id=t.auth_user_id
 WHERE t.id=p_teacher AND t.is_active AND s.is_active AND p.role IN ('teacher','host')
 AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false)
 AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (SELECT count(*) FROM public.teachers t2 WHERE t2.auth_user_id=t.auth_user_id AND t2.is_active)=1)
$$;
CREATE OR REPLACE FUNCTION gcc_ops_v248.members(p_offer uuid)
RETURNS TABLE(teacher_id uuid,school_id uuid,teacher_name text,school_name text,country_code text,expected integer,is_host boolean)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT t.id,s.id,t.display_name,s.name,s.country_code,a.student_count,true
 FROM public.exchange_availability a JOIN public.teachers t ON t.id=a.teacher_id JOIN public.schools s ON s.id=t.school_id
 WHERE a.id=p_offer AND gcc_ops_v248.active_teacher(t.id)
 UNION ALL
 SELECT t.id,s.id,t.display_name,s.name,s.country_code,r.requested_students,false
 FROM public.session_join_requests r JOIN public.teachers t ON t.id=r.requesting_teacher_id JOIN public.schools s ON s.id=t.school_id
 JOIN public.exchange_availability a ON a.id=r.offer_id
 WHERE r.offer_id=p_offer AND r.status='approved' AND NOT coalesce(r.reconfirmation_required,false)
 AND t.id<>a.teacher_id AND gcc_ops_v248.active_teacher(t.id)
$$;
CREATE OR REPLACE FUNCTION gcc_ops_v248.people(p_offer uuid)
RETURNS TABLE(teacher_id uuid,school_id uuid,school_name text,country_code text,student_no integer,student_name text,grade text)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT m.teacher_id,m.school_id,m.school_name,m.country_code,x.n::integer,x.item->>'name',coalesce(x.item->>'grade','')
 FROM gcc_ops_v248.members(p_offer) m JOIN gcc_ops_v248.rosters r ON r.offer_id=p_offer AND r.teacher_id=m.teacher_id
 CROSS JOIN LATERAL jsonb_array_elements(r.students) WITH ORDINALITY x(item,n)
$$;
CREATE OR REPLACE FUNCTION gcc_ops_v248.signature(p_offer uuid)
RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_object('offer',jsonb_build_array(a.teacher_id,a.student_count,a.room_count,a.starts_at,a.ends_at,a.status,a.session_details),
 'members',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.teacher_id) FROM gcc_ops_v248.members(a.id) m),'[]'::jsonb),
 'requests',coalesce((SELECT jsonb_agg(jsonb_build_array(r.requesting_teacher_id,r.status,r.requested_students,r.reconfirmation_required) ORDER BY r.id)
 FROM public.session_join_requests r WHERE r.offer_id=a.id AND r.status='approved'),'[]'::jsonb),
 'people',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.teacher_id,p.student_no) FROM gcc_ops_v248.people(a.id) p),'[]'::jsonb))::text)
 FROM public.exchange_availability a WHERE a.id=p_offer
$$;
CREATE OR REPLACE FUNCTION public.gcc_v248_session_operations(p_offer_id uuid,p_action text DEFAULT 'read',p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 tid uuid; a public.exchange_availability%ROWTYPE; w gcc_ops_v248.workspace%ROWTYPE;
 owner boolean; member boolean; request_status text; target uuid; expected integer;
 roster jsonb; clean jsonb; rooms integer; n integer; v_plan jsonb; sig text; ready boolean;
 members_json jsonb; request_json jsonb; chart jsonb; own_roster jsonb; rev bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required'; END IF;
 tid:=public.gcc_current_teacher_id();
 IF NOT gcc_ops_v248.active_teacher(tid) THEN RAISE EXCEPTION 'Confirmed active teacher account required'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('read','save_roster','arrange','save_plan','publish') OR p_data IS NULL
 OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>750000
 THEN RAISE EXCEPTION 'Invalid session operation'; END IF;
 SELECT * INTO a FROM public.exchange_availability WHERE id=p_offer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session unavailable'; END IF;
 owner:=a.teacher_id=tid;
 SELECT r.status INTO request_status FROM public.session_join_requests r WHERE r.offer_id=a.id AND r.requesting_teacher_id=tid ORDER BY r.created_at DESC LIMIT 1;
 member:=EXISTS(SELECT 1 FROM gcc_ops_v248.members(a.id) m WHERE m.teacher_id=tid);
 IF a.ends_at<=now() THEN RAISE EXCEPTION 'Session has ended'; END IF;
 IF NOT member AND (p_action<>'read' OR (a.status<>'open' AND request_status IS NULL)) THEN RAISE EXCEPTION 'Only the host and approved participating teachers have access'; END IF;
 -- Unapproved viewers see session title/status only, never another school's names.
 IF NOT member THEN
 RETURN jsonb_build_object('role','applicant','offer_id',a.id,'title',coalesce(a.session_details->>'session_name',a.topic),
 'starts_at',a.starts_at,'ends_at',a.ends_at,'timezone',a.timezone,'request_status',coalesce(request_status,'none'),
 'can_apply',a.status='open' AND request_status IS NULL AND a.starts_at>now()
 AND coalesce((a.session_details->>'registration_closes_at')::timestamptz,a.starts_at)>now());
 END IF;
 SELECT * INTO w FROM gcc_ops_v248.workspace WHERE offer_id=a.id;
 rev:=coalesce(w.revision,0);
 IF p_action<>'read' THEN
 IF (p_data->>'revision') IS NULL OR (p_data->>'revision')::bigint<>rev THEN RAISE EXCEPTION 'Session changed. Refresh before saving.'; END IF;
 IF NOT owner AND p_action<>'save_roster' THEN RAISE EXCEPTION 'Only the session owner can manage rooms'; END IF;
 IF p_action='save_roster' THEN
 target:=coalesce(nullif(p_data->>'teacher_id','')::uuid,tid);
 IF target<>tid AND NOT owner THEN RAISE EXCEPTION 'You may edit only your own registered class'; END IF;
 SELECT m.expected INTO expected FROM gcc_ops_v248.members(a.id) m WHERE m.teacher_id=target;
 IF expected IS NULL THEN RAISE EXCEPTION 'Teacher has no approved allocation'; END IF;
 roster:=p_data->'students';
 IF roster IS NULL OR jsonb_typeof(roster)<>'array' THEN RAISE EXCEPTION 'Invalid student list'; END IF;
 IF jsonb_array_length(roster)>expected OR jsonb_array_length(roster)>2000 THEN RAISE EXCEPTION 'Student list exceeds the approved allocation'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(roster) v WHERE jsonb_typeof(v)<>'object'
 OR jsonb_typeof(v->'name') IS DISTINCT FROM 'string' OR char_length(btrim(v->>'name')) NOT BETWEEN 1 AND 100
 OR coalesce(jsonb_typeof(v->'grade'),'string')<>'string' OR char_length(coalesce(v->>'grade',''))>30)
 THEN RAISE EXCEPTION 'Check student display names and grades'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',btrim(x.v->>'name'),'grade',btrim(coalesce(x.v->>'grade',''))) ORDER BY x.n),'[]'::jsonb)
 INTO clean FROM jsonb_array_elements(roster) WITH ORDINALITY x(v,n);
 INSERT INTO gcc_ops_v248.rosters(offer_id,teacher_id,students) VALUES(a.id,target,clean)
 ON CONFLICT(offer_id,teacher_id) DO UPDATE SET students=excluded.students;
 INSERT INTO gcc_ops_v248.workspace(offer_id,revision) VALUES(a.id,rev+1)
 ON CONFLICT(offer_id) DO UPDATE SET revision=rev+1,plan=NULL,plan_signature=NULL,published=false;
 ELSE
 -- Every approved allocation must have a complete roster. Reconfirmation or disabled accounts block publishing.
 SELECT NOT EXISTS(SELECT 1 FROM gcc_ops_v248.members(a.id) m LEFT JOIN gcc_ops_v248.rosters r ON r.offer_id=a.id AND r.teacher_id=m.teacher_id
 WHERE coalesce(jsonb_array_length(r.students),0)<>m.expected)
 AND NOT EXISTS(SELECT 1 FROM public.session_join_requests r WHERE r.offer_id=a.id AND r.status='approved'
 AND NOT EXISTS(SELECT 1 FROM gcc_ops_v248.members(a.id) m WHERE m.teacher_id=r.requesting_teacher_id AND NOT m.is_host))
 INTO ready;
 IF NOT ready THEN RAISE EXCEPTION 'Complete all approved class lists and schedule confirmations first'; END IF;
 SELECT count(*) INTO n FROM gcc_ops_v248.people(a.id);
 IF n<1 OR n>2000 THEN RAISE EXCEPTION 'Invalid total student count'; END IF;
 sig:=gcc_ops_v248.signature(a.id);
 IF p_action='arrange' THEN
 rooms:=(p_data->>'room_count')::integer;
 IF rooms IS NULL OR rooms NOT BETWEEN 1 AND least(100,n) THEN RAISE EXCEPTION 'Choose 1 to 100 rooms, no more than the student count'; END IF;
 -- Distribute each school's students over successive rooms; global modulo balances sizes.
 SELECT jsonb_agg(jsonb_build_object('teacher_id',p.teacher_id,'student_no',p.student_no,'room',((p.seq-1)%rooms+1)::integer) ORDER BY p.seq)
 INTO v_plan FROM (SELECT p.*,row_number() OVER(ORDER BY p.school_id,p.teacher_id,p.student_no) seq FROM gcc_ops_v248.people(a.id) p) p;
 INSERT INTO gcc_ops_v248.workspace(offer_id,revision,room_count,plan,plan_signature,published)
 VALUES(a.id,rev+1,rooms,v_plan,sig,false)
 ON CONFLICT(offer_id) DO UPDATE SET revision=rev+1,room_count=rooms,plan=excluded.plan,plan_signature=sig,published=false;
 ELSIF p_action='save_plan' THEN
 IF w.plan IS NULL OR w.plan_signature IS DISTINCT FROM sig THEN RAISE EXCEPTION 'Roster changed. Arrange rooms again.'; END IF;
 rooms:=w.room_count;v_plan:=p_data->'plan';
 IF v_plan IS NULL OR jsonb_typeof(v_plan)<>'array' THEN RAISE EXCEPTION 'Invalid room plan'; END IF;
 IF jsonb_array_length(v_plan)<>n THEN RAISE EXCEPTION 'Every student needs exactly one room'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_plan) x WHERE jsonb_typeof(x)<>'object'
 OR coalesce(x->>'student_no','') !~ '^[0-9]{1,4}$' OR coalesce(x->>'room','') !~ '^[0-9]{1,3}$'
 OR coalesce(x->>'teacher_id','') !~ '^[0-9a-fA-F-]{36}$') THEN RAISE EXCEPTION 'Invalid room assignment'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_plan) x WHERE (x->>'room')::integer NOT BETWEEN 1 AND rooms
 OR NOT EXISTS(SELECT 1 FROM gcc_ops_v248.people(a.id) p WHERE p.teacher_id=(x->>'teacher_id')::uuid AND p.student_no=(x->>'student_no')::integer))
 OR (SELECT count(DISTINCT ((x->>'teacher_id')::uuid,(x->>'student_no')::integer)) FROM jsonb_array_elements(v_plan) x)<>n
 THEN RAISE EXCEPTION 'Invalid or duplicated student assignment'; END IF;
 UPDATE gcc_ops_v248.workspace SET revision=rev+1,plan=v_plan,published=false WHERE offer_id=a.id;
 ELSE
 IF w.plan IS NULL OR w.plan_signature IS DISTINCT FROM sig THEN RAISE EXCEPTION 'Save a current room plan before publishing'; END IF;
 UPDATE gcc_ops_v248.workspace SET revision=rev+1,published=true WHERE offer_id=a.id;
 END IF;
 END IF;
 END IF;
 SELECT * INTO w FROM gcc_ops_v248.workspace WHERE offer_id=a.id;
 sig:=gcc_ops_v248.signature(a.id);
 SELECT coalesce(jsonb_agg(jsonb_build_object('teacher_id',m.teacher_id,'school',m.school_name,'teacher',m.teacher_name,'country',m.country_code,'expected',m.expected,'is_host',m.is_host,'students',coalesce(r.students,'[]'::jsonb)) ORDER BY m.is_host DESC,m.school_name,m.teacher_id),'[]'::jsonb)
 INTO members_json FROM gcc_ops_v248.members(a.id) m LEFT JOIN gcc_ops_v248.rosters r ON r.offer_id=a.id AND r.teacher_id=m.teacher_id WHERE owner OR m.teacher_id=tid;
 IF owner THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'teacher',t.display_name,'school',s.name,'status',r.status,'students',r.requested_students,'reconfirmation',r.reconfirmation_required) ORDER BY r.created_at),'[]'::jsonb)
 INTO request_json FROM public.session_join_requests r JOIN public.teachers t ON t.id=r.requesting_teacher_id JOIN public.schools s ON s.id=t.school_id WHERE r.offer_id=a.id;
 END IF;
 IF w.plan IS NOT NULL AND w.plan_signature=sig AND (owner OR w.published) THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('teacher_id',p.teacher_id,'student_no',p.student_no,'name',p.student_name,'grade',p.grade,'school',p.school_name,'country',p.country_code,'room',(x->>'room')::integer) ORDER BY (x->>'room')::integer,p.school_name,p.student_name),'[]'::jsonb)
 INTO chart FROM jsonb_array_elements(w.plan) x JOIN gcc_ops_v248.people(a.id) p ON p.teacher_id=(x->>'teacher_id')::uuid AND p.student_no=(x->>'student_no')::integer;
 END IF;
 RETURN jsonb_build_object('role',CASE WHEN owner THEN 'host' ELSE 'participant' END,'offer_id',a.id,
 'title',coalesce(a.session_details->>'session_name',a.topic),'starts_at',a.starts_at,'ends_at',a.ends_at,'timezone',a.timezone,
 'revision',coalesce(w.revision,0),'room_count',coalesce(w.room_count,a.room_count),'members',members_json,'requests',request_json,
 'chart',chart,'published',coalesce(w.published AND w.plan_signature=sig,false),'plan_stale',coalesce(w.plan IS NOT NULL AND w.plan_signature IS DISTINCT FROM sig,false));
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gcc_ops_v248 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v248_session_operations(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v248_session_operations(uuid,text,jsonb) TO authenticated;
COMMIT;
