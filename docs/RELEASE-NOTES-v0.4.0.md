# Nexora Cloud v0.4.0 — Multi-Database Telemetry

## Added
- Live dashboard metrics: total databases, online/open databases, aggregate MiB, registered file count, top three databases, and sync timestamps.
- Idempotent schema migration for database instance registry, storage object inventory, and telemetry ingest log.
- Internal system telemetry project and dedicated metrics API key provisioned by migration.
- PostgreSQL metrics agent, multi-source PostgreSQL URLs, provider/location metadata, HTTPS ingest, retry with exponential backoff, and first-sync health gate.
- File metadata registration endpoint and OpenAPI documentation for telemetry/storage endpoints.
- 30-second dashboard refresh; agent default collection interval 60 seconds.

## Compatibility and safety
- Existing database owner, runtime, admin, and backup secrets are not rotated. The new metrics-agent key is additive and may be generated during upgrade.
- Existing volumes and records are preserved. No destructive migration is introduced.
- Summary endpoint is disabled unless explicitly enabled; self-hosted Compose defaults it on while binding the app to loopback. Protect it with a private access gateway before exposing through a reverse proxy.
- File count represents registered metadata rows, not an unverified recursive scan of arbitrary filesystems/buckets.
- Native collection is PostgreSQL only. The ingest contract is engine-normalized for future adapters; other database engines are not auto-collected in this release.
- Agent sync transfers telemetry only, not database contents or files. Replication/CDC and object transfer remain separate capabilities.

## Validation
- Node syntax checks passed for bootstrap, migration, and metrics agent.
- Static bootstrap regression suite passed.
- Compose YAML parsed successfully.
- Real Docker/PostgreSQL migration, backup restore, Next.js build, and Vercel deployment remain unverified in this environment.
