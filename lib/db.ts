import { Pool } from 'pg';

declare global { var nexoraPgPool: Pool | undefined; }

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if (!global.nexoraPgPool) {
    global.nexoraPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false }
    });
  }
  return global.nexoraPgPool;
}
