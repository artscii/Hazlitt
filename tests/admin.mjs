import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync}from'node:sqlite';import worker from '../dist/server/index.js';
const sqlite=new DatabaseSync(':memory:');for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));
function statement(sql,args=[]){return{bind(...next){return statement(sql,next)},async all(){return{results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}}
const env={DB:{prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},ADMIN_PASSWORD_HASH:fs.readFileSync('.env','utf8').trim().split('=')[1]};let cookie='';
async function call(path,method='GET',body,origin='https://atlas.test'){const r=await worker.fetch(new Request('https://atlas.test'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'203.0.113.8'},body:body===undefined?undefined:JSON.stringify(body)}),env);const data=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,data};}
const configuredHash=env.ADMIN_PASSWORD_HASH;delete env.ADMIN_PASSWORD_HASH;
assert.equal((await call('/api/login','POST',{password:'Bombo'})).status,503);
env.ADMIN_PASSWORD_HASH=configuredHash;
assert.equal((await call('/api/records','POST',{})).status,401);assert.equal((await call('/api/audit')).status,401);assert.equal((await call('/api/records/bombo/history')).status,401);assert.equal((await call('/api/login','POST',{password:'wrong'})).status,401);assert.equal((await call('/api/login','POST',{password:'Bombo'})).status,200);
delete env.ADMIN_PASSWORD_HASH;
assert.equal((await call('/api/login','POST',{password:'Bombo'})).status,200);
assert.equal((await call('/api/login','POST',{password:'wrong'})).status,401);
assert.equal((await call('/api/session')).data.authenticated,true);
// Configuration is public to read, Admin-only to change, validated, and persistent.
assert.deepEqual((await call('/api/config')).data,{editFlipEnabled:true,editFlipDuration:400,palette:'coastal',qmdEnabled:true});
assert.equal((await call('/api/config','PUT',{editFlipEnabled:true,editFlipDuration:50})).status,400);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:true,editFlipDuration:800},'https://evil.test')).status,403);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000})).status,200);
assert.deepEqual((await call('/api/config')).data,{editFlipEnabled:false,editFlipDuration:1000,palette:'coastal',qmdEnabled:true});
assert.equal((await call('/api/catalog')).data.config.editFlipEnabled,false);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000,qmdEnabled:false})).status,200);
assert.equal((await call('/api/config')).data.qmdEnabled,false);
assert.equal((await call('/api/search/status')).data.disabled,true);
assert.equal((await call('/api/search/query','POST',{query:'Kenya'})).status,503);
await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000,qmdEnabled:true});
for(const palette of ['coastal','ocean','forest','plum','slate']){assert.equal((await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000,palette})).status,200);assert.equal((await call('/api/catalog')).data.config.palette,palette);}
assert.equal((await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000,palette:'untrusted'})).status,400);
assert.equal((await call('/api/config')).data.palette,'slate');
await call('/api/config','PUT',{editFlipEnabled:false,editFlipDuration:1000});assert.equal((await call('/api/config')).data.palette,'slate');

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
// Edit notes participate in snapshots, summaries, diffs and restoration like other fields.
record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);
assert.equal((await call('/api/records/'+id,'PUT',{...record,editNotes:'First observation'})).status,200);
record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);
assert.equal((await call('/api/records/'+id,'PUT',{...record,editNotes:'Revised observation'})).status,200);
let noteHistory=(await call('/api/records/'+id+'/history')).data.entries;
const noteEdit=noteHistory.at(-1),firstNote=noteHistory.at(-2);
assert.equal(noteEdit.before.editNotes,'First observation');assert.equal(noteEdit.after.editNotes,'Revised observation');
assert.match(noteEdit.summary,/“Edit notes” field/);
assert.equal((await call('/api/rollback/'+firstNote.id,'POST',{side:'after',revision:noteEdit.revision})).status,200);
assert.equal((await call('/api/catalog')).data.programs.find(p=>p.id===id).editNotes,'First observation');
noteHistory=(await call('/api/records/'+id+'/history')).data.entries;
assert.equal(noteHistory.at(-1).before.editNotes,'Revised observation');assert.equal(noteHistory.at(-1).after.editNotes,'First observation');
// v4.6.0: language provenance survives edits and rollback; unsafe links are rejected.
let bilingual=(await call('/api/catalog')).data.programs.find(p=>p.id===id);
assert.equal((await call('/api/records/'+id,'PUT',{...bilingual,originalLanguage:'es',originalTitle:'Título',originalSource:'javascript:alert(1)'})).status,400);
assert.equal((await call('/api/records/'+id,'PUT',{...bilingual,originalLanguage:'es',originalTitle:'Título',originalSummary:'Resumen',originalSource:'https://example.org/es'})).status,200);
bilingual=(await call('/api/catalog')).data.programs.find(p=>p.id===id);assert.equal(bilingual.originalSummary,'Resumen');
assert.equal((await call('/api/records/'+id,'PUT',{...bilingual,originalSummary:'Revisión'})).status,200);
const bilingualHistory=(await call('/api/records/'+id+'/history')).data.entries;const lastLanguage=bilingualHistory.at(-1);
assert.equal(lastLanguage.before.originalSummary,'Resumen');assert.equal(lastLanguage.after.originalSummary,'Revisión');
assert.equal((await call('/api/rollback/'+lastLanguage.id,'POST',{side:'before',revision:bilingual.revision+1})).status,200);
assert.equal((await call('/api/catalog')).data.programs.find(p=>p.id===id).originalSummary,'Resumen');
assert.equal((await call('/api/logout','POST',{})).status,200);assert.equal((await call('/api/audit')).status,401);
assert.equal((await call('/api/config','PUT',{editFlipEnabled:true,editFlipDuration:400})).status,401);
console.log('PASS: configuration persistence, validation and authorization; authentication, protected audit access, CRUD, duplicate names, CSRF, URL validation, stale revisions, edit IPs, rollback, deletion restoration and logout.');

// Publication year and evidence unit survive saves and history.
assert.equal((await call('/api/login','POST',{password:'Bombo'})).status,200);
record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);
assert.equal((await call('/api/records/'+id,'PUT',{...record,publicationYear:'2024',evidenceBasis:'Slide scans',sampleDetails:'500 slides; patient count not established'})).status,200);
record=(await call('/api/catalog')).data.programs.find(p=>p.id===id);
assert.equal(record.publicationYear,'2024');assert.equal(record.evidenceBasis,'Slide scans');
assert.equal((await call('/api/records/'+id,'PUT',{...record,publicationYear:'2024x'})).status,400);
assert.equal((await call('/api/records/'+id,'PUT',{...record,evidenceBasis:'Unsupported'})).status,400);
const latest=(await call('/api/records/'+id+'/history')).data.entries.at(-1);
assert.equal(latest.after.publicationYear,'2024');assert.equal(latest.after.sampleDetails,record.sampleDetails);
