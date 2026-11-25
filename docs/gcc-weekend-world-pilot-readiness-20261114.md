# GCC worldwide pilot — release checklist (14–15 November 2026, JST)

**Status: PRE-RELEASE.** No Git merge, production deploy, authentication-setting change, or production SQL migration is authorized by this checklist. Use a small invited international teacher group first, not an unrestricted mass launch.

## Verified (14 November)
- Main production deployment remains pinned to the earlier `main` build; feature work lives in Draft PR #101.
- Feature branch automated tests and Vite build completed successfully on GitHub Actions run #338; a subsequent run #340+ added headless Chrome smoke checks for home/signup/unauthenticated host route.
- Protected Vercel preview build is `READY` and returns HTTP 200 with `x-robots-tag: noindex`.
- Auth and teacher signup validation were inspected read-only in the live Supabase database; WebP/JPEG photo fallback and 3000-character bio limit are present.
- Read-only database totals: 32 login accounts, 73 active teacher records, 68 active school records, 19 country codes, 26 approved applications, zero pending applications at inspection.
- Teacher notification mail queue: 3 sent, no queued/failed records observed at inspection. This does **not** verify global SMTP throughput or receiving.
- New code includes: tabbed admin registrations, country status overview, paginated approval/school requests/teacher cards, safer approval and photo handling, simple onboarding, timezone instructions, direct approved teacher workspace link, and limited fallback country enrichment.

## BLOCKERS before broad public rollout
1. **Database separation for write tests:** Vercel Preview and Production currently share `VITE_SUPABASE_URL`. Do not create dummy teachers, students or sessions on the preview. Supabase separate branch requires explicit hourly-cost consent and was not created.
2. **Database RPC not deployed:** `sql/gcc_v226_registration_console.sql` must be tested with an isolated DB. Fallback is limited to the latest 200 accounts, and country data may be partial. No SQL was applied to production.
3. **Authorization tests:** Check that anonymous and ordinary teacher sessions cannot obtain host account names/emails; host can, and pagination works with more than 200 synthetic signups.
4. **Abuse prevention:** Assess public roster endpoints (`gcc_v8_submit_roster`, `gcc_v165_submit_roster`) for rate limits and artificial capacity exhaustion. Preserve QR/code/PIN-protected classroom access.
5. **Account protection:** Enable compromised-password protection after owner approval, confirm password reset/email verification and delivery quotas before mass invitation.
6. **Real device checks:** Test iPad Safari (portrait/landscape), school managed browsers and slow networks, especially signup upload and session time conversion.

## Recommended weekend pilot test script (real teachers, no demo student PII)
- An invited teacher opens the site in a school browser and creates an account with a school email.
- They confirm the email link, sign in, complete profile and choose the SCHOOL time zone (not browser travel time).
- Main admin verifies identity, school, consent and approves them as *Teacher* (never Host Admin by default).
- Teacher opens Teacher Space, searches a public session, requests participation, and checks notifications.
- Another approved teacher creates a short test session with a future date, checks international local time display and partner requests.
- With permission, both teachers verify student-name privacy and breakout room access on controlled test records.
- Host verifies account status, country view, school corrections and approval totals; no other teacher can open those host screens.

## Go / no-go
- **No-go:** unresolved authorization/privacy flaw, broken email confirmation, unknown rate-limit exposure, failed build, incorrect room chart or timezone.
- **Limited go:** approve only a small invited set of verified teachers if the existing production environment passes live onboarding and all critical security gates. Do not equate CI success with production readiness.
- **Full go:** after owner approves release, isolated DB tests pass, security protections are configured and verified, migrations are reviewed/applied deliberately, and production deployment has passed regression and rollback planning.

## Rollback
- Keep the current production deployment ID and commit recorded before release.
- If anything critical fails after promotion, restore the previous production deployment and disable new teacher invitations until the issue is understood.
- Database migrations require a tested rollback plan; never assume Vercel rollback reverses SQL.
