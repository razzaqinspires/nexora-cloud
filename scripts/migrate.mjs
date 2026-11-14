#!/usr/bin/env node
import { Pool } from 'pg';
import { createHash } from 'node:crypto';

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

    CREATE TABLE IF NOT EXISTS cloud_database_instances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
      source_key TEXT NOT NULL,
      database_name TEXT NOT NULL,
      engine TEXT NOT NULL DEFAULT 'postgresql',
      provider TEXT NOT NULL DEFAULT 'self-hosted',
      location TEXT NOT NULL DEFAULT 'local',
      status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online','offline','unknown')),
      size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
      open_connections INTEGER NOT NULL DEFAULT 0 CHECK (open_connections >= 0),
      total_connections BIGINT NOT NULL DEFAULT 0 CHECK (total_connections >= 0),
      last_seen_at TIMESTAMPTZ,
      collected_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, source_key)
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_database_instances_seen ON cloud_database_instances(last_seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cloud_database_instances_size ON cloud_database_instances(size_bytes DESC);

    CREATE TABLE IF NOT EXISTS cloud_storage_objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
      database_instance_id UUID REFERENCES cloud_database_instances(id) ON DELETE SET NULL,
      object_key TEXT NOT NULL,
      object_name TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
      storage_provider TEXT NOT NULL DEFAULT 'local',
      storage_location TEXT NOT NULL DEFAULT 'local',
      checksum_sha256 TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, object_key)
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_storage_objects_project ON cloud_storage_objects(project_id);

    CREATE TABLE IF NOT EXISTS cloud_metric_ingest_log (
      id BIGSERIAL PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
      source_agent TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      database_count INTEGER NOT NULL DEFAULT 0,
      payload_bytes INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_metric_ingest_log_received ON cloud_metric_ingest_log(received_at DESC);
  `);
  await client.query(
    `INSERT INTO nexora_schema_migrations(version, name) VALUES (2, 'multi_database_metrics_and_storage_registry') ON CONFLICT (version) DO NOTHING`
  );
  const metricsKey = process.env.NEXORA_METRICS_AGENT_API_KEY;
  if (metricsKey) {
    const systemProject = await client.query(`
      INSERT INTO cloud_projects(name,slug,description,environment,status)
      VALUES ('Nexora Metrics Agent','nexora-cloud-system','Internal telemetry agent identity','production','running')
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
      RETURNING id
    `);
    const metricsHash = createHash('sha256').update(metricsKey).digest('hex');
    await client.query(`
      INSERT INTO project_api_keys(project_id,key_prefix,key_hash,label,scopes)
      VALUES ($1,$2,$3,'internal-metrics-agent',ARRAY['project:read','metrics:write'])
      ON CONFLICT (key_hash) DO NOTHING
    `, [systemProject.rows[0].id, metricsKey.slice(0,16), metricsHash]);
  }

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
