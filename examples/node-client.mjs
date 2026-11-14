const base = process.env.NEXORA_CLOUD_URL;
const key = process.env.NEXORA_PROJECT_API_KEY;
if (!base || !key) throw new Error('Set NEXORA_CLOUD_URL and NEXORA_PROJECT_API_KEY in this backend environment.');
const response = await fetch(new URL('/api/v1/me', base), {
  headers: { Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(8000),
});
const body = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`Nexora Cloud returned ${response.status}: ${JSON.stringify(body)}`);
console.log('Connected to Nexora Cloud project:', body.project.slug);
