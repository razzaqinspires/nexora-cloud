# Multi-database telemetry and storage inventory — v0.4.0

## Dashboard metrics

The dashboard shows (1) total registered database instances, (2) online/open databases, (3) aggregate database size in MiB, (4) registered file objects, and (5) the three largest databases by reported size. Online means an agent heartbeat was received within the previous three minutes. The browser refreshes the summary every 30 seconds.

File count means all registered records in `cloud_storage_objects`; it is not a recursive scan of arbitrary host filesystems or third-party buckets. Register storage objects through a future storage adapter/API before they appear in the count. This prevents double counting and avoids claiming visibility into buckets Nexora has not been granted access to.

## Automatic local agent

The `metrics-agent` Compose service starts with the core stack. It reads PostgreSQL catalog statistics from the primary cluster, reports every non-template database, and sends metrics to `/api/v1/metrics/ingest` using a dedicated project API key with `metrics:write` scope. It retries failures with exponential backoff (5 seconds up to 5 minutes). The agent reports metadata and measurements only; it does not copy database contents.

## Multiple places / providers

The collector is location/provider neutral: it can connect to any reachable PostgreSQL endpoint (self-hosted, VPS, on-premises, or managed cloud) when firewall, credentials, TLS and network routing permit it. Add sources with `NEXORA_METRIC_SOURCES_JSON`, an array of objects containing `sourceKey`, `databaseUrl`, optional `provider`, `location`, and `ssl:true`. Protect this environment variable as a secret because it contains connection credentials. For an agent at another site, set `NEXORA_METRICS_API_URL` to the Nexora deployment URL, provide the same dedicated agent key securely, and run `npm run metrics:agent` under a process supervisor or container at that site. This works across locations/providers when outbound HTTPS to the control plane and the database network path are available. Each source needs a unique stable `sourceKey`. For remote sources, use least-privilege monitoring users and verified TLS.

The ingest API accepts normalized telemetry for PostgreSQL, MySQL, MariaDB, MongoDB, SQLite, Redis and `other`, but v0.4.0 ships a native collector only for PostgreSQL. Other engines require a dedicated adapter that produces the same normalized payload. Do not claim they are auto-discovered until those adapters are installed and tested.

## Endpoints

- `POST /api/v1/metrics/ingest` — project API key with `metrics:write` scope.
- `GET /api/v1/metrics/summary` — aggregate dashboard data; disabled by default unless `NEXORA_METRICS_PUBLIC=true`.

The summary endpoint exposes infrastructure metadata. Enable it only behind a private LAN, VPN, reverse-proxy access policy, or equivalent authenticated gateway. Do not expose it on an unrestricted public hostname.

## Data transfer and stability boundary

Automatic transfer in this release means periodic transfer of telemetry/metadata from agents to the Nexora control plane. It does **not** replicate raw database rows, WAL, files, or object contents between providers. Continuous database replication and cross-provider file synchronization require separately configured replication/storage adapters, conflict rules, encryption, and restore tests. A metrics heartbeat is not a backup.

## Database size and units

PostgreSQL database size is reported by `pg_database_size` in bytes and displayed as MiB (bytes / 1,048,576). The top three are ranked by latest reported database size. A stale agent becomes offline after three minutes; historical records remain in the registry rather than being silently deleted.
