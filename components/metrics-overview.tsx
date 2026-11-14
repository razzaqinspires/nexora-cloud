'use client';
import { useEffect, useMemo, useState } from 'react';
type Metrics = { ok:boolean; generatedAt:string; totals:{databases:number;openDatabases:number;totalSizeMB:number;files:number;lastUpdated:string|null}; topDatabases:Array<{database_name:string;engine:string;provider:string;location:string;status:string;sizeMB:number;open_connections:number;project_name:string}>; sync:{lastIngest:string|null;eventsLast24Hours:number}; };
const number = (v:number) => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
export default function MetricsOverview(){
 const [data,setData]=useState<Metrics|null>(null); const [state,setState]=useState('connecting'); const [updated,setUpdated]=useState('');
 useEffect(()=>{let live=true; let timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{try{const r=await fetch('/api/v1/metrics/summary',{cache:'no-store'}); if(!r.ok) throw new Error(r.status===404?'private':'unavailable'); const j=await r.json(); if(live){setData(j);setState('online');setUpdated(new Date().toLocaleTimeString());}}catch(e){if(live)setState(e instanceof Error?e.message:'unavailable');}finally{if(live)timer=setTimeout(load,30000);}};
  load(); return ()=>{live=false;if(timer)clearTimeout(timer);};
 },[]);
 const cards: Array<[string,string]> = useMemo(()=>data?[['DATABASES',number(data.totals.databases)],['OPEN / ONLINE',number(data.totals.openDatabases)],['TOTAL SIZE',`${number(data.totals.totalSizeMB)} MB`],['REGISTERED FILES',number(data.totals.files)]]:[],[data]);
 const topDatabases: Metrics['topDatabases'] = data?.topDatabases ?? [];
 return <section className="metrics" aria-live="polite">
  <div className="metrics-head"><div><p className="eyebrow">LIVE INFRASTRUCTURE TELEMETRY</p><h2>Database overview</h2><p className="metrics-sub">Aggregated from connected Nexora agents. Refresh interval: 30 seconds.</p></div><span className={`metric-state ${state==='online'?'good':''}`}>{state==='online'?'● LIVE':state==='private'?'● PRIVATE':'● '+state.toUpperCase()}</span></div>
  <div className="metric-grid">{cards.length?cards.map(([k,v])=><article className="metric-card" key={k}><span>{k}</span><strong>{v}</strong></article>):<article className="metric-empty">{state==='private'?'Metrics endpoint is private or not enabled. Enable it only behind a private access gateway.':'Waiting for database telemetry. No values are fabricated.'}</article>}</div>
  <div className="top-dbs"><div className="top-head"><h3>Top databases</h3><span>MAX 3 · BY SIZE</span></div>{topDatabases.length?topDatabases.map((d,i)=><div className="db-row" key={`${d.project_name}-${d.database_name}`}><span className="db-rank">0{i+1}</span><div className="db-name"><b>{d.database_name}</b><small>{d.project_name} · {d.engine} · {d.provider}/{d.location}</small></div><div className="db-size"><b>{number(d.sizeMB)} MB</b><small>{d.status} · {d.open_connections} connections</small></div></div>):<p className="metrics-sub">No database sources have reported yet.</p>}</div>
  <div className="metrics-foot"><span>Last browser update: {updated||'—'}</span><span>Last agent sync: {data?.sync.lastIngest?new Date(data.sync.lastIngest).toLocaleString():'—'}</span><span>Sync events / 24h: {data?data.sync.eventsLast24Hours:'—'}</span></div>
 </section>;
}
