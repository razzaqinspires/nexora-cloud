import { headers } from 'next/headers';
import { resolvePublicOrigin } from '@/lib/public-origin';

export const dynamic = 'force-dynamic';

export default async function Docs() {
  const incoming = await headers();
  const origin = resolvePublicOrigin(undefined, incoming.get('x-forwarded-host') || incoming.get('host') || undefined, incoming.get('x-forwarded-proto') || undefined);
  const api = `${origin}/api/v1`;
  return <main className="docs shell">
    <nav><a className="brand" href="/"><span className="mark">N</span><span>NEXORA <b>CLOUD</b></span></a><span className="navtag">DEVELOPER DOCUMENTATION</span></nav>
    <p className="eyebrow">API REFERENCE / V1</p><h1>Connect your projects.</h1>
    <p className="intro">Dokumentasi membaca origin deployment saat runtime. Preview menggunakan hostname deployment yang sedang aktif; domain resmi akan menjadi URL kanonis setelah NEXORA_PUBLIC_URL dikonfigurasi. Tidak ada domain yang ditanam permanen di source code.</p>
    <section><h2>Live deployment URLs</h2><pre>Origin: {origin}{'\n'}API base: {api}{'\n'}OpenAPI: {api}/openapi.json{'\n'}Health: {api}/health{'\n'}Metadata: {api}/meta</pre><p>URL relatif digunakan untuk permintaan browser. Backend proyek lain harus memakai API base URL dari environment server mereka.</p></section>
    <section><h2>1. Check deployment metadata</h2><pre>{`curl "${api}/meta"`}</pre><p>Endpoint meta menampilkan base URL deployment, dokumentasi, OpenAPI spec, versi, dan mode runtime tanpa membocorkan rahasia.</p></section>
    <section><h2>2. Create a project (admin only)</h2><pre>{`curl -X POST "${api}/admin/projects" \\
  -H "Content-Type: application/json" \\
  -H "x-nexora-admin-token: $NEXORA_ADMIN_TOKEN" \\
  -d '{"name":"Whiskay Bot","slug":"whiskay-bot","description":"WhatsApp automation","environment":"production"}'`}</pre><p>Slug dipakai sebagai idempotency key. Jika proyek sudah terdaftar, API mengembalikan proyek yang ada tanpa menerbitkan API key kedua.</p></section>
    <section><h2>3. Verify project credentials</h2><pre>{`curl "${api}/me" \\
  -H "Authorization: Bearer $NEXORA_PROJECT_API_KEY"`}</pre></section>
    <section><h2>4. Node.js integration</h2><pre>{`const base = process.env.NEXORA_CLOUD_URL;\nconst key = process.env.NEXORA_PROJECT_API_KEY;\nif (!base || !key) throw new Error("Nexora credentials are missing");\nconst response = await fetch(new URL("/api/v1/me", base), {\n  headers: { Authorization: \`Bearer \${key}\` },\n  signal: AbortSignal.timeout(8000),\n});\nif (!response.ok) throw new Error(\`Nexora API failed: \${response.status}\`);\nconst { project } = await response.json();\nconsole.log(project.slug);`}</pre><p>Simpan key hanya di backend, secret manager, atau environment server. Jangan gunakan NEXT_PUBLIC_ untuk API key privat.</p></section>
    <section><h2>5. Vercel deployment mode</h2><p>Vercel menjalankan Next.js sebagai managed Functions. Vercel tidak menjalankan Docker daemon, tidak menyediakan persistent local filesystem untuk database, dan tidak menjalankan npm start sebagai daemon server. Configure DATABASE_URL ke PostgreSQL yang sudah tersedia. Jika NEXORA_MIGRATION_DATABASE_URL disediakan, prebuild script dapat menjalankan migration idempotent sebelum build. Jika belum ada database, UI bisa dipratinjau tetapi endpoint stateful akan mengembalikan HTTP 503.</p></section>
    <section><h2>6. Self-hosted one-command mode</h2><p>Di host Linux yang memiliki Docker Engine dan Compose plugin, jalankan <code>npm start</code>. Bootstrap memeriksa volume database terlebih dahulu, membuat .env dan secret hanya untuk instalasi database baru, memvalidasi host, menjalankan database, migration, app, backup worker, lalu menunggu health endpoint. Jika volume lama ada tetapi .env/secret hilang, bootstrap berhenti demi mencegah penggantian kredensial yang akan mengunci data lama.</p></section>
    <section><h2>7. OpenAPI and machine-readable documentation</h2><p>OpenAPI JSON: <a href={`${api}/openapi.json`}>{api}/openapi.json</a>. The specification is generated from the active deployment origin.</p></section>
    <section><h2>8. Data durability boundary</h2><p>Persistent PostgreSQL volume plus encrypted daily local backup protects against some application and container failures. It does not protect against loss of the whole host, theft, disk failure, or loss of the encryption key. A second physical device or independent storage target is required for off-host disaster recovery.</p></section>
    <a className="secondary" href="/">← Back to Nexora Cloud</a><footer>© 2026 RAZZAQ VENTURES <span>NEXORA CLOUD · API V1 · PRIVATE</span></footer>
  </main>;
}
