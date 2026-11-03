-- GCC V21.4: private teacher-to-teacher session conversations.
-- Approved teacher requests only. No email, push services, student names,
-- public meeting URLs or paid messaging providers.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gcc_teacher_messages_v214 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.session_join_requests(id) ON DELETE CASCADE,
 sender_teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS gcc_teacher_messages_v214_thread_created
 ON public.gcc_teacher_messages_v214(request_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS gcc_teacher_messages_v214_sender_recent
 ON public.gcc_teacher_messages_v214(sender_teacher_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.gcc_teacher_message_reads_v214 (
 request_id uuid NOT NULL REFERENCES public.session_join_requests(id) ON DELETE CASCADE,
 teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
 last_read_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz,
 PRIMARY KEY(request_id,teacher_id)
);

ALTER TABLE public.gcc_teacher_messages_v214 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_teacher_message_reads_v214 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_teacher_messages_v214 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.gcc_teacher_message_reads_v214 FROM PUBLIC,anon,authenticated;

-- List only approved partner-school conversations visible to the current teacher.
-- Per-conversation and global unread counts are calculated on the server.
CREATE OR REPLACE FUNCTION public.gcc_v214_teacher_threads()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); result jsonb;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Verified teacher sign-in required'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.last_message_at DESC NULLS LAST,x.starts_at DESC),
  '[]'::jsonb) INTO result
 FROM (
  SELECT r.id AS request_id,r.offer_id,r.status,
   a.teacher_id=tid AS is_host,
   CASE WHEN a.teacher_id=tid THEN guest.display_name ELSE host.display_name END AS partner_name,
   CASE WHEN a.teacher_id=tid THEN gs.name ELSE hs.name END AS partner_school,
   CASE WHEN a.teacher_id=tid THEN gs.country_code ELSE hs.country_code END AS partner_country_code,
   COALESCE(NULLIF(a.session_details->>'session_name',''),NULLIF(a.topic,''),'Global Classroom Exchange') AS title,
   a.starts_at,a.ends_at,a.timezone,
   (SELECT m.body FROM public.gcc_teacher_messages_v214 m WHERE m.request_id=r.id
    ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS last_message,
   (SELECT m.created_at FROM public.gcc_teacher_messages_v214 m WHERE m.request_id=r.id
    ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS last_message_at,
   (SELECT count(*)::integer FROM public.gcc_teacher_messages_v214 m
    LEFT JOIN public.gcc_teacher_message_reads_v214 seen ON
      seen.request_id=r.id AND seen.teacher_id=tid
    WHERE m.request_id=r.id AND m.sender_teacher_id<>tid
      AND m.created_at>coalesce(seen.last_read_at,'-infinity'::timestamptz)) AS unread_count
  FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  JOIN public.teachers host ON host.id=a.teacher_id AND host.is_active=true
  JOIN public.teachers guest ON guest.id=r.requesting_teacher_id AND guest.is_active=true
  LEFT JOIN public.schools hs ON hs.id=host.school_id
  LEFT JOIN public.schools gs ON gs.id=guest.school_id
  WHERE r.status='approved'
    AND (a.teacher_id=tid OR r.requesting_teacher_id=tid)
  ORDER BY a.starts_at DESC LIMIT 200
 ) x;
 RETURN result;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v214_teacher_messages(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); result jsonb;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Verified teacher sign-in required'; END IF;
 IF p_request_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  WHERE r.id=p_request_id AND r.status='approved'
   AND (a.teacher_id=tid OR r.requesting_teacher_id=tid)
 ) THEN RAISE EXCEPTION 'Conversation is not available to this teacher'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at,m.id),'[]'::jsonb)
 INTO result FROM (
  SELECT id,request_id,sender_teacher_id=tid AS is_mine,body,created_at
  FROM public.gcc_teacher_messages_v214
  WHERE request_id=p_request_id
  ORDER BY created_at DESC,id DESC LIMIT 150
 ) m;
 RETURN result;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v214_teacher_send_message(p_request_id uuid,p_body text)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); thread record; result uuid;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Verified teacher sign-in required'; END IF;
 IF p_body IS NULL OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 2000
 THEN RAISE EXCEPTION 'Message must contain 1–2000 characters'; END IF;
 -- Lock the conversation while checking the approved state and simple spam limit.
 SELECT r.id,r.requesting_teacher_id,a.teacher_id
 INTO thread
 FROM public.session_join_requests r
 JOIN public.exchange_availability a ON a.id=r.offer_id
 WHERE r.id=p_request_id AND r.status='approved' FOR UPDATE OF r;
 IF NOT FOUND OR tid NOT IN (thread.teacher_id,thread.requesting_teacher_id)
 THEN RAISE EXCEPTION 'Only approved session partner teachers can send messages';END IF;
 IF (SELECT count(*) FROM public.gcc_teacher_messages_v214 m
     WHERE m.sender_teacher_id=tid AND m.created_at>now()-interval '1 hour')>=60
 THEN RAISE EXCEPTION 'Message limit reached (60 per hour). Try again later'; END IF;
 INSERT INTO public.gcc_teacher_messages_v214(request_id,sender_teacher_id,body)
 VALUES(p_request_id,tid,btrim(p_body)) RETURNING id INTO result;
 RETURN result;
END $fn$;

-- Mark only messages actually shown to the reader. Messages received after
-- the last visible message remain unread, even during concurrent sends.
CREATE OR REPLACE FUNCTION public.gcc_v214_teacher_mark_read(
 p_request_id uuid,p_last_message_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); seen_at timestamptz;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Verified teacher sign-in required'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  WHERE r.id=p_request_id AND r.status='approved'
    AND (a.teacher_id=tid OR r.requesting_teacher_id=tid)
 ) THEN RAISE EXCEPTION 'Conversation is not available to this teacher'; END IF;
 SELECT m.created_at INTO seen_at FROM public.gcc_teacher_messages_v214 m
 WHERE m.id=p_last_message_id AND m.request_id=p_request_id;
 IF seen_at IS NULL THEN RAISE EXCEPTION 'Last visible message does not belong to this conversation'; END IF;
 INSERT INTO public.gcc_teacher_message_reads_v214(request_id,teacher_id,last_read_at)
 VALUES(p_request_id,tid,seen_at)
 ON CONFLICT(request_id,teacher_id) DO UPDATE
 SET last_read_at=greatest(
  public.gcc_teacher_message_reads_v214.last_read_at,EXCLUDED.last_read_at
 );
 RETURN true;
END $fn$;

REVOKE ALL ON FUNCTION public.gcc_v214_teacher_threads() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v214_teacher_messages(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v214_teacher_send_message(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v214_teacher_mark_read(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v214_teacher_threads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v214_teacher_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v214_teacher_send_message(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v214_teacher_mark_read(uuid,uuid) TO authenticated;
COMMIT;
