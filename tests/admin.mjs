import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync}from'node:sqlite';import worker from '../dist/server/index.js';
const sqlite=new DatabaseSync(':memory:');for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));
function statement(sql,args=[]){return{bind(...next){return statement(sql,next)},async all(){return{results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}}
const env={DB:{prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},ADMIN_PASSWORD_HASH:fs.readFileSync('.env','utf8').trim().split('=')[1]};let cookie='';
async function call(path,method='GET',body,origin='https://atlas.test'){const r=await worker.fetch(new Request('https://atlas.test'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'203.0.113.8'},body:body===undefined?undefined:JSON.stringify(body)}),env);const data=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,data};}
assert.equal((await call('/api/records','POST',{})).status,401);assert.equal((await call('/api/audit')).status,401);assert.equal((await call('/api/records/bombo/history')).status,401);assert.equal((await call('/api/login','POST',{password:'wrong'})).status,401);assert.equal((await call('/api/login','POST',{password:'Bombo'})).status,200);
// Configuration is public to read, Admin-only to change, validated, and persistent.
assert.deepEqual((await call('/api/config')).data,{editFlipEnabled:true,editFlipDuration:720});
assert.equal((await call('/api/config','PUT',{editFlipEnabled:true,editFlipDuration:50})).status,400);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:true,editFlipDuration:800},'https://evil.test')).status,403);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000})).status,200);
assert.deepEqual((await call('/api/config')).data,{editFlipEnabled:false,editFlipDuration:1000});
assert.equal((await call('/api/catalog')).data.config.editFlipEnabled,false);
let catalog=(await call('/api/catalog')).data;assert.equal(catalog.programs.length,11);const base=catalog.programs[0];
let result=await call('/api/records','POST',{...base,name:base.name.toUpperCase()});assert.equal(result.status,400);
result=await call('/api/records','POST',{...base,name:'Test project',kind:'pilot',countries:['Canada']});assert.equal(result.status,201);const id=result.data.id;
let record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);assert.equal(record.revision,1);
assert.equal((await call('/api/records/'+id,'PUT',{...record,outcome:'Changed outcome'},'https://evil.test')).status,403);
assert.equal((await call('/api/records/'+id,'PUT',{...record,source:'javascript:alert(1)'})).status,400);
assert.equal((await call('/api/records/'+id,'PUT',{...record,outcome:'Changed outcome'})).status,200);
assert.equal((await call('/api/records/'+id,'PUT',record)).status,409);
let logs=(await call('/api/audit')).data.entries;assert.equal(logs.length,2);const edit=logs.find(l=>l.action==='update');assert.equal(edit.ip,'203.0.113.8');assert.equal(edit.revision,2);const history=(await call('/api/records/'+id+'/history')).data;assert.equal(history.currentRevision,2);assert.deepEqual(history.entries.map(e=>e.revision),[1,2]);assert.equal(history.entries[1].after.outcome,'Changed outcome');assert.equal(history.entries[1].before.outcome,base.outcome);
assert.equal((await call('/api/rollback/'+edit.id,'POST',{side:'before',revision:2})).status,200);record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);assert.equal(record.outcome,base.outcome);assert.equal(record.revision,3);
assert.equal((await call('/api/records/'+id,'DELETE',{revision:3})).status,200);assert(!(await call('/api/catalog')).data.programs.some(p=>p.id===id));
logs=(await call('/api/audit')).data.entries;const deletion=logs.find(l=>l.action==='delete');assert.equal((await call('/api/rollback/'+deletion.id,'POST',{side:'before',revision:4})).status,200);assert((await call('/api/catalog')).data.programs.some(p=>p.id===id));
const create=logs.find(l=>l.action==='create');assert.equal((await call('/api/rollback/'+create.id,'POST',{side:'before',revision:5})).status,400);record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);assert.equal(record.revision,5);assert.equal((await call('/api/rollback/'+create.id,'POST',{side:'after',revision:5})).status,200);record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);assert.equal(record.revision,6);assert.equal(record.name,'Test project');
assert.equal((await call('/api/logout','POST',{})).status,200);assert.equal((await call('/api/audit')).status,401);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:true,editFlipDuration:720})).status,401);
console.log('PASS: configuration persistence, validation and authorization; authentication, protected audit access, CRUD, duplicate names, CSRF, URL validation, stale revisions, edit IPs, rollback, deletion restoration and logout.');
