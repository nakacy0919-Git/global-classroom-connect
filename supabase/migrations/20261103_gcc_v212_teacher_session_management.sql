-- GCC V21.2 Phase 1: authenticated teacher-managed offers, capacity-safe requests,
-- in-app notifications and schedule-change reconfirmation. NO changes to host-managed
-- events, published room plans, student names or stable invitation links.
BEGIN;

ALTER TABLE public.session_join_requests
 ADD COLUMN IF NOT EXISTS requested_students integer NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS reconfirmation_required boolean NOT NULL DEFAULT false;
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='gcc_v212_request_count_check'
   AND conrelid='public.session_join_requests'::regclass) THEN
  ALTER TABLE public.session_join_requests ADD CONSTRAINT gcc_v212_request_count_check
   CHECK(requested_students BETWEEN 1 AND 500);
 END IF;
END $check$;

CREATE TABLE IF NOT EXISTS public.gcc_teacher_notifications_v212 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
 offer_id uuid REFERENCES public.exchange_availability(id) ON DELETE CASCADE,
 request_id uuid REFERENCES public.session_join_requests(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN
   ('join_requested','join_approved','join_declined','schedule_changed',
    'session_updated','session_closed','session_reopened','schedule_confirmed')),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160),
 body text NOT NULL DEFAULT '' CHECK(char_length(body)<=600),
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz
);
CREATE INDEX IF NOT EXISTS gcc_v212_notifications_teacher_idx
 ON public.gcc_teacher_notifications_v212(teacher_id,created_at DESC);
ALTER TABLE public.gcc_teacher_notifications_v212 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_teacher_notifications_v212 FROM PUBLIC,anon,authenticated;
-- All accesses are via teacher-scoped security-definer RPCs, never by direct table reads.

CREATE OR REPLACE FUNCTION public.gcc_v212_notifications()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); result jsonb;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC),'[]'::jsonb)
 INTO result FROM (
   SELECT id,category,title,body,offer_id,request_id,created_at,read_at
   FROM public.gcc_teacher_notifications_v212
   WHERE teacher_id=tid ORDER BY created_at DESC LIMIT 60
 ) n;
 RETURN result;
END $fn$;
CREATE OR REPLACE FUNCTION public.gcc_v212_mark_notification_read(p_notification_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); changed integer;
BEGIN
 UPDATE public.gcc_teacher_notifications_v212 SET read_at=coalesce(read_at,now())
 WHERE id=p_notification_id AND teacher_id=tid;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Notification not found for this teacher';END IF;
 RETURN true;
END $fn$;

-- Trigger covers both new requests and legacy review endpoints (no missed alerts).
CREATE OR REPLACE FUNCTION public.gcc_v212_request_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE host uuid; name text;
BEGIN
 SELECT a.teacher_id INTO host FROM public.exchange_availability a WHERE a.id=NEW.offer_id;
 SELECT display_name INTO name FROM public.teachers WHERE id=NEW.requesting_teacher_id;
 IF TG_OP='INSERT' AND NEW.status='pending'
  OR TG_OP='UPDATE' AND NEW.status='pending' AND OLD.status IS DISTINCT FROM NEW.status THEN
  INSERT INTO public.gcc_teacher_notifications_v212
  (teacher_id,offer_id,request_id,category,title,body)
  VALUES (host,NEW.offer_id,NEW.id,'join_requested','New request to join',
   left(coalesce(name,'A teacher')||' would like to join with '||NEW.requested_students||' students.',600));
 ELSIF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
 AND NEW.status IN ('approved','declined') THEN
  INSERT INTO public.gcc_teacher_notifications_v212
  (teacher_id,offer_id,request_id,category,title,body)
  VALUES (NEW.requesting_teacher_id,NEW.offer_id,NEW.id,
   CASE WHEN NEW.status='approved' THEN 'join_approved' ELSE 'join_declined' END,
   CASE WHEN NEW.status='approved' THEN 'Join request approved' ELSE 'Join request declined' END,
   CASE WHEN NEW.status='approved'
      THEN 'Your request for '||NEW.requested_students||' students was approved. Please agree final arrangements with the host.'
      ELSE 'Your join request was declined. You can browse other sessions.' END);
 END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v212_request_notify_trg ON public.session_join_requests;
CREATE TRIGGER gcc_v212_request_notify_trg
 AFTER INSERT OR UPDATE OF status ON public.session_join_requests
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v212_request_notify();

CREATE OR REPLACE FUNCTION public.gcc_v212_teacher_apply_to_session(
 p_offer_id uuid,p_message text,p_students integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); offer record;
 request_id uuid; max_seats integer; booked integer;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 IF p_students IS NULL OR p_students NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Enter 1–500 students joining from your school'; END IF;
 IF char_length(coalesce(p_message,''))>500 THEN RAISE EXCEPTION 'Message is too long';END IF;
 -- Serialize approvals/applications per session to avoid double spending capacity.
 SELECT * INTO offer FROM public.exchange_availability WHERE id=p_offer_id FOR UPDATE;
 IF NOT FOUND OR offer.status<>'open' OR offer.ends_at<=now() OR offer.starts_at<=now()
 OR (offer.session_details->>'registration_closes_at')::timestamptz<=now()
 THEN RAISE EXCEPTION 'This session is no longer accepting requests';END IF;
 IF offer.teacher_id=tid THEN RAISE EXCEPTION 'You cannot request your own session';END IF;
 IF coalesce(offer.session_details->>'max_participants','') !~ '^[0-9]{1,4}$'
 THEN RAISE EXCEPTION 'Host must finish the total capacity setting before receiving requests';END IF;
 max_seats:=(offer.session_details->>'max_participants')::integer;
 SELECT coalesce(sum(requested_students),0) INTO booked
 FROM public.session_join_requests
 WHERE offer_id=p_offer_id AND status='approved';
 IF offer.student_count+booked+p_students>max_seats THEN
  RAISE EXCEPTION 'Not enough remaining seats for this school';END IF;
 IF EXISTS(SELECT 1 FROM public.session_join_requests
   WHERE offer_id=p_offer_id AND requesting_teacher_id=tid)
 THEN RAISE EXCEPTION 'You already have a request for this session';END IF;
 INSERT INTO public.session_join_requests
  (offer_id,requesting_teacher_id,status,message,created_by,requested_students)
 VALUES(p_offer_id,tid,'pending',btrim(coalesce(p_message,'')),auth.uid(),p_students)
 RETURNING id INTO request_id;
 RETURN request_id;
END $fn$;

-- Maintain compatibility with older clients, but never bypass capacity checks.
CREATE OR REPLACE FUNCTION public.gcc_teacher_apply_to_session(
 p_offer_id uuid,p_message text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 RETURN public.gcc_v212_teacher_apply_to_session(p_offer_id,p_message,1);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v212_teacher_review_request(
 p_request_id uuid,p_decision text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); r record; offer record;
 booked integer; max_seats integer;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 IF p_decision NOT IN ('approved','declined') THEN RAISE EXCEPTION 'Invalid decision';END IF;
 SELECT offer_id INTO r FROM public.session_join_requests WHERE id=p_request_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join request not found';END IF;
 SELECT * INTO offer FROM public.exchange_availability WHERE id=r.offer_id FOR UPDATE;
 IF NOT FOUND OR offer.teacher_id<>tid THEN
  RAISE EXCEPTION 'Only the host can review this request';END IF;
 SELECT * INTO r FROM public.session_join_requests WHERE id=p_request_id FOR UPDATE;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Request has already been reviewed';END IF;
 IF p_decision='approved' THEN
  IF offer.status<>'open' OR offer.starts_at<=now() THEN
   RAISE EXCEPTION 'Session must be open and in the future to approve students';END IF;
  IF coalesce(offer.session_details->>'max_participants','') !~ '^[0-9]{1,4}$'
  THEN RAISE EXCEPTION 'Set total capacity before approving';END IF;
  max_seats:=(offer.session_details->>'max_participants')::integer;
  SELECT coalesce(sum(requested_students),0) INTO booked
   FROM public.session_join_requests WHERE offer_id=r.offer_id AND status='approved';
  IF offer.student_count+booked+r.requested_students>max_seats THEN
   RAISE EXCEPTION 'Not enough remaining seats. Reduce the request size or reject it';END IF;
 END IF;
 UPDATE public.session_join_requests SET status=p_decision,reviewed_by=auth.uid(),
  reviewed_at=now(),reconfirmation_required=false WHERE id=p_request_id;
 RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_teacher_review_request(
 p_request_id uuid,p_decision text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 RETURN public.gcc_v212_teacher_review_request(p_request_id,p_decision);
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v212_teacher_manage_session(p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); result jsonb;
BEGIN
 SELECT to_jsonb(a) - 'created_by' INTO result
 FROM public.exchange_availability a WHERE id=p_offer_id AND teacher_id=tid;
 IF result IS NULL THEN RAISE EXCEPTION 'Only the session owner can edit it';END IF;
 RETURN result;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v212_teacher_edit_session(
 p_offer_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
 p_student_count integer,p_room_count integer,p_age_band text,
 p_topic text,p_notes text,p_details jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();
 offer record; booked integer; max_seats integer; school_zone text;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 SELECT * INTO offer FROM public.exchange_availability WHERE id=p_offer_id FOR UPDATE;
 IF NOT FOUND OR offer.teacher_id<>tid THEN RAISE EXCEPTION 'Only the session owner can edit it';END IF;
 IF offer.ends_at<=now() OR p_starts_at<=now()
  OR p_ends_at<=p_starts_at OR p_ends_at>p_starts_at+interval '6 hours'
 THEN RAISE EXCEPTION 'Only future sessions with a valid duration can be edited';END IF;
 SELECT s.timezone INTO school_zone FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 WHERE t.id=tid;
 IF school_zone IS NULL OR school_zone<>offer.timezone
 THEN RAISE EXCEPTION 'Set your school timezone before editing';END IF;
 PERFORM public.gcc_v203_validate_plan(p_details,p_starts_at,p_ends_at,offer.timezone);
 IF p_student_count NOT BETWEEN 1 AND 500 OR p_room_count NOT BETWEEN 1 AND 100
  OR p_age_band NOT IN ('Primary','Lower Secondary','Upper Secondary','University','Mixed')
  OR char_length(coalesce(p_topic,''))>120 OR char_length(coalesce(p_notes,''))>500
 THEN RAISE EXCEPTION 'Check participant counts, level, topic, and notes';END IF;
 IF char_length(btrim(coalesce(p_details->>'session_name',''))) NOT BETWEEN 3 AND 120
 THEN RAISE EXCEPTION 'Session name must be 3–120 characters';END IF;
 IF coalesce(p_details->>'host_country_code','')<>offer.country_code
 THEN RAISE EXCEPTION 'Host country must match the registered school';END IF;
 IF coalesce(p_details->>'max_participants','') !~ '^[0-9]{1,4}$'
 THEN RAISE EXCEPTION 'A valid total capacity is required';END IF;
 max_seats:=(p_details->>'max_participants')::integer;
 SELECT coalesce(sum(requested_students),0) INTO booked
 FROM public.session_join_requests WHERE offer_id=p_offer_id AND status='approved';
 IF max_seats NOT BETWEEN p_student_count+booked AND 2000 THEN
  RAISE EXCEPTION 'Total capacity cannot be less than your students and approved guest students';END IF;
 UPDATE public.exchange_availability
 SET starts_at=p_starts_at,ends_at=p_ends_at,student_count=p_student_count,
  room_count=p_room_count,age_band=p_age_band,topic=btrim(coalesce(p_topic,'')),
  notes=btrim(coalesce(p_notes,'')),session_details=p_details,updated_at=now()
 WHERE id=p_offer_id;
 RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v212_offer_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE changed_schedule boolean; kind text; title text; body text;
BEGIN
 changed_schedule:=(OLD.starts_at,OLD.ends_at) IS DISTINCT FROM
  (NEW.starts_at,NEW.ends_at);
 IF changed_schedule THEN
  UPDATE public.session_join_requests SET reconfirmation_required=true
   WHERE offer_id=NEW.id AND status='approved';
 END IF;
 IF changed_schedule THEN
  kind:='schedule_changed';title:='Session date or time changed';
  body:='Your host changed the meeting time. Review the new time in GCC and confirm it.';
 ELSIF OLD.status<>NEW.status THEN
  kind:=CASE WHEN NEW.status='closed' THEN 'session_closed' ELSE 'session_reopened' END;
  title:=CASE WHEN NEW.status='closed' THEN 'Session closed' ELSE 'Session reopened' END;
  body:='The host changed the registration status for this session.';
 ELSIF OLD.session_details IS DISTINCT FROM NEW.session_details THEN
  kind:='session_updated';title:='Session details updated';
  body:='Your host updated session details. Review the agenda in GCC.';
 ELSE
  RETURN NEW;
 END IF;
 INSERT INTO public.gcc_teacher_notifications_v212
  (teacher_id,offer_id,request_id,category,title,body)
 SELECT r.requesting_teacher_id,NEW.id,r.id,kind,title,body
 FROM public.session_join_requests r WHERE r.offer_id=NEW.id
  AND r.status IN ('pending','approved');
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v212_offer_notice_trg ON public.exchange_availability;
CREATE TRIGGER gcc_v212_offer_notice_trg
 AFTER UPDATE OF starts_at,ends_at,status,session_details ON public.exchange_availability
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v212_offer_notice();

CREATE OR REPLACE FUNCTION public.gcc_v212_confirm_new_schedule(p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); offer_id uuid; host uuid;
BEGIN
 UPDATE public.session_join_requests SET reconfirmation_required=false
 WHERE id=p_request_id AND requesting_teacher_id=tid AND status='approved'
 AND reconfirmation_required=true
 RETURNING session_join_requests.offer_id INTO offer_id;
 IF offer_id IS NULL THEN RAISE EXCEPTION 'No pending schedule confirmation found';END IF;
 SELECT teacher_id INTO host FROM public.exchange_availability WHERE id=offer_id;
 INSERT INTO public.gcc_teacher_notifications_v212
 (teacher_id,offer_id,request_id,category,title,body)
 VALUES(host,offer_id,p_request_id,'schedule_confirmed','New time confirmed',
  'A partner school confirmed the updated session schedule.');
 RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v212_teacher_reopen_session(p_offer_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); changed integer;
BEGIN
 UPDATE public.exchange_availability SET status='open',updated_at=now()
 WHERE id=p_offer_id AND teacher_id=tid AND status='closed' AND starts_at>now()
 AND (session_details->>'registration_closes_at')::timestamptz>now();
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Cannot reopen this session; check your deadline';END IF;
 RETURN true;
END $fn$;

-- Database-side guard also covers direct writes by a privileged host account.
-- This prevents bypassing the RPC's serialized capacity check.
CREATE OR REPLACE FUNCTION public.gcc_v212_enforce_approved_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE offer record; booked integer; max_seats integer; old_approved integer:=0;
BEGIN
 IF NEW.status<>'approved' THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status='approved' AND OLD.requested_students=NEW.requested_students
   AND OLD.offer_id=NEW.offer_id THEN RETURN NEW; END IF;
  IF OLD.status='approved' AND OLD.offer_id=NEW.offer_id THEN
   old_approved:=OLD.requested_students;
  END IF;
 END IF;
 SELECT * INTO offer FROM public.exchange_availability
 WHERE id=NEW.offer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session does not exist';END IF;
 IF coalesce(offer.session_details->>'max_participants','') !~ '^[0-9]{1,4}
CREATE OR REPLACE FUNCTION public.gcc_teacher_list_requests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
 INTO result FROM (
  SELECT r.id,r.offer_id,r.status,r.message,r.created_at,r.requesting_teacher_id,
   r.requested_students,r.reconfirmation_required,a.teacher_id as host_teacher_id,
   h.display_name as host_name,g.display_name as guest_name,
   a.starts_at,a.ends_at,a.timezone,a.topic,
   sh.country_code as host_country,
   CASE WHEN a.teacher_id=tid THEN 'incoming' ELSE 'outgoing' END as direction
  FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  JOIN public.teachers h ON h.id=a.teacher_id
  JOIN public.teachers g ON g.id=r.requesting_teacher_id
  LEFT JOIN public.schools sh ON sh.id=h.school_id
  WHERE r.requesting_teacher_id=tid OR a.teacher_id=tid
  ORDER BY r.created_at DESC LIMIT 200
 ) x;
 RETURN result;
END $fn$;

-- Teacher listing shows actual remaining seats, and keeps the meeting URL private.
CREATE OR REPLACE FUNCTION public.gcc_teacher_browse_sessions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();items jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]'::jsonb)
 INTO items FROM (
  SELECT a.id,a.teacher_id,t.display_name as teacher_name,s.name as school_name,
   s.country_name,s.country_code,a.starts_at,a.ends_at,a.timezone,a.student_count,
   a.room_count,a.age_band,a.topic,a.status,
   (a.session_details-'meeting_url') AS session_details,
   (a.teacher_id=tid) as is_mine,
   coalesce(booked.confirmed,0)::integer AS approved_guest_students,
   CASE WHEN a.session_details->>'max_participants' ~ '^[0-9]{1,4}$'
     THEN greatest(0,(a.session_details->>'max_participants')::integer
       -a.student_count-coalesce(booked.confirmed,0)) ELSE NULL END AS available_seats
  FROM public.exchange_availability a
  JOIN public.teachers t ON t.id=a.teacher_id AND t.is_active=true
  JOIN public.schools s ON s.id=t.school_id
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(requested_students),0) AS confirmed
    FROM public.session_join_requests r WHERE r.offer_id=a.id AND r.status='approved'
  ) booked ON true
  WHERE a.ends_at>now() AND (a.teacher_id=tid OR
   (a.status='open' AND (a.session_details->>'registration_closes_at' IS NULL
    OR (a.session_details->>'registration_closes_at')::timestamptz>now())))
  ORDER BY a.starts_at ASC LIMIT 300
 ) x;
 RETURN items;
END $fn$;

-- Never let anonymous actors call teacher-specific RPCs. Internal triggers
-- are invoked only by Postgres, not via the external REST Data API.
REVOKE ALL ON FUNCTION public.gcc_v212_request_notify() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_offer_notice() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_notifications() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_mark_notification_read(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_apply_to_session(uuid,text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_review_request(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_manage_session(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_edit_session(uuid,timestamptz,timestamptz,integer,integer,text,text,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_confirm_new_schedule(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_reopen_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v212_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_apply_to_session(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_review_request(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_manage_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_edit_session(uuid,timestamptz,timestamptz,integer,integer,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_confirm_new_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_reopen_session(uuid) TO authenticated;

COMMIT;

 THEN RAISE EXCEPTION 'Complete total session capacity before approving students';END IF;
 max_seats:=(offer.session_details->>'max_participants')::integer;
 SELECT coalesce(sum(requested_students),0) INTO booked
 FROM public.session_join_requests WHERE offer_id=NEW.offer_id AND status='approved';
 IF offer.student_count+booked-old_approved+NEW.requested_students>max_seats THEN
  RAISE EXCEPTION 'Approved students would exceed total session capacity';END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v212_approved_capacity_trg ON public.session_join_requests;
CREATE TRIGGER gcc_v212_approved_capacity_trg
 BEFORE INSERT OR UPDATE OF status,requested_students,offer_id
 ON public.session_join_requests
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v212_enforce_approved_capacity();

CREATE OR REPLACE FUNCTION public.gcc_v212_offer_capacity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE booked integer; total_cap integer;
BEGIN
 IF coalesce(NEW.session_details->>'max_participants','') !~ '^[0-9]{1,4}
CREATE OR REPLACE FUNCTION public.gcc_teacher_list_requests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
 INTO result FROM (
  SELECT r.id,r.offer_id,r.status,r.message,r.created_at,r.requesting_teacher_id,
   r.requested_students,r.reconfirmation_required,a.teacher_id as host_teacher_id,
   h.display_name as host_name,g.display_name as guest_name,
   a.starts_at,a.ends_at,a.timezone,a.topic,
   sh.country_code as host_country,
   CASE WHEN a.teacher_id=tid THEN 'incoming' ELSE 'outgoing' END as direction
  FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  JOIN public.teachers h ON h.id=a.teacher_id
  JOIN public.teachers g ON g.id=r.requesting_teacher_id
  LEFT JOIN public.schools sh ON sh.id=h.school_id
  WHERE r.requesting_teacher_id=tid OR a.teacher_id=tid
  ORDER BY r.created_at DESC LIMIT 200
 ) x;
 RETURN result;
END $fn$;

-- Teacher listing shows actual remaining seats, and keeps the meeting URL private.
CREATE OR REPLACE FUNCTION public.gcc_teacher_browse_sessions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();items jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]'::jsonb)
 INTO items FROM (
  SELECT a.id,a.teacher_id,t.display_name as teacher_name,s.name as school_name,
   s.country_name,s.country_code,a.starts_at,a.ends_at,a.timezone,a.student_count,
   a.room_count,a.age_band,a.topic,a.status,
   (a.session_details-'meeting_url') AS session_details,
   (a.teacher_id=tid) as is_mine,
   coalesce(booked.confirmed,0)::integer AS approved_guest_students,
   CASE WHEN a.session_details->>'max_participants' ~ '^[0-9]{1,4}$'
     THEN greatest(0,(a.session_details->>'max_participants')::integer
       -a.student_count-coalesce(booked.confirmed,0)) ELSE NULL END AS available_seats
  FROM public.exchange_availability a
  JOIN public.teachers t ON t.id=a.teacher_id AND t.is_active=true
  JOIN public.schools s ON s.id=t.school_id
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(requested_students),0) AS confirmed
    FROM public.session_join_requests r WHERE r.offer_id=a.id AND r.status='approved'
  ) booked ON true
  WHERE a.ends_at>now() AND (a.teacher_id=tid OR
   (a.status='open' AND (a.session_details->>'registration_closes_at' IS NULL
    OR (a.session_details->>'registration_closes_at')::timestamptz>now())))
  ORDER BY a.starts_at ASC LIMIT 300
 ) x;
 RETURN items;
END $fn$;

-- Never let anonymous actors call teacher-specific RPCs. Internal triggers
-- are invoked only by Postgres, not via the external REST Data API.
REVOKE ALL ON FUNCTION public.gcc_v212_request_notify() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_offer_notice() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_notifications() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_mark_notification_read(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_apply_to_session(uuid,text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_review_request(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_manage_session(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_edit_session(uuid,timestamptz,timestamptz,integer,integer,text,text,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_confirm_new_schedule(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_reopen_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v212_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_apply_to_session(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_review_request(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_manage_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_edit_session(uuid,timestamptz,timestamptz,integer,integer,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_confirm_new_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_reopen_session(uuid) TO authenticated;

COMMIT;

 THEN RETURN NEW;END IF;
 total_cap:=(NEW.session_details->>'max_participants')::integer;
 SELECT coalesce(sum(requested_students),0) INTO booked
 FROM public.session_join_requests WHERE offer_id=NEW.id AND status='approved';
 IF NEW.student_count+booked>total_cap THEN
  RAISE EXCEPTION 'Session total capacity must include all approved participants';END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gcc_v212_offer_capacity_guard_trg ON public.exchange_availability;
CREATE TRIGGER gcc_v212_offer_capacity_guard_trg
 BEFORE UPDATE OF student_count,session_details ON public.exchange_availability
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v212_offer_capacity_guard();
REVOKE ALL ON FUNCTION public.gcc_v212_enforce_approved_capacity() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_offer_capacity_guard() FROM PUBLIC,anon,authenticated;

-- Return only the relevant count and schedule status to the applicant/host.
CREATE OR REPLACE FUNCTION public.gcc_teacher_list_requests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
 INTO result FROM (
  SELECT r.id,r.offer_id,r.status,r.message,r.created_at,r.requesting_teacher_id,
   r.requested_students,r.reconfirmation_required,a.teacher_id as host_teacher_id,
   h.display_name as host_name,g.display_name as guest_name,
   a.starts_at,a.ends_at,a.timezone,a.topic,
   sh.country_code as host_country,
   CASE WHEN a.teacher_id=tid THEN 'incoming' ELSE 'outgoing' END as direction
  FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  JOIN public.teachers h ON h.id=a.teacher_id
  JOIN public.teachers g ON g.id=r.requesting_teacher_id
  LEFT JOIN public.schools sh ON sh.id=h.school_id
  WHERE r.requesting_teacher_id=tid OR a.teacher_id=tid
  ORDER BY r.created_at DESC LIMIT 200
 ) x;
 RETURN result;
END $fn$;

-- Teacher listing shows actual remaining seats, and keeps the meeting URL private.
CREATE OR REPLACE FUNCTION public.gcc_teacher_browse_sessions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();items jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.starts_at),'[]'::jsonb)
 INTO items FROM (
  SELECT a.id,a.teacher_id,t.display_name as teacher_name,s.name as school_name,
   s.country_name,s.country_code,a.starts_at,a.ends_at,a.timezone,a.student_count,
   a.room_count,a.age_band,a.topic,a.status,
   (a.session_details-'meeting_url') AS session_details,
   (a.teacher_id=tid) as is_mine,
   coalesce(booked.confirmed,0)::integer AS approved_guest_students,
   CASE WHEN a.session_details->>'max_participants' ~ '^[0-9]{1,4}$'
     THEN greatest(0,(a.session_details->>'max_participants')::integer
       -a.student_count-coalesce(booked.confirmed,0)) ELSE NULL END AS available_seats
  FROM public.exchange_availability a
  JOIN public.teachers t ON t.id=a.teacher_id AND t.is_active=true
  JOIN public.schools s ON s.id=t.school_id
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(requested_students),0) AS confirmed
    FROM public.session_join_requests r WHERE r.offer_id=a.id AND r.status='approved'
  ) booked ON true
  WHERE a.ends_at>now() AND (a.teacher_id=tid OR
   (a.status='open' AND (a.session_details->>'registration_closes_at' IS NULL
    OR (a.session_details->>'registration_closes_at')::timestamptz>now())))
  ORDER BY a.starts_at ASC LIMIT 300
 ) x;
 RETURN items;
END $fn$;

-- Never let anonymous actors call teacher-specific RPCs. Internal triggers
-- are invoked only by Postgres, not via the external REST Data API.
REVOKE ALL ON FUNCTION public.gcc_v212_request_notify() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_offer_notice() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v212_notifications() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_mark_notification_read(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_apply_to_session(uuid,text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_review_request(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_manage_session(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_edit_session(uuid,timestamptz,timestamptz,integer,integer,text,text,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_confirm_new_schedule(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v212_teacher_reopen_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v212_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_apply_to_session(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_review_request(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_manage_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_edit_session(uuid,timestamptz,timestamptz,integer,integer,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_confirm_new_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v212_teacher_reopen_session(uuid) TO authenticated;

COMMIT;
