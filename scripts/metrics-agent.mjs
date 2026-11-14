#!/usr/bin/env node
import { Pool } from 'pg';
import process from 'node:process';
import { writeFile } from 'node:fs/promises';
const api = (process.env.NEXORA_METRICS_API_URL || 'http://app:3000').replace(/\/$/, '');
const key = process.env.NEXORA_METRICS_AGENT_API_KEY;
const interval = Math.max(15, Number(process.env.NEXORA_METRICS_INTERVAL_SECONDS || 60));
const provider = process.env.NEXORA_METRICS_PROVIDER || 'self-hosted';
const location = process.env.NEXORA_METRICS_LOCATION || 'primary-node';
const sourceJson = process.env.NEXORA_METRIC_SOURCES_JSON;
if (!key) { console.error('[NEXORA AGENT] NEXORA_METRICS_AGENT_API_KEY is missing.'); process.exit(2); }
let sources;
try { sources = sourceJson ? JSON.parse(sourceJson) : [{ sourceKey: 'primary-postgres', databaseUrl: process.env.NEXORA_METRICS_DATABASE_URL || process.env.DATABASE_URL, provider, location }]; }
catch { console.error('[NEXORA AGENT] NEXORA_METRIC_SOURCES_JSON is invalid JSON.'); process.exit(2); }
if (!Array.isArray(sources) || !sources.length || sources.some(s => !s.databaseUrl || !s.sourceKey)) { console.error('[NEXORA AGENT] Each source requires sourceKey and databaseUrl.'); process.exit(2); }
const pools = sources.map(s => ({ source: s, pool: new Pool({ connectionString: s.databaseUrl, max: 2, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000, ssl: s.ssl === true ? { rejectUnauthorized: true } : undefined, application_name: 'nexora-metrics-agent' }) }));
let stopping = false;
for (const sig of ['SIGTERM','SIGINT']) process.on(sig, () => { stopping = true; });
const wait = ms => new Promise(r => setTimeout(r, ms));
async function collect(item) {
  const q = await item.pool.query(`SELECT d.datname AS database_name, pg_database_size(d.datname)::bigint AS size_bytes,
    COALESCE(s.numbackends,0)::int AS open_connections,
    COALESCE(s.xact_commit+s.xact_rollback,0)::bigint AS total_connections
    FROM pg_database d LEFT JOIN pg_stat_database s ON s.datname=d.datname
    WHERE d.datallowconn=true AND NOT d.datistemplate ORDER BY d.datname`);
  return q.rows.map(r => ({
    sourceKey: `${item.source.sourceKey}:${r.database_name}`,
    databaseName: r.database_name,
    engine: 'postgresql',
    provider: item.source.provider || provider,
    location: item.source.location || location,
    sizeBytes: Number(r.size_bytes),
    openConnections: Number(r.open_connections),
    totalConnections: Number(r.total_connections),
    metadata: { source: item.source.sourceKey, collector: 'nexora-postgresql-agent' },
  }));
}
async function cycle() {
  const databases = [];
  const errors = [];
  for (const item of pools) {
    try { databases.push(...await collect(item)); }
    catch (e) { errors.push(`${item.source.sourceKey}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (!databases.length) throw new Error(`No database metrics collected. ${errors.join('; ')}`);
  const response = await fetch(`${api}/api/v1/metrics/ingest`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ agent: 'nexora-metrics-agent', databases }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Metrics API returned ${response.status}: ${(await response.text()).slice(0,300)}`);
  const result = await response.json();
  await writeFile('/tmp/nexora-metrics-agent.last-success', new Date().toISOString(), { mode: 0o600 });
  console.log(`[NEXORA AGENT] Synced ${result.accepted} databases at ${result.receivedAt}${errors.length ? `; partial errors: ${errors.join('; ')}` : ''}`);
}
let backoff = 5000;
while (!stopping) {
  try { await cycle(); backoff = 5000; await wait(interval * 1000); }
  catch (e) { console.error(`[NEXORA AGENT] Sync failed: ${e instanceof Error ? e.message : String(e)}; retry in ${Math.round(backoff/1000)}s`); await wait(backoff); backoff = Math.min(backoff * 2, 300000); }
}
await Promise.all(pools.map(p => p.pool.end()));
