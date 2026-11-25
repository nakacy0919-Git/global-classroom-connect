# Global Classroom Connect V23.0 — Integrated release readiness

Date: 2026-11-17 (JST)
Status: **DEVELOPMENT / DRAFT PR ONLY — NOT DEPLOYED**

## Code integrated in draft PR #103

- PR #101: Global-readiness registration console, country aggregations, paginated teacher/host approvals and first-time teacher onboarding. Its host-only SQL and search-path hardening remain **staged and unapplied**.
- PR #102: Find Sessions includes teacher's own active sessions, identifiable as "Your Session"; read-only partner preview; verification after publishing. Own sessions appear on the world map.
- PR #99: Room-chart access for managed school PCs uses an isolated anonymous Supabase client (no stored teacher auth refresh), with a limited diagnostic that does not transmit the real invitation or code.
- V23.0: Availability conditions (status, time, deadline) are shared between search, country pins and country filters. Optional network/API failures no longer erase the successfully loaded teacher-owned session listing.
- V23.1: New keyset-paginated, approved-teacher-only browsing RPC in `sql/gcc_v231_teacher_browse_paged.sql` fixes the legacy 300-row ceiling and prevents one malformed deadline from crashing the whole directory. The JS client falls back **only** if the new RPC is missing, and explicitly refuses to silently truncate a full 300-row legacy response. SQL is **staged, not live**.
- Host-managed published events now preserve the start time, publication state and registration deadline in the world-map projection, preventing them from disappearing under V23's unified validation.
- Expanded browser smoke checks cover anonymous host and teacher access, registration routes and mobile signup.
- This branch merges both draft feature histories but has **not** merged into `main`.

## Production environment: read-only inspection (2026-11-17)

- Approved/active teacher records: 73. Schools: 68.
- Future open teacher-created offers: 4; future published host-managed events: 0.
- A future open offer is missing maximum participant capacity (legacy **Peace Project**); this prevents reliable join-request capacity checks. Do **not** silently guess a value or write it to production: the owner must open the session editor and set an appropriate total.
- No pending teacher approvals or join requests at inspection.
- An initial smoke from PR #101 and an integrated CI run passed; this does **not** prove international end-to-end correctness.

## V23.1 automated evidence (2026-11-17)

- Node regressions passed with dedicated coverage for 325+ session pagination, safe migration fallback, expired and malformed deadlines, permission errors and the host-event map.
- A disposable **PostgreSQL 17 service container** in GitHub Actions executes the staged V22.6 registration-console SQL, V22.7 name-validator hardening and V23.1 paginated session SQL. No production connection or real user data is used.
- Synthetic assertions verify an authorized host can page through 326 offers (325 foreign + one personally hosted closed session), while a different teacher cannot view the private session.
- Admin paging and country/status filtering were checked with 252 synthetic accounts. Anonymous users cannot execute the two privileged browse APIs, ordinary teachers cannot read the host account directory, and session browsing removes private meeting URLs.
- Passing these checks means the SQL is syntactically executable and meets the stated **synthetic role tests**. It does not substitute for verifying actual Supabase authentication tokens, the production PostgREST API cache, managed browser access or international delivery.

## Supabase security inventory (read-only)

As of 2026-11-17 the Supabase advisor reports 20 anonymously executable SECURITY DEFINER functions and 103 authenticated executable SECURITY DEFINER functions. A public grant is not alone proof of exploitability: five of the anonymous warnings relate to trigger or event-trigger functions, while others include intentionally code/PIN-protected classroom endpoints, public session discovery and public roster submission. Do not revoke them en masse.

The unauthenticated public roster function `gcc_v8_submit_roster` validates student count, requires an open future event, deduplicates teacher/school and caps event pending queue/capacity. However these controls alone do **not** establish IP/client rate limiting; repeated fictitious schools could potentially exhaust pending capacity. A trusted gateway/WAF rate-limit or server-verified abuse challenge requires a separate architecture and live-equivalent test.

An Auth advisor still reports leaked-password protection disabled. This is an account-setting control, not a client JavaScript fix, and needs an authorized change by the Supabase owner.

Relevant vendor guidance:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## V23.2 targeted privacy and privilege hardening (2026-11-17)

- New teacher Auth signups are tagged with `raw_user_meta_data.gcc_registration_source = 'global-classroom-connect'` **only to scope analytics**. User metadata is self-editable and MUST NOT be used to authorize any teacher or admin action. The existing server-side `gcc_v6_require_host()` remains the sole host authorization check for registration-console reads.
- Staged `sql/gcc_v226_registration_console.sql` now lists accounts with a GCC application, an active linked GCC teacher, or the explicit self-declared GCC signup marker. It no longer includes every account in `auth.users`.
- Live **read-only aggregate** audit at this point showed 32 Auth users and 3 not linked to a GCC application or teacher. All 3 unlinked users were email-unconfirmed and had no GCC marker. Their origin cannot be established. **This privacy-first change excludes these legacy unlinked accounts from the new console** until an authorized administrator verifies their GCC origin. Do not automatically change these user records; never guess that they are GCC users.
- Staged `sql/gcc_v232_restrict_trigger_execute.sql` verifies five named zero-argument trigger/event-trigger functions still have attached triggers, then revokes direct `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`. Does not disable triggers, alter RLS, or rewrite any function body. Isolated PostgreSQL CI verifies the row and DDL triggers still fire after revocation.
- The remaining public `SECURITY DEFINER` advisories include intentional student-code, roster and room-chart endpoints. No automatic mass revocation; security and rate limiting still require review.
- The staged SQL files are **NOT installed on the connected Supabase production project**. These tests do not imply that Supabase-specific JWT and PostgREST checks have passed.

## V23.2 isolated REST/JWT authorization evidence

- The consolidated GitHub workflow now runs three jobs: Node/browser/build regression, isolated PostgreSQL SQL/trigger assertions, and **isolated PostgREST 12.2 HTTP JWT authorization**.
- Only disposable fixture identities and a static, CI-only HS256 signing secret are used. No network request targets the connected production Supabase project.
- JWT/PostgREST assertions prove that anonymous callers, an approved ordinary teacher and an unlinked account cannot read the Host Admin registrations RPC; an approved host can read exactly 252 tagged/linked fixture accounts while an unrelated Auth user is omitted.
- Teacher-scoped JWT paging fetches 327 fixture offers without duplicate IDs, does not reveal a different school's closed session, and strips private meeting URLs.
- The isolated SQL tests verify the five trigger-only direct-execute grants are removed without disabling automatic row or DDL trigger execution.
- GitHub Actions run [#44087793322](https://github.com/nakacy0919-Git/global-classroom-connect/actions/runs/44087793322) passed all three jobs: **616 Node tests**, Vite production bundle, Chromium public-route checks, SQL checks and JWT/PostgREST API checks.
- This narrows a release gap but does **not** verify real Supabase Auth configuration, provider policies, school network or external mailbox deliverability. Staged SQL remains unapplied.

## Release blockers (must be verified before worldwide rollout)

1. **Preview DB separation.** Historical Vercel previews used the production Supabase URL. Do not run destructive or synthetic tests against that database; an isolated database may have usage costs and needs authorization.
2. **Staged SQL not applied.** The four staged scripts (`sql/gcc_v226_registration_console.sql`, `sql/gcc_v227_english_name_search_path.sql`, `sql/gcc_v231_teacher_browse_paged.sql`, and `sql/gcc_v232_restrict_trigger_execute.sql`) pass disposable PostgreSQL role/syntax/trigger checks. Still verify them against an isolated **Supabase** project and PostgREST with real JWT role contexts before production migration. The legacy registration overview and 300-session listing remain limited until then.
3. **Role-specific database authorization.** Verify anonymous, pending teacher, approved teacher, Host Admin and different schools' access. A hidden UI tab is not an authorization check.
4. **Anonymous privileged endpoints.** The Supabase security advisor flags 20 anonymous-callable SECURITY DEFINER functions. Some are intentionally code/PIN-protected; test input validation, brute-force protection and row ownership before revoking any endpoint.
5. **Sign-up and anti-abuse.** Real email confirmation, password reset and compromised-password protection (reported off on 2026-11-13), registration spam and public roster submission rate limiting.
6. **International teacher-to-teacher workflow.** Test a genuine approved host and a different approved guest teacher on separate devices, requests, notifications, approval, private contact handoff and session changes.
7. **Email deliverability.** Provider accepted a test-sink message in earlier work. Confirm a consented real join-request notification reaches the intended host (including overseas/school email) and is delivered only once.
8. **School browser/mobile QA.** Verify iPad Safari portrait/landscape, school-managed browsers, upload fallback, time zones and daylight saving with real accounts.
9. **Privacy and data lifecycle.** Check student name access, consent, storage retention/deletion and private room links before public invitations.
10. **Release and rollback.** Record the production deployment ID and database backup strategy first; confirm explicit owner authorization before promotion. App rollback does not undo SQL.

## One connected acceptance flow

1. An invited teacher registers and confirms email.
2. A Host Admin verifies the account and approves it as Teacher (not Host Admin).
3. Teacher A creates a future session, sets school time zone, a valid deadline and a total capacity greater than their own class count.
4. Teacher A sees "Your Session" in Find Sessions, inspects partner preview and sees the host country pin.
5. Teacher B, using a separate account/school, finds the session via both world map and time filters.
6. Teacher B requests to join with a specific student count and age range.
7. Teacher A receives a notification and (after separately confirmed email delivery) one host email.
8. Teacher A approves the request, and both teachers may share contacts privately and revoke them.
9. If the host changes the time, guests see reconfirmation and accurate local time.
10. Host registers consenting student roster, prepares rooms, shares limited-access room code; unauthorised users cannot read the room chart.
11. Approved participant finds their own room and uses correct meeting information.
12. Session finishes; archival/deletion retains correct protection and does not change other sessions.

## Deployment preparation sequence

- Merge only after green CI and the live end-to-end acceptance flow passes in an isolated test environment.
- Validate staged SQL using representative synthetic data in an isolated database, then review privileges and rollback.
- Explicitly review all warnings and obtain owner approval for Auth settings, cost, SQL execution and production deployment.
- Promote the reviewed build deliberately. Recheck signup/login/Find Sessions/Join Requests/room chart immediately, monitor error and email queues.
- On critical failure, return to previous production deployment and temporarily suspend invitations; restore database separately if SQL changed.

No secrets or student records should be attached to CI logs or GitHub PR descriptions. Report any failed gate without calling the release production-ready.
