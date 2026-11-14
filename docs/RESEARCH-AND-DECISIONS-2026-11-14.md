# Nexora Cloud — Research and Architecture Decisions

Research snapshot: 14 November 2026. Facts below are based on current official provider/project documentation where possible. Always re-check provider terms before production deployment because free-tier terms can change.

## Verified constraints

### Supabase
- Supabase's Free plan pauses projects after low database activity over a seven-day period.
- Paid plans are not automatically paused for inactivity.
- Decision: no Supabase Free project may be the sole production database for Nexora Cloud.
- Sources: https://supabase.com/docs/guides/platform/free-project-pausing and https://supabase.com/kb/faqs/platform/free-project-pausing

### Vercel
- Current Vercel Terms state Hobby use is limited to personal or non-commercial use.
- The terms also reserve the right to disable or remove Hobby deployments.
- Decision: do not make Vercel Hobby the production dependency for Razzaq Ventures' business infrastructure. Use only a preview/demo where the terms permit.
- Source: https://vercel.com/legal/terms

### Cloudflare Tunnel
- A standard published Tunnel requires a Cloudflare account, a domain on Cloudflare, and an internet-connected server/VM running `cloudflared`.
- Quick Tunnels do not require a domain or account, but are temporary development/testing endpoints. The URL stops when the process stops, and Cloudflare states there is no uptime guarantee.
- Decision: Quick Tunnel is not a production endpoint. A custom domain and stable tunnel are deferred until the owner has a domain and explicitly opts in.
- Sources: https://developers.cloudflare.com/tunnel/get-started/ and https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

### Docker Compose
- Docker documents Compose on a single server as a valid deployment pattern and recommends production-specific configuration and restart policies.
- Decision: start with one Docker Compose host; do not introduce Kubernetes until multiple-node scheduling or actual operational requirements justify its complexity.
- Source: https://docs.docker.com/compose/how-tos/production/

### Database backup
- PostgreSQL provides `pg_dump` in custom archive format and `pg_restore` for selective restoration. A database dump is portable but must be paired with tested restore procedures.
- Decision: create local custom-format dumps, copy them to a second independent device, encrypt the copy, and run restore drills. A same-host backup alone is not disaster recovery.
- Sources: https://www.postgresql.org/docs/current/app-pgdump.html and https://www.postgresql.org/docs/current/backup-dump.html

### Host operating system
- Debian 13 (Trixie) is the current stable Debian release; its published lifecycle extends through full support to August 2028 and LTS through June 2030.
- Decision: use Debian 13 stable if reinstalling an existing owner-controlled PC/server; use a supported Ubuntu LTS already available if that is more practical.
- Source: https://www.debian.org/releases/stable/index.en.html

### Framework baseline
- Next.js support policy identifies 16.x as Active LTS and 15.x as Maintenance LTS, with Next.js 15 security maintenance extended through 31 January 2027.
- The v0.2 package has been updated to Next.js 16.4.6 and React 19.3.1, but dependencies have not been installed or built in this export environment. Run install, lockfile generation, lint, build, and regression tests before deployment.
- Sources: https://nextjs.org/support-policy and https://www.npmjs.com/package/next

### Dynamic DNS and public HTTPS
- DuckDNS offers a free dynamic-DNS update API, but it only maps a hostname to the address it can observe; it cannot bypass ISP CGNAT or ensure connectivity.
- Caddy can automate public HTTPS when the hostname resolves to the server and external HTTP/HTTPS ports are reachable; private-only deployments can remain behind VPN instead.
- Decision: public publishing is deferred. First test ISP public IPv4/IPv6 reachability and router control. Do not assume a free hostname solves CGNAT.
- Sources: https://www.duckdns.org/spec.jsp and https://caddyserver.com/docs/quick-starts/https

## Architecture decision

**Chosen initial model:** private self-hosted single-node cloud on hardware already owned by the project owner.

Why:
- It has no managed Free-tier inactivity timer.
- PostgreSQL files remain on the owner's persistent disk volume.
- Internal project services can call Nexora over a private Docker network without a public hostname.
- It does not require a paid domain, VPS, managed DB, or paid relay for the local/host-only phase.

Trade-offs:
- Host power, storage, temperature, ISP, router, and operator maintenance become the owner's responsibility.
- No SLA, no redundant node, no automatic failover, and no off-site disaster recovery are included at Rp0 unless a second existing device is available.
- If the host is off or the internet is down, remote projects cannot reach it.
- A phone is an admin client, not a recommended 24/7 production host.

## Alternatives not selected for production

| Option | Reason not selected as production foundation |
|---|---|
| Supabase Free | Automatic pause for inactivity. |
| Vercel Hobby | Personal/non-commercial restriction and provider control over Hobby deployments. |
| Cloudflare Quick Tunnel | Temporary hostname; testing only; no uptime guarantee. |
| Free hosted database providers | Terms, sleep, quotas, and continuity are controlled by a third party. Do not make any such service the only production copy. |
| Free cloud VM offers | Eligibility, capacity, reclaim policy, regional availability, and terms may change; no free provider should be treated as guaranteed long-term hardware without checking its current contract. |

## Conditions before calling this a professional production cloud

1. A suitable owner-controlled host is inventoried and dedicated to service operation.
2. Automatic start/restart is tested after a real host reboot.
3. Database storage survives container rebuild/recreation.
4. A separate device holds encrypted backups.
5. A restore drill succeeds.
6. The firewall exposes no PostgreSQL port to the public internet.
7. Admin routes are reachable only by localhost or tested private VPN.
8. API keys have independent revocation/rotation, scope enforcement, and audit logs before wider project integration.
9. Framework lockfile, dependency security audit, lint, build, and integration tests pass.
10. Owner understands local-host uptime limitations and authorizes any future public network exposure.
