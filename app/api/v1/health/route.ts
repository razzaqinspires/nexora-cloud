import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: false,
      service: 'nexora-cloud-control-plane',
      database: 'not_configured',
      schema: 'not_checked',
      mode: process.env.VERCEL ? 'vercel-dashboard-only' : 'unconfigured',
      version: '0.3.0',
      action: 'Configure DATABASE_URL for a persistent PostgreSQL service. Vercel does not provide a persistent local database volume.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const result = await db().query(`
      SELECT
        to_regclass('public.cloud_projects') IS NOT NULL AS projects_table,
        to_regclass('public.project_api_keys') IS NOT NULL AS api_keys_table,
        to_regclass('public.nexora_schema_migrations') IS NOT NULL AS migrations_table
    `);
    const row = result.rows[0];
    const schemaReady = Boolean(row.projects_table && row.api_keys_table && row.migrations_table);
    return NextResponse.json({
      ok: schemaReady,
      service: 'nexora-cloud-control-plane',
      database: 'connected',
      schema: schemaReady ? 'ready' : 'migration_required',
      mode: process.env.NEXORA_RUNTIME_MODE || (process.env.VERCEL ? 'vercel-serverless' : 'unknown'),
      version: '0.3.0',
    }, { status: schemaReady ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      service: 'nexora-cloud-control-plane',
      database: 'unavailable',
      schema: 'not_checked',
      version: '0.3.0',
      error: process.env.NODE_ENV === 'production' ? 'database_connection_failed' : (error instanceof Error ? error.message : 'database_connection_failed'),
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
