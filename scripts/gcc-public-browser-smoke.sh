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
printf '%s' "$home" | grep -q 'Global Classroom'
echo 'PASS: welcome page renders'

signup="$(fetch_rendered 'http://127.0.0.1:4173/#/signup')"
printf '%s' "$signup" | grep -q 'Create account'
printf '%s' "$signup" | grep -q 'Confirm your email'
printf '%s' "$signup" | grep -q 'School time zone'
echo 'PASS: new teacher signup page and global timezone instructions render'

protected="$(fetch_rendered 'http://127.0.0.1:4173/#/teacher-approvals')"
printf '%s' "$protected" | grep -q 'Login\|Sign in\|Sign In'
if printf '%s' "$protected" | grep -q 'id="gcc226-panel-registrations"'; then
  echo 'FAIL: unauthenticated host registration center rendered' >&2; exit 1
fi
echo 'PASS: anonymous visitors cannot render the host registration center'
