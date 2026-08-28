#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then echo "Usage: $0 backups/handmekey-YYYYMMDDTHHMMSSZ.dump" >&2; exit 2; fi
FILE="$1"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
[[ -s "$FILE" ]] || { echo "Backup file not found or empty: $FILE" >&2; exit 2; }
if [[ -f "$FILE.sha256" ]]; then sha256sum -c "$FILE.sha256"; fi
if [[ "${CONFIRM_RESTORE:-}" != "RESTORE_HANDMEKEY" ]]; then
  echo "Restore is destructive. Re-run with CONFIRM_RESTORE=RESTORE_HANDMEKEY" >&2
  exit 3
fi

echo "Restoring $FILE into production PostgreSQL..."
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$FILE"
echo "Restore complete. Run the readiness check before reopening traffic."
