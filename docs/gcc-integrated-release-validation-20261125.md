# GCC V24.0 integrated validation and production handoff
Status: HOLD. 2026-11-25. This is a cumulative candidate, not a production release.

## Confirmed baseline
PR #118, commit 299034b1b29bf5ee1a990c453a8b23dea607b910, CI run 45544336890: 649/649 Node tests, production build, public Chromium smoke, isolated PostgreSQL and JWT/HTTP jobs passed. The HTTP job at that SHA covered admin/privacy and pagination; the four new roster protection layers were exercised in SQL fixture tests, not all through HTTP.

Read-only production inspection:
- Vercel project global-classroom-connect-w1t3; current production alias gcc.pic-speak-story.com resolves in deployment metadata to READY dpl_EFT93knKT6L5JtByUKMGcEWHLZ2f, Git SHA eaef44cd0120bf59d9894032730660609d7b5f87, rollback candidate. Verify alias and deployment again immediately before a release or rollback. No deploy or alias change.
- Supabase production GCC mail functions gcc-join-request-email ACTIVE v5, gcc-teacher-onboarding-email ACTIVE v1. Bot verifier is not deployed. No development branches returned. No backup/PITR status verified; do not infer coverage from an active database.
- Vercel git.deploymentEnabled remains false. No production credentials, student lists, mail addresses or secrets copied.

## New automated checks
- Six synthetic events through a real disposable PostgREST server: open, bot-only, invite-only, verified-only, all three, and bot+limited burst. Real staged SQL gates, synthetic underlying legacy roster write. Anonymous, teacher, unrelated and host JWTs; service-only receipt issuer; direct roster table read denial; wrong-event and wrong-school checks; repeated challenge/receipt, failed transaction retry, two simultaneous HTTP requests for one receipt/invitation and two different receipts competing for one admission. No real provider token or actual Supabase Auth.
- Disposable PG17 logical backup from the SQL job, restore into a fresh database in the same ephemeral cluster. Compare fingerprints of registration, request, mail outbox, contacts, invitations, receipts, event windows, policies, grants, triggers. Test restored gates, consumed receipt rejection, sent email job state. No production backup, disaster recovery, Storage, real room chart data, roles outside this cluster or PITR recovery tested. Do not publish backup files; temporary CI files removed.
- Require exact-head green CI; do not use #118 success as proof of V24.0 success.

## Migration and release order
Maintain manual staged SQL, review live definitions/grants and backup/recovery before applying. In an approved isolated environment first:
1. V226 registration console; V227 search_path; V231 pagination; V232 restrict trigger execution; V233 legacy registration scope.
2. V236 shared roster burst guard; V237 invitation gate; V238 verified school identity; V239 bot receipt gate. Review proposed 24 batches/5 min default; V236 affects new registrations even without optional gates. All opt-in policy tables initially empty. Confirm no unapproved activation.
3. Test old frontend compatibility (especially V226/V231), complete actual Auth, Edge, PostgREST, provider and school browser validation; check real schema/migration drift. Review V6 legacy capacity and request-level gateway throttling. Confirm leaked-password/ Auth CAPTCHA policy on shared project; do not enable without all-app compatibility.
4. After written operator authorization and verified production backup/restore, apply reviewed compatible migrations, verify permission and data integrity, then approved mail worker and bot verifier deployment/configuration, then candidate frontend staged without domain assignment. Confirm exact commit, test and promote only the tested approved production artifact. Do not mix historical PRs or turn on auto-deploy. Keep optional gates off until owner-approved per-event pilot.
5. On incident: stop promotion, restore known-good frontend/worker version if compatible. Preserve genuine requests, outbox and rosters. Reviewed forward fix or selective rollback; never restore an unscoped Auth directory. Reconcile writes before any approved PITR/restore. Re-check baseline immediately before execution.

## Human acceptance checklist (must record evidence; still pending)
- [ ] Owner authorizes isolated Supabase environment and cost if applicable; no independent branch created.
- [ ] Verify production backup/PITR availability, retention, timestamp and restore procedure; rehearse real environment recovery without altering production.
- [ ] Two consenting approved teachers from different schools: create/publish/find session, request once, one outbox job, real domestic/overseas inbox delivery, approve and receive in-app notification, mutual contact share/edit/revoke; no personal data in logs. #85/#86 remain open.
- [ ] School-managed Windows Chrome/Edge, iPad Safari portrait/landscape, phone; actual sign-in, roster/room chart token+6-digit code+netiquette, responsive layout, school network access with ICT approval, DST/timezone, challenge privacy/accessibility and recovery.
- [ ] Real isolated Turnstile setup; verify hostname/action/event/replay/expiry, no raw token logs, request-level abuse limits and third-party privacy/CSP. Confirm school/teacher eligibility before opt-in.
- [ ] Authorized host corrects missing capacity on legacy future open event, using confirmed value.
- [ ] Review leaked-password protection, CAPTCHA and shared Auth compatibility; agree support contact, privacy/retention and owner approval for release.
- [ ] Confirm main state, candidate SHA and green CI immediately before merge/deploy. Explicit release approval required.

References: gcc-worldwide-launch-candidate-20261125.md (earlier baseline), gcc-roster-admission-20261125.md, gcc-event-invitation-20261125.md, gcc-verified-roster-20261125.md, gcc-bot-protection-20261125.md, gcc-mail-partner-release-gates-20261125.md.
