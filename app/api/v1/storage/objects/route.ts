import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateProject } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  objectKey: z.string().trim().min(1).max(1024),
  objectName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(160).default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  storageProvider: z.string().trim().min(1).max(80).default('local'),
  storageLocation: z.string().trim().min(1).max(160).default('local'),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  databaseInstanceId: z.string().uuid().optional(),
});
export async function POST(request: Request) {
  const project = await authenticateProject(request);
  if (!project) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!project.scopes?.includes('storage:write')) return NextResponse.json({ error: 'insufficient_scope', required: 'storage:write' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  try {
    const d = parsed.data;
    const result = await db().query(`INSERT INTO cloud_storage_objects(project_id,database_instance_id,object_key,object_name,content_type,size_bytes,storage_provider,storage_location,checksum_sha256)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT(project_id,object_key) DO UPDATE SET database_instance_id=EXCLUDED.database_instance_id,object_name=EXCLUDED.object_name,content_type=EXCLUDED.content_type,size_bytes=EXCLUDED.size_bytes,storage_provider=EXCLUDED.storage_provider,storage_location=EXCLUDED.storage_location,checksum_sha256=EXCLUDED.checksum_sha256,updated_at=NOW()
      RETURNING id,object_key,object_name,size_bytes,storage_provider,storage_location,updated_at`,
      [project.id,d.databaseInstanceId ?? null,d.objectKey,d.objectName,d.contentType,d.sizeBytes,d.storageProvider,d.storageLocation,d.checksumSha256 ?? null]);
    return NextResponse.json({ ok: true, object: result.rows[0] }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[NEXORA STORAGE] Object registration failed', error);
    return NextResponse.json({ error: 'storage_registry_unavailable' }, { status: 503 });
  }
}
