import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET() {
  try { await db().query('SELECT 1'); return NextResponse.json({ok:true,service:'nexora-cloud-control-plane',database:'connected',version:'0.2.0'}); }
  catch { return NextResponse.json({ok:false,service:'nexora-cloud-control-plane',database:'unavailable'}, {status:503}); }
}
