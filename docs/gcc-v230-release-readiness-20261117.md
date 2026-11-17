# Global Classroom Connect V23.0 — Integrated release readiness

Date: 2026-11-17 (JST)
Status: **DEVELOPMENT / DRAFT PR ONLY — NOT DEPLOYED**

## Code integrated in draft PR #103

- PR #101: Global-readiness registration console, country aggregations, paginated teacher/host approvals and first-time teacher onboarding. Its host-only SQL and search-path hardening remain **staged and unapplied**.
- PR #102: Find Sessions includes teacher's own active sessions, identifiable as "Your Session"; read-only partner preview; verification after publishing. Own sessions appear on the world map.
- PR #99: Room-chart access for managed school PCs uses an isolated anonymous Supabase client (no stored teacher auth refresh), with a limited diagnostic that does not transmit the real invitation or code.
- V23.0: Availability conditions (status, time, deadline) are shared between search, country pins and country filters. Optional network/API failures no longer erase the successfully loaded teacher-owned session listing.
- Expanded browser smoke checks cover anonymous host and teacher access, registration routes and mobile signup.
- This branch merges both draft feature histories but has **not** merged into `main`.

## Production environment: read-only inspection (2026-11-17)

- Approved/active teacher records: 73. Schools: 68.
- Future open teacher-created offers: 4; future published host-managed events: 0.
- A future open offer is missing maximum participant capacity (legacy **Peace Project**); this prevents reliable join-request capacity checks. Do **not** silently guess a value or write it to production: the owner must open the session editor and set an appropriate total.
- No pending teacher approvals or join requests at inspection.
- An initial smoke from PR #101 and an integrated CI run passed; this does **not** prove international end-to-end correctness.

## Release blockers (must be verified before worldwide rollout)

1. **Preview DB separation.** Historical Vercel previews used the production Supabase URL. Do not run destructive or synthetic tests against that database; an isolated database may have usage costs and needs authorization.
2. **Staged SQL not applied.** `sql/gcc_v226_registration_console.sql` needs an isolated execution and a 200+ sample account test. The fallback only covers a limited recent subset. `sql/gcc_v227_english_name_search_path.sql` needs SQL validation.
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
