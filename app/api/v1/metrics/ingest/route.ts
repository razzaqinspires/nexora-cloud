import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateProject } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  agent: z.string().trim().min(1).max(80).default('nexora-metrics-agent'),
  databases: z.array(z.object({
    sourceKey: z.string().trim().min(1).max(160),
    databaseName: z.string().trim().min(1).max(128),
    engine: z.enum(['postgresql','mysql','mariadb','mongodb','sqlite','redis','other']).default('postgresql'),
    provider: z.string().trim().min(1).max(80).default('self-hosted'),
    location: z.string().trim().min(1).max(120).default('unknown'),
    sizeBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    openConnections: z.number().int().nonnegative().max(1000000).default(0),
    totalConnections: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })).max(100),
});
export async function POST(request: Request) {
  const project = await authenticateProject(request);
  if (!project) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!project.scopes?.includes('metrics:write')) return NextResponse.json({ error: 'insufficient_scope', required: 'metrics:write' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    for (const item of parsed.data.databases) {
      await client.query(`
        INSERT INTO cloud_database_instances
          (project_id, source_key, database_name, engine, provider, location, status, size_bytes, open_connections, total_connections, last_seen_at, collected_at, metadata, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,'online',$7,$8,$9,NOW(),NOW(),$10::jsonb,NOW())
        ON CONFLICT (project_id, source_key) DO UPDATE SET
          database_name=EXCLUDED.database_name, engine=EXCLUDED.engine, provider=EXCLUDED.provider,
          location=EXCLUDED.location, status='online', size_bytes=EXCLUDED.size_bytes,
          open_connections=EXCLUDED.open_connections, total_connections=EXCLUDED.total_connections,
          last_seen_at=NOW(), collected_at=NOW(), metadata=EXCLUDED.metadata, updated_at=NOW()
      `, [project.id, item.sourceKey, item.databaseName, item.engine, item.provider, item.location, item.sizeBytes, item.openConnections, item.totalConnections, JSON.stringify(item.metadata)]);
    }
    await client.query(`UPDATE cloud_database_instances SET status='offline', open_connections=0 WHERE project_id=$1 AND last_seen_at < NOW() - INTERVAL '3 minutes'`, [project.id]);
    await client.query(`INSERT INTO cloud_metric_ingest_log(project_id,source_agent,database_count,payload_bytes) VALUES ($1,$2,$3,$4)`, [project.id, parsed.data.agent, parsed.data.databases.length, Buffer.byteLength(JSON.stringify(parsed.data))]);
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, accepted: parsed.data.databases.length, project: project.slug, receivedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[NEXORA METRICS] Ingest failed', error);
    return NextResponse.json({ error: 'metrics_ingest_failed' }, { status: 503 });
  } finally { client.release(); }
}
