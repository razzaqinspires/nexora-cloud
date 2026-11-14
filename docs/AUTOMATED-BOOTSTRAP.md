# Nexora Cloud v0.3.0 — Automated Bootstrap Contract

## One command on an owner-controlled host

Install Docker Engine and the Compose plugin from the official Docker instructions, then run. The host bootstrap uses Node.js built-ins; the Docker build installs the application dependencies.

```bash
npm start
```

`npm start` executes `scripts/bootstrap.mjs`. It is intentionally idempotent:

1. Checks whether the named `nexora_pgdata` volume already exists before creating or repairing secrets.
2. Creates `.env` from `.env.example` only for a genuinely new database installation.
3. Generates missing/placeholder secrets on a new installation and keeps valid existing values unchanged. If an existing volume is found but `.env`, a critical secret, or a database identity setting is missing, bootstrap fails closed and requires recovery of the original `.env`.
4. Validates PostgreSQL identifiers, owner/runtime role separation, process-environment overrides, local port, canonical URL, and backup policy bounds.
5. Enforces `.env` mode `0600` and creates the local backup directory.
6. Checks Node.js, Docker CLI, Compose plugin, Docker daemon availability, and required project files.
7. Validates `docker compose config`.
8. Starts/reconciles PostgreSQL without deleting `nexora_pgdata`.
9. Force-recreates and runs the idempotent migration job, serialized by a PostgreSQL advisory lock.
10. Starts/reconciles the API and encrypted backup worker.
11. Waits for `/api/v1/health` to report database and schema readiness.
12. Waits for the backup worker to report a recent authenticated, decryptable, archive-verified encrypted dump before reporting full readiness.

Repeat runs do not regenerate valid secrets or delete the existing named volume. If `.env` is lost while the volume remains, restore the owner-held offline `.env` copy; do not let the bootstrap invent replacement DB/admin/backup secrets. Do not run `docker compose down -v`; it deletes persistent volumes. Keep a separate encrypted/physical recovery copy of `.env` and its backup key.

### Modes

- `npm start`: self-hosted bootstrap and health acceptance.
- `npm run doctor`: read-only host checks; it does not create `.env` or change services.
- `npm run bootstrap:dry-run`: prepares missing local config and validates host requirements, but does not start containers.
- `npm run start:app`: starts only the Next.js app process; reserved for the Docker app container.
- `npm run build`: runs the prebuild validator, then Next.js build.

The bootstrap does not silently install Docker or execute privileged remote install scripts. The owner must install Docker through official OS instructions and authorize the Docker daemon.

## Container startup order

1. PostgreSQL starts with a persistent named volume and private database network.
2. `migrate` waits for PostgreSQL health, acquires a PostgreSQL advisory lock, creates only missing roles/tables/indexes, and grants runtime permissions.
3. `app` starts only after migration exits successfully.
4. `backup` creates an encrypted logical dump, writes an HMAC sidecar using a domain-separated derived key, verifies the HMAC/decryption/archive, then repeats every 24 hours by default.

Existing role definitions and tables are retained. Existing runtime role passwords are not silently changed. If a stored role password and `.env` disagree, app health fails rather than resetting a credential or overwriting the volume.

## Vercel mode

Vercel does not call the local `npm start` orchestrator as a persistent server process. Vercel runs the Next.js build and request-scoped Functions. The `prebuild` script detects Vercel and validates the build environment; it never attempts to start Docker.

- Dashboard and stateless API routes can deploy without a database.
- Stateful endpoints return `503` until `DATABASE_URL` points to an existing PostgreSQL database with the Nexora schema.
- If `NEXORA_MIGRATE_ON_BUILD=true` and `NEXORA_MIGRATION_DATABASE_URL` are both set, the prebuild hook executes idempotent migrations. Keep the migration URL private and use a database owner/migration identity.
- The build does not create a managed database service or provision a server.
- Vercel Hobby terms restrict use to personal/non-commercial purposes. Confirm plan eligibility before deploying business operations.

## Dynamic domain and API docs

No deployment domain is hard-coded. Resolution precedence:

1. `NEXORA_PUBLIC_URL` when an owner-configured canonical origin exists.
2. `VERCEL_URL` for the current Vercel deployment (Preview or Production), with `VERCEL_PROJECT_PRODUCTION_URL` as a fallback.
3. The incoming request origin / forwarded host for local or proxied request-scoped docs.
4. `http://localhost:<port>` for local development.

The website exposes `/docs`, `/api/v1/meta`, and `/api/v1/openapi.json`. These expose the current runtime API origin, so changing the official domain later does not require editing every API example in source code. Server-side project clients still set `NEXORA_CLOUD_URL` in their own environment.
