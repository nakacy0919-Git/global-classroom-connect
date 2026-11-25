# GCC worldwide launch candidate — 2026-11-25
Status: HOLD / draft. No production deployment or migration authorized by this work.

## Integrated changes
- Prioritize this cumulative candidate over merging overlapping historical draft PRs individually (#99, #101, #103, #107–#113). Preserve main's latest UI and all changes in #113. #109 is a parallel integration, not an additional prerequisite: compare before closing anything. Historical release reports are retained for audit, not as current proof.
- Repair two legacy tests that required the intentionally removed duplicate hosted-list ID and absent sidebar shortcuts; assert the new single-list and primary navigation behavior. Previous #113 SQL and JWT HTTP jobs passed, but Node regression failed; build/browser skipped. Require a green run on this exact candidate.
- Integrate managed school PC public room chart from #99/#103: ephemeral anonymous client, no saved teacher auth refresh; optional diagnosis only on network/API errors. Keep token and six-digit code gate, guide, expiry and wrong-code lock. Production read-only function definition inspected 2026-11-25: gcc_v112 delegates to gcc_v104, which rejects malformed/empty token and code before access lookup or attempt updates. No real token, roster or code queried.
- Do not duplicate old styles or replace newer teacher portal/cards with old PR wholesale. Existing session publication code is already in main; old overlapping workspace styles/tests remain superseded by the newer ones.

## Required go/no-go evidence
- [ ] Exact candidate SHA: Node regression suite, Vite build, public Chromium phone/tablet/desktop routes, disposable PG17 tests and HTTP JWT role tests green.
- [ ] Authorized independent Supabase test environment (confirm cost first): apply staged SQL, inspect actual RLS, grants, Auth, Edge Functions and live PostgREST behavior. Disposable fixtures are not full Supabase. Re-run advisors and resolve or justify each relevant warning.
- [ ] Public roster abuse protection: decide invitation proof and bounded rate limits before general launch; inspect both V8/V165 entrypoints, preserve school NAT and accessibility. Verify no false lockouts. Decide and enable leaked-password protection where supported. Not implemented by this candidate.
- [ ] Real consenting approved teachers from distinct schools: create/publish/find session, request once, in-app host notice, exactly one email job, verified real domestic/international mailbox receipt, approve, applicant notice, safe contact share/edit/revoke. No student personal information in synthetic tests; provider receipt alone not delivery. #85/#86 remain open.
- [ ] Physical iPad Safari portrait/landscape, smartphone and managed Windows school PC: verify no clipped cards, navigation, keyboard, room chart invitation/code and required netiquette, time zones including DST, no private info before authorization. School ICT administrator must approve network access; never bypass filtering.
- [ ] Legacy future Peace Project open session: authorized host sets missing capacity using UI after confirming correct value. Never silently invent it.
- [ ] Owner confirms pilot scope, support contact, privacy/data retention, and explicitly authorizes production release.

## Deployment and rollback sequence (operator-approved only)
1. Record previous production Vercel deployment ID, Git commit, active Edge Function version, Supabase schema/function definitions and grants, backup/PITR availability and restore point; keep secrets and private data out of Git. Rehearse restore in independent environment, confirm restoration of room/roster/request integrity. Do not claim backup or restore completed until verified.
2. Review SQL in isolation in order: V22.6 scoped registration console; V22.7 English-name search_path; V23.1 teacher browse pagination; V23.2 revoke only attached trigger-only functions; V23.3 scope legacy signup RPC. Confirm privilege/shape compatibility with existing frontend; SQL files in sql/ are staged manual changes, not automatically deployed. Record exact statements, versions, grants, checks and rollback strategy. No mass changes to RLS or users.
3. If approved, apply reviewed compatible DB changes first; verify old frontend continues to function, then deploy approved worker version, then approved Vercel artifact from exact candidate commit. Auto-deployment remains disabled. Stop on any failure.
4. Smoke test approved production flows without exposing student data; monitor error/queue counts, avoid duplicate sends. Confirm pilot participants can proceed.
5. On regression: halt rollout, restore prior known-good frontend deployment and worker if compatible, preserve all genuine requests and queue jobs. Do not blindly roll back schema or restore unscoped Auth directory. Use reviewed forward fix or tested selective rollback; use point-in-time restore only with owner approval and explicit reconciliation of new writes. Never erase actual requests to recover.
6. Record acceptance evidence, sign-off, version and final release notes. Only then mark worldwide launch ready.

## Supporting reports
- gcc-security-release-gates-20261125.md
- gcc-mail-partner-release-gates-20261125.md
- gcc-teacher-experience-20261125.md
- gcc-public-launch-preflight-20261119.md
- gcc-v230-release-readiness-20261117.md (historical)
