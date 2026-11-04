# GCC Phase 2 — 10-teacher pilot checklist

## Purpose
Verify that a new approved teacher can create a session, find a session, apply to join, and coordinate safely with a partner. Invite approximately ten first-time GCC teachers from several schools in Japan and abroad. Do not call the product community-ready until the release gates pass.

## Release scope (frontend-only)
- Teacher Home: two primary actions (Find a Partner / Create a Session)
- Create Session: optional template selection; no changes to the existing 4-step wizard or publication permissions
- Find Partner: independent search; zero results can reset filters but never cross-promote Create Session
- Approved requests: calendar exports and opt-in verified Teacher Network directory, with external messaging safety guidance
- Signup: better network error guidance
- No in-app chat, no persistent partner-only contact handoff, no host request email delivery in this release

## Pilot roles
- Two Japanese host teachers and at least three overseas host teachers
- At least five teachers who have never used GCC (can overlap with hosts)
- One GCC administrator to verify teachers; one observer to capture test outcomes
- Do not use genuine student names or publish meeting links in public fields during tests

## Scenario checklist
1. New teacher account: create account and confirm email on real mail provider; confirm blocked network errors have actionable instructions; avoid repeat submissions.
2. Teacher approval: verify applicant details and school; reject unverified or suspicious registration; ensure nonadmins cannot approve.
3. Create Session: select starter, set school-local time, review max students and participant ages, save draft, publish, revisit same session.
4. Find Partner: filter by country/time/grade; test an empty search; never see Create Session controls inside Find.
5. Join Request: guest signs in, requests N seats; host confirms school, country, ages and N students and approves/declines.
6. Capacity: two+ countries request overlapping capacity; ensure approvals are serialized and cannot exceed max seats.
7. Follow-up: approved teachers can add session to Google, Outlook or Apple Calendar; external contact directory may require opt-in and is not a guaranteed handoff.
8. Privacy: unapproved teacher cannot access partner details, roster, admin actions or another school's records.
9. Device: run full signup → approval → create/find → request → external handoff on desktop Chrome/Edge, iPad Safari and phone Safari/Chrome.
10. Reliability: test network interruption, logout/login, refresh, DST/non-Japan time zones, Unicode teacher and school names, long text and translated school names.

## Evaluation sheet (one row per teacher)
Tester ID | country | school level | device/browser | signup worked | approval worked | created session | found partner | request sent | request approved | external contact established | issue ID | notes

Track operation success/failure without storing passwords, personal email inbox contents or students' names.

## Release gates before worldwide community launch
- All 10 pilot teachers can complete their assigned scenario without administrator technical intervention.
- No confirmed authorization leak, capacity overbooking, or cross-school information exposure.
- Critical and major bugs resolved and re-tested; no unresolved account registration failure on supported networks.
- Approved applicants can reliably reach each other via a verified, consent-based handoff (currently a known gap).
- Host request notifications reliably deliver through configured provider, with rate limiting, retries and delivery tests (currently a known gap).
- At least one live successful international session completes with a post-session feedback report.
- The platform owner explicitly approves the broad community release.

## Operational note
Do not send invitations or deploy unfinished email/chat flows as if they were live. The pilot must treat host email notification and approved-only contact exchange as unfinished until verified in production.
