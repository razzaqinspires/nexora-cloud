#!/bin/sh
set -eu
: "${NEXORA_APP_DB_USER:?NEXORA_APP_DB_USER is required}"
: "${NEXORA_APP_DB_PASSWORD:?NEXORA_APP_DB_PASSWORD is required}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_user="$NEXORA_APP_DB_USER" \
  --set=app_password="$NEXORA_APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')\gexec
SQL
