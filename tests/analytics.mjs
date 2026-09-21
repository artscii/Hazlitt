import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync}from'node:sqlite';import worker from '../dist/server/index.js';
const sqlite=new DatabaseSync(':memory:');for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));
function statement(sql,args=[]){return{bind(...next){return statement(sql,next)},async all(){return{results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}}
const env={DB:{prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},ADMIN_PASSWORD_HASH:fs.readFileSync('.env','utf8').trim().split('=')[1]};let cookie='';
async function call(path,method='GET',body,origin='https://atlas.test'){const r=await worker.fetch(new Request('https://atlas.test'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'203.0.113.8'},body:body===undefined?undefined:JSON.stringify(body)}),env);const data=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,data};}

assert.equal((await call('/api/analytics')).status,401);
const visit=crypto.randomUUID();
for(let i=0;i<2;i++)assert.equal((await call('/api/analytics/event','POST',{visit,project:'bombo'})).status,200);
assert.equal(sqlite.prepare('SELECT SUM(visits) n FROM analytics_daily').get().n,1);
assert.equal(sqlite.prepare('SELECT SUM(views) n FROM analytics_daily').get().n,1);
assert.equal((await call('/api/analytics/event','POST',{visit,project:'absent'})).status,400);
assert.equal((await call('/api/analytics/event','POST',{visit},'https://evil.test')).status,403);
await call('/api/login','POST',{password:'Bombo'});
assert.equal((await call('/api/analytics/event','POST',{visit:crypto.randomUUID()})).data.ignored,true);
let report=(await call('/api/analytics')).data;assert.equal(report.recent.length,1);assert.deepEqual(report.recent[0].projects,['bombo']);assert.ok(!('id' in report.recent[0]));
const old=Date.now()-366*86400000,retained=Date.now()-364*86400000;
sqlite.prepare('INSERT INTO analytics_visits VALUES (?,?,?,?,?,?)').run('expired','initial',old,old,'CA','Mobile');
sqlite.prepare('INSERT INTO analytics_views VALUES (?,?,?,?,?)').run('expired-view','expired','initial',old,'bombo');
sqlite.prepare('INSERT INTO analytics_visits VALUES (?,?,?,?,?,?)').run('retained','initial',retained,retained,'CA','Mobile');
await call('/api/analytics');assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM analytics_visits WHERE id='expired'").get().n,0);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM analytics_visits WHERE id='retained'").get().n,1);assert.equal(sqlite.prepare('SELECT SUM(visits) n FROM analytics_daily').get().n,1);
assert.equal((await call('/api/analytics/reset','POST',{period:report.current})).status,200);
assert.equal((await call('/api/analytics/reset','POST',{period:report.current})).status,409);
assert.equal((await call('/api/analytics')).data.rows.length,0);
assert.equal((await call('/api/analytics?period=initial')).data.rows.length,2);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM global_history WHERE action='analytics_reset'").get().n,1);
console.log('PASS: analytics deduplication, authorization, origin protection, admin exclusion, 365-day retention, preserved totals and archived reset.');
