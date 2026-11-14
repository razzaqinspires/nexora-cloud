# Nexora Cloud — Confidentiality & Operations Rules

1. Keep the repository private and the official deployment private until security acceptance is complete.
2. Never commit `.env`, API keys, passwords, WireGuard private keys, database dumps, WhatsApp sessions, host credentials, or customer data.
3. Generate independent secrets for PostgreSQL owner, runtime DB role, Nexora admin, and backup encryption.
4. Store only API-key hashes in PostgreSQL. Show newly issued project keys once; do not place them in frontend bundles.
5. Do not reuse database superuser credentials across projects. Per-project database identities are a required future milestone before broad workload onboarding.
6. Keep the admin endpoint on localhost/private network. An obscure URL is not authentication.
7. Do not add public signup, arbitrary shell execution, arbitrary container image deployment, or unrestricted Docker socket access.
8. The backup worker writes encrypted dumps and HMAC sidecars. Store the encryption key separately from off-host backup copies.
9. A local backup directory on the same physical disk is not disaster recovery. Copy to a second device and test restores.
10. Do not claim 24/7 uptime, redundancy, zero data loss, or disaster recovery until infrastructure exists and the corresponding test passes.
11. Record versions, sources, dependencies, licenses, config changes, backup checks, and restoration history.

## Release status

v0.3.0 includes idempotent project registration by slug, migration locking, PostgreSQL persistence, and encrypted/HMAC-verified local backups. It still lacks API-key rotation/revocation, rate limiting, full audit logging, project-level data-plane provisioning, off-host automatic replication, and production acceptance tests. Keep the system on localhost until those items are implemented and verified.
