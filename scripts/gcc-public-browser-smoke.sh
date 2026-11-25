#!/usr/bin/env bash
# Read-only public-page browser smoke tests. No production credentials are used.
set -euo pipefail
browser=""
for bin in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$bin" >/dev/null 2>&1; then browser="$bin"; break; fi
done
if [[ -z "$browser" ]]; then echo "Chromium/Chrome unavailable" >&2; exit 1; fi

npm run preview -- --host 127.0.0.1 --port 4173 --strictPort >/tmp/gcc-preview-smoke.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

ready=0
for try in $(seq 1 35); do
  if curl -fsS http://127.0.0.1:4173/ >/dev/null; then ready=1; break; fi
  sleep .3
done
if [[ "$ready" != 1 ]]; then cat /tmp/gcc-preview-smoke.log >&2; exit 1; fi

fetch_rendered() {
  timeout 30 "$browser" \
    --headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu \
    --disable-background-networking --no-first-run --no-default-browser-check \
    --virtual-time-budget=7000 --dump-dom "$1" 2>/dev/null
}
home="$(fetch_rendered 'http://127.0.0.1:4173/#/welcome')"
[[ "$home" == *'Global Classroom'* ]]
echo 'PASS: welcome page renders'

signup="$(fetch_rendered 'http://127.0.0.1:4173/#/signup')"
[[ "$signup" == *'Create account'* ]]
[[ "$signup" == *'Confirm your email'* ]]
[[ "$signup" == *'School time zone'* ]]
echo 'PASS: new teacher signup page and global timezone instructions render'

protected="$(fetch_rendered 'http://127.0.0.1:4173/#/teacher-approvals')"
[[ "$protected" == *'Login'* || "$protected" == *'Sign in'* || "$protected" == *'Sign In'* ]]
if [[ "$protected" == *'id="gcc226-panel-registrations"'* ]]; then
  echo 'FAIL: unauthenticated host registration center rendered' >&2; exit 1
fi
echo 'PASS: anonymous visitors cannot render the host registration center'


# Public routes are read-only here: no Supabase credentials, no submissions.
login="$(fetch_rendered 'http://127.0.0.1:4173/#/teacher-access')"
[[ "$login" == *'id="gcta-login"'* ]]
[[ "$login" == *'Forgot your password?'* ]]
echo 'PASS: verified teacher sign-in and recovery links render'

registration="$(fetch_rendered 'http://127.0.0.1:4173/#/session-register')"
[[ "$registration" == *'id="gcc-v8-event"'* ]]
[[ "$registration" == *'Choose your session'* ]]
echo 'PASS: public session registration flow renders without exposing a roster'

room="$(fetch_rendered 'http://127.0.0.1:4173/#/room-plan')"
[[ "$room" == *'id="gcc-v104-code"'* ]]
[[ "$room" == *'id="gcc-v104-chart"'* ]]
echo 'PASS: room chart requires a session access code before viewing data'

anonymous_teacher="$(fetch_rendered 'http://127.0.0.1:4173/#/teacher-portal?view=find')"
[[ "$anonymous_teacher" == *'id="gcta-login"'* || "$anonymous_teacher" == *'Sign in'* ]]
if [[ "$anonymous_teacher" == *'id="gctp-results"'* ]]; then
  echo 'FAIL: anonymous visitor rendered the teacher session workspace' >&2; exit 1
fi
echo 'PASS: anonymous visitors cannot browse protected teacher sessions'

# The mobile viewport must retain important public registration controls.
mobile="$(timeout 30 "$browser" --headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --no-first-run --window-size=390,844 --virtual-time-budget=7000 \
  --dump-dom 'http://127.0.0.1:4173/#/signup' 2>/dev/null)"
[[ "$mobile" == *'id="gcc140-tab-signup"'* ]]
[[ "$mobile" == *'School time zone'* ]]
echo 'PASS: mobile signup page preserves the account and school-timezone fields'
