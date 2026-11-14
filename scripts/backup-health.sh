#!/bin/sh
set -eu
FILE="${BACKUP_DIR:-/backups}/.last-success-epoch"
[ -s "$FILE" ] || exit 1
LAST="$(cat "$FILE")"
NOW="$(date +%s)"
[ "$LAST" -gt 0 ] || exit 1
[ "$((NOW - LAST))" -lt 172800 ]
