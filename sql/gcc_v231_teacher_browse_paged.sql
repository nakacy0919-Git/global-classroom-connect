-- GCC V23.1: staged, teacher-scoped, cursor-based session discovery.
-- DO NOT EXECUTE ON PRODUCTION UNTIL ISOLATED TEST DB, PRIVILEGE, AND ROLLBACK REVIEWS.
-- Purpose: replace existing gcc_teacher_browse_sessions() 300-row LIMIT for global scale.
-- Does not change any existing table, student record, or prior RPC.
BEGIN;

-- Internal validation helper; malformed explicit deadlines must not throw in browse.
CREATE OR REPLACE FUNCTION public.gcc_v231_registration_open(
 p_deadline text, p_as_of timestamptz
) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path TO ''
AS $fn$
BEGIN
 IF p_deadline IS NULL OR btrim(p_deadline)='' THEN RETURN true; END IF;
 BEGIN
  RETURN p_deadline::timestamptz>p_as_of;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RETURN false;
 END;
END;
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v231_registration_open(text,timestamptz)
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v231_teacher_browse_sessions_page(
 p_after_start timestamptz DEFAULT NULL,
 p_after_id uuid DEFAULT NULL,
 p_limit integer DEFAULT 100
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 teacher uuid;
 effective_limit integer;
 entries jsonb;
 more boolean;
 snapshot timestamptz:=now();
BEGIN
 teacher:=public.gcc_current_teacher_id(); -- enforces a signed-in approved teacher
 IF (p_after_start IS NULL)<>(p_after_id IS NULL)
  THEN RAISE EXCEPTION 'Session cursor is incomplete'; END IF;
 IF p_limit IS NULL OR p_limit<1 OR p_limit>100
  THEN RAISE EXCEPTION 'Session page size must be between 1 and 100'; END IF;
 effective_limit:=p_limit;

 WITH matching AS MATERIALIZED (
  SELECT a.id,a.teacher_id,t.display_name AS teacher_name,
   s.name AS school_name,s.country_name,s.country_code,
   a.starts_at,a.ends_at,a.timezone,a.student_count,a.room_count,
   a.age_band,a.topic,a.status,
   (a.session_details-'meeting_url') AS session_details,
   (a.teacher_id=teacher) AS is_mine,
   coalesce(booked.confirmed,0)::integer AS approved_guest_students,
   CASE WHEN a.session_details->>'max_participants' ~ '^[0-9]{1,4}$'
    THEN greatest(0,(a.session_details->>'max_participants')::integer
      -a.student_count-coalesce(booked.confirmed,0)) ELSE NULL END AS available_seats
  FROM public.exchange_availability a
  JOIN public.teachers t ON t.id=a.teacher_id AND t.is_active=true
  JOIN public.schools s ON s.id=t.school_id
  LEFT JOIN LATERAL (
   SELECT coalesce(sum(r.requested_students),0) AS confirmed
   FROM public.session_join_requests r
   WHERE r.offer_id=a.id AND r.status='approved'
  ) booked ON true
  WHERE a.ends_at>snapshot
   AND (a.teacher_id=teacher OR
    (a.status='open' AND
     public.gcc_v231_registration_open(a.session_details->>'registration_closes_at',snapshot)))
   AND (p_after_start IS NULL OR (a.starts_at,a.id)>(p_after_start,p_after_id))
  ORDER BY a.starts_at,a.id
  LIMIT (effective_limit+1)
 ),
 display_rows AS (
  SELECT * FROM matching ORDER BY starts_at,id LIMIT effective_limit
 )
 SELECT coalesce(jsonb_agg(to_jsonb(display_rows) ORDER BY starts_at,id),'[]'::jsonb),
   (SELECT count(*)>effective_limit FROM matching)
 INTO entries,more
 FROM display_rows;

 RETURN jsonb_build_object('items',entries,'has_more',coalesce(more,false));
END;
$fn$;

-- Do not grant anonymous or PUBLIC access to the security-definer browse.
REVOKE ALL ON FUNCTION public.gcc_v231_teacher_browse_sessions_page(timestamptz,uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v231_teacher_browse_sessions_page(timestamptz,uuid,integer)
 TO authenticated;

COMMIT;
