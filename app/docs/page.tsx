export default function Docs(){return <main className="docs shell"><nav><a className="brand" href="/"><span className="mark">N</span><span>NEXORA <b>CLOUD</b></span></a><span className="navtag">DEVELOPER DOCUMENTATION</span></nav><p className="eyebrow">API REFERENCE / V1</p><h1>Connect your projects.</h1><p className="intro">Setelah Nexora Cloud di-deploy, backend Whiskay, AISYAH, dan aplikasi lain dapat menggunakan API base URL yang sama.</p>
<section><h2>1. API base URL</h2><pre>https://YOUR-VERCEL-DOMAIN/api/v1</pre><p>Ganti dengan domain deployment Vercel milik Nexora Cloud.</p></section>
<section><h2>2. Create a project (admin only)</h2><p>Endpoint ini membuat identitas proyek dan satu API key. Jalankan dari terminal pribadi, bukan browser publik.</p><pre>{`curl -X POST "$NEXORA_URL/api/v1/admin/projects" \\
  -H "Content-Type: application/json" \\
  -H "x-nexora-admin-token: $NEXORA_ADMIN_TOKEN" \\
  -d '{"name":"Whiskay Bot","slug":"whiskay-bot","description":"WhatsApp automation","environment":"production"}'`}</pre><p>Respons berisi <code>apiKey</code>. Simpan segera di secret manager proyek. Key hanya ditampilkan sekali.</p></section>
<section><h2>3. Verify project credentials</h2><pre>{`curl "$NEXORA_URL/api/v1/me" \\
  -H "Authorization: Bearer $NEXORA_PROJECT_API_KEY"`}</pre><p>Respons berisi identitas proyek, environment, status, dan scopes.</p></section>
<section><h2>4. Node.js integration</h2><pre>{`const response = await fetch(
  process.env.NEXORA_CLOUD_URL + "/api/v1/me",
  { headers: {
      Authorization: "Bearer " + process.env.NEXORA_PROJECT_API_KEY
    }
  }
);
if (!response.ok) throw new Error("Nexora authentication failed");
const { project } = await response.json();
console.log("Connected project:", project.slug);`}</pre></section>
<section><h2>5. Environment variables in each project</h2><pre>{`NEXORA_CLOUD_URL=https://YOUR-VERCEL-DOMAIN
NEXORA_PROJECT_API_KEY=nx_live_REPLACE_WITH_ISSUED_KEY`}</pre><p>Set these in the backend's environment settings. Never prefix private keys with <code>NEXT_PUBLIC_</code>, never commit them to Git, and never put them in frontend JavaScript.</p></section>
<section><h2>6. Available endpoints</h2><div className="endpoint"><b>GET</b><code>/health</code><span>Database health check (no API key)</span></div><div className="endpoint"><b>POST</b><code>/admin/projects</code><span>Create project and issue its initial key (admin token)</span></div><div className="endpoint"><b>GET</b><code>/me</code><span>Validate project API key and return project identity</span></div></section>
<section><h2>7. Current scope and next modules</h2><p>Versi 0.1.0 adalah control-plane foundation: project registry, key issuance, hashed key storage, and identity verification. Belum menyediakan container provisioning, file upload, managed database per project, log streaming, billing, atau auto-scaling. Modul tersebut memerlukan compute host dan layanan storage/database yang dikonfigurasi terpisah.</p></section>
<a className="secondary" href="/">← Back to Nexora Cloud</a><footer>© 2026 RAZZAQ VENTURES <span>API VERSION 1</span></footer></main>}
