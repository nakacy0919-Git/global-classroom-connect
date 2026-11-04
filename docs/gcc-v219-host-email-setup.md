# GCC V21.9 — Automatic Host Email Notification

## What will happen

When a *verified teacher* requests to join a GCC session, the existing join-request transaction saves the request **and one notification outbox record**. The host receives a concise English email directing them to **Join Requests** after signing in at:

https://gcc.pic-speak-story.com/#/teacher-portal?view=requests

The email does **not** contain student names, ages, phone numbers, private session access links or other student information. Host details are visible only inside authenticated GCC. The request record and its in-app notice remain authoritative even if the email cannot be sent.

The feature uses a **Supabase Edge Function**, **Resend** for transactional delivery, an outbox table, and **pg_net + pg_cron** for immediate attempts and retries. Vercel serves the frontend but does not relay these emails.

## Provision the sender before activation

1. In Resend, verify a domain controlled by GCC. Prefer a dedicated subdomain (for example a notifications subdomain you own) and complete its SPF/DKIM setup. Avoid personal Gmail/LINE addresses as the From domain.
2. Create an API key with permission to send email. Store it as **RESEND_API_KEY** in Supabase Edge Functions **Secrets**. Do not put it in Vite, GitHub, a database table, or this chat.
3. Store a sender address such as **Global Classroom <notifications@your-verified-domain>** in the Supabase Edge Function secret **GCC_MAIL_FROM**; the domain must actually be verified.
4. Generate a cryptographically random >=32-character secret and store it in Supabase Edge Function Secrets as **GCC_MAIL_WEBHOOK_TOKEN**.
5. In Supabase Vault, create one encrypted secret named **gcc_mail_webhook_token** with the exact same random token. Never copy a secret into Git or send it through the chat.
6. Deploy the Edge Function **gcc-join-request-email** with **verify_jwt=false**. It rejects requests without the private long webhook bearer token and rejects every method except POST.
7. Apply the outbox migration `supabase/migrations/20261104_gcc_v219_host_join_email_outbox.sql` before invoking the function.
8. Verify that a controlled, consented recipient with a *confirmed GCC login address* can receive a test notification (prefer a single actual application, not synthetic data in production). Confirm inbox and spam placement; verify request/approval still works if email delivery fails.
9. **Only then**, after approval, run `supabase/manual-activation/gcc-v219-enable-mail.sql` once, in Supabase SQL Editor. This adds immediate delivery on new requests and a five-minute retry schedule. Do not activate it before sender/domain/API configuration is confirmed.

The mailbox may initially reject mail to institutional addresses; testing must cover Gmail and at least one overseas/school mail system.

## Reliability and cost controls

- The queue is *one row per request*; repeated button presses cannot create a second email job for the same request ID.
- The worker batches a maximum of five, with service-role-only RPCs and row locks, short leases, and up to five attempts.
- Resend's `Idempotency-Key: gcc-join-request-<request ID>` avoids duplicate accepted sends within the provider's 24-hour deduplication window. The maximum retry window is substantially shorter. Provider acceptance is **not** proof of inbox delivery.
- Server side requests only. No mail credentials, contacts, or transaction APIs in the browser.
- The queue does not store email addresses; it resolves the confirmed host Auth email at sending time. Unverified/legacy hosts are skipped (in-app notifications still work).
- If a request is approved or declined before a mail attempt, queued mail is skipped.
- No student PII or private meeting links in the email.
- A failure does not roll back the session application. A worker can retry without requiring the teacher to resubmit.

## Monitoring

Query counts (aggregated only, no recipient addresses):

```sql
select status, count(*) as jobs
from public.gcc_v219_request_email_jobs
group by status order by status;
```

Inspect Supabase Edge Function logs for `gcc_mail_claim_failed` / `gcc_mail_finish_failed` and errors by code only. Inspect Cron runs for retries and Resend delivery events for bounced/rejected emails. Do not publish logs containing email addresses or bearer tokens.

## Rollback / safety switch

To stop outbound notifications (without touching GCC application or existing requests):

```sql
select cron.unschedule('gcc-v219-mail-retry');
drop trigger if exists gcc_v219_queue_mail_webhook
on public.gcc_v219_request_email_jobs;
```

The outbox insert trigger may safely remain enabled; it records pending jobs without sending email. To fully disable the queue, only after reviewing the effect on existing data, remove `gcc_v219_join_request_mail_created` from `session_join_requests`.

## Current release note

If the sender domain/API key/webhook token are not yet configured, **automatic email delivery is not live**, even if the SQL migration and Edge Function files are present. Do not mark issue #85 resolved before a successful real test and monitoring of the first sends.
