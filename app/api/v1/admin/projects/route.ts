import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdmin, sha256 } from '@/lib/auth';
export const runtime = 'nodejs';
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
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const p = await client.query(
      `INSERT INTO cloud_projects (name,slug,description,environment) VALUES ($1,$2,$3,$4)
       RETURNING id,slug,name,description,environment,status,created_at`,
      [parsed.data.name,parsed.data.slug,parsed.data.description,parsed.data.environment]
    );
    const apiKey = `nx_live_${randomBytes(32).toString('hex')}`;
    const prefix = apiKey.slice(0,16);
    await client.query(
      `INSERT INTO project_api_keys (project_id,key_prefix,key_hash,label,scopes) VALUES ($1,$2,$3,'initial',ARRAY['project:read'])`,
      [p.rows[0].id,prefix,sha256(apiKey)]
    );
    await client.query('COMMIT');
    return NextResponse.json({project:p.rows[0],apiKey,warning:'Copy this key now. It is shown only once.'},{status:201});
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const code = (error as {code?:string})?.code;
    if (code === '23505') return NextResponse.json({error:'slug_already_exists'},{status:409});
    return NextResponse.json({error:'project_creation_failed'},{status:500});
  } finally { client.release(); }
}
