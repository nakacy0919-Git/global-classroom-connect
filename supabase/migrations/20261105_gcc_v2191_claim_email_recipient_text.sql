-- GCC V21.9.1: fix SQLSTATE 42804 in host email job claim RPC.
-- auth.users.email is varchar while RETURNS TABLE declares text.
-- Preserve queue locks, lease behavior, worker-only permissions and retry policy.
CREATE OR REPLACE FUNCTION public.gcc_v219_claim_request_emails(p_limit integer DEFAULT 5)
RETURNS TABLE(request_id uuid,lease_token uuid,recipient_email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN
   RAISE EXCEPTION 'Invalid email batch size';
 END IF;
 RETURN QUERY
 WITH due AS (
   SELECT j.request_id FROM public.gcc_v219_request_email_jobs j
   JOIN public.session_join_requests r ON r.id=j.request_id AND r.status='pending'
   JOIN public.exchange_availability a ON a.id=r.offer_id AND a.starts_at>now()
   WHERE j.attempts<5
     AND j.next_attempt_at<=now()
     AND (j.status IN ('pending','retry')
         OR (j.status='sending' AND j.lease_expires_at<now()))
   ORDER BY j.created_at
   FOR UPDATE OF j SKIP LOCKED
   LIMIT p_limit
 ), claimed AS (
   UPDATE public.gcc_v219_request_email_jobs j
   SET status='sending',attempts=j.attempts+1,
       lease_token=gen_random_uuid(),lease_expires_at=now()+interval '2 minutes'
   FROM due WHERE j.request_id=due.request_id
   RETURNING j.request_id,j.lease_token,j.host_teacher_id
 )
 SELECT c.request_id,c.lease_token,
   CASE WHEN u.email_confirmed_at IS NOT NULL AND t.is_active=true
        THEN u.email::text ELSE NULL::text END AS recipient_email
 FROM claimed c
 JOIN public.teachers t ON t.id=c.host_teacher_id
 LEFT JOIN auth.users u ON u.id=t.auth_user_id;
END $$;

-- Existing EXECUTE privileges are retained by CREATE OR REPLACE FUNCTION.
