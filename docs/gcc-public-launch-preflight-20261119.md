# GCC public launch preflight — 2026-11-19 (JST)

**Status: GO for controlled acceptance test; NO-GO for unrestricted worldwide invitations yet.**
This is a read-only audit and pre-release code branch. No production Supabase writes, migrations, account changes, email sends or Vercel production deploys were performed.

## Confirmed infrastructure
- Project: Vercel `global-classroom-connect-w1t3`, production domain `https://gcc.pic-speak-story.com`.
- Production: Vite build READY, source commit `eaef44cd0120bf59d9894032730660609d7b5f87` at audit start.
- Latest `main` GitHub Actions regression workflow `44527761238`: success.
- Vercel runtime error scan, last 24h: no runtime errors reported (does **not** prove client/UI error-free).
- Supabase `Global Classroom Connect`: ACTIVE_HEALTHY; security & health advisors consulted.
- `teacher-photos` Storage bucket is private. Teacher directory photos are opt-in.
- Teacher-to-teacher request RPC saves request and student age range; database trigger creates host in-app notification, and review triggers applicant decision notification.
- GCC join request email machinery exists: V21.9.2 DB migration, queue, worker function, Vault webhook token and active retry cron. No real request/email job history was found, so actual inbox delivery is **not verified**.
- Sensitive request/notification tables have RLS enabled; several use RPC-only access rather than directly exposing rows. This is not a substitute for live role tests.

## Real production data quality (aggregates only)
- 73 active teacher directory rows, **26** are linked to confirmed Auth accounts. Do not describe all 73 as login accounts.
- 68 active school rows; 28 lack timezone, but **none of the 26 Auth-linked active teachers** belongs to one of these. Ensure newly approved teacher/school identity always has a valid IANA timezone.
- 4 upcoming open teacher sessions, 0 upcoming published host events.
- 1 of the 4 upcoming offers has no numeric maximum participant capacity: topic "Free Topic · What makes you happy?", **2027-01-19 13:25 JST**, host school 33 students. The submitting teacher will fail the existing capacity guard until the host sets a valid total. Do not guess or write this value as administrator.
- 0 session join requests, 0 in-app notifications, 0 request email jobs at inspection. Automated traces are not proof of delivered messages.

## Release blockers (must close before public invitation)
1. **Live 2-account acceptance:** two real, consented approved teacher accounts from distinct schools; send one genuine request, verify host in-app receipt and the full message/headcount/ages, approve/decline, verify sender decision notification. No fake users or real student records in the production test.
2. **Email:** confirm Resend provider accepts a real host notification to a verified school mailbox and an overseas mailbox; verify delivery exactly once or document delivery failure/fallback. Do not infer delivery from `cron.job_run_details.status='succeeded'`.
3. **Session capacity:** authorized host corrects the upcoming legacy offer with a valid total maximum. Verify Join Request becomes available and capacity restrictions still hold.
4. **Staged V23 security/reliability branch:** PR #103 is DRAFT and not part of main. It includes staged SQL `gcc_v226_registration_console`, `gcc_v227_english_name_search_path`, `gcc_v231_teacher_browse_paged`, `gcc_v232_restrict_trigger_execute`. Test the four migrations against an isolated Supabase environment, live-equivalent Auth/PostgREST and role behavior; never blindly apply to production.
5. **Security decisions:** Supabase advisor flags 20 anonymous-executable and 103 authenticated-executable SECURITY DEFINER functions (some intentionally protected by code, PIN or role); review individual grants, server validation and rate limiting. Leaked-password protection is OFF. Do not globally revoke permissions.
6. **Roster safety/anti-abuse:** verify public roster enrollment challenge/rate limiting, no private student names or meeting URLs exposed by anonymous routes, and safe deletion/retention. One code-only audit is not a substitute for actual separate-role tests.
7. **Real-device international test:** school-managed Windows Chrome/Edge, iPad Safari portrait/landscape, mobile, teacher photo upload, country filtering, daylight saving, school timezone and local calendar export.
8. **Backup and rollback:** confirm a restorable backup and tested restoration procedure **before** any schema migration. Record previous Vercel production deployment. Vercel rollback does not undo database changes.

## Patch prepared on this branch (no production release)
- Reuse the already-tested snapshot loader so failure of optional public events, join-request panel or notifications does not erase valid own sessions.
- Separate successful join-request/approval RPC outcome from subsequent page refresh errors; do not encourage resending a request which may already have been committed.
- Correct misleading UI text saying automated email is disabled; clarify that an emailed alert is supplementary and delivery must not be assumed.
- Add Node regression tests; run complete GitHub Actions before merging or deploying.

## Release steps
1. Review this PR and automated test results; preview must not write synthetic data to production Supabase.
2. Run isolated Supabase migration/regression tests, with approved cost if a paid branch is required.
3. Obtain consent from two teachers and execute the single request/approval/email delivery acceptance flow.
4. Correct the missing session capacity through the authorized host UI.
5. Document risk dispositions for public RPC grants, rate limiting, password protection, student data.
6. Confirm backup/restore and explicit production approval, then stage and promote only tested build.
7. Monitor request/email queue, error events and school browser feedback; pause invitations/rollback app if needed.

**Owner decision needed before worldwide announcements:** approve a final reviewed implementation/migration plan, testing identities and any potentially billable isolated environment.
