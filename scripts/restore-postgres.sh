#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/nexora-postgres-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 2
fi
BACKUP_FILE="$1"
if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file missing or empty: $BACKUP_FILE" >&2
  exit 1
fi
if [[ "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "This overwrites matching objects in the target database." >&2
  echo "Review the backup, then rerun with RESTORE_CONFIRM=YES." >&2
  exit 1
fi
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
docker compose exec -T db sh -lc 'pg_restore --exit-on-error --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$BACKUP_FILE"
echo "Restore command completed. Verify the application and database before routing traffic."
