# GCC security release gates — 2026-11-25

## Production read-only findings
- Security Advisor: 20 anonymous and 103 authenticated SECURITY DEFINER executable-function findings; categories overlap and are not confirmed vulnerabilities. 26 RLS-without-policy informational findings; deny-by-default tables may intentionally use RPCs. No blanket grants or revocations.
- Five named trigger-only functions still have both client EXECUTE grants and actual attached triggers. V23.2 staged script checks signatures/attachments before revoking; disposable tests check that triggers continue firing.
- gcc_v7_english_name mutable search_path: staged V22.7 fix.
- Legacy gcc_v134_signup_overview is host-only but reads the latest 200 shared Auth accounts without GCC filtering. V23.3 compatibility patch filters before LIMIT, preserves response shape and host-only authorization. New V22.6 console uses the same app scope; signup marker is user-editable, not a role or authority, and cannot grant access. Unlinked unmarked historical accounts are not shown; owner must verify origin separately.
- Auth leaked-password protection disabled. Check plan availability and enable with owner-approved Auth configuration; do not log passwords or change existing accounts.

## Public roster abuse review
Live function definitions inspected read-only: gcc_v165_submit_roster delegates to gcc_v8_submit_roster then stores pairs. Both are callable by anon and authenticated. The latter validates published future event, country/name, payload size, duplicate teacher/school, capacity and pending queue ceiling under event row lock. It has no explicit caller-based rate limiting or invitation proof in the inspected body. This is a potential abuse risk, not a confirmed incident. Do not globally revoke anonymous access; legitimate shared registration relies on it.
Before public launch: design revocable invitation proof and per-event/credential rate limits at the server boundary; ensure both RPC paths are covered, preserve public invitation flows, test duplicate, expired and revoked invitations, capacity concurrency, forged identifiers, excessive payloads, school NAT and recovery. Do not trust browser-supplied IP or user metadata. Decide invitation policy with owner before changing current public behavior. No live abusive traffic generated.

## Release / rollback
1. Re-run all CI, including browser, disposable Postgres and HTTP JWT. Fixtures are not real Supabase.
2. Obtain isolated Supabase authorization and test actual triggers, existing role grants and shared registration flow, backups and rollback. Capture current function definitions/ACLs in restricted backup; no PII in repository.
3. Apply staged SQL in reviewed order only after approval. Legacy RPC patch can be rolled forward independently; never restore an unscoped Auth directory as a routine rollback.
4. Verify real teacher/host authorization, public invites, mail and roster safeguards; monitor errors. Keep Vercel automatic deployment off. No production data/settings changed in this audit.
