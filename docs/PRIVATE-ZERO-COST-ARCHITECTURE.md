# NEXORA CLOUD — Private Zero-Cash Architecture

**Release:** 0.3.0  
**Owner:** Razzaq Ventures  
**Classification:** Confidential / Internal / Proprietary  
**Status:** Automated single-host foundation; not yet production-certified.

## 1. Non-negotiable objective

Nexora Cloud must not depend on a third-party free database that can pause, suspend, reclaim, or remove the production data plane because of inactivity. The first real data plane is intended to run on hardware already controlled by the owner. Vercel is a temporary dashboard/API preview only, not the database host or Docker host.

**Rp0** means no new subscription or infrastructure purchase only if suitable always-on hardware, storage, power, and internet already exist. It does not mean zero operating cost, guaranteed public uptime, redundant hardware, or disaster recovery.

## 2. Ownership and confidentiality

Nexora Cloud is a private internal infrastructure project of Razzaq Ventures. It is not a public SaaS or developer marketplace, and it is not a product under XARVIONEX or COBAMULAI. XARVIONEX is a prior project/example whose Supabase pause is the failure mode this design seeks to avoid.

- Keep the Git repository private.
- Never commit `.env`, API keys, passwords, database dumps, WhatsApp sessions, host credentials, or customer data.
- Keep administrator, runtime, and backup-encryption secrets separate.
- Do not expose Docker socket, arbitrary shell commands, or arbitrary image deployment through an API.
- Keep the dashboard bound to loopback by default; remote administration requires a deliberate VPN/firewall setup.
- Third-party DNS, Vercel, repository hosting, internet relays, and physical hardware operators may observe traffic or metadata. Do not claim that data is invisible to the infrastructure provider.

## 3. Runtime topology

```text
Owner device / LAN / future VPN
              |
        127.0.0.1:3000
              |
       Nexora Cloud app
       /             \
  nexora_db        nexora_private
      |                  |
 PostgreSQL 17       approved project services
      |
 nexora_pgdata named volume
      |
 encrypted daily backup worker -> ./backups (same host)
```

Compose services in v0.3.0:

- `db`: PostgreSQL 17, named volume `nexora_pgdata`, no published database port.
- `migrate`: advisory-lock migration job, run before app startup; creates missing roles/tables/indexes and applies grants without dropping existing data.
- `app`: Next.js control plane and API; bound to `127.0.0.1` by default.
- `backup`: creates an encrypted logical dump immediately and every 24 hours, adds an HMAC sidecar, decrypts and checks the archive, retains local backups for 30 days, and exposes a Docker healthcheck.

## 4. Single-command bootstrap

On an owner-controlled Linux host with Node.js 22.x, Docker Engine, and Docker Compose plugin installed:

```bash
npm start
```

The bootstrap script:

1. Checks for the named `nexora_pgdata` volume before generating secrets.
2. Creates `.env` from `.env.example` only when no existing database volume is present.
3. Generates four independent high-entropy secrets on a new install and preserves valid existing values. If the volume already exists but `.env`, a required secret, or database identity setting is missing, it stops and requires the owner-held original `.env`; it does not silently rotate or guess existing credentials.
4. Validates PostgreSQL identifiers, owner/runtime role separation, process-environment overrides, canonical URL, port, and backup policy bounds.
5. Applies mode `0600` to `.env` and creates the backup directory.
6. Validates Node, Docker, Compose, daemon access, and required project files.
7. Validates Compose configuration.
8. Starts PostgreSQL without removing its named volume.
9. Recreates and runs the idempotent migration job under a database advisory lock.
10. Reconciles the app and backup worker.
11. Waits for API health to confirm PostgreSQL connectivity and schema readiness.
12. Waits for an authenticated, decryptable, archive-verified initial backup before reporting full readiness.

It deliberately does not run a remote root installer to install Docker automatically. Docker Engine and the Compose plugin are one-time host prerequisites and must be installed from official OS instructions. After that prerequisite, `npm start` reconciles Docker services automatically.

Useful commands:

```bash
npm run doctor
npm run bootstrap:dry-run
npm run test:bootstrap
```

Never run `docker compose down -v` or `docker volume prune` against the production host without a separately verified backup and explicit owner decision.

## 5. Persistence and inactivity

PostgreSQL stores its data in Docker's named volume `nexora_pgdata`, not in the app container's writable layer. Docker documents that volume contents exist outside an individual container's lifecycle and remain after the container is removed. That protects against app container recreation, not against loss of the Docker host or its disk.

A self-hosted database has no managed-provider inactivity timer, but the machine can still be unavailable if it sleeps, shuts down, loses power, loses internet, or fails.

## 6. Network and access

### Local-only stage
- App port is mapped to `127.0.0.1:<NEXORA_LOCAL_PORT>`.
- PostgreSQL port 5432 is not published to the host or public internet.
- `nexora_db` is an internal Docker network shared by database, migration, app, and backup only.
- `nexora_private` is the project-service network. Approved workload containers can join it and reach the API using Docker DNS.

### Private remote stage
- Use WireGuard only after checking public reachability, ISP CGNAT, firewall policy, and a separate recovery route.
- Never expose PostgreSQL publicly.
- If a reachable inbound connection is unavailable, keep the platform local rather than silently enabling an unauthenticated tunnel.

### Public endpoint
Public DNS/domain and a production ingress are deferred until the owner obtains and configures a domain and compute host. The code resolves its API origin from `NEXORA_PUBLIC_URL`, the current Vercel deployment hostname, request origin, or localhost. The OpenAPI and `/docs` URLs follow the active deployment automatically. It does not invent or purchase a domain.

## 7. Data durability and recovery

- Live data: Docker named volume `nexora_pgdata`.
- Backup: encrypted PostgreSQL custom-format dumps in `./backups`.
- Authentication: HMAC sidecar for each encrypted dump.
- Verification: backup worker decrypts a temporary copy and executes `pg_restore --list` before recording success.
- Retention: 30 days locally by default.

**Same-host backup is not disaster recovery.** If the host/disk is lost, the live volume and local backup directory may both be lost. Before storing irreplaceable data, copy encrypted dumps to a second physical device or independently controlled target; keep the encryption key separately; test restore to a fresh database.

v0.3.0 does not implement WAL archiving, point-in-time recovery, off-host replication, failover, or multi-node redundancy. PostgreSQL documents logical dumps and continuous archiving/PITR as distinct approaches. The current release uses logical dumps only.

## 8. Vercel transition mode

Vercel can host the dashboard and request-scoped API functions while the official server/domain are not ready. It does not run this Compose stack as a persistent daemon and does not create an owner-controlled PostgreSQL volume. If `DATABASE_URL` is absent, UI preview remains available but stateful routes honestly return HTTP 503.

For a Vercel deployment with an existing remote PostgreSQL database, set `DATABASE_URL`. To auto-apply schema during build, set `NEXORA_MIGRATE_ON_BUILD=true` and `NEXORA_MIGRATION_DATABASE_URL` (a private migration-owner URL). Use verified TLS for remote connections.

Vercel Hobby terms limit use to personal/non-commercial use. Nexora is intended for the Razzaq Ventures ecosystem, so Hobby is not an approved commercial production dependency.

## 9. Hardware envelope

Planning values only; not benchmark results:
- Lab/control plane: 2 CPU cores, 4 GB RAM, 40 GB free SSD.
- Small multi-project node: 4 CPU cores, 8 GB RAM, 100 GB free SSD.
- Local AI inference, media processing, and multiple concurrent bots require additional resources.

A phone can administer the system, but should not be assumed to be a production database host or persistent WhatsApp runtime without a tested device/network/power design.

## 10. Acceptance gates before production

- Reboot host and verify services return automatically.
- Re-run `npm start`; verify secrets and volume are preserved.
- Recreate app container; confirm database data remains.
- Stop/recreate PostgreSQL container; confirm project registry survives.
- Run a manual encrypted backup and verify HMAC + archive.
- Restore a backup into a new empty test database and compare records.
- Confirm port 5432 is not publicly listening.
- Confirm admin endpoints are inaccessible outside the owner-approved network.
- Confirm an encrypted backup exists on a second physical device.
- Record measured RPO and RTO only after the restore drill.
