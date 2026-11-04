# GCC Phase 2 — Pilot Coordinator Runbook
**Restricted pilot operations; repository copy contains no participant personal information.**

## Status at start
- Production GCC V21.7 deployed to https://gcc.pic-speak-story.com/
- Test audience: ~10 invited first-time GCC teachers from multiple Japanese and overseas schools.
- Existing teacher-approval, session publishing, search, request and host seat-cap rules should be retained.
- Host email notification: **not implemented** — see issue #85.
- Approved-partner-only contact exchange / minimal chat: **not implemented** — see issue #86.
- Pilot tracking and device acceptance: issue #87.
- The teacher-facing public directory is optional/opt-in; it is **not** an approved-only private contact handoff.

## Pilot participant allocation (anonymized)
| ID | Proposed role | Actual country / school / identity |
| --- | --- | --- |
| P01–P02 | Japan-based host teachers | Keep actual roster privately, outside this public repository |
| P03–P05 | Overseas host teachers from more than one country | Keep actual roster privately |
| P06–P10 | Requesting partner teachers; mix Japanese and overseas | Keep actual roster privately |

Roles can be adjusted; every participant should be unfamiliar with the GCC workflow if possible. Recruit a variety of school levels, time zones and devices.

**Never upload the filled-in participant roster, their emails, private contact links, student details, or test meeting passwords to this public repository or GitHub issue.** The committed CSV is a blank/anonymized template only; fill a private local copy or approved restricted workspace.

## Step-by-step pilot operations

### 0. Preflight by coordinator
- Confirm Vercel production deployment is READY and Supabase is healthy.
- Check that sign-up and confirmation email are reachable on at least two unrelated networks before inviting participants.
- Confirm an administrator is available to verify profiles during the pilot. Do not auto-approve unverified schools.
- Provide the invitation and teacher guide **privately** to chosen volunteers; do not post a general 5,000-person announcement yet.
- Ask host teachers to identify their testing sessions with the **[PILOT]** prefix; avoid real student data in this test.

### 1. Sign-up and teacher approval
- Give each participant a unique Pxx identifier for reports; keep the ID ↔ real person mapping private.
- Have participants sign up themselves, confirm email, and submit their profile.
- Administrator verifies the person's institution and approves or declines according to existing GCC policy.
- Record: success, device/browser, whether help was needed, exact error category (not raw email/password).
- If a teacher reports Failed to fetch, capture network/browser and local timestamp without asking for credentials.

### 2. Create / Find
- Assign P01–P05 to create test sessions using both a starter idea and the full custom wizard.
- Assign P06–P10 to find matching sessions by time/country/level, including a zero-result test.
- Keep **Find a Partner** separate from **Create a Session**. Do not introduce cross-navigation controls into the Find results.
- Confirm host-local versus guest-local time conversion (including overseas time zones).

### 3. Join, capacity, and multiple-country approval
- Requesters enter non-identifying student counts and optional short introductory notes.
- A host signs into GCC and inspects **Join Requests** manually; no request email is sent by this release.
- Have at least one session receive applications from **two different countries**. Test approving/declining individual requests without overbooking.
- Check the actual information shown to the host. Country/school/student ages are known display gaps; record whether the host can make an informed decision.
- Verify other teachers cannot see private application data or approve someone else's request.

### 4. Contact and calendar
- Use a mutually agreed external channel and **coordinator-facilitated, private contact introduction when necessary**. Do not put phone numbers or private meeting links into public GCC fields.
- Do not pretend that partner-only contact handoff or GCC chat is live. Log any friction as issue #86 evidence.
- Test Google/Outlook/Apple Calendar export with correct dates across time zones.
- Complete at least one authentic live international classroom exchange, using school-approved procedures.

### 5. Devices
Each critical flow must be checked at minimum on: desktop Chrome/Edge, iPad Safari, iPhone Safari and Android Chrome (where available). Record actual rather than assumed coverage; do not mark a device as passed without testing.

### 6. Triage and security
- **Stop pilot immediately for affected flow** on a suspected permission leak, student data disclosure, unauthorized approval, duplicate account/security problem or overbooking.
- Mark issues by impact: Critical = security/data exposure; High = cannot complete core task; Medium = recoverable confusion; Low = cosmetic.
- Reproduce in a non-production environment where feasible. Fix on development branch, run regression, manually deploy only a reviewed batch.
- Preserve a changelog of issue, fix PR, commit, release, and retest evidence without collecting sensitive participant data.

## Participant feedback
See teacher-guide-en.md, plus pilot-feedback.md. Collate findings by Pxx in a **private** copy of participant-tracker-template.csv.

## Pilot completion gate
- All ten invited teachers complete their assigned key workflows or every failure has an investigated, resolved and retested root cause.
- No unresolved critical/high security, permission, time zone or seat-cap defects.
- At least one completed real exchange; record the outcome and teacher sentiment.
- Host request notifications and safe approved-only contact handoff are implemented, delivered and verified before **worldwide public launch**. These can remain controlled gaps during the small pilot when the coordinator handles the workaround.
- Owner approves a separate, staged Global Classroom Community announcement.
