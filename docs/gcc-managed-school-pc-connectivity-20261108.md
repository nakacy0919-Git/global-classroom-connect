# GCC — managed school PC connection diagnostics (2026-11-08)

## Context

A Nagoya City-issued teacher PC displayed "GCC could not connect to the account service". This is a browser-to-Supabase transport failure, **not proof of bad credentials**. The affected teacher's authentication account and approved teacher record were checked independently and were intact. Supabase edge logs showed successful requests from other Windows/Android clients; they do not prove that this particular managed browser had unrestricted connectivity.

Nagoya City's published school ICT guidance describes historically separated administrative, instructional and external networks, with migration plans. **Do not assume the teacher's present device is on the older network.**

## Diagnosis (after PR #97 is deployed with owner approval)

1. Visit the official GCC Teacher sign-in page in a school-authorized browser.
2. If login reports a connection error, choose **Check connection**. This sends no user identity, password, session token, room code or student data.
3. The browser tests the configured Supabase Auth health endpoint over HTTPS. If that fails, it asks **this GCC website's Vercel server** to perform an independent server-side health check.
4. When the server succeeds but the browser cannot reach Supabase, examine the device/network's outbound HTTPS policy, DNS resolution, content filtering, institutional proxy, TLS inspection, browser policies, or VDI environment.
5. If both sides fail, check Supabase service status and GCC/Vercel environment configuration. If the browser succeeds, inspect the individual sign-in error and browser console rather than resetting the teacher's account.

## Endpoints for the school ICT administrator

Verify institutional approval before allowlisting. GCC requires these **fixed** HTTPS endpoints (TCP 443), not unrestricted access to every Supabase project:

- **App:** `https://gcc.pic-speak-story.com`
- **GCC project backend:** `https://ayrflycncfbvizlfchce.supabase.co`
- **Authentication:** `/auth/v1/*`
- **Data and room-chart RPCs:** `/rest/v1/*`
- **Storage (used for photos/resources):** `/storage/v1/*`

The diagnostic endpoint on GCC is `/api/gcc-auth-health`; it returns only a service status and optional HTTP status. It does **not** act as a login or data proxy. It cannot bypass a municipal firewall.

Do not disable endpoint protection, TLS security, proxy enforcement or content filtering to make the app work. If the administrative PC cannot access a third-party education app by design, use an officially approved instructional device/network after checking institutional policies.

## Verification and privacy

- Account creation, RLS policies, host/teacher approvals, and passwords are unchanged.
- No access token, password or student list is sent to the diagnostic endpoint.
- The diagnostic does not repeat failed sign-in or registration POST requests.
- Avoid placing email addresses, raw invitation tokens, student rosters, or passwords in support screenshots.
- The separate room-chart UI error recovery work is tracked in PR #98. Do not confuse an API failure with a Zoom guide rendering failure.
- This change must pass all `node --test` regression tests and `npm run build` in GitHub Actions, followed by real managed-device checks and **explicit** production release approval.
