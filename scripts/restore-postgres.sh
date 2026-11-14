#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/restore-postgres.sh backups/nexora-postgres-YYYYMMDDTHHMMSSZ.dump.enc" >&2
  exit 2
fi
FILE="$1"
[[ -f "$FILE" ]] || { echo "Backup file not found: $FILE" >&2; exit 2; }
[[ -f "$FILE.hmac" ]] || { echo "Backup authentication sidecar not found: $FILE.hmac" >&2; exit 2; }
[[ -n "${NEXORA_BACKUP_ENCRYPTION_KEY:-}" ]] || { echo "NEXORA_BACKUP_ENCRYPTION_KEY is missing. Supply it from the owner's secure offline copy." >&2; exit 2; }
EXPECTED="$(tr -d '\r\n ' < "$FILE.hmac")"
HMAC_KEY_OUTPUT="$(printf '%s' 'nexora-cloud-backup-hmac-v1' | openssl dgst -sha256 -hmac "$NEXORA_BACKUP_ENCRYPTION_KEY")"
HMAC_KEY="${HMAC_KEY_OUTPUT##*= }"
ACTUAL_OUTPUT="$(openssl dgst -sha256 -mac HMAC -macopt "hexkey:$HMAC_KEY" "$FILE")"
ACTUAL="${ACTUAL_OUTPUT##*= }"
[[ "$EXPECTED" == "$ACTUAL" && ${#ACTUAL} -eq 64 ]] || { echo 'Backup HMAC validation failed. Do not restore this file.' >&2; exit 3; }
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:NEXORA_BACKUP_ENCRYPTION_KEY -in "$FILE" -out "$TMP"
if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --list "$TMP" >/dev/null
else
  docker compose exec -T db pg_restore --list - < "$TMP" >/dev/null
fi
echo 'Backup HMAC, decryption, and archive verification passed.'
echo 'This script does not overwrite a live database automatically. Restore to a new database first and validate application data.'
