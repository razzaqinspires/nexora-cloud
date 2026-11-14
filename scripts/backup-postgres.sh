#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/nexora-postgres-$STAMP.dump"

cd "$ROOT_DIR"
docker compose exec -T db sh -lc 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$OUT"
test -s "$OUT"
chmod 600 "$OUT"
find "$BACKUP_DIR" -type f -name 'nexora-postgres-*.dump' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup created: %s (%s bytes)\n' "$OUT" "$(wc -c < "$OUT" | tr -d ' ')"
printf '%s\n' 'IMPORTANT: copy this backup to a second, separate device. A backup on the same host is not disaster recovery.'
