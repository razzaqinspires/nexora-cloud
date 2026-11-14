const services = [
  ['Idempotent Bootstrap','Membuat konfigurasi yang belum ada, menjaga konfigurasi yang sudah valid, dan memeriksa prasyarat.'],
  ['Project Registry','Identitas proyek, environment, status, dan registrasi idempotent berdasarkan slug.'],
  ['API Identity','API key terpisah untuk tiap proyek; hanya hash yang disimpan.'],
  ['PostgreSQL Persistence','Database lokal Docker dengan named volume dan migrasi terkunci.'],
  ['Encrypted Backup Worker','Backup otomatis harian, enkripsi, verifikasi arsip, dan retensi lokal.'],
  ['Runtime-aware Documentation','API docs dan OpenAPI mengikuti domain deployment aktif.'],
];
export default function Home() { return <main className="shell">
  <nav><div className="brand"><span className="mark">N</span><span>NEXORA <b>CLOUD</b></span></div><span className="navtag">RAZZAQ VENTURES / PRIVATE INFRASTRUCTURE</span></nav>
  <section className="hero"><p className="eyebrow">CENTRAL PRIVATE CLOUD CONTROL PLANE</p><h1>One infrastructure.<br/><em>Every project connected.</em></h1><p className="intro">Fondasi privat untuk identitas proyek, database persisten, API terpusat, dan operasi cloud internal Razzaq Ventures.</p><div className="actions"><a className="primary" href="/docs">Baca API Documentation <span>↗</span></a><a className="secondary" href="/api/v1/health">System health</a><a className="secondary" href="/api/v1/openapi.json">OpenAPI</a></div></section>
  <section className="status"><div><span className="dot"/> CONTROL PLANE <b>v0.3.0</b></div><div>API PREFIX <b>/api/v1</b></div><div>RUNTIME <b>VERCEL / SELF-HOSTED</b></div></section>
  <section className="section"><p className="eyebrow">AUTOMATED CORE</p><div className="cards">{services.map(([title,desc],i)=><article className="card" key={title}><span className="number">0{i+1}</span><h2>{title}</h2><p>{desc}</p></article>)}</div></section>
  <section className="notice"><div><p className="eyebrow">DEPLOYMENT MODEL</p><h2>Vercel for preview. Docker for persistent infrastructure.</h2><p>Vercel deployment can host the dashboard/API functions while a persistent PostgreSQL service is configured separately. The one-command self-hosted bootstrap starts PostgreSQL, applies migrations, starts the API, and launches the backup worker on a machine we control.</p></div><a href="/docs">Integration guide →</a></section>
  <footer>© 2026 RAZZAQ VENTURES <span>NEXORA CLOUD · PRIVATE CONTROL PLANE</span></footer>
</main> }
