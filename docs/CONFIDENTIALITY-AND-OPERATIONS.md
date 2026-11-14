# Nexora Cloud — Confidentiality & Operations Rules

1. Private repository only; do not publish the repository or deployment logs containing sensitive configuration.
2. Never commit `.env`, API keys, passwords, WireGuard private keys, database dumps, WhatsApp sessions, or customer data.
3. Store only high-entropy API token hashes in PostgreSQL. Show a newly issued token once and require secure owner storage.
4. Use separate keys for Nexora administrator, Whiskay Bot, AISYAH/Nexora AI, RPG services, and each future project.
5. Do not reuse one database superuser credential across applications. Use per-project database roles and separate databases/schemas.
6. Admin surface is private-network-only. Do not rely on an obscure URL as authentication.
7. Do not add public signup, public project registration, arbitrary shell execution, or arbitrary container image deployment.
8. Backups are confidential production data. Encrypt them and keep a second copy off the host.
9. Do not claim 24/7 uptime, redundancy, or disaster recovery until tested and actually provisioned.
10. Record owner, version, source, dependencies, licenses, config changes, backup tests, and restoration history.

## Release review note

The control-plane API currently implements only bootstrap project registration and project identity verification. It does not yet include the complete key lifecycle, rate limiting, database-backed audit, user roles, or end-to-end test coverage. Keep it on localhost/private network until those controls are implemented and tested.
