# Nexora Cloud v0.3.0 — Release Notes

## Main change

A single-command, idempotent self-host bootstrap now coordinates the local runtime. On an owner-controlled Linux host with Node.js 22, Docker Engine, and the Docker Compose plugin installed, `npm start`:

- Detects an existing `nexora_pgdata` volume before touching credentials.
- Creates `.env` and generates missing/placeholder secrets only on a genuinely new database installation.
- Preserves valid existing secret values and fails closed if the old data volume exists but `.env` or a critical secret is missing.
- Validates host requirements and Compose configuration.
- Starts PostgreSQL without deleting existing named volumes.
- Recreates and runs an advisory-lock migration job.
- Reconciles the Next.js app and encrypted backup worker.
- Waits for the database/schema health endpoint.
- Waits for a recent verified encrypted backup before reporting full readiness.

## Database durability improvements

- PostgreSQL 17 stored in named volume `nexora_pgdata`.
- Runtime role separate from database owner.
- Database port is not published.
- Migrations create missing tables/roles and preserve existing records.
- Dedicated backup image includes PostgreSQL 17 client tools and OpenSSL CLI. The worker creates immediate + daily logical dumps, encrypts and HMAC-authenticates each artifact, validates it, and retains local copies for 30 days.
- Restore helper validates HMAC and archive readability before a human performs recovery to a separate database.

## Website/API improvements

- `/docs` now displays the active API origin.
- `/api/v1/meta` exposes runtime metadata and canonical URL information.
- `/api/v1/openapi.json` provides a machine-readable API contract with request/response schemas and auth definitions.
- `NEXORA_PUBLIC_URL` overrides the automatically detected deployment origin when the official domain is configured.
- Project registration is idempotent by slug; existing projects do not receive duplicate API keys.

## Vercel mode

`vercel.json` sets the build command to `npm run build`, which invokes the prebuild validator. Vercel deployment does not run the local Docker orchestrator. The current deployment hostname is preferred for preview documentation URLs; `NEXORA_PUBLIC_URL` overrides it once the official domain is owned and configured. The dashboard can preview without a DB, but stateful endpoints return 503 until a persistent PostgreSQL service is configured. Optional Vercel build migrations require `NEXORA_MIGRATE_ON_BUILD=true` and a private `NEXORA_MIGRATION_DATABASE_URL`.

## Not included yet

No owner host has been deployed or tested. Docker is a one-time OS prerequisite; `npm start` orchestrates Compose after Docker Engine and the Compose plugin are already installed. No off-host backup replication, WAL archiving/PITR, HA failover, public ingress, object-storage service, container provisioning, project DB provisioning, API-key rotation/revocation, or full audit/rate limiting is claimed.

## Validation

Passed in the available environment:
- Node syntax checks for bootstrap/migration scripts.
- Shell syntax checks for backup/restore helpers.
- YAML parse of `compose.yaml`.
- Static bootstrap self-tests.
- Encryption + HMAC + decryption round-trip test.
- Local and simulated Vercel prebuild checks.

Not executed:
- Docker Compose execution (Docker CLI unavailable).
- Real PostgreSQL migration/role validation.
- Next.js production build (dependency installation timed out).
- Vercel deployment/acceptance.
- Actual backup restore against a live PostgreSQL server.
