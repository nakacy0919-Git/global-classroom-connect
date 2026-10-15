# Global Classroom Connect — Development handoff (2026-10-15)

Working branch: `dev/2026-10-14`. Do not edit `main` until development testing is complete.

## Implemented
- Teacher registration wizard and host dashboards.
- Schedule Planner: draft events, 197-country directory, world clocks and map.
- Exchange Matching: host-only teacher availability and pair suggestions.
- Matching guided UI V2.2: 4-stage wizard, softly glowing next input field, less decorative copy, accessible reduced motion.
- Supabase exchange tables: `exchange_availability` and `exchange_shortlists`. Migration source is included in `supabase/migrations`; already applied to the connected Supabase project. Do not execute it again just to set up another PC.

## Open
- Start with `npm ci` and `npm run dev` after cloning/pulling this branch.
- Routes: `#/scheduling` and `#/matching`.
- `.env.local` is local, private configuration and must be configured separately on the next PC. Never commit or send environment secrets through Git.
- V2 currently lets HOSTS register availability; teacher self-submission, invitations and final matching confirmation are not yet implemented.
- Use Find partners > Preview sample to check the comparison UI without writing sample entries to Supabase.

## Continue from here
1. Recheck Matching Guided UI V2.2 in the browser, including step-to-step glow and saved availability.
2. Add teacher self-submission with a secure registration flow, scoped row-level security and explicit host approval.
3. Add international matching review, invitation and confirmation in separate tested steps.

GitHub holds source code, not the Supabase database, local `.env.local`, or uncommitted working changes.