# Vercel Transition Mode

Nexora can use Vercel temporarily for the dashboard and request/response API while the official server and domain are not yet available. This is a preview/control-plane presentation mode, not the private permanent database host.

## Vercel environment

Use Node.js 22.x (pinned by the project `engines` field). Set `DATABASE_URL` only when a persistent PostgreSQL endpoint has already been provisioned. The project can build in dashboard-only mode without it; stateful endpoints then return `503`.

Set `DATABASE_URL` only when a persistent PostgreSQL endpoint has already been provisioned. If migrations are required, also set:

- `NEXORA_MIGRATION_DATABASE_URL` — private database owner/migration connection string.
- `NEXORA_MIGRATE_ON_BUILD=true` — opt in to running the migration script during Vercel build.
- `NEXORA_DATABASE_SSL=true` — require verified TLS for a remote PostgreSQL provider.

The build detects `VERCEL` automatically. It does not create Docker containers or start PostgreSQL. If `DATABASE_URL` is absent, the website remains deployable as a dashboard preview while `/api/v1/health` returns `503` and explains that the database is not configured. It does not fake a successful health status.

## Domain handling

The API documentation derives its current public origin at request time. When a canonical domain is eventually owned and configured, set `NEXORA_PUBLIC_URL=https://cloud.example-owned-domain` in the deployment environment and redeploy. No source-code search/replace is required.

## Plan eligibility

Vercel's Hobby plan terms limit the plan to personal/non-commercial use. Since Nexora is intended for the Razzaq Ventures ecosystem, do not rely on Hobby for commercial production use. Verify current Vercel plan terms before selecting a production plan.

## Important architecture constraint

Vercel Functions are request-scoped and have configured maximum durations. They are not a Docker host, do not provide a persistent PostgreSQL data directory, and are not a permanent process supervisor for WhatsApp sockets or always-on workers. Those workloads belong on the future owner-controlled runtime host.
