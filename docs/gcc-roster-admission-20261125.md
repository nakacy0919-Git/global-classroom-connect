# GCC roster admission protection — V23.6 staged candidate (2026-11-25)

Production read-only inspection confirmed three public registration paths: V8, V165 (delegates to V8), and V6 legacy invitation-code submission. All insert into gcc_session_signups; direct INSERT/SELECT on signup, student and code tables is denied to anon/authenticated. Existing validation and V8 capacity/duplicate/queue checks remain unchanged.

## Proposed protection (not deployed)
- A common BEFORE INSERT trigger applies to every new registration, including legacy-code submissions, irrespective of the browser or RPC used.
- Private per-event counters and optional per-event overrides. Initial proposed allowance: 24 successfully committed registration batches in a five-minute window, configurable from 1 to 120. A batch is a registration, not one student. Confirm the allowance against real school demand before deployment.
- Event row locking and atomic counter update prevent concurrent over-admission. A failed transaction, including pair validation failure, rolls back the counter as well. Updates to an existing registration are not counted.
- No IP tracking, school/teacher names or student data in the guard. One counter row per event; the foreign key removes it when the event is deleted. Only trusted database operators can set overrides; do not expose override management to the browser.
- The public form retains entered information on GCC_ROSTER_BUSY and advises waiting a few minutes or contacting the host. No automatic resubmission.

## Limitations and acceptance
This is a fixed short-window burst limiter, not identity verification or complete anti-bot protection. It counts only committed batches, not invalid attempts, and an attacker could exhaust the shared event allowance or reserve seats in one large batch. It does not strengthen V6 legacy capacity checks or bind legacy invitation codes to a specific event. Before broad public registration, decide and test event-bound, expiring/revocable invitation proof or other verified admission, coverage of legacy routes, bot/request-level throttling, and capacity integrity. Test normal school NAT, concurrent real school arrivals and recovery; approve thresholds with the event owner. Do not claim these controls are active in production.

## Verification
The previous cumulative PR #114 CI is green. This candidate adds actual staged SQL trigger tests on disposable synthetic schema/RPC stubs: default and override, all INSERT paths, privacy/grants, failed transaction rollback, independent event windows, expiry and two simultaneous submissions. These fixtures do not test full production RPC implementations or actual Supabase Auth. Require exact-head CI, isolated Supabase tests and actual pilot evidence before release. No synthetic data, messages or requests were sent to production.

## Release / rollback
Apply only after explicit authorization, verified backup/restore and review in isolated Supabase. Keep existing Vercel auto-deploy disabled. If the staged guard causes legitimate registrations to fail, stop rollout and have an authorized operator adjust an event override or remove/disable only gcc_v236_roster_burst after review; preserve genuine registrations. Do not reset live counters or alter existing roster data without authorization. All other release gates in gcc-worldwide-launch-candidate-20261125.md remain in force.
