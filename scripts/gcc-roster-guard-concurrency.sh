#!/usr/bin/env bash
# CI-only: uses the disposable PG connection configured in the workflow.
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
event='a1000000-0000-4000-8000-000000000003'
# Parallel inserts into the same event with an allowance of one.
psql -v ON_ERROR_STOP=1 -c "BEGIN; SET ROLE anon; SELECT public.gcc_test_roster_write('$event'); SELECT pg_sleep(1); COMMIT;" >"$tmp/a" 2>&1 &
a=$!
psql -v ON_ERROR_STOP=1 -c "BEGIN; SET ROLE authenticated; SELECT public.gcc_test_roster_write('$event'); COMMIT;" >"$tmp/b" 2>&1 &
b=$!
ra=0; rb=0
wait "$a" || ra=$?
wait "$b" || rb=$?
if [[ "$ra" -eq 0 && "$rb" -ne 0 ]]; then grep -q GCC_ROSTER_BUSY "$tmp/b"
elif [[ "$rb" -eq 0 && "$ra" -ne 0 ]]; then grep -q GCC_ROSTER_BUSY "$tmp/a"
else cat "$tmp/a" "$tmp/b"; exit 1; fi
[[ "$(psql -At -v ON_ERROR_STOP=1 -c "select count(*) from public.gcc_session_signups where event_id='$event'")" == 1 ]]
[[ "$(psql -At -v ON_ERROR_STOP=1 -c "select accepted_count from gcc_roster_guard.event_windows where event_id='$event'")" == 1 ]]
echo 'PASS: concurrent submissions cannot exceed the same event allowance'
