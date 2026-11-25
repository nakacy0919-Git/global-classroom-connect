-- V24.9: extend the isolated teacher-owned workspace, without granting Admin access.
BEGIN;
ALTER TABLE gcc_ops_v248.rosters ADD COLUMN IF NOT EXISTS finalized boolean;
CREATE TABLE gcc_ops_v248.extras_v249 (
 offer_id uuid PRIMARY KEY REFERENCES public.exchange_availability(id) ON DELETE CASCADE,
 pairs jsonb NOT NULL DEFAULT '[]', facilitators jsonb NOT NULL DEFAULT '[]',
 zoom_url text NOT NULL DEFAULT '', withdrawn jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE gcc_ops_v248.messages_v249 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 offer_id uuid NOT NULL REFERENCES public.exchange_availability(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES public.session_join_requests(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000),
 registration_link boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gcc249_messages_thread ON gcc_ops_v248.messages_v249(offer_id,request_id,created_at,id);
CREATE INDEX gcc249_messages_rate ON gcc_ops_v248.messages_v249(sender_id,created_at);
ALTER TABLE gcc_ops_v248.extras_v249 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_ops_v248.messages_v249 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gcc_ops_v248.extras_v249,gcc_ops_v248.messages_v249 FROM PUBLIC,anon,authenticated;
-- Legacy rows get deterministic IDs until the first explicit edit, when IDs are stored.
CREATE FUNCTION gcc_ops_v248.people_v249(p_offer uuid)
RETURNS TABLE(student_id uuid,teacher_id uuid,school_id uuid,school_name text,country_code text,student_no integer,student_name text,grade text)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(nullif(x.item->>'id','')::uuid,md5(m.teacher_id::text||':'||x.n::text)::uuid),
 m.teacher_id,m.school_id,m.school_name,m.country_code,x.n::integer,x.item->>'name',coalesce(x.item->>'grade','')
 FROM gcc_ops_v248.members(p_offer) m JOIN gcc_ops_v248.rosters r ON r.offer_id=p_offer AND r.teacher_id=m.teacher_id
 CROSS JOIN LATERAL jsonb_array_elements(r.students) WITH ORDINALITY x(item,n)
$$;
CREATE FUNCTION gcc_ops_v248.placements_v249(p_offer uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(p.student_id::text,(x->>'room')::integer),'{}'::jsonb)
 FROM gcc_ops_v248.workspace w CROSS JOIN LATERAL jsonb_array_elements(w.plan) x
 JOIN gcc_ops_v248.people_v249(p_offer) p ON p.teacher_id=(x->>'teacher_id')::uuid AND p.student_no=(x->>'student_no')::integer
 WHERE w.offer_id=p_offer
$$;
CREATE FUNCTION gcc_ops_v248.ready_v249(p_offer uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT NOT EXISTS(SELECT 1 FROM gcc_ops_v248.members(p_offer) m LEFT JOIN gcc_ops_v248.rosters r ON r.offer_id=p_offer AND r.teacher_id=m.teacher_id
 WHERE coalesce(jsonb_array_length(r.students),0)<>m.expected OR NOT coalesce(r.finalized,coalesce(jsonb_array_length(r.students),0)=m.expected))
 AND NOT EXISTS(SELECT 1 FROM public.session_join_requests r WHERE r.offer_id=p_offer AND r.status='approved'
 AND NOT EXISTS(SELECT 1 FROM gcc_ops_v248.members(p_offer) m WHERE m.teacher_id=r.requesting_teacher_id AND NOT m.is_host))
 AND EXISTS(SELECT 1 FROM gcc_ops_v248.people_v249(p_offer))
$$;
-- Atomic pair groups: prefer balanced headcounts, country/school mix, then prior placements.
-- No split of a fixed pair. Pair constraints may prevent perfect balance.
CREATE FUNCTION gcc_ops_v248.arrange_v249(p_offer uuid,p_rooms integer,p_old jsonb,p_pairs jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE g record; p record; r integer; best integer; score bigint; best_score bigint;
 n integer; cap integer; group_people jsonb; sizes integer[]; country_counts jsonb:='{}'; school_counts jsonb:='{}';
 k text; sk text; plan jsonb:='[]'; c integer; sc integer; moves integer; group_size integer;
BEGIN
 SELECT count(*) INTO n FROM gcc_ops_v248.people_v249(p_offer);
 IF p_rooms IS NULL OR p_rooms NOT BETWEEN 1 AND least(100,n) THEN RAISE EXCEPTION 'Choose a valid room count'; END IF;
 sizes:=array_fill(0,ARRAY[p_rooms]);cap:=ceil(n::numeric/p_rooms);
 FOR g IN
  WITH pairs AS (SELECT (x->>0)::uuid a,(x->>1)::uuid b FROM jsonb_array_elements(p_pairs) x),
  people AS (SELECT * FROM gcc_ops_v248.people_v249(p_offer)),
  groups AS (SELECT ARRAY[a,b] ids FROM pairs UNION ALL SELECT ARRAY[student_id] FROM people p WHERE NOT EXISTS(SELECT 1 FROM pairs q WHERE p.student_id IN(q.a,q.b)))
  SELECT ids FROM groups ORDER BY cardinality(ids) DESC,ids[1]
 LOOP
  group_size:=cardinality(g.ids);best:=1;best_score:=9223372036854775807;
  SELECT jsonb_agg(to_jsonb(p)) INTO group_people FROM gcc_ops_v248.people_v249(p_offer) p WHERE student_id=ANY(g.ids);
  FOR r IN 1..p_rooms LOOP
   c:=0;sc:=0;moves:=0;
   FOR p IN SELECT * FROM jsonb_to_recordset(group_people) AS x(student_id uuid,teacher_id uuid,student_no integer,country_code text,school_id uuid) LOOP
    k:=r::text||':'||p.country_code;sk:=r::text||':'||p.school_id::text;
    c:=c+coalesce((country_counts->>k)::integer,0);
    sc:=sc+coalesce((school_counts->>sk)::integer,0);
    IF p_old ? p.student_id::text AND (p_old->>p.student_id::text)::integer<>r THEN moves:=moves+1;END IF;
   END LOOP;
   score:=greatest(0,sizes[r]+group_size-cap)*100000+c*100+sc*30+sizes[r]*10+moves*40;
   IF score<best_score THEN best_score:=score;best:=r;END IF;
  END LOOP;
  FOR p IN SELECT * FROM jsonb_to_recordset(group_people) AS x(student_id uuid,teacher_id uuid,student_no integer,country_code text,school_id uuid) LOOP
   k:=best::text||':'||p.country_code;sk:=best::text||':'||p.school_id::text;
   country_counts:=jsonb_set(country_counts,ARRAY[k],to_jsonb(coalesce((country_counts->>k)::integer,0)+1),true);
   school_counts:=jsonb_set(school_counts,ARRAY[sk],to_jsonb(coalesce((school_counts->>sk)::integer,0)+1),true);
   plan:=plan||jsonb_build_array(jsonb_build_object('teacher_id',p.teacher_id,'student_no',p.student_no,'room',best));
   sizes[best]:=sizes[best]+1;
  END LOOP;
 END LOOP;
 RETURN plan;
END $$;
CREATE FUNCTION gcc_ops_v248.prune_v249(p_offer uuid,p_pairs jsonb,p_facs jsonb,p_rooms integer)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('pairs',coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(p_pairs) x
 WHERE EXISTS(SELECT 1 FROM gcc_ops_v248.people_v249(p_offer) p WHERE p.student_id=(x->>0)::uuid)
 AND EXISTS(SELECT 1 FROM gcc_ops_v248.people_v249(p_offer) p WHERE p.student_id=(x->>1)::uuid)),'[]'::jsonb),
 'facilitators',coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(p_facs) x
 WHERE (x->>'room')::integer BETWEEN 1 AND p_rooms AND EXISTS(SELECT 1 FROM gcc_ops_v248.members(p_offer) m WHERE m.teacher_id=(x->>'teacher_id')::uuid)),'[]'::jsonb))
$$;
CREATE FUNCTION public.gcc_v249_session_operations(p_offer_id uuid,p_action text DEFAULT 'read',p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 tid uuid; a public.exchange_availability%ROWTYPE; w gcc_ops_v248.workspace%ROWTYPE; e gcc_ops_v248.extras_v249%ROWTYPE;
 is_owner boolean; is_member boolean; req public.session_join_requests%ROWTYPE; rev bigint; old_map jsonb;
 was_published boolean; had_current_plan boolean; refresh_plan boolean:=false; target uuid; expected integer; roster jsonb; clean jsonb; entry jsonb; sid uuid;
 pairs jsonb; facs jsonb; zoom text; withdrawal jsonb; checked jsonb; rooms integer; n integer; v_plan jsonb; members_json jsonb; requests_json jsonb;
 chart jsonb; people_json jsonb; messages_json jsonb; facilitator_json jsonb; signature text; msg text; ids uuid[]; status_label text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 tid:=public.gcc_current_teacher_id();
 IF NOT gcc_ops_v248.active_teacher(tid) THEN RAISE EXCEPTION 'Confirmed active teacher account required';END IF;
 IF p_action IS NULL OR p_action NOT IN ('read','save_roster','arrange','save_plan','publish','save_zoom','save_pairs','save_facilitators','withdraw','message','review')
 OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>750000 THEN RAISE EXCEPTION 'Invalid session operation';END IF;
 SELECT * INTO a FROM public.exchange_availability WHERE id=p_offer_id FOR UPDATE;
 IF NOT FOUND OR a.ends_at<=now() THEN RAISE EXCEPTION 'Session unavailable or ended';END IF;
 is_owner:=a.teacher_id=tid;
 SELECT * INTO req FROM public.session_join_requests WHERE offer_id=a.id AND requesting_teacher_id=tid;
 is_member:=EXISTS(SELECT 1 FROM gcc_ops_v248.members(a.id) m WHERE m.teacher_id=tid);
 IF NOT is_member THEN
  IF p_action<>'read' OR (a.status<>'open' AND req.id IS NULL) THEN RAISE EXCEPTION 'Only host and approved teachers may operate this session';END IF;
  RETURN jsonb_build_object('role','applicant','offer_id',a.id,'title',coalesce(a.session_details->>'session_name',a.topic),'starts_at',a.starts_at,'ends_at',a.ends_at,'timezone',a.timezone,
  'request_status',coalesce(req.status,'none'),'can_apply',a.status='open' AND req.id IS NULL AND a.starts_at>now() AND coalesce((a.session_details->>'registration_closes_at')::timestamptz,a.starts_at)>now());
 END IF;
 SELECT * INTO w FROM gcc_ops_v248.workspace WHERE offer_id=a.id;
 SELECT * INTO e FROM gcc_ops_v248.extras_v249 WHERE offer_id=a.id;
 rev:=coalesce(w.revision,0);rooms:=coalesce(w.room_count,a.room_count);
 pairs:=coalesce(e.pairs,'[]');facs:=coalesce(e.facilitators,'[]');zoom:=coalesce(e.zoom_url,'');withdrawal:=coalesce(e.withdrawn,'[]');
 had_current_plan:=coalesce(w.plan IS NOT NULL AND w.plan_signature=gcc_ops_v248.signature(a.id),false);
 was_published:=coalesce(w.published AND had_current_plan,false);
 IF p_action<>'read' THEN
  IF coalesce((p_data->>'revision')::bigint,-1)<>rev THEN RAISE EXCEPTION 'Session changed. Refresh before saving.';END IF;
  IF NOT is_owner AND p_action NOT IN ('save_roster','message') THEN RAISE EXCEPTION 'Only the session owner can manage this operation';END IF;
  old_map:=CASE WHEN had_current_plan THEN gcc_ops_v248.placements_v249(a.id) ELSE '{}'::jsonb END;
  IF p_action='message' OR p_action='review' THEN
   SELECT * INTO req FROM public.session_join_requests WHERE id=(p_data->>'request_id')::uuid AND offer_id=a.id FOR UPDATE;
   IF NOT FOUND OR (NOT is_owner AND req.requesting_teacher_id<>tid) THEN RAISE EXCEPTION 'Private thread unavailable';END IF;
   IF p_action='review' THEN
    IF NOT is_owner OR req.status<>'pending' OR coalesce(p_data->>'decision','') NOT IN ('approved','declined') THEN RAISE EXCEPTION 'Invalid review';END IF;
    PERFORM public.gcc_teacher_review_request(req.id,p_data->>'decision');
    IF p_data->>'decision'='approved' THEN
     INSERT INTO gcc_ops_v248.messages_v249(offer_id,request_id,sender_id,body,registration_link) VALUES(a.id,req.id,tid,'Your participation has been accepted. Please complete your student registration using the link below.',true);
     refresh_plan:=true;
    END IF;
   ELSE
    IF req.status<>'approved' OR req.reconfirmation_required OR NOT gcc_ops_v248.active_teacher(req.requesting_teacher_id) OR NOT gcc_ops_v248.active_teacher(a.teacher_id) THEN RAISE EXCEPTION 'Messaging requires an active approved partnership';END IF;
    msg:=btrim(coalesce(p_data->>'body',''));
    IF char_length(msg) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Enter a message (1–2000 characters)';END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('gcc249-message:'||tid::text,0));
    IF (SELECT count(*) FROM gcc_ops_v248.messages_v249 WHERE sender_id=tid AND created_at>now()-interval '1 minute')>=10 THEN RAISE EXCEPTION 'Message limit reached. Try again later.';END IF;
    INSERT INTO gcc_ops_v248.messages_v249(offer_id,request_id,sender_id,body,registration_link) VALUES(a.id,req.id,tid,msg,is_owner AND coalesce((p_data->>'registration_link')::boolean,false));
   END IF;
  ELSIF p_action='save_roster' THEN
   target:=coalesce(nullif(p_data->>'teacher_id','')::uuid,tid);
   IF NOT is_owner AND target<>tid THEN RAISE EXCEPTION 'Edit only your own class';END IF;
   SELECT m.expected INTO expected FROM gcc_ops_v248.members(a.id) m WHERE m.teacher_id=target;
   IF expected IS NULL THEN RAISE EXCEPTION 'No approved class allocation';END IF;
   roster:=p_data->'students';
   IF roster IS NULL OR jsonb_typeof(roster)<>'array' OR jsonb_array_length(roster)>expected THEN RAISE EXCEPTION 'Invalid or oversized roster';END IF;
   IF coalesce((p_data->>'finalized')::boolean,false) AND jsonb_array_length(roster)<1 THEN RAISE EXCEPTION 'A final registration needs at least one student; withdraw a class to remove everyone';END IF;
   clean:='[]';ids:=ARRAY[]::uuid[];
   FOR entry IN SELECT x FROM jsonb_array_elements(roster) x LOOP
    IF jsonb_typeof(entry)<>'object' OR jsonb_typeof(entry->'name') IS DISTINCT FROM 'string' OR char_length(btrim(entry->>'name')) NOT BETWEEN 1 AND 100
    OR coalesce(jsonb_typeof(entry->'grade'),'string')<>'string' OR char_length(coalesce(entry->>'grade',''))>30 THEN RAISE EXCEPTION 'Invalid student name or grade';END IF;
    IF nullif(entry->>'id','') IS NULL THEN sid:=gen_random_uuid();
    ELSE
     sid:=(entry->>'id')::uuid;
     IF NOT EXISTS(SELECT 1 FROM gcc_ops_v248.people_v249(a.id) p WHERE p.student_id=sid AND p.teacher_id=target) THEN RAISE EXCEPTION 'Invalid student identity';END IF;
    END IF;
    IF sid=ANY(ids) THEN RAISE EXCEPTION 'Duplicate student identity';END IF;
    ids:=array_append(ids,sid);clean:=clean||jsonb_build_array(jsonb_build_object('id',sid,'name',btrim(entry->>'name'),'grade',btrim(coalesce(entry->>'grade',''))));
   END LOOP;
   -- A final list may release unused reserved seats; it cannot increase approved capacity.
   IF coalesce((p_data->>'finalized')::boolean,false) AND jsonb_array_length(clean)<expected THEN
    IF target=a.teacher_id THEN UPDATE public.exchange_availability SET student_count=jsonb_array_length(clean) WHERE id=a.id;
    ELSE UPDATE public.session_join_requests SET requested_students=jsonb_array_length(clean) WHERE offer_id=a.id AND requesting_teacher_id=target AND status='approved';END IF;
   END IF;
   INSERT INTO gcc_ops_v248.rosters(offer_id,teacher_id,students,finalized) VALUES(a.id,target,clean,coalesce((p_data->>'finalized')::boolean,false))
   ON CONFLICT(offer_id,teacher_id) DO UPDATE SET students=excluded.students,finalized=excluded.finalized;
   refresh_plan:=true;
  ELSIF p_action='withdraw' THEN
   -- Scope is explicit. Never remove the host's class or affect another offer.
   IF coalesce(p_data->>'scope','') NOT IN ('teacher','school','country') THEN RAISE EXCEPTION 'Invalid withdrawal scope';END IF;
   SELECT array_agg(t.id) INTO ids FROM public.session_join_requests r JOIN public.teachers t ON t.id=r.requesting_teacher_id JOIN public.schools s ON s.id=t.school_id WHERE r.offer_id=a.id AND r.status='approved' AND t.id<>a.teacher_id AND (
    (p_data->>'scope'='teacher' AND t.id::text=p_data->>'value') OR
    (p_data->>'scope'='school' AND s.id::text=p_data->>'value') OR
    (p_data->>'scope'='country' AND s.country_code=p_data->>'value'));
   IF coalesce(cardinality(ids),0)=0 THEN RAISE EXCEPTION 'No approved participating class in that scope';END IF;
   UPDATE public.session_join_requests SET status='declined',reviewed_by=auth.uid(),reviewed_at=now(),reconfirmation_required=false
    WHERE offer_id=a.id AND requesting_teacher_id=ANY(ids) AND status='approved';
   DELETE FROM gcc_ops_v248.rosters WHERE offer_id=a.id AND teacher_id=ANY(ids);
   withdrawal:=withdrawal||to_jsonb(ids);refresh_plan:=true;
  ELSIF p_action='save_pairs' THEN
   pairs:=p_data->'pairs';
   IF pairs IS NULL OR jsonb_typeof(pairs)<>'array' OR jsonb_array_length(pairs)>1000 THEN RAISE EXCEPTION 'Invalid fixed pairs';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(pairs) x WHERE jsonb_typeof(x)<>'array' OR jsonb_array_length(x)<>2) THEN RAISE EXCEPTION 'Each fixed pair needs two students';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(pairs) x CROSS JOIN LATERAL jsonb_array_elements_text(x) y WHERE NOT EXISTS(SELECT 1 FROM gcc_ops_v248.people_v249(a.id) p WHERE p.student_id=y::uuid))
    OR (SELECT count(DISTINCT y::uuid) FROM jsonb_array_elements(pairs) x CROSS JOIN LATERAL jsonb_array_elements_text(x) y)<>2*jsonb_array_length(pairs)
   THEN RAISE EXCEPTION 'Each student can belong to only one valid fixed pair';END IF;
   refresh_plan:=true;
  ELSIF p_action='save_facilitators' THEN
   facs:=p_data->'facilitators';
   IF facs IS NULL OR jsonb_typeof(facs)<>'array' OR jsonb_array_length(facs)>500 THEN RAISE EXCEPTION 'Invalid facilitator list';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(facs) x WHERE jsonb_typeof(x)<>'object' OR coalesce(x->>'room','') !~ '^[0-9]{1,3}$'
    OR (x->>'room')::integer NOT BETWEEN 1 AND rooms OR NOT EXISTS(SELECT 1 FROM gcc_ops_v248.members(a.id) m WHERE m.teacher_id=(x->>'teacher_id')::uuid))
    OR (SELECT count(DISTINCT (x->>'teacher_id')::uuid) FROM jsonb_array_elements(facs) x)<>jsonb_array_length(facs)
   THEN RAISE EXCEPTION 'Each participating teacher can facilitate one valid room';END IF;
  ELSIF p_action='save_zoom' THEN
   zoom:=btrim(coalesce(p_data->>'zoom_url',''));
   IF was_published AND zoom='' THEN RAISE EXCEPTION 'A published chart must retain its Zoom link';END IF;
   IF char_length(zoom)>2000 OR (zoom<>'' AND zoom !~* '^https://([a-z0-9-]+\.)*zoom\.us/[^[:space:]<>"]+$') THEN RAISE EXCEPTION 'Enter a valid HTTPS zoom.us meeting link';END IF;
  ELSIF p_action='arrange' THEN
   IF NOT gcc_ops_v248.ready_v249(a.id) THEN RAISE EXCEPTION 'Complete all final registrations first';END IF;
   rooms:=(p_data->>'room_count')::integer;SELECT count(*) INTO n FROM gcc_ops_v248.people_v249(a.id);
   IF rooms IS NULL OR rooms NOT BETWEEN 1 AND least(100,n) THEN RAISE EXCEPTION 'Invalid room count';END IF;
   refresh_plan:=true;
  ELSIF p_action='save_plan' THEN
   IF NOT had_current_plan OR NOT gcc_ops_v248.ready_v249(a.id) THEN RAISE EXCEPTION 'Arrange the current roster first';END IF;
   v_plan:=p_data->'plan';SELECT count(*) INTO n FROM gcc_ops_v248.people_v249(a.id);
   IF v_plan IS NULL OR jsonb_typeof(v_plan)<>'array' OR jsonb_array_length(v_plan)<>n THEN RAISE EXCEPTION 'Every student needs one room';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_plan) x WHERE coalesce(x->>'room','') !~ '^[0-9]{1,3}$' OR (x->>'room')::integer NOT BETWEEN 1 AND rooms
    OR NOT EXISTS(SELECT 1 FROM gcc_ops_v248.people_v249(a.id) p WHERE p.student_id=(x->>'student_id')::uuid))
    OR (SELECT count(DISTINCT (x->>'student_id')::uuid) FROM jsonb_array_elements(v_plan) x)<>n THEN RAISE EXCEPTION 'Invalid student assignment';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(pairs) pair
    JOIN LATERAL (SELECT x->>'room' r FROM jsonb_array_elements(v_plan) x WHERE (x->>'student_id')::uuid=(pair->>0)::uuid) left_room ON true
    JOIN LATERAL (SELECT x->>'room' r FROM jsonb_array_elements(v_plan) x WHERE (x->>'student_id')::uuid=(pair->>1)::uuid) right_room ON true
    WHERE left_room.r::integer<>right_room.r::integer) THEN RAISE EXCEPTION 'Fixed pairs must stay together';END IF;
   SELECT jsonb_agg(jsonb_build_object('teacher_id',p.teacher_id,'student_no',p.student_no,'room',(x->>'room')::integer)) INTO v_plan
   FROM jsonb_array_elements(v_plan) x JOIN gcc_ops_v248.people_v249(a.id) p ON p.student_id=(x->>'student_id')::uuid;
   UPDATE gcc_ops_v248.workspace SET plan=v_plan,plan_signature=gcc_ops_v248.signature(a.id),published=was_published WHERE offer_id=a.id;
  ELSIF p_action='publish' THEN
   IF NOT had_current_plan OR NOT gcc_ops_v248.ready_v249(a.id) THEN RAISE EXCEPTION 'Arrange the current finalized roster first';END IF;
   IF zoom='' THEN RAISE EXCEPTION 'Save the Zoom meeting link first';END IF;
   UPDATE gcc_ops_v248.workspace SET published=true WHERE offer_id=a.id;
  END IF;
  IF refresh_plan THEN
   SELECT count(*) INTO n FROM gcc_ops_v248.people_v249(a.id);
   rooms:=greatest(1,least(rooms,greatest(1,n)));
   checked:=gcc_ops_v248.prune_v249(a.id,pairs,facs,rooms);pairs:=checked->'pairs';facs:=checked->'facilitators';
   IF (had_current_plan OR p_action='arrange') AND gcc_ops_v248.ready_v249(a.id) THEN
    v_plan:=gcc_ops_v248.arrange_v249(a.id,rooms,old_map,pairs);
    INSERT INTO gcc_ops_v248.workspace(offer_id,revision,room_count,plan,plan_signature,published) VALUES(a.id,rev,rooms,v_plan,gcc_ops_v248.signature(a.id),was_published)
    ON CONFLICT(offer_id) DO UPDATE SET room_count=rooms,plan=excluded.plan,plan_signature=excluded.plan_signature,published=excluded.published;
   ELSE
    UPDATE gcc_ops_v248.workspace SET plan=NULL,plan_signature=NULL,published=false WHERE offer_id=a.id;
   END IF;
  END IF;
  INSERT INTO gcc_ops_v248.extras_v249(offer_id,pairs,facilitators,zoom_url,withdrawn) VALUES(a.id,pairs,facs,zoom,withdrawal)
  ON CONFLICT(offer_id) DO UPDATE SET pairs=excluded.pairs,facilitators=excluded.facilitators,zoom_url=excluded.zoom_url,withdrawn=excluded.withdrawn;
  INSERT INTO gcc_ops_v248.workspace(offer_id,revision) VALUES(a.id,rev+1)
  ON CONFLICT(offer_id) DO UPDATE SET revision=rev+1;
 END IF;
 SELECT * INTO w FROM gcc_ops_v248.workspace WHERE offer_id=a.id;
 signature:=gcc_ops_v248.signature(a.id);
 was_published:=coalesce(w.published AND w.plan_signature=signature,false);
 SELECT coalesce(jsonb_agg(jsonb_build_object('teacher_id',m.teacher_id,'school_id',m.school_id,'school',m.school_name,'teacher',m.teacher_name,'country',m.country_code,'expected',m.expected,'is_host',m.is_host,
 'finalized',coalesce(r.finalized,coalesce(jsonb_array_length(r.students),0)=m.expected),
 'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.student_id,'name',p.student_name,'grade',p.grade) ORDER BY p.student_no) FROM gcc_ops_v248.people_v249(a.id) p WHERE p.teacher_id=m.teacher_id),'[]')) ORDER BY m.is_host DESC,m.school_name),'[]')
 INTO members_json FROM gcc_ops_v248.members(a.id) m LEFT JOIN gcc_ops_v248.rosters r ON r.offer_id=a.id AND r.teacher_id=m.teacher_id WHERE is_owner OR m.teacher_id=tid;
 IF is_owner THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'teacher_id',t.id,'teacher',t.display_name,'school',s.name,'status',CASE WHEN withdrawal ? t.id::text THEN 'withdrawn' ELSE r.status END,'students',r.requested_students,'reconfirmation',r.reconfirmation_required) ORDER BY r.created_at),'[]')
 INTO requests_json FROM public.session_join_requests r JOIN public.teachers t ON t.id=r.requesting_teacher_id JOIN public.schools s ON s.id=t.school_id WHERE r.offer_id=a.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.student_id,'name',p.student_name,'school',p.school_name) ORDER BY p.school_name,p.student_name),'[]') INTO people_json FROM gcc_ops_v248.people_v249(a.id) p;
 END IF;
 IF w.plan IS NOT NULL AND w.plan_signature=signature AND (is_owner OR was_published) THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('student_id',p.student_id,'teacher_id',p.teacher_id,'student_no',p.student_no,'name',p.student_name,'grade',p.grade,'school',p.school_name,'country',p.country_code,'room',(x->>'room')::integer) ORDER BY (x->>'room')::integer,p.school_name,p.student_name),'[]')
 INTO chart FROM jsonb_array_elements(w.plan) x JOIN gcc_ops_v248.people_v249(a.id) p ON p.teacher_id=(x->>'teacher_id')::uuid AND p.student_no=(x->>'student_no')::integer;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('teacher_id',m.teacher_id,'teacher',m.teacher_name,'school',m.school_name,'room',(x->>'room')::integer)),'[]') INTO facilitator_json
 FROM jsonb_array_elements(facs) x JOIN gcc_ops_v248.members(a.id) m ON m.teacher_id=(x->>'teacher_id')::uuid WHERE is_owner OR was_published;
 SELECT coalesce(jsonb_agg(to_jsonb(z) ORDER BY z.created_at,z.id),'[]') INTO messages_json FROM (
 SELECT m.id,m.request_id,m.sender_id,t.display_name AS sender,m.body,m.registration_link,m.created_at
 FROM gcc_ops_v248.messages_v249 m JOIN public.session_join_requests r ON r.id=m.request_id AND r.offer_id=a.id
 JOIN public.teachers t ON t.id=m.sender_id
 WHERE m.offer_id=a.id AND r.status='approved' AND (is_owner OR r.requesting_teacher_id=tid)
 ORDER BY m.created_at DESC,m.id DESC LIMIT 200
 ) z;
 RETURN jsonb_build_object('role',CASE WHEN is_owner THEN 'host' ELSE 'participant' END,'teacher_id',tid,'offer_id',a.id,'title',coalesce(a.session_details->>'session_name',a.topic),
 'starts_at',a.starts_at,'ends_at',a.ends_at,'timezone',a.timezone,'revision',coalesce(w.revision,0),'room_count',coalesce(w.room_count,a.room_count),'members',members_json,'requests',requests_json,
 'request_id',CASE WHEN is_owner THEN NULL ELSE req.id END,'messages',messages_json,'people',people_json,'pairs',CASE WHEN is_owner THEN pairs ELSE NULL END,
 'facilitators',facilitator_json,'zoom_url',CASE WHEN is_owner OR was_published THEN zoom ELSE NULL END,'chart',chart,'published',was_published,
 'plan_stale',coalesce(w.plan IS NOT NULL AND w.plan_signature IS DISTINCT FROM signature,false),'ready',gcc_ops_v248.ready_v249(a.id));
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gcc_ops_v248 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v249_session_operations(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v249_session_operations(uuid,text,jsonb) TO authenticated;
-- Old tabs cannot bypass stable IDs, locked pairs, or final registration rules.
CREATE OR REPLACE FUNCTION public.gcc_v248_session_operations(p_offer_id uuid,p_action text DEFAULT 'read',p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_action IS DISTINCT FROM 'read' THEN RAISE EXCEPTION 'Please reload GCC to use the updated exchange workspace'; END IF;
 RETURN public.gcc_v249_session_operations(p_offer_id,'read','{}');
END $$;
REVOKE ALL ON FUNCTION public.gcc_v248_session_operations(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v248_session_operations(uuid,text,jsonb) TO authenticated;
COMMIT;
