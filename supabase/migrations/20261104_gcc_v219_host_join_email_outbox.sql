-- GCC V21.9: transactional host email notification outbox.
-- Every genuine join request creates at most one job, committed with the request.
-- Only a backend service-role worker can claim/finish jobs. No UI-sent email.
CREATE TABLE IF NOT EXISTS public.gcc_v219_request_email_jobs (
 request_id uuid PRIMARY KEY REFERENCES public.session_join_requests(id) ON DELETE CASCADE,
 host_teacher_id uuid NOT NULL REFERENCES public.teachers(id),
 status text NOT NULL DEFAULT 'pending'
   CHECK (status IN ('pending','sending','retry','sent','failed','skipped')),
 attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_expires_at timestamptz,
 provider_email_id text,
 failure_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS gcc_v219_email_due_idx
 ON public.gcc_v219_request_email_jobs(next_attempt_at,created_at)
 WHERE status IN ('pending','retry','sending');
ALTER TABLE public.gcc_v219_request_email_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_v219_request_email_jobs FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v219_enqueue_request_email()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE host_id uuid; has_verified_email boolean;
BEGIN
 SELECT a.teacher_id, EXISTS(
   SELECT 1 FROM public.teachers t
   JOIN auth.users u ON u.id=t.auth_user_id
   WHERE t.id=a.teacher_id AND t.is_active=true
     AND u.email_confirmed_at IS NOT NULL AND nullif(btrim(u.email),'') IS NOT NULL
 ) INTO host_id,has_verified_email
 FROM public.exchange_availability a WHERE a.id=NEW.offer_id;
 IF host_id IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.gcc_v219_request_email_jobs
  (request_id,host_teacher_id,status,failure_code)
 VALUES (NEW.id,host_id,
         CASE WHEN has_verified_email THEN 'pending' ELSE 'skipped' END,
         CASE WHEN has_verified_email THEN NULL ELSE 'host_email_unverified' END)
 ON CONFLICT (request_id) DO NOTHING;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS gcc_v219_join_request_mail_created ON public.session_join_requests;
CREATE TRIGGER gcc_v219_join_request_mail_created
 AFTER INSERT ON public.session_join_requests
 FOR EACH ROW WHEN (NEW.status='pending')
 EXECUTE FUNCTION public.gcc_v219_enqueue_request_email();

CREATE OR REPLACE FUNCTION public.gcc_v219_skip_resolved_request_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 UPDATE public.gcc_v219_request_email_jobs
 SET status='skipped',failure_code='request_already_reviewed'
 WHERE request_id=NEW.id AND status IN ('pending','retry');
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS gcc_v219_join_request_mail_resolved ON public.session_join_requests;
CREATE TRIGGER gcc_v219_join_request_mail_resolved
 AFTER UPDATE OF status ON public.session_join_requests
 FOR EACH ROW WHEN (OLD.status='pending' AND NEW.status<>'pending')
 EXECUTE FUNCTION public.gcc_v219_skip_resolved_request_email();

-- Claims use row locks and short leases to avoid simultaneous workers.
-- Requesters cannot invoke this function: service_role only.
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
        THEN u.email ELSE NULL END AS recipient_email
 FROM claimed c
 JOIN public.teachers t ON t.id=c.host_teacher_id
 LEFT JOIN auth.users u ON u.id=t.auth_user_id;
END $$;

CREATE OR REPLACE FUNCTION public.gcc_v219_finish_request_email(
 p_request_id uuid,p_lease_token uuid,p_outcome text,
 p_provider_email_id text DEFAULT NULL,p_failure_code text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE n integer;
BEGIN
 IF p_outcome NOT IN ('sent','retry','failed') THEN
   RAISE EXCEPTION 'Invalid mail outcome';
 END IF;
 -- Failure codes are short tags, never provider error bodies with PII.
 UPDATE public.gcc_v219_request_email_jobs j
 SET status=CASE WHEN p_outcome='retry' AND j.attempts>=5 THEN 'failed'
                 ELSE p_outcome END,
     sent_at=CASE WHEN p_outcome='sent' THEN now() ELSE j.sent_at END,
     provider_email_id=CASE WHEN p_outcome='sent'
           THEN left(coalesce(p_provider_email_id,''),160) ELSE j.provider_email_id END,
     failure_code=CASE WHEN p_outcome='sent' THEN NULL
           ELSE left(coalesce(p_failure_code,'provider_error'),80) END,
     next_attempt_at=CASE WHEN p_outcome='retry'
       THEN now()+make_interval(mins=>CASE j.attempts
         WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 4 ELSE 8 END)
       ELSE j.next_attempt_at END,
     lease_token=NULL,lease_expires_at=NULL
 WHERE j.request_id=p_request_id AND j.lease_token=p_lease_token
   AND j.status='sending';
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n=1;
END $$;

REVOKE ALL ON FUNCTION public.gcc_v219_enqueue_request_email() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v219_skip_resolved_request_email() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v219_claim_request_emails(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gcc_v219_finish_request_email(uuid,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v219_claim_request_emails(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gcc_v219_finish_request_email(uuid,uuid,text,text,text)
 TO service_role;

COMMENT ON TABLE public.gcc_v219_request_email_jobs IS
 'One host notification per genuine join request; no recipient email or student PII stored; delivered by server only.';
