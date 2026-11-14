# Nexora Cloud Architecture — v0.3.0

## Deployment model

- **Self-hosted source of truth:** Docker Compose on an owner-controlled machine.
- **PostgreSQL 17:** persistent Docker named volume `nexora_pgdata`.
- **Migration job:** one-shot, serialized by PostgreSQL advisory lock; runs before app startup.
- **Backup worker:** daily encrypted logical dump, HMAC sidecar, archive verification, local retention and healthcheck.
- **Private networking:** database/migration/backup share `nexora_db`; approved project services use `nexora_private` to reach the API.
- **Admin interface:** bound to `127.0.0.1:3000` by default.
- **Vercel:** temporary dashboard/API preview only; no persistent database volume or Docker host there.

## One-command start

`npm start` runs the local idempotent bootstrap: create missing `.env` secrets, validate host/configuration, start PostgreSQL, run migrations, start app and backup, then wait for health. Existing secret values and the named database volume are preserved. See `AUTOMATED-BOOTSTRAP.md`.

## API and domain resolution

- Website documentation: `/docs`
- Runtime metadata: `/api/v1/meta`
- Machine-readable OpenAPI: `/api/v1/openapi.json`
- Health: `/api/v1/health`

`NEXORA_PUBLIC_URL` is the canonical origin override. Otherwise Vercel's assigned deployment hostname or the local request hostname is used. No domain is hard-coded in source.

## Data durability boundary

- `nexora_pgdata` persists through container lifecycle changes.
- Backups are encrypted and authenticated, but stored on the same host in v0.3.0.
- Off-host copies, WAL archiving/PITR, host replication, and failover remain future work.
- Do not use `docker compose down -v` or `docker volume prune` on the live host.

## Current API scope

Project registry, one-time API-key issuance, project identity verification, deployment metadata, health, and OpenAPI specification. Full API key rotation/revocation, rate limiting, audit trails, per-project database provisioning, storage API, and compute scheduling are not yet implemented.
