// v4.5.0: country/device aggregates; no raw IP, identity or search text is stored.
async function analyticsPeriod(env){const db=database(env);await db.prepare("INSERT OR IGNORE INTO analytics_periods (id,at) VALUES ('initial',0)").run();return db.prepare('SELECT * FROM analytics_periods ORDER BY at DESC LIMIT 1').first();}
async function pruneAnalytics(env){const cutoff=Date.now()-365*86400000;await database(env).batch([database(env).prepare('DELETE FROM analytics_views WHERE at<?').bind(cutoff),database(env).prepare('DELETE FROM analytics_visits WHERE last<?').bind(cutoff)]);}
async function collectAnalytics(request,env,auth){
 if(auth||/bot|crawler|spider|headless/i.test(request.headers.get('User-Agent')||'')||request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return json({ignored:true});
 const input=await body(request,2048);if(!/^[a-f0-9-]{36}$/.test(input.visit||''))return json({error:'Invalid visit'},400);
 const project=typeof input.project==='string'?input.project:'';if(project&&!(await records(env)).some(p=>p.id===project))return json({error:'Unknown project'},400);
 const db=database(env),period=await analyticsPeriod(env),at=Date.now(),day=new Date(at).toISOString().slice(0,10),visit=period.id+':'+input.visit;
 const prior=await db.prepare('SELECT * FROM analytics_visits WHERE id=?').bind(visit).first();
 if(prior&&at-prior.last>1800000)return json({renew:true},409);
 const code=request.cf?.country||request.headers.get('CF-IPCountry')||'Unknown',country=/^[A-Z]{2}$/.test(code)&&!['XX','T1'].includes(code)?code:'Unknown';
 const ua=request.headers.get('User-Agent')||'',device=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)?'Tablet':/Mobi|iPhone/i.test(ua)?'Mobile':/Windows|Macintosh|Linux|CrOS/i.test(ua)?'Desktop/PC':'Unknown';
 const c=prior?.country||country,d=prior?.device||device;
 const add=(p,v,w)=>db.prepare('INSERT INTO analytics_daily (id,period,day,country,device,project,visits,views) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0 ON CONFLICT(id) DO UPDATE SET visits=visits+excluded.visits,views=views+excluded.views').bind([period.id,day,c,d,p].join(':'),period.id,day,c,d,p,v,w);
 const statements=[db.prepare('INSERT OR IGNORE INTO analytics_visits (id,period,at,last,country,device) VALUES (?,?,?,?,?,?)').bind(visit,period.id,at,at,c,d),add('',1,0)];
 if(project)statements.push(db.prepare('INSERT OR IGNORE INTO analytics_views (id,visit,period,at,project) VALUES (?,?,?,?,?)').bind(visit+':'+project,visit,period.id,at,project),add(project,0,1));
 statements.push(db.prepare('UPDATE analytics_visits SET last=? WHERE id=?').bind(at,visit));await db.batch(statements);await pruneAnalytics(env);return json({ok:true});
}
async function analyticsRoute(request,env,path,url){
 if(path==='/api/analytics'&&request.method==='GET'){
  const current=await analyticsPeriod(env);await pruneAnalytics(env);
  const periods=(await database(env).prepare('SELECT * FROM analytics_periods ORDER BY at DESC').all()).results;
  const period=periods.find(p=>p.id===url.searchParams.get('period'))||current;
  const range=url.searchParams.get('range'),days=range==='today'?1:range==='7'?7:range==='30'?30:null;
  const since=days?new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10):'0000';
  const rows=(await database(env).prepare('SELECT day,country,device,project,visits,views FROM analytics_daily WHERE period=? AND day>=? ORDER BY day').bind(period.id,since).all()).results;
  const recent=(await database(env).prepare('SELECT id,at,country,device FROM analytics_visits WHERE period=? AND at>=? ORDER BY at DESC LIMIT 20').bind(period.id,Math.max(Date.now()-365*86400000,days?Date.parse(since):0)).all()).results;
  for(const visit of recent){visit.projects=(await database(env).prepare('SELECT project FROM analytics_views WHERE visit=? ORDER BY at').bind(visit.id).all()).results.map(p=>p.project);delete visit.id;}
  return json({current:current.id,period:period.id,periods,rows,recent});
 }
 if(path==='/api/analytics/reset'&&request.method==='POST'){
  const input=await body(request),current=await analyticsPeriod(env);if(input.period!==current.id)return json({error:'The reporting period changed. Refresh analytics and try again.'},409);
  const db=database(env),id=crypto.randomUUID(),at=Date.now();
  const results=await db.batch([
   db.prepare('INSERT INTO analytics_periods (id,at) SELECT ?,? WHERE (SELECT id FROM analytics_periods ORDER BY at DESC LIMIT 1)=?').bind(id,at,current.id),
   db.prepare("INSERT INTO file_operations (id,kind,filename,at,status,payload,ip,completed) SELECT ?,'analytics','Analytics reporting period',?,'completed','{}',?,? WHERE changes()>0").bind(id,at,transferIp(request),at),
   db.prepare("INSERT INTO global_history (at,action,operation_id,summary,details,ip) SELECT ?,'analytics_reset',?,'Reset analytics counters; the previous reporting period remains available. No projects changed.',?,? WHERE changes()>0").bind(at,id,JSON.stringify({filename:'Analytics reporting period',previousPeriod:current.id}),transferIp(request))]);
  return results[0].meta.changes?json({ok:true}):json({error:'Another reset already completed. Refresh analytics.'},409);
 }
 return null;
}
