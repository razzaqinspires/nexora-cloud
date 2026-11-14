# Vercel Transition Mode — Nexora Cloud v0.3.0

Use Vercel only for a dashboard/API preview while Nexora's official server and domain are not ready. It is not the persistent database or Docker runtime.

## Deployment

1. Push the Nexora Cloud repository to a private Git repository.
2. Import it into Vercel as a Next.js project.
3. In Vercel Project Settings, select Node.js 22.x. Use the normal install/build detection (`npm install` / `npm run build`). `prebuild` runs the Vercel environment check automatically.
4. Add `DATABASE_URL` only after a persistent PostgreSQL database exists.
5. To apply migrations at build time, configure `NEXORA_MIGRATE_ON_BUILD=true` and `NEXORA_MIGRATION_DATABASE_URL` with a private migration-owner connection. Optionally set `NEXORA_APP_DB_USER` / `NEXORA_APP_DB_PASSWORD` for the runtime role grant.
6. Set `NEXORA_DATABASE_SSL=true` when the database requires verified TLS.
7. Add `NEXORA_PUBLIC_URL` after the canonical official domain is owned and assigned. Until then, the docs derive the current deployment hostname (`VERCEL_URL`) automatically.

Without `DATABASE_URL`, the dashboard can render but stateful API endpoints return HTTP 503. Do not claim the database is ready.

Vercel Functions have configured execution-duration limits and are not long-lived process supervisors. Docker, persistent Postgres data volumes, WhatsApp sockets, and always-on workers must run on a separate owner-controlled compute host. See [Vercel Functions limitations](https://vercel.com/docs/functions/limitations) and [maximum duration](https://vercel.com/docs/functions/configuring-functions/duration).

Vercel Hobby is restricted to personal/non-commercial use by the current terms. Do not use it as Nexora's commercial production dependency. See [Vercel Terms of Service](https://vercel.com/legal/terms).
