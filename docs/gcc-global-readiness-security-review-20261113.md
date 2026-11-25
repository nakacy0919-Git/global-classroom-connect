# GCC global launch readiness: security and novice-teacher QA

Date: 2026-11-13 JST
Scope: Global Classroom Connect public teacher signup, teacher workspace, host registration console.
Status: **Staged changes only. Do not merge, deploy, or apply SQL to production without review.**

## Changes implemented in draft PR #101

- Host registration dashboard: four views (status, country, approvals, school corrections).
- Host Teacher Database now has 8-card pages, a country picker, combined teacher/school search, and accurate matching-results count.
- Account table: search by teacher/email/school; country and lifecycle filters; 8 entries/page.
- Country counts: all-account aggregation and 12 countries/page after the staged read-only SQL is applied; unreported countries grouped separately.
- Approval/correction queues: 6 entries/page, expandable approval details and secondary option for granting Host Admin.
- Safer DOM rendering: account data is assigned as text rather than interpolated HTML.
- First-time teacher help: optional three-step explanation of Find a Partner / Request / Create / Notifications, plus reminder not to post students' contact information.
- Fallback to the prior 200-account overview until SQL v226 exists; fallback is **not complete global coverage**.
- CI (Node regression tests, Vite build, whitespace check) passed on the draft PR branch.

## Live read-only database advisory check (2026-11-13)

Connected Supabase project: Global Classroom Connect, region ap-northeast-1.
These are **advisories, not verified exploits**. No database schema, access grants, authentication settings, or user records were changed during this review.

| Finding | Advisor count | Assessment and next action |
| --- | ---: | --- |
| Anonymous-callable SECURITY DEFINER RPCs | 20 | **High-priority manual audit**. Some public classroom invitation, room chart, and edit functions intentionally use access codes/PINs. Review access-code entropy, request throttling, per-school ownership checks, replay protection, and unauthenticated data minimization; do **not** blindly revoke access. |
| Authenticated-callable SECURITY DEFINER RPCs | 103 | Review whether each has server-side identity / object-ownership authorization; callable does **not** by itself mean exploitable. |
| Auth leaked-password protection | 1 | Protection reported disabled. Enable using Supabase Auth security settings before broad invitation, after administrator approval. |
| Mutable function search_path | 1 | Simple function `public.gcc_v7_english_name(text)`; staged narrow hardening in `sql/gcc_v227_english_name_search_path.sql`. |
| RLS enabled with no policy | 26 info | Usually deny-by-default; verify intended internal-only access, not automatically a disclosure. |
| RLS auth initialization performance | 24 | Optimize `auth.uid()` wrapping/plan checks as growth warrants, without changing access semantics. |
| Unindexed foreign keys | 47 info | Review query costs when global school records grow. |

Some analyzed functions:
- `gcc_v108_edit_room` checks a token/access-code/PIN via `gcc_v108_check_teacher` and then explicitly verifies student ownership of the same signup before updates. The advisory alone does not establish a bypass.
- `gcc_v165_submit_roster` delegates to `gcc_v8_submit_roster`; that underlying authorization and rate limiting still require review.
- `gcc_v8_submit_roster` is an intentionally unauthenticated registration path for published sessions. It validates inputs, caps total students and limits the pending queue per session, but database inspection did not establish any per-client/IP rate limiting. Before opening registration broadly, review edge/WAF rate controls and abuse monitoring without breaking legitimate international school signups.
- `gcc_v6_submit_signup` validates a hashed 32-character invitation code, expiry and revocation before it accepts a roster. The code-protected flow is different from the open-registration flow and must be tested separately.
- `rls_auto_enable()` is an event trigger function configured with `pg_catalog` search_path; its generic anonymous-execute advisory deserves a contextual review, not an automatic revocation.

Reference guidance:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Additional UI safety improvements

- Approval refresh now queues a follow-up refresh if an earlier network request is still running, preventing stale approval records.
- Applicant photos are fetched with short-lived signed URLs only when an administrator expands a review. A long pending queue no longer triggers all private photo requests immediately.
- Tab controls are linked to their panels with ARIA attributes for keyboard/screen reader navigation.

## Required validation before worldwide rollout

1. Run the draft SQL in an isolated Supabase development branch/database, not in production.
2. Verify host-only RPC: an anonymous and an ordinary teacher session must not fetch account/email lists.
3. Compare server totals, country group counts, unknown-country group, pagination and search with a known synthetic dataset exceeding 200 accounts.
4. Test workflows on iPad Safari, managed-school browsers, keyboard navigation and narrow displays.
5. Test teacher signup/email verification/recovery; profile optional fields; approved, rejected and pending states; accidental double-clicks.
6. Test host approvals, no inadvertent Host Admin escalation, and the existing breakout-room/registration flows.
7. Review the 20 anonymous privileged functions individually; test code guessing and rate limits using authorized test credentials only.
8. Confirm email provider throughput and password policy for worldwide invites.
9. Review data retention/privacy for international teacher and student records.
10. Explicitly approve deployment after tests. Until then keep PR in Draft, SQL unapplied and Git deployment disabled.

## Interpretation

Node build/test success confirms static and regression checks, **not** a live end-to-end penetration test.
The absence of health-advisor lints is not a guarantee of security.
