const services = [
  ['Project Registry','Identitas proyek, environment, dan status layanan.'],
  ['API Identity','API key terpisah untuk setiap proyek dengan hash di database.'],
  ['Control Plane API','Satu endpoint pusat untuk integrasi backend proyek.'],
  ['Runtime-ready Architecture','Disiapkan untuk menghubungkan container host pada fase berikutnya.']
];
export default function Home() { return <main className="shell">
  <nav><div className="brand"><span className="mark">N</span><span>NEXORA <b>CLOUD</b></span></div><span className="navtag">RAZZAQ VENTURES / INFRASTRUCTURE</span></nav>
  <section className="hero"><p className="eyebrow">CENTRAL CLOUD CONTROL PLANE</p><h1>One infrastructure.<br/><em>Every project connected.</em></h1><p className="intro">Fondasi terpusat untuk mengelola identitas proyek, akses API, dan integrasi layanan di seluruh ekosistem Razzaq Ventures.</p><div className="actions"><a className="primary" href="/docs">Baca API Documentation <span>↗</span></a><a className="secondary" href="/api/v1/health">System health</a></div></section>
  <section className="status"><div><span className="dot"/> CONTROL PLANE <b>INITIAL BUILD</b></div><div>VERSION 0.1.0</div><div>API PREFIX <b>/api/v1</b></div></section>
  <section className="section"><p className="eyebrow">CORE CAPABILITIES</p><div className="cards">{services.map(([title,desc],i)=><article className="card" key={title}><span className="number">0{i+1}</span><h2>{title}</h2><p>{desc}</p></article>)}</div></section>
  <section className="notice"><div><p className="eyebrow">DEPLOYMENT MODEL</p><h2>Vercel runs the control plane.</h2><p>Persistent bot sessions, long-running workers, and container workloads belong on a separate compute host. Nexora Cloud connects them through authenticated APIs.</p></div><a href="/docs">Integration guide →</a></section>
  <footer>© 2026 RAZZAQ VENTURES <span>NEXORA CLOUD · CONTROL PLANE</span></footer>
</main> }
