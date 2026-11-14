const cleanOrigin = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch { return null; }
};

export function resolvePublicOrigin(requestUrl?: string, forwardedHost?: string, forwardedProto?: string): string {
  const configured = cleanOrigin(process.env.NEXORA_PUBLIC_URL);
  if (configured) return configured;

  // VERCEL_URL identifies the current deployment (including Preview), whereas
  // VERCEL_PROJECT_PRODUCTION_URL always points at the production deployment.
  // The explicit owner canonical URL above takes priority once the official domain exists.
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    const deployment = cleanOrigin(process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL);
    if (deployment) return deployment;
  }

  if (requestUrl) {
    try { return new URL(requestUrl).origin; } catch { /* fall through */ }
  }
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    const proto = (forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')).split(',')[0].trim();
    const origin = cleanOrigin(`${proto}://${host}`);
    if (origin) return origin;
  }
  return `http://localhost:${process.env.NEXORA_LOCAL_PORT || process.env.PORT || '3000'}`;
}
