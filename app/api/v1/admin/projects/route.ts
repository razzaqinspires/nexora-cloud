import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdmin, sha256 } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(48),
  description: z.string().trim().max(300).optional().default(''),
  environment: z.enum(['development','staging','production']).optional().default('production')
});
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({error:'unauthorized'},{status:401});
  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'invalid_request',details:parsed.error.flatten()},{status:400});
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error:'database_not_configured',message:'A persistent PostgreSQL database must be configured before registering projects.'},{status:503});
  }
  let client: PoolClient | undefined;
  try {
    client = await db().connect();
    await client.query('BEGIN');
    const p = await client.query(
      `INSERT INTO cloud_projects (name,slug,description,environment)
       VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO NOTHING
       RETURNING id,slug,name,description,environment,status,created_at`,
      [parsed.data.name,parsed.data.slug,parsed.data.description,parsed.data.environment]
    );
    if (p.rowCount === 0) {
      const existing = await client.query(
        `SELECT id,slug,name,description,environment,status,created_at FROM cloud_projects WHERE slug = $1`,
        [parsed.data.slug]
      );
      await client.query('COMMIT');
      return NextResponse.json({project:existing.rows[0],existing:true,apiKey:null,message:'Project already exists. No API key was re-issued; use the key-rotation workflow when available.'},{status:200});
    }
    const apiKey = `nx_live_${randomBytes(32).toString('hex')}`;
    const prefix = apiKey.slice(0,16);
    await client.query(
      `INSERT INTO project_api_keys (project_id,key_prefix,key_hash,label,scopes) VALUES ($1,$2,$3,'initial',ARRAY['project:read'])`,
      [p.rows[0].id,prefix,sha256(apiKey)]
    );
    await client.query('COMMIT');
    return NextResponse.json({project:p.rows[0],apiKey,existing:false,warning:'Copy this key now. It is shown only once.'},{status:201});
  } catch (error: unknown) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('[NEXORA] Project registration failed:', error);
    return NextResponse.json({error:'database_unavailable',message:'The project registry database is unavailable. No project was registered.'},{status:503});
  } finally { client?.release(); }
}
