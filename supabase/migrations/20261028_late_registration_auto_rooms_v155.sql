-- GCC V15.5 — approved late registrations extend existing published charts atomically.
-- Critically, already assigned students/facilitators never move, and the existing
-- 64-character sharing link + six-digit access code remain valid after approval.
-- No backfill and no mutation of today's confirmed plans during deployment.

CREATE OR REPLACE FUNCTION public.gcc_v155_append_approved_rooms(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_saved record;
 v_publication record;
 v_rooms jsonb;
 v_updated jsonb;
 v_room jsonb;
 v_student record;
 v_index integer;
 v_nrooms integer;
 v_min_size integer;
 v_size integer;
 v_best_score integer;
 v_score integer;
 v_choice integer;
 v_ties integer;
 v_added integer:=0;
 v_added_fac integer:=0;
 v_approved integer;
 v_old_count integer;
 v_old_unique integer;
 v_slots integer;
 v_country_weight integer;
 v_school_weight integer;
 v_fac_ids text[];
 v_fac_pos integer:=1;
 v_fac_total integer;
 v_slot integer;
 v_new_revision integer;
BEGIN
 -- Only a signed-in GCC host may call this internal helper through the review RPC.
 PERFORM public.gcc_v6_require_host();
 SELECT d.draft,d.revision INTO v_saved
 FROM public.gcc_v91_room_drafts d
 WHERE d.event_id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('auto_assigned',false,'added_students',0,'added_facilitators',0,
     'reason','No saved room arrangement yet');
 END IF;
 v_rooms:=v_saved.draft->'rooms';
 IF coalesce(v_saved.draft->>'version','')<>'1'
    OR jsonb_typeof(v_rooms)<>'array'
    OR jsonb_array_length(v_rooms) NOT BETWEEN 1 AND 60
    OR jsonb_typeof(v_saved.draft->'prefs')<>'object' THEN
   RAISE EXCEPTION 'Saved room arrangement is invalid. Registration was not approved.';
 END IF;
 v_nrooms:=jsonb_array_length(v_rooms);
 v_slots:=(v_saved.draft->'prefs'->>'facilitatorsPerRoom')::integer;
 IF v_slots NOT BETWEEN 0 AND 2 OR
    (v_saved.draft->'prefs'->>'rooms')::integer<>v_nrooms OR
    coalesce(v_saved.draft->'prefs'->>'countryMode','') NOT IN ('ignore','prefer','strong') OR
    coalesce(v_saved.draft->'prefs'->>'schoolMode','') NOT IN ('ignore','prefer','strong') THEN
    RAISE EXCEPTION 'Saved room settings need review. Registration was not approved.';
 END IF;
 -- Reject malformed saved membership rather than silently discarding or moving anyone.
 FOR v_index IN 0..v_nrooms-1 LOOP
   v_room:=v_rooms->v_index;
   IF jsonb_typeof(v_room)<>'object' OR
      (v_room->>'number')::integer<>v_index+1 OR
      jsonb_typeof(v_room->'students')<>'array' OR
      jsonb_typeof(v_room->'facilitators')<>'array' OR
      jsonb_array_length(v_room->'facilitators')<>v_slots THEN
     RAISE EXCEPTION 'Saved rooms are not valid. Registration was not approved.';
   END IF;
 END LOOP;
 SELECT count(*),count(DISTINCT st.id)
 INTO v_old_count,v_old_unique
 FROM jsonb_array_elements(v_rooms) room(data),
 LATERAL jsonb_array_elements_text(room.data->'students') st(id);
 SELECT count(*) INTO v_approved
 FROM public.gcc_session_signup_students st
 JOIN public.gcc_session_signups s ON s.id=st.signup_id
 WHERE s.event_id=p_event_id AND s.status='approved';
 IF v_old_count<1 OR v_old_count<>v_old_unique OR v_old_count>v_approved OR v_approved>2000 OR EXISTS(
   SELECT member.id FROM jsonb_array_elements(v_rooms) r(room),
        LATERAL jsonb_array_elements_text(r.room->'students') member(id)
   EXCEPT
   SELECT st.id::text FROM public.gcc_session_signup_students st
   JOIN public.gcc_session_signups s ON s.id=st.signup_id
   WHERE s.event_id=p_event_id AND s.status='approved'
 ) THEN RAISE EXCEPTION 'Saved arrangement contains missing or unapproved students. Registration was not approved.';END IF;

 -- Do not overwrite an independently republished or edited share link.
 SELECT p.revision,p.token_hash,p.is_active INTO v_publication
 FROM public.gcc_v102_shared_plans p WHERE p.event_id=p_event_id FOR UPDATE;
 IF FOUND AND v_publication.is_active AND v_publication.revision<>v_saved.revision THEN
   RAISE EXCEPTION 'Published room chart is out of date. Review it before approving late registrations.';
 END IF;
 IF v_publication.is_active AND EXISTS(
    SELECT 1 FROM public.gcc_v104_shared_access a WHERE a.event_id=p_event_id
      AND a.enabled AND (a.revision<>v_saved.revision OR a.publication_hash<>v_publication.token_hash)
 ) THEN
   RAISE EXCEPTION 'Shared room access is out of date. Registration was not approved.';
 END IF;

 v_country_weight:=CASE v_saved.draft->'prefs'->>'countryMode'
   WHEN 'strong' THEN 4 WHEN 'prefer' THEN 1 ELSE 0 END;
 v_school_weight:=CASE v_saved.draft->'prefs'->>'schoolMode'
   WHEN 'strong' THEN 4 WHEN 'prefer' THEN 1 ELSE 0 END;

 -- Randomize new students, choose the least populated room, and break equal
 -- country/school mixing scores randomly. Existing assignments are append-only.
 FOR v_student IN
   SELECT st.id::text AS student_id,s.country_code,
          lower(btrim(s.school_name)) AS school_name
   FROM public.gcc_session_signup_students st
   JOIN public.gcc_session_signups s ON s.id=st.signup_id
   WHERE s.event_id=p_event_id AND s.status='approved'
     AND NOT EXISTS(
       SELECT 1 FROM jsonb_array_elements(v_rooms) room(data),
                     LATERAL jsonb_array_elements_text(room.data->'students') member(id)
       WHERE member.id=st.id::text
     )
   ORDER BY random()
 LOOP
   SELECT min(jsonb_array_length(room.data->'students')) INTO v_min_size
   FROM jsonb_array_elements(v_rooms) room(data);
   v_best_score:=2147483647; v_choice:=NULL;v_ties:=0;
   FOR v_index IN 0..v_nrooms-1 LOOP
     v_room:=v_rooms->v_index;
     v_size:=jsonb_array_length(v_room->'students');
     IF v_size>v_min_size THEN CONTINUE; END IF;
     SELECT coalesce(sum(
       (CASE WHEN coalesce(s.country_code,'')=coalesce(v_student.country_code,'') THEN v_country_weight ELSE 0 END)+
       (CASE WHEN lower(btrim(s.school_name))=v_student.school_name AND s.country_code=v_student.country_code
          THEN v_school_weight ELSE 0 END)
     ),0)::integer INTO v_score
     FROM jsonb_array_elements_text(v_room->'students') member(id)
     JOIN public.gcc_session_signup_students st ON st.id::text=member.id
     JOIN public.gcc_session_signups s ON s.id=st.signup_id;
     IF v_score<v_best_score THEN v_choice:=v_index;v_best_score:=v_score;v_ties:=1;
     ELSIF v_score=v_best_score THEN
       v_ties:=v_ties+1;
       IF random()<1.0/v_ties THEN v_choice:=v_index;END IF;
     END IF;
   END LOOP;
   IF v_choice IS NULL THEN RAISE EXCEPTION 'No available room for additional students';END IF;
   v_rooms:=jsonb_set(v_rooms,ARRAY[v_choice::text,'students'],
     (v_rooms->v_choice->'students')||to_jsonb(v_student.student_id),false);
   v_added:=v_added+1;
 END LOOP;
 -- Newly registered facilitators are added only to vacant slots.
 SELECT coalesce(array_agg(f.fac_id ORDER BY f.sort_key),ARRAY[]::text[]) INTO v_fac_ids
 FROM (
  SELECT s.id::text||':fac:'||(m.ordinality-1)::text AS fac_id,random() AS sort_key
  FROM public.gcc_session_signups s,
       LATERAL jsonb_array_elements_text(s.facilitators) WITH ORDINALITY m(name,ordinality)
  WHERE s.event_id=p_event_id AND s.status='approved'
  AND NOT EXISTS(
   SELECT 1 FROM jsonb_array_elements(v_rooms) r(room),
             LATERAL jsonb_array_elements_text(r.room->'facilitators') present(id)
   WHERE present.id=s.id::text||':fac:'||(m.ordinality-1)::text
  )
 ) f;
 v_fac_total:=coalesce(array_length(v_fac_ids,1),0);
 IF v_slots>0 AND v_fac_total>0 THEN
   FOR v_index IN 0..v_nrooms-1 LOOP
     FOR v_slot IN 0..v_slots-1 LOOP
       EXIT WHEN v_fac_pos>v_fac_total;
       IF jsonb_typeof(v_rooms->v_index->'facilitators'->v_slot)='null' THEN
         v_rooms:=jsonb_set(v_rooms,ARRAY[v_index::text,'facilitators',v_slot::text],
           to_jsonb(v_fac_ids[v_fac_pos]),false);
         v_fac_pos:=v_fac_pos+1;v_added_fac:=v_added_fac+1;
       END IF;
     END LOOP;
   END LOOP;
 END IF;
 IF v_added=0 AND v_added_fac=0 THEN
   RETURN jsonb_build_object('auto_assigned',true,'added_students',0,'added_facilitators',0,
       'revision',v_saved.revision);
 END IF;

 -- Reuse V9.1's authoritative validation & optimistic locking to commit the
 -- new approved roster. An error aborts the entire registration approval.
 v_updated:=public.gcc_v91_save_room_draft(p_event_id,
   jsonb_set(v_saved.draft,'{rooms}',v_rooms,false),v_saved.revision);
 v_new_revision:=(v_updated->>'revision')::integer;

 -- Existing sharing token, Zoom URL, and 6-digit PIN hash are unchanged.
 -- All three revisions advance in the SAME transaction to avoid invalidated
 -- access codes when a school registers after publication.
 IF v_publication.is_active THEN
   UPDATE public.gcc_v102_shared_plans
   SET revision=v_new_revision,published_at=now()
   WHERE event_id=p_event_id AND revision=v_saved.revision AND is_active;
   IF NOT FOUND THEN RAISE EXCEPTION 'Concurrent room publication detected. Approval rolled back.';END IF;
   UPDATE public.gcc_v104_shared_access
   SET revision=v_new_revision
   WHERE event_id=p_event_id AND publication_hash=v_publication.token_hash
     AND revision=v_saved.revision;
 END IF;
 RETURN jsonb_build_object('auto_assigned',true,'added_students',v_added,
   'added_facilitators',v_added_fac,'revision',v_new_revision,
   'shared_link_unchanged',coalesce(v_publication.is_active,false));
END $$;

-- Only this wrapper is callable from the GCC host approval UI. It preserves
-- the existing registration verification/participant import logic unmodified.
CREATE OR REPLACE FUNCTION public.gcc_v155_review_signup_with_auto_rooms(
 p_signup_id uuid,p_approve boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE event_id uuid;result jsonb;
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT s.event_id INTO event_id FROM public.gcc_session_signups s
 WHERE s.id=p_signup_id AND s.status='pending';
 IF event_id IS NULL THEN RAISE EXCEPTION 'Pending registration not found';END IF;
 PERFORM public.gcc_v6_review_signup(p_signup_id,p_approve);
 IF p_approve THEN
   result:=public.gcc_v155_append_approved_rooms(event_id);
 ELSE
   result:=jsonb_build_object('auto_assigned',false,'added_students',0,'added_facilitators',0);
 END IF;
 RETURN result||jsonb_build_object('approved',p_approve,'event_id',event_id);
END $$;

REVOKE ALL ON FUNCTION public.gcc_v155_append_approved_rooms(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v155_review_signup_with_auto_rooms(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v155_review_signup_with_auto_rooms(uuid,boolean) TO authenticated;
