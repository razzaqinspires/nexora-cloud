#!/bin/sh
set -eu
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${NEXORA_BACKUP_ENCRYPTION_KEY:?NEXORA_BACKUP_ENCRYPTION_KEY is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${NEXORA_BACKUP_RETENTION_DAYS:-30}"
INTERVAL_SECONDS="${NEXORA_BACKUP_INTERVAL_SECONDS:-86400}"
umask 077
mkdir -p "$BACKUP_DIR"
printf '%s\n' '[NEXORA BACKUP] Backup worker started; creating initial backup now.'
while :; do
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  raw="$BACKUP_DIR/.nexora-$stamp.dump.tmp"
  verify="$BACKUP_DIR/.nexora-$stamp.verify.tmp"
  encrypted="$BACKUP_DIR/nexora-postgres-$stamp.dump.enc"
  macfile="$encrypted.hmac"
  if pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$raw"; then
    if openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:NEXORA_BACKUP_ENCRYPTION_KEY -in "$raw" -out "$encrypted"; then
      rm -f "$raw"
      hmac_key_output="$(printf '%s' 'nexora-cloud-backup-hmac-v1' | openssl dgst -sha256 -hmac "$NEXORA_BACKUP_ENCRYPTION_KEY")"
      hmac_key="${hmac_key_output##*= }"
      mac_output="$(openssl dgst -sha256 -mac HMAC -macopt "hexkey:$hmac_key" "$encrypted")"
      mac="${mac_output##*= }"
      if [ "${#mac}" -eq 64 ] && printf '%s\n' "$mac" > "$macfile" \
        && openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:NEXORA_BACKUP_ENCRYPTION_KEY -in "$encrypted" -out "$verify" \
        && pg_restore --list "$verify" >/dev/null 2>&1; then
        rm -f "$verify"
        chmod 600 "$encrypted" "$macfile"
        date +%s > "$BACKUP_DIR/.last-success-epoch"
        printf '[NEXORA BACKUP] Encrypted and authenticated backup verified: %s\n' "$encrypted"
      else
        rm -f "$verify" "$encrypted" "$macfile"
        printf '%s\n' '[NEXORA BACKUP] HMAC or archive verification failed; artifact removed.' >&2
      fi
    else
      rm -f "$raw" "$encrypted"
      printf '%s\n' '[NEXORA BACKUP] Encryption failed.' >&2
    fi
  else
    rm -f "$raw"
    printf '%s\n' '[NEXORA BACKUP] pg_dump failed.' >&2
  fi
  find "$BACKUP_DIR" -type f -name 'nexora-postgres-*.dump.enc' -mtime "+$RETENTION_DAYS" -exec rm -f {} {}.hmac \;
  sleep "$INTERVAL_SECONDS"
done
