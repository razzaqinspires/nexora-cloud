import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';

export function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function isAdmin(request: Request) {
  const configured = process.env.NEXORA_ADMIN_TOKEN;
  const supplied = request.headers.get('x-nexora-admin-token') ?? '';
  return Boolean(configured && supplied && safeEqual(configured, supplied));
}

export async function authenticateProject(request: Request) {
  const raw = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!raw || !raw.startsWith('nx_live_')) return null;
  const hash = sha256(raw);
  const result = await db().query(
    `SELECT p.id, p.slug, p.name, p.description, p.environment, p.status, k.id AS key_id, k.scopes
     FROM project_api_keys k JOIN cloud_projects p ON p.id = k.project_id
     WHERE k.key_hash = $1 AND k.revoked_at IS NULL LIMIT 1`, [hash]
  );
  if (!result.rowCount) return null;
  await db().query('UPDATE project_api_keys SET last_used_at = NOW() WHERE id = $1', [result.rows[0].key_id]);
  return result.rows[0] as {id:string;slug:string;name:string;description:string;environment:string;status:string;key_id:string;scopes:string[]};
}
