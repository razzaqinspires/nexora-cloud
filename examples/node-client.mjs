const base = process.env.NEXORA_CLOUD_URL;
const key = process.env.NEXORA_PROJECT_API_KEY;
if (!base || !key) throw new Error('Set NEXORA_CLOUD_URL and NEXORA_PROJECT_API_KEY');
const response = await fetch(`${base}/api/v1/me`, { headers: { Authorization: `Bearer ${key}` } });
const body = await response.json();
if (!response.ok) throw new Error(JSON.stringify(body));
console.log('Connected to Nexora Cloud project:', body.project.slug);
