# NEXORA CLOUD — Private Control Plane

**Razzaq Ventures · v0.2.0 · Private / Internal / Proprietary**

Nexora Cloud is an internal project-infrastructure control plane. It is intended to coordinate project identity and service APIs for Whiskay, AISYAH/Nexora AI, Whiskay RPG, and approved Razzaq Ventures projects.

This release adds a self-hosted Docker Compose foundation. It deliberately avoids making a free managed database or a Vercel Hobby deployment the production source of truth.

## Important boundary

Rp0 means no new subscription or infrastructure purchase when the owner already has suitable always-on hardware, network, power, and separate backup storage. It does **not** mean free 24/7 uptime, SLA, redundant hardware, or disaster recovery. If no suitable host exists, this is a development/lab deployment until hardware becomes available.

## What exists in this release

- Next.js dashboard and API documentation.
- PostgreSQL project registry and API-key hashes.
- Admin-only project registration endpoint.
- One-time `nx_live_...` project API-key issuance.
- Project identity endpoint.
- Dockerfile and Docker Compose stack for self-hosting.
- Persistent PostgreSQL volume; no database host port published.
- Separate PostgreSQL owner and non-superuser runtime role.
- Local PostgreSQL backup script and host preflight script.
- Private network, confidentiality, and recovery guidance.

## Not yet production-complete

This is not yet a public cloud hosting service. It does not provision arbitrary containers, provide multi-node scheduling, object-storage service, per-project database lifecycle, API-key revocation/rotation endpoints, full audit logging, rate limiting, billing, public signup, or HA failover. Those features are deliberately deferred until the private host is validated.

## 1. Prepare the host

Recommended starting point: Debian 13 stable or supported Ubuntu LTS, 4 CPU cores, 8 GB RAM, and 100 GB free SSD for a small multi-project node. A 2-core/4-GB/40-GB machine may be used for a lab/control-plane-only trial.

Run the read-only inventory script:

```bash
bash scripts/host-preflight.sh
```

Install Docker Engine and the Compose plugin from the official Docker instructions for the host OS. Do not use the convenience installer as a production deployment shortcut.

## 2. Configure secrets

```bash
cp .env.example .env
openssl rand -hex 32
```

Generate distinct random values for `POSTGRES_PASSWORD`, `NEXORA_APP_DB_PASSWORD`, and `NEXORA_ADMIN_TOKEN`. Put each value into `.env`. Restrict the file:

```bash
chmod 600 .env
```

Never commit `.env` or copy secrets into frontend files.

## 3. Start privately

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

Open `http://127.0.0.1:3000` on the host. Check:

```bash
curl -fsS http://127.0.0.1:3000/api/v1/health
```

The dashboard/API is bound to localhost by default. PostgreSQL does not publish port 5432 to the host. Do not change this until the firewall/VPN plan is configured.

## 4. Create a project API key

```bash
export NEXORA_URL="http://127.0.0.1:3000"
export NEXORA_ADMIN_TOKEN="value-from-.env"
curl -X POST "$NEXORA_URL/api/v1/admin/projects" \
  -H "Content-Type: application/json" \
  -H "x-nexora-admin-token: $NEXORA_ADMIN_TOKEN" \
  -d '{"name":"Whiskay Bot","slug":"whiskay-bot","description":"Private WhatsApp bot runtime","environment":"production"}'
```

Copy the returned `apiKey` immediately. Only its hash is stored in PostgreSQL. Do not put the key in a client app or commit it to Git.

## 5. Connect another project on the same Docker host

Attach that project's Compose service to the `nexora_private` network and call the API using the Docker service name `http://app:3000/api/v1/me` with its own server-side key:

```js
const response = await fetch('http://app:3000/api/v1/me', {
  headers: { Authorization: `Bearer ${process.env.NEXORA_PROJECT_API_KEY}` },
});
if (!response.ok) throw new Error(`Nexora API failed: ${response.status}`);
const { project } = await response.json();
```

Other Compose stacks can join the pre-created `nexora_private` network using `external: true`. PostgreSQL is isolated on `nexora_db` and is not connected to project containers. Never make the database port public.

Do not run `docker compose down -v` on the live host: `-v` removes the persistent database volume.

## 6. Backup

Create a local database dump:

```bash
bash scripts/backup-postgres.sh
```

This script keeps a local 14-day rolling set. A same-host backup is not disaster recovery. Copy dumps to a separate existing physical device, encrypt that copy, and periodically perform a restore drill. See `docs/PRIVATE-ZERO-COST-ARCHITECTURE.md`.

Before a production release, generate and commit `package-lock.json` by running `npm install` on a networked development machine, then rebuild/test from the lockfile. This build package does not include a generated lockfile.

## 7. Vercel

Vercel Hobby is not the production home for Nexora Cloud. Its terms restrict the plan to personal or non-commercial use and reserve the right to disable deployments. See `VERCEL_DEPLOY.md`.

## 8. Architecture and safeguards

- `docs/PRIVATE-ZERO-COST-ARCHITECTURE.md` — target architecture, limits, networking, backup, hardware envelope, roadmap.
- `docs/CONFIDENTIALITY-AND-OPERATIONS.md` — private-project security rules.
- `db/schema.sql` — project registry schema.

## Version boundary

v0.2.0 is a private self-host deployment foundation and architecture revision. It has not been deployed to an owner-controlled host and has not passed a real hardware reboot/restore/network acceptance test. Do not store irreplaceable business data before those tests pass.
