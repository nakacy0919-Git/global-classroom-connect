#!/usr/bin/env bash
# Local containers, disposable CI database and no hosted credentials.
set -euo pipefail
[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true && "${PGDATABASE:-}" == gcc_auth_ci && "${PGHOST:-}" == 127.0.0.1 ]]
cleanup(){ docker rm -f gcc-local-auth gcc-local-mail gcc-local-rest >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Match the official Auth dev bootstrap, keeping the Auth-owned schema separate.
psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE supabase_admin NOLOGIN;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'gcc_ci_disposable_only';
GRANT anon,authenticated,service_role TO authenticator;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE PASSWORD 'gcc_ci_disposable_only';
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
GRANT CREATE ON DATABASE gcc_auth_ci TO supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path TO auth;
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
SQL
jwt='gcc-ephemeral-auth-ci-only-secret-2026-000000'
docker run -d --name gcc-local-mail --network host \
 -e MP_SMTP_BIND_ADDR=127.0.0.1:1025 -e MP_UI_BIND_ADDR=127.0.0.1:8025 \
 axllent/mailpit:v1.21.8 >/dev/null
docker run -d --name gcc-local-auth --network host \
 -e GOTRUE_API_HOST=127.0.0.1 -e GOTRUE_API_PORT=9999 \
 -e API_EXTERNAL_URL=http://127.0.0.1:9999 \
 -e GOTRUE_DB_DRIVER=postgres \
 -e GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:gcc_ci_disposable_only@127.0.0.1:5432/gcc_auth_ci \
 -e DB_NAMESPACE=auth \
 -e GOTRUE_SITE_URL=http://127.0.0.1:3000 \
 -e GOTRUE_DISABLE_SIGNUP=false -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true \
 -e GOTRUE_EXTERNAL_PHONE_ENABLED=false -e GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED=false \
 -e GOTRUE_JWT_SECRET="$jwt" -e GOTRUE_JWT_AUD=authenticated \
 -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
 -e GOTRUE_JWT_EXP=3600 -e GOTRUE_MAILER_AUTOCONFIRM=false \
 -e GOTRUE_SMTP_HOST=127.0.0.1 -e GOTRUE_SMTP_PORT=1025 \
 -e GOTRUE_SMTP_ADMIN_EMAIL=gcc-ci@example.com -e GOTRUE_SMTP_SENDER_NAME=GCC-CI \
 -e GOTRUE_SMTP_MAX_FREQUENCY=1s -e GOTRUE_RATE_LIMIT_EMAIL_SENT=20 \
 -e GOTRUE_MAILER_URLPATHS_CONFIRMATION=/verify \
 -e GOTRUE_MAILER_URLPATHS_RECOVERY=/verify \
 supabase/gotrue:v2.189.0 >/dev/null
ready=0
for i in $(seq 1 90); do
 if curl -fsS http://127.0.0.1:9999/health >/dev/null 2>&1 && curl -fsS http://127.0.0.1:8025/api/v1/messages >/dev/null 2>&1; then ready=1; break; fi
 sleep 1
done
if [[ "$ready" != 1 ]]; then
 # Startup only; no accounts or tokens have been created yet.
 docker logs gcc-local-auth --tail 30 2>&1 || true
 echo 'Local Auth/Mailpit startup failed'; exit 1
fi
# The hosted Supabase auth.uid helper reads PostgREST request claims.
# Standard PostgreSQL lacks the Supabase platform bootstrap; provide only this
# compatible helper if absent. Do not alter GoTrue-owned user tables.
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $outer$
BEGIN
 IF to_regprocedure('auth.uid()') IS NULL THEN
  EXECUTE $fn$CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $body$
   SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
  $body$$fn$;
 END IF;
END $outer$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
SQL
psql -X -v ON_ERROR_STOP=1 -f tests/sql/gcc_local_auth_acceptance_fixture.sql
psql -X -v ON_ERROR_STOP=1 -f sql/gcc_v238_verified_roster_guard.sql
docker run -d --name gcc-local-rest --network host \
 -e PGRST_DB_URI=postgres://authenticator:gcc_ci_disposable_only@127.0.0.1:5432/gcc_auth_ci \
 -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
 -e PGRST_JWT_SECRET="$jwt" -e PGRST_SERVER_HOST=127.0.0.1 -e PGRST_SERVER_PORT=3400 \
 postgrest/postgrest:v12.2.12 >/dev/null
ready=0
for i in $(seq 1 40); do
 if curl -fsS http://127.0.0.1:3400/ >/dev/null 2>&1; then ready=1; break; fi
 sleep 1
done
[[ "$ready" == 1 ]] || { echo 'Local PostgREST startup failed'; exit 1; }
node scripts/gcc-local-auth-acceptance.mjs
