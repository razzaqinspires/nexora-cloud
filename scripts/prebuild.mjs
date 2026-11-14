#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
const projectHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
console.log('[NEXORA PREBUILD] Validating build environment.');
if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error(`Node.js 22.x is required; current version is ${process.versions.node}.`);
if (isVercel) {
  console.log(`[NEXORA PREBUILD] Vercel deployment detected: ${projectHost ? `https://${projectHost}` : 'host will be resolved from the incoming request'}.`);
  if (process.env.NEXORA_PUBLIC_URL) {
    let canonical;
    try { canonical = new URL(process.env.NEXORA_PUBLIC_URL); } catch { throw new Error('NEXORA_PUBLIC_URL must be a valid absolute URL.'); }
    if (canonical.protocol !== 'https:' || canonical.username || canonical.password || canonical.search || canonical.hash || canonical.pathname !== '/') {
      throw new Error('NEXORA_PUBLIC_URL must be an HTTPS origin only (scheme + hostname + optional port), without credentials, path, query, or hash.');
    }
    console.log('[NEXORA PREBUILD] NEXORA_PUBLIC_URL override found; it will be used in generated API documentation.');
  }
  if (!process.env.DATABASE_URL) console.warn('[NEXORA PREBUILD] DATABASE_URL is absent: dashboard preview only; stateful API endpoints will return HTTP 503.');
  if (process.env.NEXORA_MIGRATE_ON_BUILD === 'true') {
    if (!process.env.DATABASE_URL) throw new Error('NEXORA_MIGRATE_ON_BUILD=true requires DATABASE_URL for application runtime too.');
    if (!process.env.NEXORA_MIGRATION_DATABASE_URL) throw new Error('NEXORA_MIGRATE_ON_BUILD=true but NEXORA_MIGRATION_DATABASE_URL is missing.');
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/migrate.mjs'], { stdio: 'inherit', env: process.env });
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Database migration failed with exit code ${code}`)));
    });
  } else {
    console.warn('[NEXORA PREBUILD] Database migration skipped. Set NEXORA_MIGRATE_ON_BUILD=true and NEXORA_MIGRATION_DATABASE_URL only when a persistent PostgreSQL service is configured.');
  }
} else {
  console.log('[NEXORA PREBUILD] Local build detected. No external resources will be provisioned during build.');
}
