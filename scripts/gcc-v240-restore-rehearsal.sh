#!/usr/bin/env bash
# Only the ephemeral GitHub Actions postgres:17 service. No production backup.
set -euo pipefail
[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true && "${PGDATABASE:-}" == gcc_v231_ci && "${PGHOST:-}" == 127.0.0.1 ]]
id="${GCC_CI_PG_CONTAINER:?missing disposable service ID}"
[[ "$id" =~ ^[a-f0-9]{12,64}$ ]]
[[ "$(docker inspect --format '{{.Config.Image}}' "$id")" == postgres:17 ]]
db=gcc_v240_restore_ci
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Use the matching server image's PostgreSQL 17 client binaries.
docker exec -i "$id" psql -U postgres -d gcc_v231_ci -At -v ON_ERROR_STOP=1 < tests/sql/gcc_v240_restore_fingerprint.sql > "$tmp/before"
docker exec "$id" pg_dump -U postgres -d gcc_v231_ci -Fc > "$tmp/backup.dump"
test -s "$tmp/backup.dump"
docker exec "$id" createdb -U postgres "$db"
docker exec -i "$id" pg_restore -U postgres --exit-on-error -d "$db" < "$tmp/backup.dump"
docker exec -i "$id" psql -U postgres -d "$db" -At -v ON_ERROR_STOP=1 < tests/sql/gcc_v240_restore_fingerprint.sql > "$tmp/after"
cmp -s "$tmp/before" "$tmp/after" || { echo 'Restore fingerprint mismatch'; exit 1; }
docker exec -i "$id" psql -U postgres -d "$db" -v ON_ERROR_STOP=1 < tests/sql/gcc_v240_restore_assertions.sql
echo 'PASS: disposable PG17 logical backup and restore; selected data, grants and gates preserved'
