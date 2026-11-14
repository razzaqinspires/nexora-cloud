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
      // Local Docker-network traffic is private. Remote database TLS must verify its certificate.
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false
    });
  }
  return global.nexoraPgPool;
}
