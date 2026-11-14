# Nexora Cloud Architecture — v0.2.0

This document is the concise entry point. The full, normative design is in `PRIVATE-ZERO-COST-ARCHITECTURE.md`.

## Deployment model

- **Owner-controlled host:** runs the Nexora dashboard/API, PostgreSQL and future project containers.
- **Docker Compose:** single-host runtime for the initial private deployment.
- **PostgreSQL 17:** persistent named Docker volume; no managed Free-tier database is required.
- **Private network:** `nexora_private`; internal app-to-app requests use Docker service DNS.
- **Admin interface:** bound to `127.0.0.1:3000` by default. LAN/VPN access is a deliberate later configuration after firewall tests.
- **Vercel:** preview/demo only, not the production source of truth for a business infrastructure platform.

## Request flow

Same-host project service:

`Whiskay / AISYAH / RPG container → http://app:3000/api/v1 → Nexora app → PostgreSQL private network`

The Docker database service does not publish port 5432 to the host. The Compose network is not a replacement for per-project authorization; each service must use its own key and only its granted scopes.

## Data durability

- `nexora_pgdata` stores active database files.
- `scripts/backup-postgres.sh` creates custom-format PostgreSQL dumps.
- Backups must be copied to a second, separate device and encrypted.
- `scripts/restore-postgres.sh` requires an explicit `RESTORE_CONFIRM=YES` before overwriting objects.
- A monthly restore drill is required before storing irreplaceable data.

## Security boundaries

The current application is a project registry/API identity prototype. It is not yet approved for public exposure. Before production add key revocation/rotation, database-backed audit logs, rate limiting, per-project DB roles, validated TLS for remote DB connections, and full authorization tests. Never expose Docker socket, host SSH credentials, shell commands, or unrestricted image deployment through an API.

## Roadmap

1. Host inventory and secure OS preparation.
2. Private Compose deployment and persistent PostgreSQL.
3. Off-host backup + restore test.
4. WireGuard remote administration, if reachable via public IP or supported topology.
5. Project API keys and narrowly scoped internal integrations.
6. Storage service, compute agent, resource limits, logs and metrics.
7. Public endpoint only after domain/network/abuse controls and owner approval.
