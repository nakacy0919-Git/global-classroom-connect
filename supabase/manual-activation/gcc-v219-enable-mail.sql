-- OPERATOR RUNBOOK SQL — DO NOT APPLY BEFORE CONFIGURING VERIFIED MAIL SENDER.
-- Run manually once after:
-- 1. Supabase Edge Function deployed with verify_jwt=false and secured by a
--    random GCC_MAIL_WEBHOOK_TOKEN (>=32 characters).
-- 2. RESEND_API_KEY and GCC_MAIL_FROM secrets configured in Supabase Edge Functions.
-- 3. The SAME random webhook token is stored in Supabase Vault as
--    gcc_mail_webhook_token. Never paste an actual secret into Git.
-- 4. A test to one verified recipient has passed and owner approves activation.

BEGIN;

DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM vault.decrypted_secrets
   WHERE name='gcc_mail_webhook_token' AND char_length(decrypted_secret)>=32
 ) THEN
   RAISE EXCEPTION 'Missing gcc_mail_webhook_token in Vault (at least 32 characters)';
 END IF;
END $$;

-- Do not email old pending requests when this worker is first activated.
-- They were submitted while automatic emails were explicitly unavailable.
UPDATE public.gcc_v219_request_email_jobs
SET status='skipped',failure_code='before_email_activation',
    lease_token=NULL,lease_expires_at=NULL
WHERE status IN ('pending','retry','sending') AND created_at<now();

-- Supabase pg_net creates its own net schema; do not force extensions schema.
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Supabase Cron installs in pg_catalog and creates cron schema.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE SCHEMA IF NOT EXISTS gcc_internal;
REVOKE ALL ON SCHEMA gcc_internal FROM PUBLIC,anon,authenticated;

-- Immediate attempt for a newly committed join request.
-- If the HTTP queue operation fails, the join request still succeeds and
-- the retry scheduler can send the notification later.
CREATE OR REPLACE FUNCTION gcc_internal.gcc_v219_mail_webhook()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE token text;
BEGIN
 IF NEW.status<>'pending' THEN RETURN NEW; END IF;
 SELECT decrypted_secret INTO token
 FROM vault.decrypted_secrets WHERE name='gcc_mail_webhook_token';
 IF token IS NULL THEN RETURN NEW; END IF;
 PERFORM net.http_post(
   url:='https://ayrflycncfbvizlfchce.supabase.co/functions/v1/gcc-join-request-email',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
   body:=jsonb_build_object('event','join_request_created'),
   timeout_milliseconds:=8000
 );
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'GCC mail webhook could not be queued';
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION gcc_internal.gcc_v219_mail_webhook()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gcc_v219_queue_mail_webhook
 ON public.gcc_v219_request_email_jobs;
CREATE TRIGGER gcc_v219_queue_mail_webhook
 AFTER INSERT ON public.gcc_v219_request_email_jobs
 FOR EACH ROW WHEN (NEW.status='pending')
 EXECUTE FUNCTION gcc_internal.gcc_v219_mail_webhook();

-- Every five minutes: retry temporary failures; no wake-up when nothing due.
SELECT cron.schedule(
 'gcc-v219-mail-retry',
 '*/5 * * * *',
 $job$
 SELECT net.http_post(
   url:='https://ayrflycncfbvizlfchce.supabase.co/functions/v1/gcc-join-request-email',
   headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||(SELECT decrypted_secret
         FROM vault.decrypted_secrets WHERE name='gcc_mail_webhook_token')
   ),
   body:='{"event":"retry"}'::jsonb,
   timeout_milliseconds:=8000
 ) AS request_id
 WHERE EXISTS (
  SELECT 1 FROM public.gcc_v219_request_email_jobs j
  WHERE j.attempts<5 AND j.next_attempt_at<=now()
    AND (j.status IN ('pending','retry')
       OR (j.status='sending' AND j.lease_expires_at<now()))
 );
 $job$
);
COMMIT;

-- To disable email triggering without disabling GCC registration:
-- SELECT cron.unschedule('gcc-v219-mail-retry');
-- DROP TRIGGER IF EXISTS gcc_v219_queue_mail_webhook
--   ON public.gcc_v219_request_email_jobs;
-- Queued notifications remain in database until resolved/explicitly cleaned.
