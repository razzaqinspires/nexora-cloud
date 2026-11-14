# Vercel deployment checklist

- [ ] Create managed PostgreSQL database.
- [ ] Execute `db/schema.sql`.
- [ ] Push project to GitHub.
- [ ] Import repository in Vercel as a Next.js project.
- [ ] Select Node.js 22.x.
- [ ] Add `DATABASE_URL` and `NEXORA_ADMIN_TOKEN` to Production (and Preview only if needed).
- [ ] Deploy.
- [ ] Verify `/api/v1/health`.
- [ ] Verify `/docs`.
- [ ] Create first project using admin curl command.
- [ ] Store issued API key in that project's server-side environment.

Vercel environment variable changes apply to new deployments; redeploy after changing them.
