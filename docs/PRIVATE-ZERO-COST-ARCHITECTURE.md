# NEXORA CLOUD — Private Zero-Cash Architecture

**Release:** 0.2.0  
**Owner:** Razzaq Ventures  
**Classification:** Private / Internal / Proprietary  
**Status:** Architecture and self-host deployment foundation; not production-certified.

## 1. Non-negotiable objective

Nexora Cloud must not depend on a third-party free database that can pause, suspend, reclaim, or delete the production data plane because of inactivity. The first deployment is a private single-host system operated on hardware already owned by the project owner. The application framework baseline has been moved to the current Next.js 16.4.6 Active LTS release and React 19.3.1 after checking the upstream support/release information on 14 November 2026; run a dependency install and full regression suite before treating this build as production-ready.

The word **Rp0** means zero new subscription or infrastructure purchase only when suitable hardware, storage, power, and internet already exist. It does not mean zero operating cost, guaranteed public uptime, redundant infrastructure, or provider-grade disaster recovery.

## 2. Project identity and confidentiality

Nexora Cloud is an internal infrastructure project of Razzaq Ventures. It is not a public SaaS, not a public developer marketplace, and not a product under XARVIONEX or COBAMULAI. XARVIONEX is a prior project/example whose Supabase pause is the failure mode this design must avoid.

Controls:
- Keep the Git repository private.
- Do not publish source, architecture secrets, host addresses, credentials, backups, or operational runbooks publicly.
- Keep `.env`, private keys, database dumps, and application sessions outside Git.
- Disable public registration. Project identities are created by the owner only.
- Keep the admin console reachable only from localhost/LAN or a private VPN.
- Give each workload its own API key and least-privilege scope. Keys must be revocable and rotatable before production use.
- Do not claim the system is unobservable to its infrastructure operator. Any third-party host, DNS, relay, or repository provider may process traffic or metadata.

## 3. Target architecture — phase zero/one

```text
Owner devices (admin laptop / phone)
          |
     LAN or WireGuard VPN
          |
     Private host firewall
          |
     Docker Compose host
       |          |
       |          +-- Nexora Cloud (Next.js control-plane MVP)
       |                    |
       |                    +-- PostgreSQL 17 (private Docker network)
       |
       +-- Future project containers:
            Whiskay Bot / Nexora AI backend / RPG API / web services

Backup job --> local encrypted backup workflow --> second offline device
```

- Host OS: Debian 13 stable (or a supported Ubuntu LTS already installed).
- Runtime: Docker Engine + Docker Compose plugin.
- First orchestration: Docker Compose on one host; no Kubernetes.
- Database: self-hosted PostgreSQL 17 in a persistent Docker volume, not Supabase/Neon/Railway Free. The PostgreSQL owner role is reserved for bootstrap/backup; the app connects using a separate non-superuser role.
- Application: Nexora Cloud Next.js app in a container.
- Inter-service access: private Docker bridge network `nexora_private`; project services call `http://app:3000/api/v1` when attached to the same network. PostgreSQL sits on a separate internal-only `nexora_db` network shared only with the Nexora app.
- Admin access: localhost initially. Enable LAN/VPN access only after firewall rules are installed and tested.
- Public DNS: not required for private-only phase.

## 4. Why this avoids the Supabase pause incident

PostgreSQL runs as a container and stores data in the persistent volume `nexora_pgdata`. It does not have a managed free-tier inactivity timer. Docker restart policy `unless-stopped` brings the service back after a supported host restart. This does not protect against host failure, disk failure, power loss, ISP outage, operator error, or resource exhaustion.

A self-hosted service cannot be automatically paused by Supabase, but it can still go offline if the owner device is shut down, sleeps, loses power, or loses network connectivity.

## 5. Network and access

### Stage A: local-only
- Compose publishes the dashboard/API on `127.0.0.1:3000` only.
- PostgreSQL has no host-published port.
- Project containers connect over `nexora_private`; PostgreSQL is isolated on `nexora_db` and is not attached to the project network.
- Use local browser access or SSH port forwarding for remote administration.

### Stage B: private remote access
- Configure self-managed WireGuard on the host/router if an inbound public IP and UDP port are available.
- Restrict Nexora host ports to the VPN interface/subnet with the host firewall.
- Do not expose PostgreSQL to the public internet.
- If the ISP uses CGNAT and inbound VPN is unavailable, keep administration local until a legitimate relay or other connection is available. Do not silently fall back to public unauthenticated tunnels.

### Public publishing is deferred
- Cloudflare production Tunnel requires a domain managed by Cloudflare and a server/VM running `cloudflared`.
- Cloudflare Quick Tunnel provides a temporary URL for development/testing only; it has no uptime guarantee and the address changes.
- A free dynamic DNS subdomain can help only if the home connection has a reachable public IP and the owner can safely forward ports. It does not solve CGNAT or provide an SLA.
- Public access is a later explicit decision, not enabled by default.

## 6. Data and backup

- `nexora_pgdata` is the live database volume.
- `scripts/backup-postgres.sh` creates a PostgreSQL custom-format dump.
- Schedule the dump daily with cron/systemd timer after validating the host.
- Copy backups to a second, separate, preferably offline device. A second directory or partition on the same disk is not a safe disaster-recovery copy.
- Encrypt off-host backups (for example using age or restic) and store recovery material separately.
- Run a restore drill to a fresh database at least monthly before trusting the backup process.
- The current script retains a local 14-day rolling set; it does not provide off-site backup or encryption automatically.

## 7. Hardware envelope

These are planning estimates, not verified requirements for every workload:
- Lab / control-plane only: 2 CPU cores, 4 GB RAM, 40 GB free SSD as a practical minimum.
- Small multi-project node: 4 CPU cores, 8 GB RAM, 100 GB free SSD recommended before adding media processing or local AI inference.
- Whiskay, AI inference, image/video processing, and multiple databases can need substantially more CPU/RAM/storage.
- A phone can be used to administer the system, but should not be treated as the production host for persistent WhatsApp sockets or databases.

## 8. Zero-cash limits

No purchased server, domain, VPS, managed database, external storage, paid monitoring, paid VPN relay, or paid backup target is assumed. This gives no uptime SLA, no multi-region failover, no guaranteed remote access, and no independent disaster recovery unless a second existing device is available.

If no suitable always-on hardware exists, it is not technically honest to call the project a dependable 24/7 cloud at Rp0. The correct output then is a private development/lab environment, not production hosting.

## 9. Existing v0.1 API security gaps

The first control-plane MVP is a project registry and identity-check API, not a full cloud platform. Before production:
- Add API key revocation/rotation and key labels.
- Add database-backed audit events for administrative actions.
- Add rate limiting and abuse protection.
- Use least-privilege database roles and schema migrations.
- Restrict admin endpoints to private networks; the single admin token is bootstrap-only.
- Remove any database TLS configuration that disables certificate verification. Private local Docker-network connections may use no TLS; remote database connections must use verified TLS.
- Add tested backup/restore and schema migration procedures.
- Add project-level authorization checks to every future API route.

## 10. Vercel policy boundary

Vercel Hobby terms restrict use to personal or non-commercial use and permit Vercel to disable Hobby projects. Because Nexora Cloud belongs to a business ecosystem, do not make Vercel Hobby the production control-plane dependency. It may be used for a clearly non-commercial preview/demo if the terms permit that use. The self-hosted instance is the authority for internal operations.

## 11. Phase roadmap

1. Host inventory: inspect existing hardware, OS, RAM, CPU, disk, power, LAN, public IP/CGNAT.
2. Private base: Debian 13 or supported OS, updates, firewall, Docker, Compose.
3. Local Nexora: PostgreSQL volume + app container + admin-only localhost access.
4. Durability: restart policy, health checks, daily dump, second-device backup, restore drill.
5. Private access: WireGuard only if reachable and firewall can be safely configured.
6. Project integration: attach Whiskay and approved services to the Docker private network; give each its own API key.
7. Future public endpoint: evaluate domain, tunnel or ISP networking and cost only after the owner opts in.

## 12. Acceptance gates before production

- Reboot host: app and database return automatically.
- Stop/recreate app container: database volume remains intact.
- Restart PostgreSQL container: project registry survives.
- Run and restore a dump on a clean database.
- Confirm port 5432 is not publicly listening.
- Confirm admin endpoints are not reachable from the public WAN.
- Confirm every project key is independently revocable (once revocation API is implemented).
- Confirm logs do not print credentials or bearer tokens.
- Confirm backups exist on a second physical device before real business data is stored.
