#!/usr/bin/env node
import { Pool } from 'pg';

const connectionString = process.env.NEXORA_MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[NEXORA MIGRATE] No migration database URL. Set NEXORA_MIGRATION_DATABASE_URL.');
  process.exit(2);
}
const ssl = process.env.NEXORA_DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false;
const pool = new Pool({ connectionString, ssl, max: 1, connectionTimeoutMillis: 10000, application_name: 'nexora-migrator' });
const quoteIdent = value => `"${String(value).replaceAll('"', '""')}"`;
const quoteLiteral = value => `'${String(value).replaceAll("'", "''")}'`;
const client = await pool.connect();
try {
  await client.query('SELECT pg_advisory_lock($1)', [74120261114]);
  await client.query('BEGIN');
  const appUser = process.env.NEXORA_APP_DB_USER;
  const appPassword = process.env.NEXORA_APP_DB_PASSWORD;
  if (appUser && appPassword) {
    const role = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser]);
    if (role.rowCount === 0) {
      await client.query(`CREATE ROLE ${quoteIdent(appUser)} LOGIN PASSWORD ${quoteLiteral(appPassword)}`);
      console.log(`[NEXORA MIGRATE] Created missing runtime role ${appUser}.`);
    } else {
      console.log(`[NEXORA MIGRATE] Runtime role ${appUser} already exists; left unchanged.`);
    }
  }
  await client.query(`
    CREATE TABLE IF NOT EXISTS nexora_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cloud_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development','staging','production')),
      status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','provisioning','running','paused','failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS project_api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL DEFAULT 'default',
      scopes TEXT[] NOT NULL DEFAULT ARRAY['project:read'],
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_project_api_keys_project ON project_api_keys(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_api_keys_prefix ON project_api_keys(key_prefix);
  `);
  await client.query(
    `INSERT INTO nexora_schema_migrations(version, name) VALUES (1, 'initial_project_registry') ON CONFLICT (version) DO NOTHING`
  );
  if (appUser) {
    await client.query(`GRANT CONNECT ON DATABASE ${quoteIdent((await client.query('SELECT current_database() AS name')).rows[0].name)} TO ${quoteIdent(appUser)}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdent(appUser)}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdent(appUser)}`);
    await client.query(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdent(appUser)}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteIdent(appUser)}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quoteIdent(appUser)}`);
  }
  await client.query('COMMIT');
  console.log('[NEXORA MIGRATE] Schema is present and current. Existing tables and data were preserved.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.query('SELECT pg_advisory_unlock($1)', [74120261114]).catch(() => {});
  client.release();
  await pool.end();
}
