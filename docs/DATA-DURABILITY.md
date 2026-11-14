# Nexora Database Durability Model

There is no literal "eternal" database. Durability is achieved through independent failure domains, verified backups, tested restores, hardware maintenance, and owner-controlled credentials.

## v0.3.0 protections

- PostgreSQL 17 runs in Docker and writes to the named `nexora_pgdata` volume.
- Container restart policy is `unless-stopped`.
- Database port 5432 is not published to the host or public internet.
- Migrations use a PostgreSQL advisory lock and `CREATE ... IF NOT EXISTS` semantics.
- A dedicated backup worker creates an encrypted custom-format `pg_dump` immediately at startup and every 24 hours by default.
- The worker authenticates encrypted artifacts with a domain-separated HMAC-SHA256 key, decrypts to a temporary file, and runs `pg_restore --list`.
- Local encrypted backups are retained for 30 days by default.

## What this protects against

- App container recreation: database is outside the app container.
- Normal process/container restarts: named volume and restart policy preserve state.
- Many logical/application failures: recent verified SQL dumps may be restored.
- Accidental duplicate bootstrap: migrations and project registration are idempotent.

## What this does not protect against

- Loss/theft/fire/failure of the entire host or its disk.
- Loss of the Docker volume and same-host backup directory together.
- Loss of `NEXORA_BACKUP_ENCRYPTION_KEY`.
- Long-term power/network outages.
- Silent corruption that is never detected by monitoring or restore tests.
- High availability / automatic failover.

## Credential recovery rule

The owner `.env` file contains the database owner/runtime passwords, admin token, and backup encryption key. Keep a separate offline recovery copy under the owner's control. Bootstrap checks for an existing `nexora_pgdata` volume before generating secrets. If that volume exists but `.env` or a critical secret is missing, startup stops rather than generating replacement credentials that cannot unlock the existing database or old backups. The bootstrap never resets an existing PostgreSQL role password automatically.

## Required owner operation before storing irreplaceable data

1. Copy the encrypted `.dump.enc` files and the backup encryption key separately to a second physical device or independent storage target.
2. Keep at least one offline copy. Never store the only encryption key beside the only encrypted backup.
3. Test restore to a new, empty database. Never test by overwriting the production database.
4. Verify record counts and application-level data after restore.
5. Record Recovery Point Objective and Recovery Time Objective only after the restore drill has been timed.

The local backup worker is a first layer, not a full disaster-recovery system. With a strict Rp0 limit, an existing second device and manual encrypted copy are the minimum viable off-host backup. Automatic off-host replication requires a reachable second host or external storage and is not included until an actual target is configured.
