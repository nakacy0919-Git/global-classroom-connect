#!/usr/bin/env bash
# Only run in the existing disposable CI job.
set -euo pipefail
[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true && "${PGDATABASE:-}" == gcc_v231_ci && "${PGHOST:-}" == 127.0.0.1 ]]
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
event=a6000000-0000-4000-8000-000000000002
psql -v ON_ERROR_STOP=1 -c "BEGIN; SET ROLE anon; SELECT public.gcc_v6_submit_signup(repeat('a',32),'$event','Legacy Teacher','Legacy School','JP','Japan','[{\"name\":\"Student One\"}]','[]'); SELECT pg_sleep(1); COMMIT;" >"$tmp/a" 2>&1 &
a=$!
psql -v ON_ERROR_STOP=1 -c "BEGIN; SET ROLE anon; SELECT public.gcc_v8_submit_roster('$event','Other Teacher','Other School','PH','Philippines','[{\"name\":\"Student Two\"}]','[]'); COMMIT;" >"$tmp/b" 2>&1 &
b=$!
ra=0; rb=0; wait "$a" || ra=$?; wait "$b" || rb=$?
if [[ "$ra" -eq 0 && "$rb" -ne 0 ]]; then grep -q 'has reached its registration capacity' "$tmp/b"
elif [[ "$rb" -eq 0 && "$ra" -ne 0 ]]; then grep -q 'has reached its registration capacity' "$tmp/a"
else cat "$tmp/a" "$tmp/b"; exit 1; fi
[[ "$(psql -At -v ON_ERROR_STOP=1 -c "select count(*) from public.gcc_session_signup_students st join public.gcc_session_signups s on s.id=st.signup_id where s.event_id='$event'")" == 1 ]]
echo 'PASS: concurrent actual V6 and V8 writes share one capacity limit'
