import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  // Metrics are operational metadata. Keep disabled on public Vercel deployments unless explicitly enabled.
  if (process.env.NEXORA_METRICS_PUBLIC !== 'true') {
    return NextResponse.json({ error: 'metrics_endpoint_disabled', message: 'Enable only behind private network access or an access gateway.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'database_not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const [totals, files, top, ingest] = await Promise.all([
      db().query(`SELECT COUNT(*)::int AS total_databases,
        COUNT(*) FILTER (WHERE status='online' AND last_seen_at > NOW() - INTERVAL '3 minutes')::int AS open_databases,
        COALESCE(SUM(size_bytes),0)::text AS total_size_bytes,
        MAX(last_seen_at) AS last_updated
        FROM cloud_database_instances d`),
      db().query(`SELECT COUNT(*)::text AS total_files FROM cloud_storage_objects`),
      db().query(`SELECT d.database_name, d.engine, d.provider, d.location,
        CASE WHEN d.last_seen_at > NOW() - INTERVAL '3 minutes' THEN 'online' ELSE 'offline' END AS status,
        d.size_bytes::text, CASE WHEN d.last_seen_at > NOW() - INTERVAL '3 minutes' THEN d.open_connections ELSE 0 END AS open_connections, d.last_seen_at, p.name AS project_name
        FROM cloud_database_instances d JOIN cloud_projects p ON p.id=d.project_id
        ORDER BY d.size_bytes DESC, d.database_name ASC LIMIT 3`),
      db().query(`SELECT MAX(received_at) AS last_ingest, COUNT(*) FILTER (WHERE received_at > NOW() - INTERVAL '24 hours')::int AS sync_events_24h FROM cloud_metric_ingest_log`)
    ]);
    const t = totals.rows[0];
    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), totals: {
      databases: Number(t.total_databases), openDatabases: Number(t.open_databases),
      totalSizeBytes: Number(t.total_size_bytes), totalSizeMB: Number(t.total_size_bytes) / 1048576,
      files: Number(files.rows[0].total_files), lastUpdated: t.last_updated,
    }, topDatabases: top.rows.map((r: any) => ({ ...r, sizeBytes: Number(r.size_bytes), sizeMB: Number(r.size_bytes) / 1048576, size_bytes: undefined })),
    sync: { lastIngest: ingest.rows[0].last_ingest, eventsLast24Hours: Number(ingest.rows[0].sync_events_24h) },
    freshness: 'online means agent reported within the last 3 minutes',
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('[NEXORA METRICS] Summary failed', error);
    return NextResponse.json({ error: 'metrics_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
