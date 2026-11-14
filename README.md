# NEXORA CLOUD — Private Control Plane

**Razzaq Ventures · v0.3.0 · Confidential / Internal / Proprietary**

Nexora Cloud is the private infrastructure control plane intended to coordinate project identity, API access, persistent database state, and service operations for Whiskay, AISYAH/Nexora AI, Whiskay RPG, Razzaq Ventures websites, and approved internal projects.

## One command on the self-hosted machine

After installing Node.js 22.x and the official Docker Engine + Compose plugin, run:

```bash
npm start
```

`npm start` is the idempotent local orchestrator. The host-side bootstrap uses only Node.js built-ins; Docker builds the application image and installs the project dependencies. It creates missing `.env` configuration and strong secrets without replacing valid existing secrets, creates the backup directory, validates the host and Compose configuration, reconciles containers, waits for the database migration and app startup, then verifies the health endpoint.

Useful commands:

```bash
npm run doctor          # read-only host check
npm run bootstrap:dry-run # config + prerequisites; does not start services
npm run test:bootstrap  # static architecture/bootstrap regression checks
npm run build           # build dashboard; runs prebuild validation first
```

Do not run `docker compose down -v` on the primary host. It deletes the named PostgreSQL volume. Keep an offline recovery copy of `.env` and the backup encryption key. If the existing database volume is found but a critical secret is missing, bootstrap deliberately stops instead of generating credentials that cannot unlock the old data.

## Runtime manifest

- Node.js: 22.x (exact major enforced by bootstrap).
- Next.js: 16.4.6; React / React DOM: 19.3.1; node-postgres (`pg`): 8.23.1; Zod: 4.6.7. Direct dependency versions are pinned in `package.json`.
- PostgreSQL container: major 17 (`postgres:17-bookworm`).

Versions were checked against the current official package sources on 14 November 2026: [Next.js](https://www.npmjs.com/package/next), [React](https://www.npmjs.com/package/react), [node-postgres](https://www.npmjs.com/package/pg), [Zod](https://www.npmjs.com/package/zod).

## What v0.3.0 starts

- `db`: PostgreSQL 17, private network, named persistent volume `nexora_pgdata`.
- `migrate`: advisory-lock migration runner; creates missing roles/tables/indexes and grants runtime access; leaves existing schema and records in place.
- `app`: Next.js dashboard and API; bound to `127.0.0.1` by default.
- `backup`: dedicated PostgreSQL 17 + OpenSSL image; daily encrypted logical backup, HMAC authentication, decrypt/archive verification, 30-day local retention and a Docker healthcheck.

The app waits for the migration service to complete successfully. Compose dependency health conditions are documented by Docker. [Docker Compose service dependencies](https://docs.docker.com/reference/compose-file/services/).

## Domain-aware API documentation

The website derives its current origin from `NEXORA_PUBLIC_URL`, the current Vercel deployment hostname (`VERCEL_URL`), the local request origin, or localhost. Preview deployments do not accidentally point to the production hostname. No deployment domain is hard-coded. Once the official domain is owned and configured, set `NEXORA_PUBLIC_URL` and redeploy; `/docs` and `/api/v1/openapi.json` resolve the matching API URLs automatically.

## Vercel transition

Vercel can host a dashboard/API preview while the official domain and server are not ready. Vercel does not run the local Docker orchestrator or host the persistent PostgreSQL volume. Without a configured database, the dashboard can build, but stateful API routes report `503` rather than pretending that a durable database exists.

For a Vercel build with an already-provisioned PostgreSQL database, set `DATABASE_URL`. To run schema migrations during build, also set `NEXORA_MIGRATE_ON_BUILD=true` and a private owner/migration URL in `NEXORA_MIGRATION_DATABASE_URL`. Enable verified TLS with `NEXORA_DATABASE_SSL=true` for remote services.

Vercel Hobby terms restrict use to personal/non-commercial use. Confirm a plan appropriate for business use before production. See [Vercel Terms](https://vercel.com/legal/terms) and [Functions limitations](https://vercel.com/docs/functions/limitations).

## Database durability boundary

There is no literally eternal database. v0.3.0 is designed not to auto-pause for inactivity on an owner-controlled Docker host. PostgreSQL data is kept in a named volume; a separate backup worker writes encrypted and authenticated dumps to `./backups` each day. This is a same-host backup only. Host/disk loss can destroy both database and local backups, so a second physical device or independent storage target and regular restore drills are mandatory before irreplaceable data is stored.

PostgreSQL supports SQL dumps and continuous archiving/PITR as separate backup strategies. This release implements verified logical dumps, not WAL archiving/PITR. See [PostgreSQL 17 Backup and Restore](https://www.postgresql.org/docs/17/backup.html).

## Current limitations

This is not yet a multi-node public cloud. It does not provision arbitrary project containers, provide automatic failover, off-host backup replication, object storage, API key rotation/revocation, full audit trails, metering, or rate limiting. These require a validated owner-controlled server and explicit resource/security policies.

See:
- `docs/AUTOMATED-BOOTSTRAP.md`
- `docs/DATA-DURABILITY.md`
- `docs/VERCEL-TRANSITION.md`
- `docs/CONFIDENTIALITY-AND-OPERATIONS.md`
- `docs/PRIVATE-ZERO-COST-ARCHITECTURE.md`
