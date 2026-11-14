# Nexora Cloud — Control Plane MVP

**Razzaq Ventures · v0.1.0**

Nexora Cloud is the central project identity and API control plane. This first release is intentionally a small, deployable foundation for Vercel. It is not yet a general-purpose VPS/container hosting platform.

## Included
- Next.js dashboard and API documentation.
- PostgreSQL project registry.
- Admin-only project creation.
- One-time API key issuance (`nx_live_...`); only SHA-256 hashes are stored.
- Project API-key verification and identity endpoint.
- Health endpoint.

## Not included yet
Container provisioning, persistent WhatsApp sockets, VM management, per-project databases, object-storage upload, queue workers, billing, autoscaling, or public customer self-service. These require a separate compute host and additional services.

## Deploy on Vercel
1. Create a PostgreSQL database (Neon, Supabase, Railway, or another PostgreSQL provider).
2. Run `db/schema.sql` against that database.
3. Push this folder to a GitHub repository and import it into Vercel. Framework: Next.js; Node.js 22.x.
4. Add `DATABASE_URL` and `NEXORA_ADMIN_TOKEN` in Vercel Project → Settings → Environment Variables. Generate the admin token with `openssl rand -hex 32`.
5. Redeploy after setting variables.
6. Open `/api/v1/health`; expect `{ "ok": true, "database": "connected" }`.
7. Open `/docs` for API usage.

Do not expose `NEXORA_ADMIN_TOKEN` or project API keys in client-side code. Keep all secrets server-side.

## API
Base URL: `https://YOUR-VERCEL-DOMAIN/api/v1`

- `GET /health` — DB health check.
- `POST /admin/projects` — admin token required; creates a project and returns its API key once.
- `GET /me` — project Bearer key required; returns project identity.

### Create a project
```bash
export NEXORA_URL="https://YOUR-VERCEL-DOMAIN"
export NEXORA_ADMIN_TOKEN="your-admin-secret"
curl -X POST "$NEXORA_URL/api/v1/admin/projects" \
  -H "Content-Type: application/json" \
  -H "x-nexora-admin-token: $NEXORA_ADMIN_TOKEN" \
  -d '{"name":"Whiskay Bot","slug":"whiskay-bot","description":"WhatsApp bot backend","environment":"production"}'
```
Copy `apiKey` from the response immediately. It cannot be retrieved again because only its hash is stored.

### Use from another Node.js backend
```js
const response = await fetch(`${process.env.NEXORA_CLOUD_URL}/api/v1/me`, {
  headers: { Authorization: `Bearer ${process.env.NEXORA_PROJECT_API_KEY}` }
});
if (!response.ok) throw new Error(`Nexora API failed: ${response.status}`);
const { project } = await response.json();
console.log(project.slug, project.status);
```

Set `NEXORA_CLOUD_URL` and `NEXORA_PROJECT_API_KEY` in the backend's server-side environment. Do not use `NEXT_PUBLIC_` prefixes.

## Architecture boundary
Vercel Functions are request/response functions with execution-duration and filesystem limits. They are appropriate for the dashboard and control-plane API, not as a persistent WhatsApp socket host. Run Whiskay and other persistent services on a separate Docker host; connect them to this API over HTTPS. See `docs/ARCHITECTURE.md`.
