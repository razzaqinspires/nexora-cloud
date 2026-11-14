import { Pool } from 'pg';

declare global { var nexoraPgPool: Pool | undefined; }

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured. Configure a persistent PostgreSQL database before enabling stateful API routes.');
  if (!global.nexoraPgPool) {
    const max = Number.parseInt(process.env.PG_POOL_MAX || (process.env.VERCEL ? '2' : '10'), 10);
    global.nexoraPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number.isFinite(max) ? Math.min(Math.max(max, 1), 20) : 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      // TLS is verified when enabled. Never set rejectUnauthorized=false.
      ssl: process.env.NEXORA_DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
      application_name: 'nexora-cloud-api',
    });
  }
  return global.nexoraPgPool;
}
