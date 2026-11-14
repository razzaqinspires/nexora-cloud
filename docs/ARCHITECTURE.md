# Nexora Cloud Architecture — v0.1

## Deployment split

- **Vercel:** Next.js dashboard, documentation, HTTPS control-plane API.
- **PostgreSQL:** project registry and API-key hashes. Use a managed database for the first release.
- **Compute host (future phase):** Docker/Compose services for persistent Node.js bots, workers, and backend processes.
- **Object storage (future phase):** S3-compatible bucket (for example Cloudflare R2) for media and backups.

## Request flow

`Whiskay / AISYAH backend → HTTPS → Nexora Cloud API (Vercel) → PostgreSQL`

A later runtime control service will provision or update containers on the compute host. The Vercel control plane must never expose the Docker socket or unrestricted host SSH credentials to client requests.

## Security requirements before public multi-user hosting

1. Separate admin identity from project API keys; rotate admin secret if exposed.
2. Store only hashes of API keys; add revocation and rotation endpoints before production expansion.
3. Add rate limiting/WAF at the edge and audit logs for admin operations.
4. Restrict database network access where provider supports it; enforce TLS.
5. Do not allow user-supplied container images/commands until sandboxing, resource quotas, image scanning, and isolation are implemented.
6. Add backup schedules and restore tests; database backups alone do not protect object media.

## Scaling path

- **0.1:** project registry, key issue, identity check.
- **0.2:** key revoke/rotate, audit logs, rate limiting, usage metering.
- **0.3:** storage API with short-lived signed upload/download URLs.
- **0.4:** compute agent on a Docker host; deploy/restart/status endpoints with strict allowlists.
- **0.5:** per-project resource quotas, logs/metrics, backup/restore workflow.
- **1.0:** customer tenancy, billing, multi-node orchestration, documented SLOs.

Start with Docker Compose on one VPS for a trusted internal workload. Do not begin with Kubernetes; adopt K3s/Kubernetes only when multi-node scheduling, service discovery, or tenant scale justifies the operational cost.
