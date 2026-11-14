import { NextResponse } from 'next/server';
import { resolvePublicOrigin } from '@/lib/public-origin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request.url);
  return NextResponse.json({
    service: 'nexora-cloud-control-plane',
    version: '0.4.0',
    mode: process.env.NEXORA_RUNTIME_MODE || (process.env.VERCEL ? 'vercel-serverless' : 'unknown'),
    origin,
    apiBaseUrl: `${origin}/api/v1`,
    docsUrl: `${origin}/docs`,
    openApiUrl: `${origin}/api/v1/openapi.json`,
    canonicalDomainConfigured: Boolean(process.env.NEXORA_PUBLIC_URL),
    deploymentHostnameConfigured: Boolean(process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
