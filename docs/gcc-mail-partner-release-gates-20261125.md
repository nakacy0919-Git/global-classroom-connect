# GCC mail and approved-partner release gate — 2026-11-25

## Read-only production audit (no personal values or mail addresses retrieved)
- V21.9 join-request email outbox: 0 jobs; join-request table and in-app notifications: 0 rows at audit time. No genuine session request delivery has been demonstrated.
- V22.0 teacher registration email outbox: 3 records marked sent, all with provider receipt IDs and sent timestamps, each on first attempt. A provider receipt is not proof of mailbox delivery.
- Approved partner contacts: 0 rows. Both contact RPCs require authenticated approved host/applicant and deny others; access expires 14 days after session end. Actual participant testing remains outstanding.
- Both GCC mail workers deployed ACTIVE; scheduled jobs active. Past 24h: join retry 288 scheduler successes, onboarding 1,440 scheduler successes. Scheduler success does not prove downstream HTTP or mailbox success.
- Private webhook authentication must stay in place. Do not send secrets, addresses, student records, or mail bodies to logs.

## Changes prepared in this branch
- Require a usable provider acceptance ID before recording sent. Retry an ambiguous 2xx using the same idempotency key and existing bounded retry policy. No claim of mailbox delivery.
- Revalidate contact access on every panel open; clear private text on close and failed verification, prevent stale async responses and writes before authorization refresh. Do not add polling or full chat.
- Disposable PostgreSQL CI uses actual contact-table/RPC section and actual mail outbox/claim migrations with synthetic teacher fixtures; checks opt-in, cross-account denial, pending/expired access, revocation, no direct table grants, unique pending jobs, correct verified recipient, active leases, invalid lease rejection and acceptance recording. No real mail calls.
- Existing teacher/host request logic, capacity protections and Vercel auto-deploy disabled unchanged.

## Consented release pilot (required before closing #85/#86)
1. Recruit two approved teachers from separate schools with explicit consent, including institutional and overseas inbox coverage; confirm current recipient addresses out of band. No student personal data; use an agreed test session and synthetic participant counts.
2. Publish an agreed test session, submit one request, verify host in-app notice and exactly one queue job. Confirm actual mailbox receipt (including spam folder) and authenticated review link. Provider accepted/sent != delivered; record redacted result only.
3. Approve, confirm applicant notification and schedule/meeting link permissions. External approval email is not assumed; test in-app approval separately.
4. Each teacher voluntarily shares a school-managed contact, edits and revokes it; verify counterpart sees latest value on reopen and unrelated accounts cannot see it. Check iPad/Safari and managed PC. No unsolicited messaging.
5. Capture timing, duplicates, bounces and missing receipts without collecting addresses in public documentation. If needed, decide minimal in-app contact request after pilot feedback; full chat deferred.
6. Keep draft until CI, pilot, actual isolated Supabase tests, rollback and explicit owner release approval. Do not merge or deploy on the basis of synthetic tests alone.
