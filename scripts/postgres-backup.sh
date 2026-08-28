#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/handmekey-$STAMP.dump"

echo "Creating PostgreSQL backup: $TARGET"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$TARGET"
test -s "$TARGET"
sha256sum "$TARGET" > "$TARGET.sha256"
find "$BACKUP_DIR" -type f -name 'handmekey-*.dump' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'handmekey-*.dump.sha256' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup complete: %s\n' "$TARGET"
