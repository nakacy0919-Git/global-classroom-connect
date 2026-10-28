-- V16.5: optional pair/room requests saved atomically with teacher registration.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gcc_v165_pair_requests(
 signup_id uuid NOT NULL REFERENCES public.gcc_session_signups(id) ON DELETE CASCADE,
 student_a uuid NOT NULL REFERENCES public.gcc_session_signup_students(id) ON DELETE CASCADE,
 student_b uuid NOT NULL REFERENCES public.gcc_session_signup_students(id) ON DELETE CASCADE,
 target_room integer NOT NULL CHECK(target_room BETWEEN 1 AND 60),
 PRIMARY KEY(signup_id,student_a,student_b),CHECK(student_a<>student_b)
);
ALTER TABLE public.gcc_v165_pair_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v165_pair_requests FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.gcc_v165_store_pair_requests(p_signup uuid,p_pairs jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb;a uuid;b uuid;seen uuid[]:=ARRAY[]::uuid[];n integer;room_count integer;
BEGIN
 IF p_pairs IS NULL OR jsonb_typeof(p_pairs)<>'array' OR jsonb_array_length(p_pairs)>100
 THEN RAISE EXCEPTION 'Invalid pair requests';END IF;
 SELECT count(*) INTO room_count FROM public.gcc_v91_room_drafts d WHERE d.event_id=(SELECT event_id FROM public.gcc_session_signups WHERE id=p_signup);
 FOR p IN SELECT value FROM jsonb_array_elements(p_pairs) LOOP
   IF jsonb_typeof(p)<>'object' OR (p->>'a')!~'^[0-9]+$' OR (p->>'b')!~'^[0-9]+$'
    OR (p->>'room')!~'^[0-9]+$' THEN RAISE EXCEPTION 'Invalid pair details';END IF;
   IF (p->>'a')::integer<0 OR (p->>'b')::integer<0 OR (p->>'a')::integer>499 OR (p->>'b')::integer>499
    OR (p->>'room')::integer NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Invalid pair selection';END IF;
   SELECT id INTO a FROM public.gcc_session_signup_students WHERE signup_id=p_signup AND sort_order=(p->>'a')::integer+1;
   SELECT id INTO b FROM public.gcc_session_signup_students WHERE signup_id=p_signup AND sort_order=(p->>'b')::integer+1;
   IF a IS NULL OR b IS NULL OR a=b OR a=ANY(seen) OR b=ANY(seen) THEN
     RAISE EXCEPTION 'Pair members must be different students and cannot belong to another pair';END IF;
   seen:=seen||a||b;
   INSERT INTO public.gcc_v165_pair_requests(signup_id,student_a,student_b,target_room)
   VALUES(p_signup,least(a,b),greatest(a,b),(p->>'room')::integer);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v165_store_pair_requests(uuid,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.gcc_v165_submit_roster(p_event_id uuid,p_teacher_name text,p_school_name text,p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb,p_pairs jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid;
BEGIN
 sid:=public.gcc_v8_submit_roster(p_event_id,p_teacher_name,p_school_name,p_country_code,p_country_name,p_students,p_facilitators);
 PERFORM public.gcc_v165_store_pair_requests(sid,p_pairs);
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v165_submit_roster(uuid,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v165_submit_roster(uuid,text,text,text,text,jsonb,jsonb,jsonb) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.gcc_v165_submit_signup(p_code text,p_event_id uuid,p_teacher_name text,p_school_name text,p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb,p_pairs jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid;
BEGIN
 sid:=public.gcc_v6_submit_signup(p_code,p_event_id,p_teacher_name,p_school_name,p_country_code,p_country_name,p_students,p_facilitators);
 PERFORM public.gcc_v165_store_pair_requests(sid,p_pairs);
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v165_submit_signup(text,uuid,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v165_submit_signup(text,uuid,text,text,text,text,jsonb,jsonb,jsonb) TO anon,authenticated;
-- Approval: run existing authoritative append, then honor requests on that new approved roster.
CREATE OR REPLACE FUNCTION public.gcc_v155_review_signup_with_auto_rooms(p_signup_id uuid,p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e uuid;result jsonb;d record;pr record;rooms jsonb;idx integer;old_idx integer;
  new_d jsonb;new_rev integer;pub record;applied integer:=0;skipped integer:=0;applied_ids uuid[]:=ARRAY[]::uuid[];
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT event_id INTO e FROM public.gcc_session_signups WHERE id=p_signup_id AND status='pending';
 IF e IS NULL THEN RAISE EXCEPTION 'Pending registration not found';END IF;
 PERFORM public.gcc_v6_review_signup(p_signup_id,p_approve);
 IF NOT p_approve THEN RETURN jsonb_build_object('approved',false,'event_id',e);END IF;
 result:=public.gcc_v155_append_approved_rooms(e);
 SELECT draft,revision INTO d FROM public.gcc_v91_room_drafts WHERE event_id=e FOR UPDATE;
 IF NOT FOUND THEN RETURN result||jsonb_build_object('approved',true,'event_id',e,'pair_requests_pending',true);END IF;
 rooms:=d.draft->'rooms';
 FOR pr IN SELECT * FROM public.gcc_v165_pair_requests WHERE signup_id=p_signup_id ORDER BY target_room,student_a LOOP
   idx:=pr.target_room-1;
   IF idx<0 OR idx>=jsonb_array_length(rooms) OR EXISTS(
      SELECT 1 FROM public.gcc_v106_locked_pairs
      WHERE event_id=e AND (student_a IN(pr.student_a,pr.student_b) OR student_b IN(pr.student_a,pr.student_b))
   ) THEN skipped:=skipped+1;CONTINUE;END IF;
   FOR old_idx IN 0..jsonb_array_length(rooms)-1 LOOP
      rooms:=jsonb_set(rooms,ARRAY[old_idx::text,'students'],
       (SELECT coalesce(jsonb_agg(to_jsonb(x.value)),'[]'::jsonb)
        FROM jsonb_array_elements_text(rooms->old_idx->'students') x(value)
        WHERE x.value NOT IN(pr.student_a::text,pr.student_b::text)),false);
   END LOOP;
   rooms:=jsonb_set(rooms,ARRAY[idx::text,'students'],
     (rooms->idx->'students')||to_jsonb(pr.student_a::text)||to_jsonb(pr.student_b::text),false);
   applied:=applied+1;applied_ids:=applied_ids||pr.student_a;
 END LOOP;
 IF applied>0 THEN
   SELECT revision,token_hash,is_active INTO pub FROM public.gcc_v102_shared_plans WHERE event_id=e FOR UPDATE;
   new_d:=public.gcc_v91_save_room_draft(e,jsonb_set(d.draft,'{rooms}',rooms,false),d.revision);
   new_rev:=(new_d->>'revision')::integer;
   IF pub.is_active AND pub.revision=d.revision THEN
     UPDATE public.gcc_v102_shared_plans SET revision=new_rev,published_at=now() WHERE event_id=e;
     UPDATE public.gcc_v104_shared_access SET revision=new_rev WHERE event_id=e AND publication_hash=pub.token_hash AND revision=d.revision;
   END IF;
   INSERT INTO public.gcc_v106_locked_pairs(event_id,student_a,student_b,created_by)
   SELECT e,student_a,student_b,auth.uid() FROM public.gcc_v165_pair_requests WHERE signup_id=p_signup_id
   AND student_a=ANY(applied_ids)
   ON CONFLICT DO NOTHING;
 END IF;
 RETURN result||jsonb_build_object('approved',true,'event_id',e,'pairs_applied',applied,'pairs_skipped',skipped);
END $$;
REVOKE ALL ON FUNCTION public.gcc_v155_review_signup_with_auto_rooms(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v155_review_signup_with_auto_rooms(uuid,boolean) TO authenticated;
COMMIT;